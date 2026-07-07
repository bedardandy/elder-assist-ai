---
name: daily-rhythm
description: Morning brief and evening wind-down, announced through HA
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, routine, cron, home-assistant, tts]
    category: elder-assist
required_environment_variables:
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: reading calendar/meds and TTS announce
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: reading calendar/meds and TTS announce
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: the brief wording
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the weekly family summary
    required_for: weekly summary
---

# Daily Rhythm

## When to use
Runs on a schedule (set up once, below): a gentle **morning brief** and an **evening
wind-down**, plus a **weekly family summary**. Also usable on demand ("what's my day
look like?").

## Scheduling (Hermes cron — set these up once)
The rhythm is conversational, so the *cadence* is a Hermes cron; but every consequential
item it mentions (appointments, meds) already lives in HA per DECISIONS.md D10 — this
skill reads and announces them, it does not own them.

Create the jobs (natural language works; exact expressions shown for reliability):
```
hermes cron create "0 8 * * *"  "Run the daily-rhythm morning brief for ${ELDER_NAME}" --skill daily-rhythm
hermes cron create "0 20 * * *" "Run the daily-rhythm evening wind-down for ${ELDER_NAME}" --skill daily-rhythm
hermes cron create "0 18 * * 0" "Run the daily-rhythm weekly family summary" --skill daily-rhythm --deliver ${CAREGIVER_CHANNEL}
```
(If your version phrases delivery differently, check `hermes cron --help`; NL form:
`/cron add "every morning at 8am" "morning brief ..."`.) Announcements to the elder go
through HA TTS regardless of the cron delivery target.

## Morning brief (≈08:00)
Assemble four short pieces, then announce ONE flowing, warm, short-sentence message.
1. **Weather** — read an HA weather entity:
   `ha_get_state("weather.home")` or
   `curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/states/weather.home"`.
   Say it plainly: "It'll be sunny and mild today."
2. **Appointments today** — read the calendars (same ones the PWA uses,
   `calendar.family`, `calendar.appointments`):
   ```bash
   curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" \
     "${HA_URL}/api/states/calendar.appointments"
   ```
   Mention only today's, with times: "You see Dr. Lee at 2 o'clock this afternoon."
3. **Meds count** — read the acknowledgment/schedule helper (do NOT advise on the meds,
   AGENTS.md §3.1): `ha_get_state("input_boolean.medication_acknowledged")` and the
   family's schedule. Say the plan, not advice: "You have your morning pill at 8, and
   your evening pill at 7." Never "you should take" beyond stating the scheduled time.
4. **One gentle memory prompt** — a single, kind recall nudge drawn from memory:
   "Emily's birthday is Thursday — want me to help you send a note later?"

Announce via HA TTS to the speaker/room (service name varies by HA setup — confirm with
`ha_list_services`; common options are `tts.speak`, `assist_satellite.announce`, or a
family `script.morning_announce`):
```bash
curl -fsS -X POST "${HA_URL}/api/services/tts/speak" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"tts.piper",
       "media_player_entity_id":"media_player.kitchen_speaker",
       "message":"Good morning, ${ELDER_NAME}. It will be sunny today. You see Dr. Lee at 2 o clock. Your morning pill is at 8. And Emily s birthday is Thursday."}'
```
If `tts.speak` isn't available, fall back to the family's announce script:
`curl -fsS -X POST "${HA_URL}/api/services/script/morning_announce" -H "Authorization: Bearer ${HA_TOKEN}"`.

## Evening wind-down (≈20:00)
1. **Tomorrow preview** — read the calendars for tomorrow's items; mention them softly:
   "Tomorrow is quiet — just your walk in the morning."
2. **Door / lock checklist** — trigger the family's HA wind-down script (which checks or
   reminds about doors/locks; it may announce or just verify sensors):
   ```bash
   curl -fsS -X POST "${HA_URL}/api/services/script/evening_wind_down" \
     -H "Authorization: Bearer ${HA_TOKEN}"
   ```
   Or read a door sensor and gently prompt if open:
   `ha_get_state("binary_sensor.front_door")` -> if "on"/open, "Your front door looks
   open — would you like to check it before bed?"
3. Announce a short, calm goodnight via the same TTS call as the morning brief.

## Weekly family summary (≈Sunday 18:00, to ${CAREGIVER_CHANNEL})
Compile the week for the caregivers (efficient tone, facts):
- **What was missed** — meds unacknowledged, appointments not confirmed, escalations you
  raised (pull from memory + HA history where available).
- **What's ahead** — next week's appointments and any refills the medication-refill skill
  flagged.
- **Anything notable** — repeated confusion, a new person met, a house fact learned.
Deliver to the family channel (the cron `--deliver ${CAREGIVER_CHANNEL}` handles routing;
or use the messaging/notify tool):
> "${ELDER_NAME} — week of Jul 1–7: meds acknowledged 19/21 (missed Tue pm, Fri am,
>  both re-announced). Ahead: cardiologist Thu 2pm; lisinopril refill prep ready for
>  your OK. Note: mentioned the furnace being loud — logged in HomeBox."

## Pitfalls
- Never turn the meds count into medical advice — state scheduled times only.
- Keep the elder announcements SHORT; a long brief is noise. One breath's worth.
- If HA is unreachable at brief time, don't fabricate — skip gracefully and, if it
  persists, tell ${CAREGIVER_CHANNEL} the house system was down.
- TTS/announce service names differ across HA installs — verify with `ha_list_services`
  rather than assuming `tts.speak` exists.

## Verification
Confirm the announce service returned success and, for the weekly summary, that delivery
to ${CAREGIVER_CHANNEL} succeeded. Spot-check that the calendar/meds values you read are
today's/tomorrow's, not stale.
