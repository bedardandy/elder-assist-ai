---
name: seasonal-chores
description: Track seasonal home maintenance, a vendor registry, and weather-triggered vendor drafts
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, seasonal, vendors, home-assistant, homebox, weather]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: warm dialogue and approvals
  - name: CAREGIVER_NAME
    prompt: The caregiver's name
    required_for: approvals and escalation
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the caregiver
    required_for: escalating unfilled critical chores
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: project todos and weather
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: project todos and weather
  - name: HOMEBOX_URL
    prompt: HomeBox base URL (optional)
    required_for: mirroring the vendor registry
  - name: HOMEBOX_TOKEN
    prompt: HomeBox API token (optional)
    required_for: mirroring the vendor registry
---

# Seasonal Chores

The outdoor / maintenance project tracker. You keep a **vendor registry** (plow, mowing,
gutters, chimney, HVAC), a **seasonal checklist**, and a **weather-triggered flow** that
drafts a message to a vendor for a human to approve. You never auto-send and never book —
you prepare and hand off (AGENTS.md §3.2, D14).

## The vendor registry (memory + HomeBox mirror)
The registry is the household's list of who-does-what-outside. Keep it in **Hermes
memory** (for talking) AND mirrored to **HomeBox notes** (the system of record) — same
registry the `local-resources` skill writes to.
```bash
# Save/update a vendor as a HomeBox item (search first to avoid duplicates):
curl -fsS -H "Authorization: Bearer ${HOMEBOX_TOKEN}" \
  "${HOMEBOX_URL}/api/v1/items?q=plow"
curl -fsS -X POST "${HOMEBOX_URL}/api/v1/items" \
  -H "Authorization: Bearer ${HOMEBOX_TOKEN}" -H "Content-Type: application/json" \
  -d '{
        "name": "Vendor — Snow plow (Al'\''s Plowing)",
        "description": "Driveway plowing. Al, 555-0161. Season contract confirmed? Track each year."
      }'
```
Memory note: "Vendor: plow = Al's Plowing, 555-0161 (contract confirmed for winter?)."
Track for each vendor: service, name, phone, and whether this season's arrangement is
**confirmed** yet.

## Seasonal checklist knowledge
Use these to prompt ahead of the season (not on the day it's too late):

    FALL (before first frost / first fire):
      • Gutters cleaned
      • Furnace serviced + a fresh furnace filter
      • Chimney swept/inspected BEFORE the first fire
      • Outdoor faucets drained, hoses in
    WINTER (before the first storm):
      • Snow-plow contract CONFIRMED before the first storm — not during it
      • Ice-melt / sand stocked and by the door
      • Pipes-freeze plan for a cold snap
    SPRING:
      • Mowing contract lined up
      • AC / cooling checked before the first hot spell
      • Gutters again after the thaw
    YEAR-ROUND:
      • Smoke & CO detector batteries — pair with the DST clock changes (spring
        forward / fall back) as the twice-a-year reminder
      • HVAC filter swaps on a cadence

## Open projects → HA to-do list (D10: real tracking lives in HA)
Track open chores as items on an HA to-do list, `todo.projects`, so they survive a Hermes
restart and show up in the weekly digest. **If that list doesn't exist yet**, ask the
family to create a To-do list helper named "Projects" (HA → Settings → Devices &
Services → Helpers → To-do list), or use the existing `todo.reminders`.
```bash
curl -fsS -X POST "${HA_URL}/api/services/todo/add_item" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"todo.projects","item":"Confirm snow plow contract with Al (555-0161)"}'
```
Native: `ha_call_service(domain="todo", service="add_item", entity_id="todo.projects",
data={"item":"..."})`. Read open items back with
`ha_get_state("todo.projects")` (or the list's `todo.get_items` service) for status
checks.

## Weather-triggered flow (draft to the vendor — never auto-send)
The HA layer owns weather automations; when it announces **incoming snow** (an HA event/
notification reaches the agent — see the `platforms.homeassistant` watch config in
config.yaml.example), do this:
1. **Check the registry** — is a plow vendor listed and is this season's arrangement
   confirmed?
2. **Read the forecast** to be concrete:
   `ha_get_state("weather.home")` or
   `curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/states/weather.home"`.
3. **Draft** the vendor message for approval (never send it yourself — AGENTS.md §3.2/§8):
   > "Snow's coming Thursday. Here's a text I can send to Al the plow guy for you: 'Hi
   > Al, snow is forecast for Thursday — can you plow ${ELDER_NAME}'s driveway? Thanks.'
   > Want me to send it?"
   Wait for a clear yes from ${ELDER_NAME} or ${CAREGIVER_NAME} before sending.
4. **Escalate if a critical chore is unfilled** — **no plow lined up + snow forecast** is
   an elder-safety issue (an unplowed drive = no way out, fall risk). Notify
   ${CAREGIVER_CHANNEL} promptly:
   > "Heads up: snow forecast Thursday for ${ELDER_NAME} and I don't have a confirmed
   > plow vendor on file. Want me to help line one up? (local-resources can find one.)"

## Weekly family digest (status of open projects)
Feed open `todo.projects` items into the `daily-rhythm` weekly summary so the family sees
what's outstanding:
> "Projects: gutters still open (added Sep 20); furnace filter done; snow plow —
> **not yet confirmed** (snow possible next week)."
Surface anything critical-and-unfilled at the top.

## Cross-links
- Need to FIND a vendor (no plow on file) → `local-resources` skill (it writes to the
  same registry).
- Vendor coming into/onto the property → loop in ${CAREGIVER_NAME} on the choice
  (stranger-at-the-house safety), same as local-resources Step 7.

## Pitfalls
- Never auto-send a vendor message — always draft → get a yes → then send.
- Never book or commit to a paid service yourself (D14) — the human confirms.
- Don't let a critical seasonal chore sit silently — an unconfirmed plow before a storm
  escalates to the caregiver.
- Keep the registry de-duplicated — search HomeBox before adding a vendor.

## Verification
Read the `todo.projects` list back after adding an item to confirm it's there. For the
weather flow, confirm the draft was actually approved before any send, and that a
critical-chore escalation delivered to ${CAREGIVER_CHANNEL}.
