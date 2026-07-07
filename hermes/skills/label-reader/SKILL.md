---
name: label-reader
description: Read labels, expiry dates, instructions, and appliance displays from a photo
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, vision, grocy, home-assistant, homebox]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: warm dialogue
  - name: OLLAMA_VISION_MODEL
    prompt: Local Ollama vision model tag (optional)
    help: Default qwen2.5vl:7b; used when Hermes must read the photo itself
    required_for: reading photos
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: use-by reminders
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: use-by reminders
  - name: GROCY_URL
    prompt: Grocy base URL (optional)
    help: Leave empty to skip stock entry
    required_for: adding food to stock
  - name: GROCY_API_KEY
    prompt: Grocy API key (optional)
    required_for: adding food to stock
  - name: HOMEBOX_URL
    prompt: HomeBox base URL (optional)
    required_for: saving appliance info
  - name: HOMEBOX_TOKEN
    prompt: HomeBox API token (optional)
    required_for: saving appliance info
---

# Label Reader

Read what's printed on a thing when ${ELDER_NAME} can't: a **kitchen item's expiry
date**, a **medicine bottle**, a piece of **mail**, or an **appliance display / error
code**. Vision assistance is user-initiated photos only — no passive cameras (D11).

## When to use
A photo arrives via any channel with "what does this say?", "is this still good?",
"when does this expire?", "what's this error on the washer?", "read me this letter".

## Step 1 — Read the photo (transcribe verbatim FIRST)
Hermes sees images natively on its chat channels. If your backend is text-only, pass the
image to the local vision model on the hub (Ollama, `http://localhost:11434`, model
`${OLLAMA_VISION_MODEL}`, default `qwen2.5vl:7b`):
```bash
# image_b64 = base64 of the photo (no data: prefix)
curl -fsS http://localhost:11434/api/generate -d '{
  "model": "'"${OLLAMA_VISION_MODEL:-qwen2.5vl:7b}"'",
  "prompt": "Transcribe EVERY piece of text visible in this image, verbatim, exactly as printed — including any small stamped/embossed date codes and their exact characters. Do not interpret yet. List what you can read and mark anything you are unsure of.",
  "images": ["'"$image_b64"'"],
  "stream": false
}'
```
**Always read the raw text back first**, then interpret. Showing the printed characters
lets a human verify — 7B-class vision on tiny date stamps is imperfect (D11).

## Step 2 — Route by what it is

    EXPIRY / BEST-BEFORE on food or a product   -> Step 3 (the honesty rule matters most)
    MEDICINE label                              -> Step 4 (read verbatim only, NO advice)
    MAIL / letter                               -> read it out; if it looks like a
                                                   solicitation/threat, cross-run scam-check
    APPLIANCE display / error code              -> Step 5

