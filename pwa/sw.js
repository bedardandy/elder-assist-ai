/* sw.js — offline app shell for ElderAssist.
 *
 * Strategy:
 *   - App shell (HTML/CSS/JS/icons/manifest): cache-first, refreshed in the
 *     background (stale-while-revalidate). Bump SHELL_VERSION to ship updates.
 *   - config.js: network-first with cache fallback, so the latest config wins
 *     but calling still works offline (cached contacts + tel: links).
 *   - Home Assistant / HomeBox API (cross-origin): never intercepted, never
 *     cached — always live. No stale medication/calendar data, ever.
 *   - Navigations: network-first, falling back to the cached app shell so the
 *     clock and cached contacts still appear with no connection.
 */

const SHELL_VERSION = 'v1';
const SHELL_CACHE = `elderassist-shell-${SHELL_VERSION}`;
const RUNTIME_CACHE = `elderassist-runtime-${SHELL_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './js/main.js',
  './js/ui.js',
  './js/ha.js',
  './js/homebox.js',
  './js/pages/setup.js',
  './js/pages/home.js',
  './js/pages/call.js',
  './js/pages/medicine.js',
  './js/pages/today.js',
  './js/pages/ask.js',
  './js/pages/tv.js',
  './js/pages/things.js',
  './js/pages/help.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isConfig(url) {
  return url.pathname.endsWith('/config.js') || url.pathname.endsWith('config.js');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (Home Assistant, HomeBox, Jitsi): stay out of the way.
  if (url.origin !== self.location.origin) return;

  // Navigations → network-first, fall back to cached shell, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  // config.js → network-first (fresh token/contacts) with cache fallback.
  if (isConfig(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Shell assets → cache-first + background refresh (stale-while-revalidate).
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
