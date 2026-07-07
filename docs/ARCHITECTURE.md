# Architecture

ElderAssist is a **hub-and-spoke** system. One always-on box in the elder's home runs
everything; every screen, speaker, and phone in the house is a thin client to it.
Nothing leaves the house unless a feature explicitly needs it (video calls, medication
ordering, family messaging), and every such egress is opt-in and documented.

```
                        ┌─────────────────────────────────────────────────┐
                        │                THE HUB (one box)                │
                        │  Linux mini-PC / old desktop / Mac / Windows    │
                        │                                                 │
   Voice satellites ───▶│  ┌───────────────┐      ┌────────────────────┐  │
   (HA Voice PE,        │  │ Home Assistant │◀───▶│  Ollama (local LLM)│  │
    old phone, PWA)     │  │  - Assist API  │      └────────────────────┘  │
                        │  │  - automations │      ┌────────────────────┐  │
   Kiosk PWA ──────────▶│  │  - dashboards  │◀───▶│ Wyoming services    │  │
   (tablet on kitchen   │  │  - casting     │      │  faster-whisper STT│  │
    counter, phones)    │  │  - VoIP        │      │  Piper TTS         │  │
                        │  └──────┬────────┘      │  openWakeWord      │  │
   Family, remotely ───▶│  ┌──────▼────────┐      └────────────────────┘  │
   (Signal/WhatsApp/    │  │ Hermes Agent   │      ┌────────────────────┐  │
    Telegram/email)     │  │  - memory      │◀───▶│ HomeBox (things)    │  │
                        │  │  - skills      │      │ Grocy (consumables)│  │
                        │  │  - scheduler   │      └────────────────────┘  │
                        │  └───────────────┘                               │
                        └─────────────────────────────────────────────────┘
                                   │ opt-in egress only
                                   ▼
                    Jitsi/Zoom calls · pharmacy sites · family chat apps
```

## The four layers

### 1. Automation hub — Home Assistant
Home Assistant (HA) is the deterministic core. Anything that MUST happen — a
medication reminder at 9:00, an escalation SMS to a daughter when a reminder is not
acknowledged — lives here as an automation, **not** inside an LLM. LLMs suggest;
HA executes on schedule.

HA also owns:
- **Voice pipeline (Assist)**: wake word → STT → intent/LLM → TTS, all local via the
  Wyoming protocol services below.
- **Casting**: Google Cast / DLNA to TVs (show the photo of the grandkids, show the
  "how to use the washing machine" card on the living-room TV).
- **TV & remote tasks**: integrations for Roku/Android TV/LG/Samsung/IR blasters
  (Broadlink) so "put on channel 5" / "switch to the DVD input" are voice commands.
- **VoIP**: the HA VoIP integration can ring and answer an analog/SIP phone.
- **Presence & safety hooks**: door sensors, "no motion by 10am" wellness checks.

### 2. Local model plane — Ollama + Wyoming services
- **Ollama** serves the local LLM (default: an 8B-class instruct model; the compose
  file lets you swap models freely). Used by both HA Assist ("conversation agent")
  and Hermes.
- **faster-whisper** (Wyoming) for STT, **Piper** (Wyoming) for TTS,
  **openWakeWord** for the wake word. All local, all CPU-capable, GPU-accelerated
  when available.
- Piper upstream was archived in Oct 2025 but remains the HA-blessed default and is
  continued as `OHF-Voice/piper1-gpl`; the compose file pins the maintained image.

### 3. Agent layer — Hermes Agent (NousResearch, MIT)
Hermes is the *conversational brain with hands*: persistent memory, a self-improving
skills system, a natural-language cron scheduler, MCP client support, and — the killer
feature for this use case — one agent simultaneously reachable over **Signal,
WhatsApp, Telegram, email, and the web**, with shared memory across all of them.

