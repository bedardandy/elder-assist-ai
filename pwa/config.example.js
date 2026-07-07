/*
 * ElderAssist Kiosk PWA — configuration template
 * ------------------------------------------------
 * COPY this file to `config.js` in the same folder and fill in your values:
 *
 *     cp config.example.js config.js
 *
 * The app loads `config.js` at runtime. If it is missing, the elder sees a
 * friendly "this tablet isn't set up yet" screen instead of an error.
 *
 * SECURITY: `config.js` contains a Home Assistant access token that anyone with
 * physical access to this device can read. Use a token belonging to a RESTRICTED,
 * NON-ADMIN Home Assistant user (see pwa/README.md). Serve this app on your LAN
 * only (or over Tailscale). Never expose it to the public internet.
 *
 * Every section below is optional: pages whose config is absent simply show a
 * calm "not set up yet" message instead of breaking. Fill in what you use.
 */

export default {
  /* ---- Who is this for -------------------------------------------------- */
  // Shown in the greeting header, e.g. "Good morning, Mary".
  elderName: 'Mary',

  // Language tag used for voice recognition, speech, and HA Assist.
  language: 'en-US',

  /* ---- Home Assistant --------------------------------------------------- */
  // Base URL of your Home Assistant instance (no trailing slash).
  // Reachable from THIS tablet — a LAN address or Tailscale hostname.
  haBaseUrl: 'http://homeassistant.local:8123',

  // Long-lived access token for a RESTRICTED, NON-ADMIN user.
  // Home Assistant → user profile → "Long-lived access tokens" → Create Token.
  haToken: 'PASTE_A_RESTRICTED_USER_LONG_LIVED_TOKEN_HERE',

  // Network timeout (ms) before we show "can't reach the house computer".
  haTimeoutMs: 8000,

  /* ---- The caregiver (used by Help + Emergency card) -------------------- */
  caregiver: {
    name: 'Susan',
    // Phone number in tel: form (digits, +country code ok). Works on devices
    // with a SIM or FaceTime. Leave empty ('') to hide the phone option.
    phone: '+15551234567',
    // Optional Jitsi room for a video call to the caregiver.
    // SECURITY: rooms on public meet.jit.si are open to ANYONE who knows the name.
    // ALWAYS append a long random suffix (see the calling-and-video playbook).
    jitsiRoom: 'ElderAssist-Susan-Care-q7Kp2mZx9R',
    // 'video' opens Jitsi, 'phone' uses the tel: link as the primary action.
    type: 'phone',
  },

  /* ---- Video calling ---------------------------------------------------- */
  // Base URL of the Jitsi instance. Public default shown; a family-run
  // instance also works. Rooms are per-person and stable — no account needed.
  // On public meet.jit.si a room is open to anyone who knows its name, so every
  // jitsiRoom below MUST carry a long random suffix (never a bare name like
  // 'ElderAssist-Susan'). See docs/playbooks/calling-and-video.md.
  jitsiBase: 'https://meet.jit.si',

  /* ---- Call Family: one card per person --------------------------------- */
  // type: 'video'  -> opens `jitsiRoom` (or a full `url`) with prejoin skipped.
  // type: 'phone'  -> dials `phone` (tel:).
  // Each jitsiRoom carries a long RANDOM suffix — public rooms are open to anyone
  // who knows the name, so never use a bare 'ElderAssist-<person>' room.
  contacts: [
    { name: 'Susan',   type: 'video', jitsiRoom: 'ElderAssist-Susan-x7Kq9mPzW4', phone: '+15551234567' },
    { name: 'David',   type: 'video', jitsiRoom: 'ElderAssist-David-3nH8dV6bLp', phone: '+15559876543' },
    { name: 'Emily',   type: 'phone', phone: '+15552223333' },
    // A full external URL is also allowed instead of a jitsiRoom (keep the random suffix):
    // { name: 'Dr. Lee', type: 'video', url: 'https://meet.jit.si/DrLee-Mary-Jf5tR2kQ8w' },
  ],

  /* ---- My Medicine ------------------------------------------------------ */
  medication: {
    // input_boolean (or similar) that the HA medication automation reads/sets.
    // The big "I TOOK IT" button turns this ON; the page reflects its real state.
    acknowledgedEntity: 'input_boolean.medication_acknowledged',
    // Static schedule shown to the elder (times are display strings).
    schedule: [
      { name: 'Blood pressure pill', dose: '1 tablet', time: '8:00 AM' },
      { name: 'Vitamin D',           dose: '1 tablet', time: '8:00 AM' },
      { name: 'Evening pill',        dose: '1 tablet', time: '7:00 PM' },
    ],
  },

  /* ---- Today ------------------------------------------------------------ */
  today: {
    // HA calendar entities to read (day-of + tomorrow).
    calendars: ['calendar.family', 'calendar.appointments'],
    // Optional HA to-do list read via todo.get_items. Set to '' to skip.
    todoEntity: 'todo.reminders',
  },

  /* ---- TV buttons ------------------------------------------------------- */
  // Each button calls an HA service. Keep to 6 for the elder's screen.
  tv: {
    buttons: [
      { label: 'Watch News',  icon: '📰', domain: 'script',       service: 'tv_watch_news' },
      { label: 'Jeopardy',    icon: '❓', domain: 'script',       service: 'tv_watch_jeopardy' },
      { label: 'Music',       icon: '🎵', domain: 'script',       service: 'tv_play_music' },
      { label: 'Volume Up',   icon: '🔊', domain: 'media_player', service: 'volume_up',   service_data: { entity_id: 'media_player.living_room_tv' } },
      { label: 'Volume Down', icon: '🔉', domain: 'media_player', service: 'volume_down', service_data: { entity_id: 'media_player.living_room_tv' } },
      { label: 'Turn Off',    icon: '⏻',  domain: 'media_player', service: 'turn_off',    service_data: { entity_id: 'media_player.living_room_tv' } },
    ],
  },

  /* ---- Read This For Me (camera → local vision model) -------------------- */
  // Lets the elder photograph a label, letter, bill, or expiry date and have it
  // read aloud by the LOCAL vision model (nothing leaves the house — see D11).
  // Both values must be set or the camera button stays hidden.
  vision: {
    // Must match OLLAMA_VISION_MODEL in the hub's .env (pulled by ./setup.sh --vision).
    model: 'qwen2.5vl:7b',
    // Must match KIOSK_OLLAMA_KEY in the hub's .env. Like the HA token above,
    // this key is readable by anyone with device access; it only unlocks the
    // local vision model (no cloud, no cost), but keep the app LAN-only.
    kioskKey: '',
  },

  /* ---- Find My Things: Bluetooth tracker buttons -------------------------- */
  // Giant "make it beep" buttons shown ABOVE the inventory search. Each calls a
  // Home Assistant script (shipped in ha/packages/elder_assist.yaml — wire your
  // tags there first; see ha/README.md "Finding things: Bluetooth trackers").
  // Leave the list empty to hide the buttons.
  trackers: [
    { label: 'My Keys 🔑',   script: 'script.find_keys' },
    { label: 'My Wallet 👛', script: 'script.find_wallet' },
  ],

  /* ---- My Things (HomeBox) ---------------------------------------------- */
  // If baseUrl + token are set, the search box queries HomeBox directly.
  // If not, the page shows a big tile that opens the HomeBox web app (webUrl).
  homebox: {
    baseUrl: '',   // e.g. 'http://homebox.local:7745'
    token: '',     // HomeBox API token (see README). Empty = deep-link mode.
    webUrl: 'http://homebox.local:7745',
  },

  /* ---- Help ------------------------------------------------------------- */
  help: {
    // HA script fired by the "Something is wrong" button (notifies family).
    // Turned on via script.turn_on. Set to '' to hide that button.
    alarmScript: 'script.notify_family_help',
  },
};
