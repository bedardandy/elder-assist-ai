# ElderAssist AI

**A private, open-source AI assistant for elderly family members — running on hardware
you own, speaking their language, remembering what they can't.**

One box in the house runs a local voice assistant (wake word → speech-to-text → local
LLM → text-to-speech), a real automation engine for the things that must never be
missed (medication, appointments, wellness checks), a household memory book
(appliances, serial numbers, warranties, manuals, routines), and an agent the whole
family can reach from Signal/WhatsApp/Telegram. The elder gets six giant buttons and
a voice. Nothing leaves the house unless you switch it on.

## What it does

- 💊 **Medication reminders that escalate** — announced on speakers, TV, and tablet;
  if not acknowledged, a caregiver gets a message.
- 📅 **Appointments** — family adds them from anywhere by chatting with the agent;
  the house announces them the day before and the morning of.
- ⏰ **"Remind me…"** — by voice, for anything, including fuzzy schedules.
- 📞 **One-tap calling** — video call each family member with a single giant button
  (Jitsi), Zoom deep links for the doctor's telehealth, help texting by dictation.
- 📺 **TV without the remote maze** — "put on Jeopardy" as one voice command; giant
  TV buttons in the app; instruction cards cast onto the TV screen.
- 🧠 **The memory book** — every appliance with photo, serial number, warranty and
  manual; "where did I put the spare key"; who came to fix the furnace and when.
- 🗣️ **Ask anything** — a local LLM answers questions, explains steps patiently, and
  never gets tired of repeating them.
- 🛰️ **Family co-pilot** — the same agent, same memory, reachable by the family over
  the chat apps they already use.

## The stack (all open source)

| Layer | Component | Why |
|---|---|---|
| Automation hub | [Home Assistant](https://www.home-assistant.io/) | Reminders, casting, TV control, voice pipeline, 2,500+ integrations |
| Voice | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) · [Piper](https://github.com/OHF-Voice/piper1-gpl) · [openWakeWord](https://github.com/dscripka/openWakeWord) via [Wyoming](https://github.com/rhasspy/wyoming) | Fully local STT/TTS/wake word |
| Local LLM | [Ollama](https://ollama.com/) | Local models on Linux/macOS/Windows |
| Agent | [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Persistent memory, skills, scheduler, Signal/WhatsApp/Telegram/email gateway |
| Memory book | [HomeBox](https://github.com/sysadminsmedia/homebox) (+ optional [Grocy](https://github.com/grocy/grocy)) | Appliances/serials/warranties (+ meds & grocery stock) |
| Elder UI | `pwa/` (this repo) | Six giant buttons, voice-first, installs on Android/iPhone/tablets |

Why these and not others — including why we did **not** fork an existing project —
is documented in [docs/DECISIONS.md](docs/DECISIONS.md). The full design is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

```bash
git clone https://github.com/bedardandy/elder-assist-ai
cd elder-assist-ai
./setup.sh          # Linux/macOS  (Windows: .\setup.ps1)
```

The setup script checks Docker, writes your `.env`, and brings up the core stack.
Then follow [docs/INSTALL.md](docs/INSTALL.md) for the 30-minute guided setup
(voice, TV, family channels) and [docs/playbooks/onboarding.md](docs/playbooks/onboarding.md)
for the human side — consent, expectations, and the first week.

**Hardware:** an old desktop or a ~$300 mini-PC with 16 GB RAM runs everything,
LLM included. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#hardware-guidance).

## Repository layout

```
docker/          Compose stack (profiles: core, voice, inventory, grocy, openwebui)
ha/              Home Assistant blueprints, packages, elder dashboard
hermes/          Hermes Agent workspace: persona, elder-care skills, channel setup
pwa/             The big-button kiosk app (no build step, static files)
docs/            Architecture, decisions, install, threat model
docs/playbooks/  Medication · calling & video · TV & casting · memory book ·
                 onboarding · safety & wellness
```

## Principles

1. **Local by default, egress by choice.** Every cloud touchpoint is a labeled toggle.
2. **The LLM never owns a deadline.** Anything that must happen is a Home Assistant
   automation; the LLM converses, remembers, and *creates* automations.
3. **The elder is the user, not the admin.** Caregivers hold the keys; the elder's
   surfaces are simple, PIN-less, and capability-scoped.
4. **Consent before telemetry.** Location, cameras, and memory are family
   conversations first (see the onboarding playbook).
5. **Glue, don't fork.** We ride mature upstreams and keep our customization in
   overlays that survive their releases.

## Status

Early but battle-tested on paper: the design went through adversarial review
(security/privacy, elder UX, failure modes) documented in
[docs/WARGAME.md](docs/WARGAME.md). Configs are CI-validated. Treat it as a strong
starting kit, not a product with a support contract.

## License

MIT — see [LICENSE](LICENSE).
