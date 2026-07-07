---
name: medication-refill
description: Prep medication refills for a human to place — never orders
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, medication, grocy, human-in-the-loop]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: dialogue and notices
  - name: CAREGIVER_NAME
    prompt: The caregiver's name
    required_for: hand-off
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the caregiver
    required_for: hand-off notification
  - name: GROCY_URL
    prompt: Grocy base URL (optional)
    help: Leave empty to use spoken stock check instead
    required_for: automated stock counts
  - name: GROCY_API_KEY
    prompt: Grocy API key (optional)
    required_for: automated stock counts
---

# Medication Refill

## The absolute rule
**You NEVER submit an order, call in a refill, or pay for anything.** You do all the
preparation and hand a finished, ready-to-execute packet to a human (see AGENTS.md
§3.2). You also NEVER give medical advice about the medication itself — you count,
list, and prepare only (§3.1). If asked whether a med is okay, redirect to the doctor.

## When to use
The weekly stock check fires (via daily-rhythm/cron), or someone says "I'm running low
on my blood pressure pills" / "do we need refills?".

## Step 1 — Stock check dialogue
**If GROCY_URL is set**, query Grocy for current stock. Grocy auth header is
`GROCY-API-KEY: ${GROCY_API_KEY}` (not bearer). API base `${GROCY_URL}/api`.
```bash
# All stock (find the product's stock_id/amount and days-to-consume):
curl -fsS -H "GROCY-API-KEY: ${GROCY_API_KEY}" "${GROCY_URL}/api/stock"
# One product's detail (products track meds as consumables in Grocy):
curl -fsS -H "GROCY-API-KEY: ${GROCY_API_KEY}" \
  "${GROCY_URL}/api/stock/products/<product_id>"
# Products due / overdue soon:
curl -fsS -H "GROCY-API-KEY: ${GROCY_API_KEY}" "${GROCY_URL}/api/stock/volatile"
```
Read the `amount` and best-before/days-left; flag anything below the family's
threshold (default: less than ~7 days of doses left).

**If GROCY_URL is empty**, run a gentle spoken count with ${ELDER_NAME}, one med at a
time (elder tone): "Let's check your blood pressure pills. Can you open the bottle and
count how many are left? … Okay, about eight. That's roughly a week." Record the count
to memory so next week compares.

## Step 2 — Build the refill checklist
For each low medication, assemble (do not guess clinical details — use what the family
recorded in config/HomeBox/memory):
- Medication name (as the family entered it)
- Pharmacy name + phone + the Rx number if on file
- Prescriber, if a new authorization may be needed
- Current count / days remaining
- Pickup vs delivery preference
Present as a plain list to family; to ${ELDER_NAME}, keep it to "You're getting low on
two things — I'll get everything ready so ${CAREGIVER_NAME} can order them."

## Step 3 — Prepare the hand-off (the part you CAN do)
Produce ONE of the following, ready for a human to execute, based on the family's method:

**A) Pharmacy phone-call script** (for the human to read):
> "Hi, I'd like to refill a prescription for ${ELDER_NAME} [full name / DOB the family
> stored]. The Rx number is ____. It's [medication]. Can you have it ready for pickup,
> and is a new authorization from Dr. ____ needed? Thank you."
Include the phone number to dial and, if the family uses HA VoIP/Twilio, offer to place
the *dialing* only after a human says go — you still do not speak the order yourself.

**B) Online-refill step-by-step** (for the human to click through):
1. Go to <pharmacy site/app the family uses>.
2. Log in (the human has the credentials — you do not store or enter them).
3. Prescriptions -> select [medication], Rx ____.
4. Choose pickup/delivery -> Review -> **the human presses Submit.**
Write it as numbered, unambiguous steps a busy caregiver can follow in 30 seconds.

## Step 4 — Notify the caregiver with the list
Send the finished packet to ${CAREGIVER_CHANNEL} (messaging/notify tool), clearly
labeled as READY-TO-ORDER, NOT ORDERED:
> "Refill prep for ${ELDER_NAME} (nothing ordered — needs your OK):
>  • Lisinopril — ~6 days left — Rx 4471123 — CVS Main St 555-0170
>  • Vitamin D — ~5 days left — OTC, add to next grocery run
>  Phone script and online steps ready on request. You place the order."
If you also drafted a message FOR the pharmacy on the elder's behalf, hold it for
approval per AGENTS.md §8.

## Step 5 — Track the loop (so it isn't dropped)
This is consequential, so it obeys the deadline rule (D10): if the refill still needs
doing, create an HA to-do / calendar entry or a cron nudge to ${CAREGIVER_CHANNEL}
until a human confirms it's ordered — do not rely on remembering. Use the remind-me
skill's Step 3 to create it. Once the caregiver says "ordered/picked up", mark it done
and update the Grocy stock or memory count.

## Pitfalls
- Never state a dose, never say "take more/less/skip", never assess interactions.
- Never auto-submit, even if a family member says "just order it" — you prepare and
  they click; that is the line. You may pre-fill and walk them to the final button.
- Don't expose Rx numbers / DOB to a shared voice channel unless asked in the moment.

## Verification
Confirm the caregiver received the packet (delivery succeeded) and that a follow-up
reminder exists in HA/cron. After the human confirms the order, verify stock/memory was
updated so next week's check is accurate.
