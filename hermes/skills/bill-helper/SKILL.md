---
name: bill-helper
description: Read a photographed bill, confirm it, and set a due-date reminder — never pays
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, money, vision, home-assistant, human-in-the-loop]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: warm dialogue
  - name: CAREGIVER_NAME
    prompt: The caregiver's name
    required_for: hand-off and family visibility
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the caregiver
    required_for: optional family visibility
  - name: OLLAMA_VISION_MODEL
    prompt: Local Ollama vision model tag (optional)
    help: Default qwen2.5vl:7b; used when Hermes must read the photo itself
    required_for: reading photos of bills
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: the due-date reminder
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: the due-date reminder
  - name: BILLS_FAMILY_VISIBLE
    prompt: Share bill due dates with family? (true/false)
    help: Financial data is opt-in per the consent checklist (D14). Default false.
    required_for: family visibility of bills
---

# Bill Helper

Photograph a bill → extract the essentials → read them back → set a **reminder before it's
due**. You handle reading and remembering. **You never pay, never store full account
numbers, never ask for card or bank details.** This is D14 (read-and-remind, never
transact) — a trust boundary, not a missing feature.

## The money discipline (applies to every step)
- **Never offer to pay, and never place a payment** — a human pays. If ${ELDER_NAME}
  asks you to pay it, Step 6 is a warm refusal + how ${CAREGIVER_NAME} can help.
- **Never ask for, and never store, a card number, bank login, or full account number.**
  Record only the **last 4 digits** for identification.
- **Never store payment credentials in memory.** Ever.

## Step 1 — Read the bill (transcribe, then extract)
Hermes sees images natively on its channels. If your backend is text-only, use the local
vision model (Ollama `http://localhost:11434`, model `${OLLAMA_VISION_MODEL}`, default
`qwen2.5vl:7b`):
```bash
# image_b64 = base64 of the bill photo (no data: prefix)
curl -fsS http://localhost:11434/api/generate -d '{
  "model": "'"${OLLAMA_VISION_MODEL:-qwen2.5vl:7b}"'",
  "prompt": "Read this bill. Report ONLY: payee/company name; the LAST 4 DIGITS of the account number (never the full number); amount due; minimum due if shown; due date; and any phrase like FINAL NOTICE or PAST DUE. Transcribe those fields verbatim. Do not output the full account number.",
  "images": ["'"$image_b64"'"],
  "stream": false
}'
```
Extract: **payee**, **account #last4 only**, **amount due**, **due date**, **minimum vs
total** (if both shown). If a field is unclear, say so and ask for a clearer photo — do
not guess an amount or a date.

## Step 2 — Read it back for confirmation (always)
Say what you read, plainly, and wait for a yes before creating anything:
> "This is your electric bill from City Power, account ending 4471. It's $84.20, due
> August 15th. Did I read that right?"
Never proceed on an amount/date you weren't confirmed on.

## Step 3 — Check for anomalies (cross-run scam-check if warranted)
Before scheduling, compare against memory of recent bills and sanity-check:
- **Amount much higher than usual** for this payee (per your memory of past bills) →
  flag it: "This is a lot more than your usual electric bill — worth a closer look before
  anyone pays it."
- **Unfamiliar payee** you have no record of → flag it.
- **"Final notice" / "past due" on a FIRST-SEEN bill** (no prior record of this payee) →
  a classic scare-mailing pattern → **run the `scam-check` skill** on it before treating
  it as a real bill.
- **Duplicate** — if memory already has a bill from this payee for this period/amount,
  say "I think we already logged this one — let's not double-pay." (See Step 5 for how
  bills are remembered.)
If anything trips these, surface it warmly to ${ELDER_NAME} and route to
${CAREGIVER_NAME}; don't quietly schedule a suspicious bill.

## Step 4 — Create the due-date reminder in HA (N days before)
A due date is consequential, so it lives in Home Assistant, not in chat (D10). Default to
a reminder **5 days before** the due date (family can change N). Create a calendar event
(preferred) or a to-do:
```bash
# reminder dated 5 days before due (compute the date; example: due 2026-08-15 -> 2026-08-10)
curl -fsS -X POST "${HA_URL}/api/services/calendar/create_event" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{
        "entity_id": "calendar.appointments",
        "summary": "Bill due soon: City Power (~$84.20, due Aug 15)",
        "start_date": "2026-08-10",
        "end_date": "2026-08-11",
        "description": "Acct ending 4471. Reminder only — a human pays. Added by ElderAssist."
      }'
```
Native equivalent: `ha_call_service(domain="calendar", service="create_event",
entity_id="calendar.appointments", data={...})`. The HA blueprints announce calendar
events ahead of time, so this is enough — don't also promise to remind them yourself.
**Put only the last 4 digits** in the summary/description — never the full account number.

## Step 5 — Remember the bill (for duplicate + anomaly detection)
Save a short memory note so next month's check can compare — payee, last4, amount, due
date, and that a reminder was set. **Never** the full account number or any payment
credential:
> Memory: "Bill: City Power, acct •4471, $84.20, due 2026-08-15, reminder set 08-10."
This is what makes Step 3's duplicate/anomaly detection work.

## Step 6 — Optional family visibility (respect the consent flag)
Only if `BILLS_FAMILY_VISIBLE=true` (financial data is opt-in, D14), send a heads-up to
${CAREGIVER_CHANNEL}:
> "Bill logged for ${ELDER_NAME} (reminder only — nothing paid): City Power, ~$84.20,
> due Aug 15, acct •4471. Reminder set for Aug 10."
If `BILLS_FAMILY_VISIBLE` is unset or `false`, do NOT share it — keep it between you and
${ELDER_NAME} unless it's an anomaly/scam under Step 3 (safety overrides, per AGENTS.md).

## Step 6b — If ${ELDER_NAME} asks you to PAY it (warm refusal)
> "I'm not able to pay bills myself — that's a rule that keeps your money safe, so no one
> can ever trick me into sending it somewhere. Here's what I can do: I've noted it and
> set a reminder, and I can let ${CAREGIVER_NAME} know so they can pay it with you, or
> walk you to it. Would you like me to do that?"
Never ask for a card or bank number to "help." Prepare the info; a human pays (D14).

## Pitfalls
- Never store or read back the full account number — last 4 only, everywhere.
- Never offer to pay or ask for payment details, even if pressed.
- Don't schedule a suspicious/first-seen "final notice" as a normal bill — scam-check
  it first.
- Don't double-log or double-remind the same bill — check memory (Step 5) first.
- If a field was unclear in the photo, ask for a better one; never guess an amount/date.

## Verification
Read the HA entry back (`ha_get_state("calendar.appointments")` or the REST
`/api/states/...`) and confirm the due date and last4 are right before telling
${ELDER_NAME} it's set. Confirm the family note delivered only if
`BILLS_FAMILY_VISIBLE=true`.
