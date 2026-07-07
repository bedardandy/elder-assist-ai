# TV and casting

**What you'll have when done:** a written inventory of the TV setup, Home Assistant
controlling it (smart TV over the network, or a cable box via an IR blaster), a handful
of one-tap/one-voice "scenes" ("watch the news," "watch Jeopardy," "TV off") that each
do the whole input-app-volume dance, those same scenes on the kiosk's TV page, and the
TV working as a second screen for photos, reminders, and instruction cards.

**Time required:** 30–60 minutes for a smart-TV setup; 1–2 hours if a cable box with an
IR blaster and channel macros is involved (learning the IR codes takes patience).

> The stove nudge and other safety uses of casting live in `safety-wellness.md`; this
> playbook is about entertainment and the "one command" simplification.

---

## 1. Inventory the TV situation first

You can't automate what you haven't written down. For each TV in the house:

- [ ] **The TV itself**: brand and rough year, and whether it's a *smart* TV (Roku TV,
      Android/Google TV, LG webOS, Samsung Tizen, Fire TV) or a plain screen.
- [ ] **The boxes plugged in**: cable/satellite box, Apple TV, Roku stick, Chromecast/
      Google TV, DVD/Blu-ray, a soundbar.
- [ ] **Which input is what**: HDMI 1 = cable, HDMI 2 = Roku, etc. Write it on a sticky
      note behind the TV *and* here — you'll need it for the scenes.
- [ ] **Control type per device** — this decides everything:
      - **IP control** (over the network): smart TVs, Roku, Apple TV, Chromecast. HA
        controls these directly and reliably. Preferred.
      - **IR control** (infrared, like the physical remote): cable boxes, older TVs,
        many soundbars. HA needs a **Broadlink IR blaster** to "press" these buttons.
- [ ] **Casting target?**: is there a Chromecast/Android TV/Google TV that HA can cast
      photos and cards to? (§5). A cheap Chromecast dongle adds this to any HDMI TV.

---

## 2. Home Assistant integrations per brand

Add the right HA integration for each device (steps in `ha/README.md`; HA has 2,500+
integrations, `docs/DECISIONS.md` D2). Quick map:

| Device | HA integration | Notes |
|---|---|---|
| **Roku / Roku TV** | Roku | IP control, very reliable — inputs, apps, volume, power |
| **Android TV / Google TV** | Android TV | IP; app launching by package name; pair once |
| **LG webOS** | LG webOS Smart TV | IP; power-on may need "wake on LAN" enabled on the TV |
| **Samsung (Tizen)** | Samsung Smart TV | IP; older sets accept only limited commands |
| **Apple TV** | Apple TV | IP; pair with the on-screen code; good app control |
| **Chromecast / Google TV** | Google Cast | IP; the casting target for photos/cards (§5) |
| **Cable/satellite box, older TV, soundbar** | Broadlink (IR blaster) | You "teach" HA each button by pointing the old remote at the blaster (§4) |

- [ ] Add each device; confirm HA sees it as a `media_player` (or Broadlink `remote`).
- [ ] Test the basics from HA's own UI before building scenes: power, input, volume.

---

## 3. Build "one-command TV" scripts

This is the payoff. A single command should do the **whole sequence** a person does with
three remotes: turn on, switch input, launch the app or tune the channel, set a sensible
volume. Build these as **HA scripts** (`ha/README.md`); each becomes a voice command
(`tv-help` skill) *and* a kiosk button (§4 below).

Design them around what the elder actually watches. Examples:

- **"Watch the news"** → TV on → HDMI for the cable box → tune to their news channel (or
  launch the news app on a smart TV) → volume to a set comfortable level.
- **"Watch Jeopardy"** → TV on → correct input → the channel/app that carries it →
  volume set. (Referenced in the README and `docs/ARCHITECTURE.md` as the flagship
  example.)
