/* main.js — entry point.
 * Loads config.js (friendly setup screen if missing), builds the persistent
 * header (greeting + clock + text-size toggle), and runs a tiny hash router.
 */

import { el, clear } from './ui.js';
import { HaClient } from './ha.js';
import { HomeBoxClient } from './homebox.js';
import { renderSetup } from './pages/setup.js';

import mountHome from './pages/home.js';
import mountCall from './pages/call.js';
import mountMedicine from './pages/medicine.js';
import mountToday from './pages/today.js';
import mountAsk from './pages/ask.js';
import mountTv from './pages/tv.js';
import mountThings from './pages/things.js';
import mountHelp from './pages/help.js';

const ROUTES = {
  '': mountHome,
  '/': mountHome,
  '/call': mountCall,
  '/medicine': mountMedicine,
  '/today': mountToday,
  '/ask': mountAsk,
  '/tv': mountTv,
  '/things': mountThings,
  '/help': mountHelp,
};

/* ---- Text size (persisted) --------------------------------------------- */
const TEXT_KEY = 'ea.textsize';
function applyTextSize(size) {
  if (size === 'lg' || size === 'xl') document.documentElement.dataset.textsize = size;
  else document.documentElement.removeAttribute('data-textsize');
}
function currentTextSize() {
  try { return localStorage.getItem(TEXT_KEY) || 'base'; } catch { return 'base'; }
}
function setTextSize(size) {
  try { localStorage.setItem(TEXT_KEY, size); } catch { /* storage may be evicted */ }
  applyTextSize(size);
  syncTextToggle();
}
let toggleEls = {};
function syncTextToggle() {
  const size = currentTextSize();
  if (toggleEls.small) toggleEls.small.setAttribute('aria-pressed', String(size === 'base'));
  if (toggleEls.big) toggleEls.big.setAttribute('aria-pressed', String(size !== 'base'));
}

/* ---- Clock + greeting -------------------------------------------------- */
function greetingWord(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function buildHeader(config) {
  const hello = el('span.hello');
  const date = el('span.date');
  const clock = el('div.clock', { 'aria-hidden': 'true' });

  const small = el('button.small', { type: 'button', 'aria-label': 'Normal text size', title: 'Normal text', onclick: () => setTextSize('base') }, 'A');
  const big = el('button.big', { type: 'button', 'aria-label': 'Larger text size', title: 'Larger text', onclick: () => setTextSize(currentTextSize() === 'xl' ? 'base' : 'xl') }, 'A+');
  toggleEls = { small, big };

  const header = el('header.app-header', {}, [
    el('div.greet', {}, [hello, date]),
    clock,
    el('div.txt-toggle', { role: 'group', 'aria-label': 'Text size' }, [small, big]),
  ]);

  const name = (config && config.elderName) ? config.elderName : '';
  function tick() {
    const now = new Date();
    hello.textContent = name ? `${greetingWord(now)}, ${name}` : greetingWord(now);
    date.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    clock.textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 1000 * 15);
  syncTextToggle();
  return header;
}

/* ---- Router ------------------------------------------------------------ */
function makeContext(config) {
  return {
    config,
    ha: new HaClient(config),
    homebox: new HomeBoxClient(config.homebox || {}),
    go(path) { location.hash = '#' + path; },
  };
}

let mounted = null;
async function route(ctx, viewRoot) {
  const raw = location.hash.replace(/^#/, '');
  const path = raw.split('?')[0] || '/';
  const mount = ROUTES[path] || ROUTES['/'];

  if (mounted && typeof mounted.cleanup === 'function') {
    try { mounted.cleanup(); } catch { /* noop */ }
  }
  clear(viewRoot);
  try {
    const node = await mount(ctx);
    mounted = node;
    viewRoot.append(node);
    viewRoot.scrollTop = 0;
    // Move focus to the page for screen readers / keyboard users.
    const focusTarget = node.querySelector('.back, .btn, h1, .page-title');
    if (focusTarget) focusTarget.setAttribute('tabindex', focusTarget.tabIndex >= 0 ? focusTarget.tabIndex : -1);
  } catch (e) {
    viewRoot.append(el('div.view.page', {}, [el('div.page-body', {}, [
      el('div.banner', {}, [el('span.icon', { text: '⚠️' }), el('span', { text: 'Something went wrong loading this page. Tap Back and try again.' })]),
      el('a.back', { href: '#/' }, ['⬅ Back']),
    ])]));
  }
}

/* ---- Boot -------------------------------------------------------------- */
async function boot() {
  const app = document.getElementById('app');
  applyTextSize(currentTextSize() === 'base' ? null : currentTextSize());

  let config;
  try {
    const mod = await import('../config.js');
    config = mod.default || mod.config || mod;
  } catch {
    config = null;
  }

  if (!config || typeof config !== 'object') {
    clear(app);
    app.append(renderSetup());
    return;
  }

  const ctx = makeContext(config);
  clear(app);
  app.append(buildHeader(config));
  const viewRoot = el('div#view', {});
  app.append(viewRoot);

  window.addEventListener('hashchange', () => route(ctx, viewRoot));
  await route(ctx, viewRoot);
}

/* Register the service worker (offline shell). Never blocks boot. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline features simply won't load */ });
  });
}

boot();
