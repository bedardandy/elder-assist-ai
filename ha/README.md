# ElderAssist — Home Assistant layer

This directory is the deterministic core of ElderAssist: the automations that
**must never be missed** (medication, appointments, wellness), the shared
helpers/scripts/voice-intents they rely on, the custom voice sentences, and the
big-button wall-tablet dashboard.

> Design rule (see `../docs/DECISIONS.md` D10): **the LLM never owns a deadline.**
> Everything here runs in Home Assistant on a schedule; Ollama/Hermes only
> converse, remember, and *create* these automations.

```
ha/
├── blueprints/automation/elder_assist/   # importable, reconfigurable automations
│   ├── medication_reminder.yaml          #   flagship: announce → wait → escalate
│   ├── appointment_reminder.yaml         #   evening-before + morning-of
│   ├── wellness_check.yaml               #   "no motion by 10am" → caregiver
│   ├── door_left_open.yaml               #   door open too long → nudge
│   └── stove_timer_nudge.yaml            #   appliance on too long → nudge
├── packages/elder_assist.yaml            # helpers + scripts + voice intent_script
├── custom_sentences/en/elder_assist.yaml # what the elder can say
└── dashboards/elder_dashboard.yaml       # wall-tablet + caregiver Lovelace views
```

Everything targets **current Home Assistant (2026.x)** using the modern
`triggers:` / `conditions:` / `actions:` automation syntax and `action:` service
calls.

---

## Assumptions about the compose stack

These files are written for the `docker/` compose stack in this repo. Where a
name matters, we assume:

| Thing | Assumed value | Where set |
|---|---|---|
| HA compose service name | `homeassistant` | `docker/compose*.yaml` |
| HA config location | a named volume mounted at `/config` in the container | compose |
| Whisper (STT) Wyoming | host `whisper`, port `10300` | `voice` profile |
| Piper (TTS) Wyoming | host `piper`, port `10200` | `voice` profile |
| openWakeWord Wyoming | host `openwakeword`, port `10400` | `voice` profile |
| Ollama | host `ollama`, port `11434` | `core`/LLM profile |

If your service/host names differ, substitute them wherever they appear below.
(The `docker/` layer is authored separately; if a name here disagrees with it,
the compose file wins — update the Wyoming host/port when you add the integration.)

---

## 1. Install the package (helpers, scripts, voice intents)

The package creates the input helpers, scripts, the announce group and the
`intent_script` handlers in one file.

```bash
# From the repo root, copy into the running HA container's /config:
docker compose cp ha/packages/elder_assist.yaml \
  homeassistant:/config/packages/elder_assist.yaml
```

(No `packages/` dir yet? `docker compose exec homeassistant mkdir -p /config/packages`
first. Or use the **File Editor** / **Studio Code Server** add-on and paste the
file in.)

Then enable packages **once** in `configuration.yaml`:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

**While you're editing `configuration.yaml`, add the kiosk CORS block.** The PWA is
served from a different origin (`http://<hub-ip>:8880`), so HA must be told to accept
its cross-origin API calls. This **must** live in the top-level `configuration.yaml` —
**not** in this package (packages cannot merge the `http:` key):

```yaml
http:
  cors_allowed_origins:
    - http://<hub-ip>:8880          # e.g. http://192.168.1.10:8880
    - http://homeassistant.local:8880
    # add your Tailscale hostname here too if you use it
```

Without it, **every** PWA API call fails with a CORS error and the elder sees the
friendly "can't reach the house computer" banner. (Do not add `use_x_forwarded_for` /
`trusted_proxies` unless HA actually sits behind a reverse proxy — see `pwa/README.md`.)

**Before restarting, edit `elder_assist.yaml`** — search for `# EDIT` and set:
- `group.elder_announce_targets` → your real `media_player.*` speakers.
- `tts.piper` in `script.elder_announce` → your TTS engine entity (see step 3).

Restart Home Assistant (Developer Tools → YAML → *Restart*, or
`docker compose restart homeassistant`).