- **"Watch church"** → TV on → cast the church-service stream (§5) → volume set.
- **"TV off"** → turn everything off (TV, box, soundbar) in one command — the elder
  never has to figure out *which* remote turns off *which* box.

Guidance:
- [ ] **Set an explicit volume**, don't assume the last one. "Loud from last night" is a
      classic complaint.
- [ ] **Make scripts idempotent-ish**: if the TV is already on, don't toggle it off.
      Use "turn on" (not "toggle") actions.
- [ ] **Name them the way they'd say them.** The voice command and the button label
      should match the elder's own words ("the news," "my game show").
- [ ] Keep the list **short** — five scenes they'll use, not twenty they won't.

---

## 4. The PWA TV page

The kiosk's TV page (`pwa/README.md`) is four giant buttons — a non-voice way to run the
scenes from §3. Map each button to one script:

- [ ] Pick the **four** most-used scenes (e.g. News, Their Show, Church, TV Off).
- [ ] Each big button triggers its HA script via the REST API (the mapping mechanism is
      in `pwa/README.md`).
- [ ] Label with the elder's words + an obvious icon; "TV Off" is always one of the
      four and always in the same corner.
- [ ] Test each button end to end from the tablet — a button that half-works (TV on but
      wrong input) is worse than none.

The voice path (`tv-help` skill, week 3) and these buttons trigger the *same* scripts,
so behavior is identical however they ask.

---

## 5. Casting uses (the TV as a second screen)

HA can cast to a Chromecast/Google TV (Google Cast). Beyond entertainment, the TV
becomes a big, across-the-room display:

- **Photos** — cast grandkids' photos, a slideshow (`memory-book.md` for where they
  live). A warm default idle screen.
- **Reminder cards** — a medication or appointment reminder shown *large* on the TV, not
  just the tablet — for the elder who's rarely near the kitchen counter
  (`medication.md`, `safety-wellness.md`).
- **Instruction cards** — "how to use the washing machine," cast step-by-step; pairs
  with the refill website walk-through (`medication.md`) and HomeBox manuals
  (`memory-book.md`).
- **Church-service stream** — the "watch church" scene (§3) casts the livestream URL.

- [ ] Confirm the cast target appears in HA and a test photo lands on the TV.
- [ ] Decide what shows when idle (blank, clock, or a family-photo slideshow).

---

## 6. The cable-box reality check

If there's a **cable or satellite box**, temper expectations — this is the fiddliest
part of the whole system.

- **IR is one-way and dumb.** The blaster can *send* "channel 5" but can't read what
  channel the box is on. If the box is already on channel 12, sending "5" may land on
  "512" depending on timing. Build **saved channel macros** (a scene per channel:
  correct digit sequence + Enter) and accept that they occasionally misfire.
- **"Watch the news" via cable = a macro**, not a clean app launch. It's the digit
  sequence for that channel, sent with small delays. Test it a few times; tune the
  delays if digits get dropped.
- **Position the IR blaster** with line of sight to the box's IR window. Behind-the-TV
  placement often works via bounce, but test.
- **Where possible, escape cable entirely.** If their news/shows are available on a Roku
  or Google TV app, an IP-controlled scene is far more reliable than IR channel macros.
  A $30–50 streaming stick can retire the flakiest part of the setup.

---

## 7. Simplification hardware (the non-tech backstop)

Automation should *reduce* remotes, but keep a dead-simple fallback for the day the hub
is down or the elder just wants to press a button in their hand:

- **A universal big-button remote** (large, few buttons, backlit) programmed for the TV
  and box. When voice mishears and the tablet is across the room, this always works —
  the same principle as the always-working Call button (`onboarding.md`).
- **Label the real remotes** you keep, and hide the ones you don't (the box's original
  remote with 60 buttons causes more panic than it solves).
- Goal: the elder has **one** simple remote and **one** tablet page, both doing the same
  few things, and neither depends on the other.
