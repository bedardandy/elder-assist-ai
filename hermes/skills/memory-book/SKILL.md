---
name: memory-book
description: Save and recall household facts and where things are
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, memory, homebox, home-assistant]
    category: elder-assist
required_environment_variables:
  - name: HOMEBOX_URL
    prompt: HomeBox base URL
    help: e.g. http://homebox.local:7745
    required_for: durable-goods records
  - name: HOMEBOX_TOKEN
    prompt: HomeBox API token (bearer)
    help: Log in to HomeBox and create an API token
    required_for: durable-goods records
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: where-is-it notes
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: where-is-it notes
---

# Memory Book

## When to use
Anyone tells you a household fact, or asks you to recall one: "the furnace was serviced
by Bob", "the dishwasher is a Bosch, serial 123", "my glasses are on the piano",
"where's the spare key?", "what's the model number of the fridge?".

## Step 0 — Classify the fact
Route by durability, because different facts belong in different stores:

    DURABLE GOOD (a physical thing with identity)?  -> HomeBox   (Step 1)
      appliance, tool, its serial / model / warranty / manual / who services it
    WHERE-IS-IT / right-now transient note?          -> HA helper + memory  (Step 2)
      "glasses on the piano", "keys in the blue bowl"
    PERSON / routine / general house fact?           -> Hermes memory  (Step 3)
      "the aide comes Tuesdays", "shutoff valve is by the stairs"

A fact can be more than one: a new appliance is a HomeBox item AND worth a memory note
that it exists. Always mirror durable facts into their system of record — never leave a
serial number living only in chat (AGENTS.md §6).

## Step 1 — Durable goods -> HomeBox
HomeBox REST API base is `${HOMEBOX_URL}/api/v1`, auth `Authorization: Bearer
${HOMEBOX_TOKEN}`. (API shape is HomeBox's, not ours — if a call 404s, check
`${HOMEBOX_URL}/api/v1/docs` / the HomeBox API reference for your version.)

Search first, to update rather than duplicate:
```bash
curl -fsS -H "Authorization: Bearer ${HOMEBOX_TOKEN}" \
  "${HOMEBOX_URL}/api/v1/items?q=dishwasher"
```
Create a new item (locations are also items; get a locationId from
`GET /api/v1/locations`):
```bash
curl -fsS -X POST "${HOMEBOX_URL}/api/v1/items" \
  -H "Authorization: Bearer ${HOMEBOX_TOKEN}" -H "Content-Type: application/json" \
  -d '{
        "name": "Dishwasher — Bosch",
        "description": "Kitchen dishwasher. Serviced by Bob (555-0143).",
        "locationId": "<location-uuid>"
      }'
```
Update an existing item with serial / model / warranty fields:
```bash
curl -fsS -X PUT "${HOMEBOX_URL}/api/v1/items/<item-id>" \
  -H "Authorization: Bearer ${HOMEBOX_TOKEN}" -H "Content-Type: application/json" \
  -d '{
        "name": "Dishwasher — Bosch",
        "modelNumber": "SHXM4AY55N",
        "serialNumber": "FD9876543210",
        "warrantyExpires": "2027-05-01",
        "notes": "Manual attached. Warranty via BestBuy Total."
      }'
```
Manuals/receipts are file attachments in HomeBox — if the family forwarded a PDF, tell
them "I've noted the dishwasher; attach the manual PDF in HomeBox and I'll be able to
pull it up." (Attachment upload is multipart; do it in the HomeBox UI unless you have
confirmed the attachments endpoint for your version.)
Also drop a one-line Hermes memory note: "Dishwasher = Bosch SHXM4AY55N in HomeBox."

## Step 2 — Where-is-it / transient -> HA helper + memory
Write to a dedicated HA `input_text` helper the family created (e.g.
`input_text.last_thing_glasses`) so the house can answer too, AND to your memory.
```bash
curl -fsS -X POST "${HA_URL}/api/services/input_text/set_value" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"input_text.last_thing_glasses","value":"on the piano (07 Jul, 3pm)"}'
```
Native equivalent: `ha_call_service(domain="input_text", service="set_value",
entity_id="input_text.last_thing_glasses", data={"value":"on the piano"})`.
If no specific helper exists, use a general `input_text.last_thing_note` and also save
to memory. Then confirm: "Got it — your glasses are on the piano. Ask me any time."

## Step 3 — People / routines / house facts -> Hermes memory
Use the memory tool to `add` a concise entry (name, relationship, contact, role for
people; the fact plainly for house facts). Keep it short — memory has a size budget.
Example note: "Home-health aide: Nadia, Tuesdays 10am, cell 555-0199."

## Retrieval — "where is / what's the serial number"
1. WHERE-IS-IT -> read the HA helper: `ha_get_state("input_text.last_thing_glasses")`
   or `curl -fsS -H "Authorization: Bearer ${HA_TOKEN}"
   "${HA_URL}/api/states/input_text.last_thing_glasses"`. Cross-check your memory in
   case it was updated more recently; answer with the most recent.
2. THING / SERIAL / MODEL / WARRANTY -> search HomeBox:
   `curl -fsS -H "Authorization: Bearer ${HOMEBOX_TOKEN}"
   "${HOMEBOX_URL}/api/v1/items?q=fridge"`, then read the matched item's fields.
3. PERSON / ROUTINE / HOUSE FACT -> it is already injected from memory; answer directly.
Answer in the listener's register: to ${ELDER_NAME}, "Your glasses are on the piano."
To family, include the item ID / serial verbatim.

## Pitfalls
- Don't duplicate HomeBox items — always search first, prefer PUT over POST.
- Transient notes go stale; include a timestamp in the value so "where are my glasses"
  from yesterday isn't trusted blindly.
- Never read serials/warranty account numbers aloud in a shared room unless asked in
  the moment (AGENTS.md §3.3).

## Verification
Re-read the record you just wrote (HomeBox GET item, or HA get_state on the helper) and
confirm the value matches before telling the person it's saved.
