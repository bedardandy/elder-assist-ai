# ElderAssist Kiosk PWA

The elder-facing front door: **six enormous buttons and a voice.** No build step,
no framework — just static HTML/CSS/ES-modules served by the nginx container in
`docker/`. It talks to Home Assistant over its REST API using a **restricted,
non-admin** user's long-lived token.

```
📞 Call Family   💊 My Medicine
📅 Today         🙋 Get Help
📺 TV            🔍 Find My Things
```

(The **Get Help** button opens the Help page — call the caregiver, "Something is
wrong," and a calm **Ask a Question 🗣️** tile that reaches the AI chat.)

Plus a persistent large-print header: greeting by name, today's day/date (a real
dementia aid), and a giant clock. An A / A+ text-size toggle is remembered between
visits.

---

## 1. Quick setup (caregiver, ~15 min)

### a. Create a restricted Home Assistant user + token

The elder tablet must **never** hold an admin token — anyone with the device can
read `config.js`.

1. Home Assistant → **Settings → People → Users → Add user**.
   - Name: e.g. `kiosk`
   - **Turn OFF "Administrator."**
   - (Optional but recommended) mark it *local only*.
2. Log in *as that user once* (in a private browser window), open the user profile
   (bottom-left avatar) → scroll to **Long-lived access tokens → Create token**.
3. Copy the token — you only see it once.

**Be honest about what "non-admin" buys you.** Home Assistant has **no
per-entity or per-token authorization**: a non-admin user's long-lived token can
still call any service on any entity through the REST API. Making the user
non-admin only stops it from changing configuration, adding users, or reaching
admin settings — `exposed_entities` limits the Assist/voice layer, **not** the REST
API this app uses. So the real mitigation is at the device level: keep dangerous
actuators (door **locks**, **garage doors**, **alarm panels**) **off this Home
Assistant instance** — or behind a separate instance/account this token cannot
reach. And treat physical access as total control: anyone holding the tablet can
do anything the token can, so **treat the kiosk tablet like a house key**. See
`ha/` for the companion package.

### b. Fill in the config

```bash
cd pwa
cp config.example.js config.js
$EDITOR config.js        # elder name, HA URL, the token, contacts, meds, TV, HomeBox
```

Every section is optional — a page whose config is missing shows a calm "not set up
yet" message rather than an error. If `config.js` is missing entirely, the whole app
shows a friendly **"This tablet isn't set up yet"** screen for the caregiver.

### c. Allow this app's origin in Home Assistant (CORS)

The kiosk is served from `http://<hub>:8880`, a **different origin** than Home
Assistant, so HA must be told to accept its cross-origin API calls. Add to your Home
Assistant `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - http://<hub-ip>:8880       # e.g. http://192.168.1.10:8880
    - http://homeassistant.local:8880
    # add your Tailscale hostname/URL here too if you use it
    # - https://elderassist.<tailnet>.ts.net
```

