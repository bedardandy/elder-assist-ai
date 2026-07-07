---
name: remind-me
description: Turn fuzzy reminder requests into real HA or cron entries
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, reminders, home-assistant, scheduling]
    category: elder-assist
required_environment_variables:
  - name: HA_URL
    prompt: Home Assistant base URL
    help: e.g. http://homeassistant.local:8123 (same as HASS_URL)
    required_for: creating durable reminders
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token (restricted user)
    help: HA profile -> Security -> Long-lived access tokens
    required_for: creating durable reminders
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: confirmations
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for caregiver notices
    required_for: escalation of consequential items
---

# Remind Me

## When to use
Someone (the elder or a family member) asks you to remember/remind about anything:
"remind me to take my pills", "every second Tuesday call the pharmacy", "when I wake
up tell me to water the plants", "the cardiologist is next Thursday at 2".

## The one rule that governs this skill (DECISIONS.md D10)
**You never own a deadline.** If missing it has any consequence, it must live in Home
Assistant, not in your memory and not only in chat. You *create* the durable entry;
HA is the runtime. Only truly soft, conversational nudges may live as a Hermes cron.

## Step 1 — Understand the fuzzy time
Parse the natural-language time into a concrete schedule before doing anything.
- Resolve relative words against the elder's timezone (the hub's TZ). "tonight" =
  today ~19:00 unless they gave a time; "in the morning" = ~08:00; "next Thursday" =
  the coming Thursday's date.
- Recurring phrases: "every second Tuesday" -> monthly, 2nd Tuesday; "every day",
  "weekdays", "every 2 hours". Keep the cron expression for Step 3.
- Event-relative ("when I wake up", "after breakfast") has no clock time: either map to
  the household's known routine time from memory (e.g. wake ~ 07:30) OR make it a
  conversational cron that fires at the routine time. If you cannot pin a time, ASK ONE
  short question: "About what time do you usually wake up?"
- If anything is ambiguous, confirm ONE thing at a time (elder tone).

## Step 2 — Decision tree (what kind of reminder to create)

    Is it consequential (meds, appointment, anything that matters if missed)?
    │
    ├─ YES, and it's a dated/timed EVENT (appointment, "next Thursday 2pm")
    │        -> HA CALENDAR event   (Step 3a)
    │
    ├─ YES, recurring or automation-like ("every morning at 9 take pills")
    │        -> HA automation / calendar / to-do  (Step 3a/3b)
    │
    ├─ One-shot, soft, within ~24h ("remind me to bring the trash in at 6")
    │        -> HA TO-DO item + optional timed announce  (Step 3b)
    │
    └─ Conversational-only, no consequence ("nudge me to stretch when we chat")
             -> Hermes CRON  (Step 3c)

When unsure, escalate UP the tree (prefer HA over cron). HA is deterministic and
survives a Hermes restart; cron does not guarantee delivery if the agent is down.

## Step 3a — Create an HA CALENDAR event (dated/timed, consequential)
Preferred: native toolset —
`ha_call_service(domain="calendar", service="create_event",
  entity_id="calendar.appointments",
  data={"summary": "Cardiologist — Dr. Lee", "start_date_time": "2026-07-16T14:00:00",
        "end_date_time": "2026-07-16T15:00:00",
        "description": "Added by ElderAssist for ${ELDER_NAME}"})`

REST fallback (always works):
```bash
curl -fsS -X POST "${HA_URL}/api/services/calendar/create_event" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{
        "entity_id": "calendar.appointments",
        "summary": "Cardiologist — Dr. Lee",
        "start_date_time": "2026-07-16T14:00:00",
        "end_date_time": "2026-07-16T15:00:00"
      }'
```
The family's HA blueprints announce calendar events the day before and morning of, so
a calendar entry is enough — do not also promise to remind them yourself.

## Step 3b — Create an HA TO-DO item (one-shot, soft, within ~24h)
`ha_call_service(domain="todo", service="add_item",
  entity_id="todo.reminders", data={"item": "Bring the trash in"})`

REST fallback:
```bash
curl -fsS -X POST "${HA_URL}/api/services/todo/add_item" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"todo.reminders","item":"Bring the trash in"}'
```
If it needs to fire at a clock time and no automation covers it, ALSO ask the family to
confirm which timed script/automation should announce it, or fall back to a cron that
triggers an HA announce at that time (Step 3c + a tts call). Never leave a timed,
consequential item as a to-do with no fire mechanism.

## Step 3c — Hermes CRON (conversational-only, no real consequence)
```
/cron add "every 1d" "Gently remind ${ELDER_NAME} to do their stretches when we next talk"
```
Recurring with an exact expression, delivered to a channel:
```
hermes cron create "0 8 * * 2#2" "Remind about the pharmacy call" --deliver ${CAREGIVER_CHANNEL}
```
(2#2 = second Tuesday; if your version phrases delivery differently, check
`hermes cron --help` — targets are origin/local/telegram/signal/whatsapp/email/all.)
Natural language also works: `/cron add "every second Tuesday at 8am" "..."`.
Use cron ONLY for nudges; anything that matters goes to HA above.

## Step 4 — Confirm back in plain words (always)
Say exactly what was set and when it will fire, in the listener's register.
- To ${ELDER_NAME}: "Okay. I'll remind you at 7 o'clock tonight to take your evening
  pill. The kitchen speaker will say it. You don't have to remember."
- To family: "Created calendar.appointments event 'Cardiologist' 2026-07-16 14:00;
  day-before + morning-of announce handled by the HA blueprint."
Never end with a vague "I'll remember" — name the mechanism and the time.

## Pitfalls
- HA unreachable: do NOT pretend it worked. Tell them honestly and offer to notify
  ${CAREGIVER_CHANNEL} or retry. A silently dropped reminder is the worst failure here.
- Don't double-book (a calendar event AND a cron for the same thing) — pick one.
- Medication *content* is never yours to judge — you only schedule the reminder the
  family configured; see the medication-refill skill and AGENTS.md §3.1.

## Verification
Read the entry back from HA to confirm it exists:
`ha_get_state("calendar.appointments")` or
`curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/states/todo.reminders"`.
For cron: `/cron list`.
