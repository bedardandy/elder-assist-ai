# Neighborhood and seasons — local help and the yearly rhythm

**What you'll have when done:** a way for the agent to find local senior services, rides, and
handymen anchored to a *coarse* home area, the authoritative phone numbers the family can call
independent of any technology, a vendor registry so "who do we call when the furnace dies?" has an
answer, a season-by-season chores calendar wired to reminders, an end-to-end snow-day flow that
gets the driveway plowed with a human's approval, and heat/ice safety plans for the days the
weather is the risk.

**Time required:** ~20 minutes to set `HOME_AREA` and teach the fallback numbers; ~1 hour to build
the vendor registry and the seasonal-chore reminders; the pre-season vendor contracts (esp. snow)
are a phone call each, best made *before* the season, not during the first storm.

> This playbook combines two jobs that lean on the same infrastructure: **finding local help** and
> **staying ahead of the seasons.** Both use the elder's coarse home area, the household vendor
> registry, and Home Assistant's weather/season triggers — so they live together.

---

## 1. Local resources — finding help nearby

The Hermes **`local-resources`** skill searches for senior services, meal delivery, rides,
handymen, and the like near the elder's home. It's a **labeled egress** — a web search leaves the
house — so it's built to share the least it can.

### `HOME_AREA` — coarse on purpose (privacy)

- **Set `HOME_AREA` to a town and/or ZIP, not a street address** (`.env`). The skill anchors
  searches to "senior transportation near {town}" — good enough to find local services, coarse
  enough that a full address never goes out in a query. This is deliberate: precise location is a
  privacy cost you don't need to pay to find the nearest meal-delivery program.
- **The agent's search flow:** takes the request ("mom needs a ride to the cardiologist"),
  searches anchored to `HOME_AREA`, and comes back with options and phone numbers — it doesn't
  book anything (a human calls). Egress is labeled, per the whole system's principle
  (`README.md`, principle 1).

### The authoritative fallbacks — teach the family these exist *without* any tech

The single most important part of this section: **there are three national front doors to elder
services that work from any phone, whether or not this system is running.** Put them on the fridge
card (`safety-wellness.md` §8) and in the family's own phones. The tech is a convenience; these are
the bedrock.