> **Do not add `use_x_forwarded_for` / `trusted_proxies` here.** Those belong *only*
> when HA sits behind a real reverse proxy, and must be paired with a **tight
> `trusted_proxies:`** list (the proxy's IP only) — enabling `use_x_forwarded_for`
> without that lets clients spoof their IP. The kiosk talks to HA directly, so leave
> them out.

Restart Home Assistant after editing. This block goes in your **top-level
`configuration.yaml`** (it cannot live in a package — see `ha/README.md`). Without it,
the browser silently blocks the API calls and the elder sees "Can't reach the house
computer."

### d. Serve it

The `docker/` nginx container serves `pwa/` as its web root on port `8880`. Nothing
to build. Just make sure `config.js` exists in the served directory.

---

## 2. Install to the home screen

Installing gives fullscreen, an app icon, and offline caching.

### Android (Chrome / Edge)
1. Open `http://<hub>:8880` in Chrome.
2. Menu **⋮ → Install app** (or "Add to Home screen").
3. Launch it from the home screen — it opens fullscreen, no browser bars.

### iPhone / iPad (Safari — the *only* browser that can install PWAs on iOS)
1. Open the URL in **Safari** (not Chrome — on iOS every browser is Safari under the
   hood, but only Safari shows the install action).
2. Tap the **Share** button (□↑) → **Add to Home Screen** → **Add**.
3. Launch from the home screen for a fullscreen, chrome-less app.

### Desktop (Chrome/Edge, for testing)
Address-bar install icon, or menu → *Install ElderAssist*.

---

## 3. Kiosk tablet recipe (recommended primary surface)

A cheap Android tablet mounted on the kitchen counter is the ideal surface. Use
**[Fully Kiosk Browser](https://www.fully-kiosk.com/)** to lock it down:

| Fully Kiosk setting | Value | Why |
|---|---|---|
| **Start URL** | `http://<hub>:8880` | Loads the app on boot |
| **Web Content → Enable Kiosk Mode** | On | Hides all browser chrome |
| Web Content → Autoplay / Microphone Access | Allow, "Grant on request" | Lets the Ask page use the mic |
| Web Content → **Enable Insecure Content / ignore mic on insecure origin** | On | Web Speech mic on plain `http://` LAN (see §5) |
| Device → **Keep Screen On** | On (or motion-wake) | Always-available clock + buttons |
| Device → Screen Orientation | Lock to how it's mounted | No accidental rotation |
| Advanced Web → **Disable Pull-to-refresh, context menu, text selection** | On | No gestures to confuse |
| Motion Detection → wake screen on motion | On | Screen lights up as they approach |
| Remote Admin | On, strong password | Manage it from your phone |
| Single-App / Screen Pinning (Android) | Pin Fully Kiosk | They can't leave the app |

Set the tablet's Android accessibility font size large as well; the app scales on top
of that.

---

## 4. What each page does

| Page | Home Assistant / service used |
|---|---|
| **Call Family** | Opens a per-person **Jitsi** room (prejoin screen skipped) in a new fullscreen tab, or dials a `tel:` number. An **Emergency / Caregiver** card is pinned first and styled red. A "Calling …" full-screen state with a giant **Cancel** appears before the call opens. |
| **My Medicine** | Shows the schedule from config, reads the real state of `input_boolean.medication_acknowledged`, and the **I TOOK IT ✓** button calls `input_boolean.turn_on`, then re-reads state so it reflects reality. |
| **Today** | Today's & tomorrow's events from `GET /api/calendars/<entity>`, plus reminders from a to-do list via the `todo.get_items` response service. If reminders are unavailable it falls back to the calendar and says so. |
| **Get Help** | The Help page: **emergency actions first** — a big **Call {caregiver}** button and **🆘 Something is wrong** (fires an HA alarm script) — then reassurance, then a calm **Ask a Question 🗣️** tile. |
| **Ask a Question** (reached from Get Help) | Voice-first question box to HA Assist (`POST /api/conversation/process`). Uses the browser's Web Speech API mic when available, always offers typed input, shows big chat bubbles, and speaks the reply. See §5 on the mic. |
| **TV** | Up to six big buttons that call HA services (`script.*`, `media_player.*`, …) from `config.tv.buttons`. |
| **My Things** | Searches **HomeBox** (`GET /api/v1/items?q=`) if `baseUrl`+`token` are set, showing name/location/serial; otherwise a big tile deep-links to the HomeBox web app. |

> **Note on voice:** the in-app mic is a *pragmatic fallback* that works on the tablet
> itself. The real hands-free experience — "Hey Nabu, put on Jeopardy" from across the
> room — is the **Wyoming voice pipeline** (faster-whisper + Piper + openWakeWord) run
> by Home Assistant, not this app. See `docs/ARCHITECTURE.md`.

---

## 5. Security & the microphone (read this)

- **The token in `config.js` is readable by anyone with the device.** That is exactly
  why it must belong to a **non-admin** HA user. NOTE: HA tokens are **not**
  entity-scoped — non-admin only blocks config/user changes, it does not stop the
  token from calling any service on any entity. Keep locks/garage/alarm actuators off
  this HA instance (see §1a). Treat the tablet as a house key, not a personal login.
- **Serve LAN-only by default.** For remote family access, put the hub on
  **[Tailscale](https://tailscale.com/)** rather than opening ports. Tailscale also
  gives you an HTTPS hostname (`*.ts.net`), which matters for the mic below.
- **The Web Speech mic requires a *secure context*.** Browsers only allow
  `getUserMedia`/speech recognition on `https://` or `http://localhost`. On a plain
  `http://<hub>:8880` LAN origin the mic is blocked — **the typed input always works**,
  and the app degrades gracefully with a visible "type your question" prompt. To get
  the mic:
  - Serve the app (or reach HA) over **Tailscale HTTPS**, **or**
  - Use **Fully Kiosk**, which can grant microphone access on insecure origins
    (the setting in §3), **or**
  - Front the kiosk with a local TLS reverse proxy.
- **No medical decisions.** The app reminds and records; it never advises dosage.

---

## 6. iOS / Safari PWA limits (be honest about these)

- **No web push before iOS 16.4**, and even after, push only works *once the PWA is
  installed to the home screen*. This app does **not** rely on push — reminders are
  announced by Home Assistant on speakers/TV, and escalation goes to the caregiver's
  phone via Hermes/HA, not the tablet.
- **Storage can be evicted** by iOS if the device is low on space or the app is unused
  for weeks; the cached shell may need a network reload. Config and settings re-load
  from the server, so nothing is lost.
- **Only Safari can install PWAs** on iOS. Fullscreen is best-effort;
  the status bar may remain.
- For these reasons the **kiosk Android tablet is the primary surface**; iPhone/iPad
  are secondary convenience surfaces.

---

## 7. Offline behavior

A service worker (`sw.js`) caches the app shell (cache-first, versioned — bump
`SHELL_VERSION` to ship updates) and caches `config.js` network-first. **API calls to
Home Assistant and HomeBox are never cached** — no stale medication or calendar data,
ever. With no connection the app still shows the **clock, date, greeting, and cached
family contacts** (with working `tel:` links); live features show the friendly
"Can't reach the house computer — ask {caregiver} for help" banner.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| **"This tablet isn't set up yet"** | `config.js` missing | `cp config.example.js config.js` and fill it in |
| Every page says **"Can't reach the house computer"** | CORS not configured, wrong HA URL, or HA down | Add the `cors_allowed_origins` snippet (§1c) and restart HA; verify `haBaseUrl` is reachable from the tablet |
| **"This tablet needs a new access code"** | Token expired/revoked or user deleted | Create a new long-lived token for the restricted user, update `config.js` |
| Medicine/TV buttons do nothing | Entity/script names don't match, or the restricted user lacks permission | Check `acknowledgedEntity`, `tv.buttons`, `help.alarmScript` against real HA entity IDs; grant the kiosk user access |
| Ask page has no microphone | Insecure origin (plain `http://`) | See §5 — use Tailscale HTTPS or Fully Kiosk's insecure-mic setting; typed input works regardless |
| Reminders section empty but events show | `todo.get_items` unavailable on your HA version | Set `today.todoEntity` to `''` — the calendar is still shown |
| My Things opens a website instead of searching | HomeBox `baseUrl`/`token` blank | Fill them in for in-app search, or leave blank to deep-link |
| Calendar events show wrong times | HA/tablet timezone mismatch | Set the tablet timezone and HA timezone to match |
| App won't update after changes | Old service-worker cache | Bump `SHELL_VERSION` in `sw.js`, or reload twice / clear site data |

---

## 9. Files

```
pwa/
  index.html              app shell + iOS/PWA meta
  offline.html            offline fallback (live clock)
  manifest.webmanifest    name, fullscreen, maskable icons
  sw.js                   offline app-shell service worker
  config.example.js       copy to config.js and fill in
  css/
    base.css              variables, typography, header, text-size
    components.css        home grid, cards, chat, states
  js/
    main.js               config load, header, hash router
    ui.js                 DOM + speech helpers
    ha.js                 Home Assistant REST client (friendly errors)
    homebox.js            HomeBox item search client
    pages/                one module per screen
  icons/                  192 / 512 / maskable / apple-touch (180)
```

No dependencies, no build. Edit a file, reload the tablet.