Create the **Reminders to-do list** (the package can't): Settings → Devices &
Services → **Add Integration** → *Local To-do* → name it `Reminders` →
yields `todo.reminders`.

---

## 2. Add the custom sentences

```bash
docker compose exec homeassistant mkdir -p /config/custom_sentences/en
docker compose cp ha/custom_sentences/en/elder_assist.yaml \
  homeassistant:/config/custom_sentences/en/elder_assist.yaml
```

Restart HA. The matching handlers are already in the package's `intent_script:`.

---

## 3. Wire the voice pipeline (Assist)

1. **Add the Wyoming services.** Settings → Devices & Services → **Add
   Integration** → *Wyoming Protocol*, once per service:
   - `whisper:10300` (speech-to-text)
   - `piper:10200` (text-to-speech)
   - `openwakeword:10400` (wake word)
   Note the TTS entity Piper creates (usually `tts.piper`) and put it in the
   `# EDIT` spot in the package and in each blueprint's *Text-to-speech engine*.

2. **Add Ollama as the conversation agent.** Settings → Devices & Services →
   **Add Integration** → *Ollama* → URL `http://ollama:11434`, pick your model.

3. **Build the Assist pipeline.** Settings → Voice assistants → *Add assistant*:
   - Conversation agent: **Ollama** (your model).
   - **Prefer handling commands locally: ON.** This makes HA try its own intent
     engine (your custom sentences + built-in intents) *first*, so "I took my
     pills" and "remind me to … in 10 minutes" resolve instantly and offline,
     and only open-ended questions fall through to the LLM.
   - Speech-to-text: **faster-whisper**. Text-to-speech: **Piper**.
   - Wake word: **openWakeWord**.

4. **Expose entities to Assist.** Settings → Voice assistants → *Expose* → add
   the media players, the `input_boolean.medication_acknowledged*`,
   `input_button.i_am_ok`, and any lights/TV you want voice control of. (The
   custom-sentence intents work regardless, but exposing entities lets the LLM
   act on them too.)

---

## 4. Import the blueprints

Blueprints are the distribution format — one import, then create one automation
per medication / door / appliance, reconfiguring inputs per family.

**Option A — from file (these live in your repo/config):**
```bash
docker compose exec homeassistant mkdir -p \
  /config/blueprints/automation/elder_assist
docker compose cp ha/blueprints/automation/elder_assist/. \
  homeassistant:/config/blueprints/automation/elder_assist/
```
Restart or reload automations. They appear under Settings → Automations →
Blueprints.

**Option B — import by URL** (after pushing to GitHub): Settings → Automations →
Blueprints → **Import Blueprint** → paste the raw GitHub URL of the `.yaml`.

Then **Settings → Automations → Create Automation → Use Blueprint**, pick e.g.
*ElderAssist — Medication reminder (escalating)*, and fill in the inputs. Use a
**separate `input_boolean` per medication** (the package ships two:
`medication_acknowledged` and `medication_acknowledged_2`).

---

## 5. Add the dashboard

```bash
docker compose exec homeassistant mkdir -p /config/dashboards
docker compose cp ha/dashboards/elder_dashboard.yaml \
  homeassistant:/config/dashboards/elder_dashboard.yaml
```

Register it in `configuration.yaml`:

```yaml
lovelace:
  dashboards:
    elder-dashboard:
      mode: yaml
      title: ElderAssist
      icon: mdi:account-heart
      show_in_sidebar: true
      filename: dashboards/elder_dashboard.yaml
```

Edit the `# EDIT` entity_ids in the dashboard (media players, TV, weather,
calendar, and the `notify.notify` placeholder → your caregiver notify service),
then restart HA. The dashboard URL path is
`/elder-dashboard` — the same `dashboard_path: elder-dashboard` used by
`script.elder_cast_instruction` / `cast.show_lovelace_view`.

---

## 6. Create the elder user + long-lived token

The elder's surfaces run as a **non-admin** user (see `../docs/ARCHITECTURE.md`
trust model), not the admin account. NOTE: HA tokens are **not** entity-scoped —
non-admin only prevents config/user changes; the token can still call any service on
any entity via the REST API. Keep dangerous actuators (locks, garage doors, alarm
panels) off this HA instance (or on a separate instance this token can't reach).

1. Settings → People → **Add user** → name "Elder", **Administrator: OFF**.
2. Log in *as that user* → click the user profile (bottom-left) → Security →
   **Long-lived access tokens** → *Create Token* → name it "kiosk-pwa".
3. Copy the token into the PWA / kiosk config (see `../pwa/`). This token drives
   the tablet and any Wyoming satellites, and is what Hermes should *not* use —
   Hermes gets its own token/user.

---

## 7. Finding things: Bluetooth trackers

The Find My Things page has big per-item "Make my keys beep" buttons that call
`script.find_keys` / `script.find_wallet` (in the package). Those scripts work
the moment you install the package — they **announce** ("Ringing your keys
now — listen!") and, if the elder has told the house where the keys are (the
"I put the keys on the counter" note), they **speak that last-seen spot** as a
fallback. To make a physical tag actually *ring*, add the hardware below and
wire one ring action into the script's `# EDIT` block.

### Why this hardware (see `../docs/DECISIONS.md` D12)
- **AirTags can't be rung from Home Assistant** — they're locked to Apple's
  network; HA can neither trigger their chime nor read them. Tile's third-party
  API is closed/deprecated. So we don't use either.
- **HA-ringable tags:** Bluetooth tags HA can chime on demand — Chipolo's
  "works with Home Assistant" models and **Pebblebee** are the easy path;
  cheap iBeacon-class tags with a ring characteristic also work.
- **ESPHome Bluetooth proxy:** a ~$5 ESP32 flashed as a
  [Bluetooth proxy](https://esphome.io/components/bluetooth_proxy.html) extends
  HA's Bluetooth range into every room. Put **one per room where things go
  missing** (kitchen, hallway, bedroom); they double as presence sensors.

### Setup (pointer level)
1. **Flash a Bluetooth proxy.** Follow the ESPHome
   [Bluetooth proxy guide](https://esphome.io/components/bluetooth_proxy.html)
   (or install the ready-made *ESPHome Bluetooth Proxy* project from
   [esphome.io/projects](https://esphome.io/projects/)). Adopt it in HA; the
   [Bluetooth integration](https://www.home-assistant.io/integrations/bluetooth/)
   picks it up as a remote adapter. One per key room.
2. **Add the tag.** Pair/adopt the Chipolo/Pebblebee tag so it shows up as a
   device in Settings → Devices & Services.
3. **Find the ring entity.** On the tag's device page, look for a **button**
   entity that rings it (e.g. `button.chipolo_keys_ring`) — that's the one to
   press. (A DIY ESP32 finder exposes an `esphome.*` service instead.)
4. **Wire it in.** In `packages/elder_assist.yaml`, uncomment the matching
   `# EDIT` line in `script.find_keys` (and `find_wallet`) and set the entity /
   service to yours. Restart or reload scripts.

### Fallbacks
- **RSSI last-seen:** even without a ring, a BLE tag heard by a proxy gives a
  rough "last seen in the kitchen" — expose the tag's signal/area as a sensor
  and add it to the dashboard for a graceful degrade.
- **Zero-hardware baseline:** the "I put the keys on the counter" /
  "where did I put the keys" voice notes need no tags at all — and the finder
  scripts already speak that note when a tag can't be heard.

The PWA's Find My Things buttons simply call these two scripts over HA's REST
API, so the elder's experience is one giant button per item.

## 8. Weather & seasonal

Two blueprints add elder-specific weather awareness and recurring seasonal
nudges. **Prerequisite:** any weather integration providing a `weather.*`
entity — the built-in **[Met.no](https://www.home-assistant.io/integrations/met/)**
ships with Home Assistant and needs only your location, so there's nothing to
install.

- **ElderAssist — Weather guardian (`weather_safety.yaml`)** — a morning
  forecast check (default 07:30) plus a live severe-weather trigger. It reads
  the daily forecast via `weather.get_forecasts` and speaks plain-words
  guidance: **heat** days (drink water, avoid midday sun, keep the AC on →
  announce + notify caregiver), **ice/freeze** ("the sidewalk may be icy, don't
  go out for the mail until it warms" → announce), and **snow** in the forecast
  (announce + notify caregiver + fire an event — see below).
- **ElderAssist — Seasonal chore reminder (`seasonal_chore_reminder.yaml`)** —
  one automation per recurring chore: pick the months and day, and it announces,
  optionally notifies, and optionally adds the chore to a to-do list
  (`todo.add_item`). Examples: gutters (Oct), furnace filter (quarterly), smoke-
  detector batteries (Mar + Nov), snow-plow contract (Oct), mowing contract
  (Apr). Point its **To-do list** input at `todo.projects` (create a second
  Local To-do list named *Projects* — see the package's to-do guidance note).
  Note: a monthly chore whose last item was never checked off may be added
  twice; that's accepted (just delete the extra).

### Event contract: `elder_assist_snow_forecast`
When the weather guardian sees snow, it fires a Home Assistant **event** so any
downstream flow (a Hermes seasonal-chores automation, another blueprint, a
notification) can react — e.g. arrange the plow / shoveling:

```yaml
event_type: elder_assist_snow_forecast
event_data:
  weather_entity: weather.home     # the entity that saw snow
  condition: snowy                 # forecast/current condition string
  forecast_low: -2                 # today's low, or null if unavailable
  forecast_high: 1                 # today's high, or null if unavailable
  source: morning                  # "morning" | "severe" (which trigger fired)
```

To react, add an automation with an **Event** trigger on
`event_type: elder_assist_snow_forecast`. (The seasonal_chore_reminder
blueprint itself runs on the calendar; this event is the *weather-driven* path.)

## 9. Test checklist

Say each phrase to a voice satellite (after the wake word) and confirm the
behavior. Where it matters, watch **Developer Tools → States** / the automation
traces.

| Say / do | Expect |
|---|---|
| "remind me to take the bins out in 2 minutes" | Confirms aloud; ~2 min later announces "Reminder: take the bins out." on the speakers. |
| "I took my pills" | Confirms aloud; `input_boolean.medication_acknowledged` turns **on**. |
| "I put the keys on the counter" | Confirms "your keys is on the counter"; `input_text.last_thing_put_away` = keys, `…_location` = "on the counter". |
| "where did I put the keys" | Speaks back "You put the keys on the counter." |
| "I'm okay" | Confirms; `input_button.i_am_ok` press event fires. |
| Med automation dose time (set one 2 min out to test) | Speakers announce "It's time to take …". If a phone is configured, an actionable push arrives. |
| …then **do nothing** for the grace period | Announces once more and the escalation `notify.*` fires; `counter.reminders_missed` +1. |
| …then **say "I took my pills"** within grace | No escalation; the boolean **stays ON** so "taken today" persists on the PWA/dashboard. It is reset at the start of the next dose's run, not right after the ack. |
| Open a configured door and leave it | After the threshold, "The front door has been open for N minutes." |
| Appointment automation morning/evening time | Speaks today's / tomorrow's appointments from the calendar (or "no appointments"). |
| Tablet: tap **Call for help** | Caregiver `notify.*` receives "Help requested". |
| Tablet: tap **I'm OK** | `input_button.i_am_ok` press fires (satisfies the wellness check). |
| Tablet: tap **Find my keys** (Find My Things) | Speakers announce "Ringing your keys now — listen!"; if a "where are the keys" note exists, it's spoken; if a tag ring is wired in, the tag beeps. |
| Weather guardian morning check on a hot day (set threshold below the forecast high to test) | Speakers announce the heat-safety guidance; caregiver `notify.*` gets a heat warning. |
| Weather guardian on a freezing / snowy day | Freezing → "the sidewalk may be icy…" announcement. Snow → snow announcement + caregiver notify + an `elder_assist_snow_forecast` event fires (watch Developer Tools → Events, listen for the type). |
| Seasonal chore on its configured day/month (set today's date to test) | Speakers announce the chore; caregiver `notify.*` gets it; if a to-do list is set, the item appears on `todo.projects`. |

### Two-medication voice acks
The **generic** phrase — "I took my medicine/pills" (and "I took my *morning*
pills") — acknowledges **medication 1** (`input_boolean.medication_acknowledged`).
For a two-medication regimen, say "I took my **evening**/night pills" (or "I took my
**second** medicine") to acknowledge **medication 2**
(`input_boolean.medication_acknowledged_2`), or just use the tablet tile for the
right medication. There is no way to tell two people apart by voice — see the
single-elder note in `docs/playbooks/onboarding.md`.

### Notes on the acknowledgment paths
The medication blueprint's **guaranteed** acknowledgment is the `input_boolean`,
which the voice intent and the dashboard tile both flip for *that specific
medication*. The push notification's **"I took it"** button uses a shared action
id (`ELDER_MED_ACK`); if you run several medication automations whose grace
windows overlap, prefer voice or the dashboard tile for exact per-med accuracy,
and give each medication its own `input_boolean`.