- [ ] **Eldercare Locator — 1-800-677-1116** — the US Administration on Aging's national number.
      It connects any caller to services in the elder's area: rides, meals, home care, legal help.
      [eldercare.acl.gov](https://eldercare.acl.gov/)
- [ ] **211** — dial **2-1-1** from almost anywhere in the US for health-and-human-services
      referrals: utility assistance, food, crisis help, local programs. [211.org](https://www.211.org/)
- [ ] **Your Area Agency on Aging (AAA)** — the *local* office for exactly this region, found via
      the Eldercare Locator above. Worth finding once and saving; they know the specific programs,
      waitlists, and low-cost legal help in that county (including the elder-law referrals from
      `money-and-bills.md` §6).

Teach these as human tools. The agent is faster for a quick "who delivers groceries here?", but the
family should never be dependent on it to reach real help — a phone and these three numbers always
work.

---

## 2. The vendor registry — "who to call when X breaks"

Half of seasonal and household stress is not knowing who to call at the moment something fails. Fix
it once: build a registry of the people who service the home, in HomeBox + the agent's memory
(same durable record as the service log, `memory-book.md` §6).

- [ ] Capture, for each: **trade, company, contact name, phone, what they did last, what it cost**,
      and any account/contract number. Record it as a HomeBox contact/item and tell the agent, so
      "who plowed us last winter and what did they charge?" is answerable by voice.
- [ ] The trades worth having *before* you need them:

| Trade | Why pre-arranged matters |
|---|---|
| **Snow plow** | The worst time to find one is during the first storm — see §4. Line it up in October. |
| **Lawn / mowing** | Recurring; set it and forget it for the season. |
| **Gutter cleaning** | Twice-a-year; easy to forget until they overflow. |
| **Handyman / general** | The "something broke" default when it's not a specialist job. |
| **Plumber, electrician, HVAC** | Emergencies. Have the number *before* the pipe bursts. |
| **Pharmacy that delivers** | Ties to `medication.md` refills — a delivering pharmacy is gold for an elder who can't drive. |

- [ ] **Make a "who to call when X breaks" card** — a printed quick-reference on the fridge (next to
      the ICE card, `safety-wellness.md` §8): furnace → this number, no heat → this, no water →
      this, snow → this. Big print. The elder or a neighbor should be able to reach the right
      person without hunting, and without the tablet.

---

## 3. The seasonal operations calendar

Seasonal chores are recurring, forgettable, and occasionally safety-relevant (heat, ice, furnace).
The **`seasonal_chore_reminder.yaml`** blueprint fires a reminder on a schedule so they surface as
HA todos and announcements — deterministic, like every other must-happen reminder
(`docs/DECISIONS.md` D10). Create one **instance per chore**.

Fill in a table like this for the household and wire each row as a `seasonal_chore_reminder`
instance (field setup in `ha/README.md`):

| Chore | Season / months | Suggested reminder day | Vendor (from §2) or DIY |
|---|---|---|---|
| **Confirm snow-plow contract** | Oct (before first snow) | Early October | Plow vendor — *do this pre-season, §4* |
| Furnace / heating tune-up + filter | Fall (Sep–Oct) | Early fall | HVAC |
| Gutter cleaning (fall) | Late fall (Nov) | After leaves drop | Gutter / handyman |
| Winterize outdoor faucets / hoses | Late fall | First hard-freeze forecast | DIY / handyman |
| Test smoke / CO detectors + batteries | Twice a year (clock change) | Mar & Nov | DIY |
| **Tracker battery replacement** | Twice a year (clock change) | Mar & Nov | DIY (`finding-things.md` §2) |
| A/C service / filter | Spring (Apr–May) | Mid-spring | HVAC |
| Gutter cleaning (spring) | Spring | After pollen/seeds | Gutter / handyman |
| Lawn / mowing start | Spring | When it greens up | Lawn vendor |
| Yard cleanup / bushes | Spring & fall | Seasonal | Lawn / DIY |

- [ ] Tie the reminders to the **vendor registry** (§2) so the nudge comes with the number: "time to
      book the furnace tune-up — call {HVAC vendor}."
- [ ] Reuse the twice-a-year **clock-change** date for the boring must-dos (detector batteries,
      tracker batteries) — one memorable anchor beats ten scattered dates.

---

## 4. The snow-day flow, end to end

Snow is the clearest example of weather → chore → vendor → human approval, so it's worth spelling
out. It runs on the **`weather_safety.yaml`** blueprint, which fires the **`elder_assist_snow_forecast`**
event when meaningful snow is in the forecast.

The flow:

1. **`weather_safety.yaml` detects incoming snow** and fires **`elder_assist_snow_forecast`** (HA
   event — deterministic trigger, `docs/DECISIONS.md` D10).
2. **The agent drafts a message to the plow vendor** (from the §2 registry) — "Snow forecast
   Thursday, please plan to plow" — and surfaces it for approval. It does **not** send it on its own
   (advice-and-draft, human-in-the-loop, same boundary as everywhere: `docs/DECISIONS.md` D13/D14).
3. **A human approves.** The caregiver (or the elder) okays the draft, and it goes to the vendor.
4. **Confirmation is tracked** — the arrangement is logged so the family can see the driveway's
   handled, and it feeds the household record.

### The critical pre-season step (don't skip this)

- [ ] **Confirm the plow contract in October, not during the first storm.** The snow-day flow only
      works if there's a vendor to text. Every plow operator is booked solid and unreachable the
      morning of the first big snow — the time to lock in the season's contract is *before* the
      season. Wire the "confirm snow-plow contract" reminder in §3 to fire in early October, and
      actually make the call. The clever automation is worthless without the boring phone call that
      precedes it.

---

## 5. Weather safety — when the weather is the risk

`weather_safety.yaml` also drives elder-specific weather guidance (`docs/ARCHITECTURE.md`, feature
map). Heat and ice are genuine wellness issues for older adults — cross-referenced from
`safety-wellness.md`. Two plans worth setting up:

### Heat plan (the assistant nudges; the family checks in)

Older adults are far more vulnerable to heat, and often don't feel it coming.

- [ ] **Pre-position the basics** at the start of a hot stretch: fans where they sit, water within
      reach, blinds-closing habit. The agent can give the morning heads-up ("it's going to hit 95°
      today — keep water nearby, stay in the cool room").
- [ ] **Assign a human check-in on extreme-heat days** (say, 95°+ or a heat advisory): a real call
      or visit from a named person. A nudge on a speaker is not enough when the risk is heat
      exhaustion — decide *who* checks in, the way the escalation chain names people
      (`safety-wellness.md` §4).

### Ice plan (lower the stakes so they don't have to go out)

The goal on an icy day is simple: **the elder has no reason to step onto ice.**

- [ ] **The mail can wait.** A slip on an icy path for a handful of catalogs isn't worth it — the
      agent's ice-day reminder should say so plainly: "it's icy out, leave the mail till it thaws."
- [ ] **Get groceries and prescriptions delivered that week.** Lean on the delivering pharmacy
      (§2, `medication.md`) and grocery delivery (`food-and-kitchen.md` §3) so nobody needs to drive
      or walk on ice. Arrange it *ahead* of the forecast, not during the storm.
- [ ] Salt/sand at the door is the plow vendor's or a neighbor's job — capture whoever does it in
      the §2 registry so an icy morning has a name attached, not a scramble.

The through-line: the house should make the risky errand unnecessary, and a *person* should be the
one who checks in when the weather itself is the danger.