## Step 3 — Expiry dates (the honesty rule — NEVER guess a date)
1. **Quote the raw printed text you see**: "The stamp reads `SEP 12 26`."
2. **State the interpretation plainly**: "`SEP 12 26` means September 12, 2026."
   Handle common formats out loud: `EXP`, `BB`/`BBE` (best before end), `USE BY`,
   `SELL BY`, MMDDYY vs DDMMYY ambiguity (if the day could be >12 it disambiguates;
   otherwise say which reading you're using).
3. **If it is blurry, cut off, or you're not certain — SAY SO and ask for a better
   photo. Never invent or round a date:**
   > "I can see a date stamp but it's too blurry for me to be sure of the numbers. Could
   > you take one more, a bit closer and with good light? I don't want to guess a date
   > on your food."
4. **Food-safety humility** — you read dates, you don't rule on safety:
   - A *past* date does not automatically mean unsafe (many "best before" dates are about
     quality, not safety). Say that calmly.
   - **When in doubt, throw it out** — offer that as the safe default.
   - **Never override obvious spoilage**: if the photo (or ${ELDER_NAME}) shows mold, a
     bulging can, an off smell, or sliminess, say "this one I'd throw away to be safe,
     no matter what the date says."
   - You are not a doctor: never advise on whether eating something will make them ill —
     that's the doctor's lane (AGENTS.md §3.1). Keep to date-reading + the throw-out
     default.

## Step 4 — Medicine labels (read verbatim ONLY — no dosage advice)
Read exactly what is printed — drug name, strength as written, the direction line, the
Rx number, the pharmacy — **and stop there.** Do NOT interpret, recommend, confirm, or
comment on a dose, timing, or whether to take it with food (AGENTS.md §3.1). Redirect:
> "The label reads: 'Lisinopril 10 mg — take one tablet by mouth daily.' I've read you
> exactly what it says. For anything about *how* to take it or whether it's right, that's
> your doctor or pharmacist — want me to help you reach ${CAREGIVER_NAME} or write the
> question down for your next visit?"
Never read an Rx number or full details aloud into a shared room unless asked in the
moment (AGENTS.md §3.3).

## Step 5 — Appliance display / error code
Read the exact code/text ("the washer shows `E4`"). If a matching appliance is in
HomeBox, note the code there for the repair history; offer to look up what the family
recorded, but don't invent a fix. Offer to add the appliance/code to HomeBox (Step 6c)
and, for anything that needs a repair, hand off to ${CAREGIVER_NAME} — you don't book
service (D14).

## Step 6 — Offer the follow-ups (only after reading)
Ask which, if any, they'd like — one at a time, plainly.

**a) Add a food item to Grocy stock.** Grocy auth is `GROCY-API-KEY: ${GROCY_API_KEY}`
(not bearer), API base `${GROCY_URL}/api`. Find or create the product, then add stock
with the best-before date you read:
```bash
# 1) look for the product
curl -fsS -H "GROCY-API-KEY: ${GROCY_API_KEY}" \
  "${GROCY_URL}/api/objects/products?query=filter[name]=Milk"
# 2) add stock to product <id>, quantity 1, best-before = the date you READ (YYYY-MM-DD)
curl -fsS -X POST "${GROCY_URL}/api/stock/products/<product_id>/add" \
  -H "GROCY-API-KEY: ${GROCY_API_KEY}" -H "Content-Type: application/json" \
  -d '{"amount": 1, "best_before_date": "2026-09-12", "transaction_type": "purchase"}'
```
(If the product doesn't exist yet, create it via `POST ${GROCY_URL}/api/objects/products`
with at least a name and the required unit fields — verify the required fields against
your Grocy version's API reference, then add stock.) Use ONLY the date you actually read;
if it was uncertain, don't write a guessed date into stock.

**b) Set a use-by reminder in HA.** For a soft "use the chicken by Friday" nudge, add an
HA to-do or a dated calendar note (this is a real date, so it lives in HA per D10):
```bash
curl -fsS -X POST "${HA_URL}/api/services/todo/add_item" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"todo.reminders","item":"Use the chicken by Fri Sep 12"}'
```
Native equivalent: `ha_call_service(domain="todo", service="add_item",
entity_id="todo.reminders", data={"item":"Use the chicken by Fri Sep 12"})`.

**c) Add appliance info to HomeBox.** Hand the model/serial/error code to the
`memory-book` skill's Step 1 (HomeBox `POST/PUT /api/v1/items`) so the repair history
lives in the system of record.

## Pitfalls
- Never guess or round an expiry date. Blurry = ask again. This is D11's core rule.
- Never turn a medicine label into advice — verbatim read + redirect only.
- Don't declare food "safe to eat" — read the date, give the throw-out-if-in-doubt
  default, and defer spoilage/illness judgments.
- Only write a date into Grocy/HA that you actually read clearly.

## Verification
After writing to Grocy/HA/HomeBox, read the record back (e.g. `GET
${GROCY_URL}/api/stock/products/<id>`, or `ha_get_state("todo.reminders")`) and confirm
the stored date matches the text you quoted before telling ${ELDER_NAME} it's done.
