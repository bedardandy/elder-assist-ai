---
name: local-resources
description: Find senior services, meals, rides, and vendors near home — coarse-location web search
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, web, resources, homebox, egress]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: warm dialogue
  - name: CAREGIVER_NAME
    prompt: The caregiver's name
    required_for: looping in on vendor choices
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the caregiver
    required_for: looping in on in-home vendors
  - name: HOME_AREA
    prompt: The elder's town or ZIP (NOT the street address)
    help: Coarse only — web queries leave the house; keep the location broad
    required_for: anchoring searches near home
  - name: HOMEBOX_URL
    prompt: HomeBox base URL (optional)
    required_for: saving a chosen vendor
  - name: HOMEBOX_TOKEN
    prompt: HomeBox API token (optional)
    required_for: saving a chosen vendor
---

# Local Resources

Find real services near ${ELDER_NAME}'s home: senior center, Meals on Wheels / food
programs, rides / paratransit, pharmacy delivery, a handyman / plow / mow vendor, the
library, the Area Agency on Aging, adult day programs. This is a **labeled egress** — a
web search leaves the house.

## The location rule (why HOME_AREA is coarse)
Search anchored to **`${HOME_AREA}`** — the **town or ZIP, never the street address**. A
web query leaves the house; keeping the location coarse means we don't broadcast exactly
where ${ELDER_NAME} lives to a search engine. Town/ZIP is enough to find services; the
precise address is not ours to send out.

## Step 1 — Classify the need
Route to the right kind of resource:

    senior center / activities / congregate meals   -> local senior center, Council on Aging
    home-delivered meals                             -> Meals on Wheels, local food programs
    rides / transport / can't drive                  -> paratransit, senior ride programs, 211
    pharmacy delivery                                -> local pharmacies that deliver
    handyman / snow plow / mowing / gutters          -> local vendors (also see seasonal-chores)
    books / large-print / homebound delivery         -> public library
    "where do I even start" / benefits / caregiving  -> Area Agency on Aging, Eldercare Locator, 211

## Step 2 — Always name the authoritative starting points (US)
For US users, **always** mention these two first — they're vetted, current, and free:
- **Eldercare Locator** — **eldercare.acl.gov**, **1-800-677-1116**. The official
  national front door to local aging services; connects to the Area Agency on Aging.
- **211** — dial **2-1-1** (or 211.org): local health & human services, food, rides,
  utility help, referrals.
These beat a cold web search for anything benefits-, care-, or program-related, and they
stay current when scraped listings go stale.

## Step 3 — Web search, anchored to HOME_AREA
Use the web tool (this is the egress). Query the classified need near the coarse area:
```
"{need} near ${HOME_AREA}"
# examples:
"Meals on Wheels ${HOME_AREA}"
"senior center ${HOME_AREA}"
"pharmacies that deliver ${HOME_AREA}"
"senior transportation paratransit ${HOME_AREA}"
```
(If the "ask anything" web toolset is disabled on this box, hand the search to a family
member instead and present the Step 2 numbers to call.)

## Step 4 — Verify recency before presenting (listings go stale)
Directory listings rot — phone numbers change, programs close, hours shift. Before you
present anything:
- Prefer the organization's **own site** over aggregator directories.
- Note the source and flag staleness out loud: "This looked current, but places change —
  let's confirm the hours when we call."
- Never present a scraped phone number as guaranteed; frame it as "worth a call to
  confirm."

## Step 5 — Present max 3 options (big-print friendly)
Give **at most three**, simplest first, in ${ELDER_NAME}'s register — name, one line on
what it does, and the phone number, spaced and clear:
> "Here are three good ones near you:
>
>  1. **${HOME_AREA} Senior Center** — lunches and activities. Call **555-0130**.
>  2. **Meals on Wheels** — brings a hot meal to your door. Call **555-0177**.
>  3. **Eldercare Locator** — helps you find anything else. Call **1-800-677-1116**.
>
>  Would you like me to help you call one, or save it?"
To family, list them with URLs/sources for verification.

## Step 6 — Offer to save the chosen one + draft a call script
Once ${ELDER_NAME} picks one:
- **Save it to the vendor registry** — a Hermes memory note AND a HomeBox contact note so
  it's the household system of record (this is the same registry `seasonal-chores` uses):
  ```bash
  curl -fsS -X POST "${HOMEBOX_URL}/api/v1/items" \
    -H "Authorization: Bearer ${HOMEBOX_TOKEN}" -H "Content-Type: application/json" \
    -d '{
          "name": "Vendor — Meals on Wheels (meals)",
          "description": "Home-delivered meals. Phone 555-0177. Found via local-resources 2026-07-07. Confirm hours when calling."
        }'
  ```
  Memory note: "Vendor: Meals on Wheels, meals, 555-0177 (saved 07 Jul)."
- **Draft the first call script** for ${ELDER_NAME} or the caregiver to read:
  > "Hi, I'm calling for ${ELDER_NAME}. I'd like to ask about home-delivered meals — how
  > to sign up, the cost, and which days you deliver in ${HOME_AREA}. Thank you."
  Hold any message you'd send on ${ELDER_NAME}'s behalf for approval (AGENTS.md §8).

## Step 7 — In-home visits → loop in the caregiver
For anything involving someone **coming into the home** (handyman, aide, plow, in-home
services), suggest ${CAREGIVER_NAME} be looped in on choosing the vendor — a stranger in
the house is a safety and scam surface. Send a short note to ${CAREGIVER_CHANNEL}:
> "${ELDER_NAME} is looking for a handyman near ${HOME_AREA}. I found a couple of options
> — want to pick one together before anyone comes to the house?"

## Pitfalls
- Never search or send the street address — HOME_AREA (town/ZIP) only.
- Never present a listing as definitely current — always "confirm when you call."
- Cap it at 3 options; a long list overwhelms. Simplest first.
- For in-home vendors, don't finalize a stranger's visit without looping in family.

## Verification
If you saved a vendor to HomeBox, GET the item back and confirm the phone number stored
matches what you read. Confirm any caregiver note delivered.