That means:
- The elder talks to it by voice (through HA) or the kiosk PWA.
- The **family talks to the same agent remotely** ("did mom take her meds today?",
  "add her cardiologist appointment next Tuesday", "what's the dishwasher's model
  number? it's leaking").
- Hermes uses HA's REST/WebSocket API (and the HA MCP server) as its actuator: it can
  create reminders, cast to the TV, check sensors.
- Hermes's memory is the **household memory book**: names, routines, preferences,
  where the spare key is, which remote controls which device.

Hermes can run against local Ollama for full privacy, or a hosted API for more
capability — per-family choice, documented trade-off.

### 4. Records layer — HomeBox + Grocy
- **HomeBox**: durable goods — appliances, serial numbers, warranties, manuals
  (PDF attachments), purchase receipts, QR labels. This is the "what is this thing
  and who fixes it" database.
- **Grocy** (optional profile): consumables — groceries and **medication stock**
  (open-package tracking, due dates), chores.
- Hermes gets read/write access to both via their REST APIs, so "what's the serial
  number of the fridge?" works by voice.

## Elder-facing surfaces

| Surface | What it is | Runs on |
|---|---|---|
| **Kiosk PWA** | This repo's `pwa/` — 6 giant buttons (Call Family, My Medicine, Today, Get Help, TV, Find My Things), voice-first, senior-legible typography | Kitchen tablet, Android/iPhone home screen |
| **Voice satellites** | HA Voice Preview Edition puck (~$60), or a Wyoming satellite on any old phone/Pi | Each room |
| **The TV** | HA casts dashboards, photos, step-by-step instruction cards | Existing Chromecast/Android TV |
| **The phone they already have** | Signal/WhatsApp chat with Hermes; big-icon launcher recommended | Their phone |

## Feature map (requirement → mechanism)

| Requirement | How it's delivered |
|---|---|
| Medication reminders + escalation | HA blueprint: announce on speakers + TV + PWA, require acknowledgment, escalate to caregiver via Signal/SMS after N minutes |
| Medication ordering | Playbook + Hermes skill: refill checklist, pharmacy autodial/site walk-through; human-in-the-loop (agent never orders unattended) |
| Appointments | CalDAV calendar in HA (local Radicale or family Google/Nextcloud), day-before + morning-of announcements, family can add via Hermes chat |
| "Remind me …" | Voice intent → HA todo/scheduler; Hermes NL cron for fuzzy ones ("every second Tuesday") |
| Calling people / Zoom | One-tap Jitsi rooms per family member from the PWA; Zoom deep links (`zoommtg://`) for external parties; HA VoIP for POTS-style calls |
| Texting | Elder dictates to Hermes → Hermes sends via Signal/WhatsApp bridge to the right person |
| GPS / find them | Opt-in: HA Companion app location on their phone, geofence alerts to family; documented consent process |
| Instructions for stuff | HomeBox manuals + Hermes "explain step by step" skill + cast instruction cards to TV |
| Appliance/serial/warranty list | HomeBox, seeded by photographing rating plates; Hermes answers queries by voice |
| Cast onto TVs | HA Google Cast: photos, dashboards, reminder cards, YouTube how-tos |
| TV/cable remote help | HA media_player + Broadlink IR; "Assist" voice commands; PWA TV page with 4 giant buttons |
| Streaming setup help | Playbook + HA scripts: "watch Jeopardy" = input switch + app launch as one command |
| Forgetfulness support | Hermes persistent memory + daily rhythm announcements + "where did I put" note-taking skill |
| Wellness/safety | No-motion-by-morning check, door-left-open, stove-timer patterns (blueprints) |
| Reading labels & expiry dates | Local vision model (Ollama VLM): kiosk "Read This For Me" camera page or photo via Hermes chat; user-initiated photos only — no passive cameras |
| Food inventory | Grocy stock + photo-assisted entry ("what's in this can, when does it expire") |
| Find keys/wallet | BLE trackers that beep on command via HA (ESPHome Bluetooth proxy + HA-compatible tags), giant buttons on the Find My Things page |
| Weather guidance | Elder-specific weather automations: heat-risk and ice warnings, storm prep, weather-aware morning brief |
| Bills | Photograph bill → vision model extracts payee/amount/due date → confirmed calendar reminder + family visibility; never pays autonomously |
| "Is this a scam?" | Hermes scam-check skill: read/photograph the mail, text, or caller story → red-flag analysis, plain-words verdict, one-tap family loop-in; advice-only |
| Local resources | Hermes search anchored to home area: senior services, meal delivery, rides, handymen within X miles (labeled egress) |
| Seasonal chores & projects | Vendor registry + seasonal/weather-triggered reminders (snow forecast → plow arrangement, mowing, gutters, furnace filters) tracked as HA todos |

## Trust & privacy model

- **Default-local**: STT, TTS, wake word, LLM, automations, inventory — all on the hub.
- **Explicit egress**: each cloud touchpoint (Zoom, WhatsApp, pharmacy, hosted LLM) is
  a labeled toggle with its own doc section; none are required for core operation.
- **The elder is not the admin**: caregiver holds admin creds; elder surfaces are
  PIN-less and driven by a long-lived HA token for a **non-admin** user (cannot
  change config/users). NOTE: HA tokens are **not** entity-scoped — that token can
  still call any service on any entity via the REST API, so the real mitigation is
  keeping dangerous actuators (locks, garage doors, alarm panels) off this HA
  instance, and treating the tablet like a house key.
- **Consent first**: location tracking, camera use, and conversation memory are
  family conversations before they are config flags. `docs/playbooks/onboarding.md`
  includes a consent checklist.
- **Single-elder assumption (v1)**: each install targets **one primary elder user**;
  a couple sharing one tablet can't be told apart for medication acks or greetings
  (use a separate tablet/HA user per person). Multi-elder support is a roadmap item.
- **No medical decisions**: the assistant reminds and records; it never advises on
  dosage or diagnosis. Guardrails live in the Hermes persona and skill prompts.
- **Hub-down watchdog**: no in-HA automation can report that the hub itself is dead, so
  we recommend an external dead-man's-switch heartbeat (healthchecks.io or self-hosted)
  that alerts the caregiver if pings stop — shipped commented in the HA package
  (`docs/playbooks/safety-wellness.md` §9).

## Hardware guidance

| Tier | Hardware | What you get |
|---|---|---|
| Minimum | Any x86 box, 8 GB RAM (old desktop/NUC) | HA + Wyoming STT/TTS + HomeBox; small LLM (3B) is slow-but-usable; or point Hermes at a hosted API |
| Recommended | Mini-PC 16 GB (Beelink/NUC) or M-series Mac mini | Whole stack incl. 8B LLM at conversational speed |
| Comfortable | Anything + used RTX 3060 12 GB | Sub-second voice round-trips, larger models |
| Satellites | HA Voice PE ($59), old Android phones, Pi Zero 2 + mic | One per room |

OS support: Linux is first-class (everything via Docker Compose). macOS and Windows
run the same compose stack via Docker Desktop; `setup.ps1` / `setup.sh` handle the
differences. Hermes installs natively on all three.

## What we deliberately did NOT build

- **A custom LLM harness** — Hermes already has memory/skills/channels/scheduler with
  a huge community; forking a fast-moving 180k-star project would strand us.
- **A custom inventory app** — HomeBox/Grocy are mature; we integrate.
- **A custom voice pipeline** — HA Assist + Wyoming is the ecosystem standard.
- **Camera-based fall detection** — high stakes, high false-alarm cost, privacy-heavy;
  out of scope v1 (see `docs/ROADMAP.md`).

This repo is therefore *glue and opinion*: compose files, HA blueprints, Hermes skills,
the kiosk PWA, and battle-tested playbooks — not another platform.
