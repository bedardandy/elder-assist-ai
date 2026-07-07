# Medication — reminders, acknowledgment, and refills

**What you'll have when done:** every medication photographed and listed, a reminder
that escalates to you only when a dose is genuinely missed, a dead-simple way for the
elder to say "I took it," a weekly stock check that produces a refill list, and three
safe ways to actually reorder — none of which let the computer buy anything on its own.

**Time required:** ~45 minutes to build the list and configure reminders for a typical
5–8 medication regimen; ~10 minutes each week for the stock check and refill.

> **The hard rule, stated once and repeated: the assistant NEVER orders medication by
> itself.** Every refill path below ends with a human — the elder, you, or a
> pharmacist — confirming. This is a design decision (`docs/DECISIONS.md`, D10;
> `docs/ARCHITECTURE.md` trust model), not a limitation to work around.

---

## 1. Build the medication list (pharmacy-first)

Don't invent the list from pill bottles alone — start from the pharmacy's record, which
is authoritative and includes prescriber, strength, and directions.

- [ ] Pull the current list: the pharmacy printout, the app, or ask the pharmacist for
      an up-to-date medication profile. Reconcile it against the bottles physically in
      the house — bottles lie (old doses, discontinued meds).
- [ ] For **each** medication, photograph two things: the **bottle/label** (name,
      strength, prescriber, Rx number, pharmacy phone) and the **pill itself** (so a
      spilled or unlabeled pill can be identified).
- [ ] Note for each: name, strength, what it's for (in plain words), when it's taken,
      with/without food, and the **risk level if missed** (you'll use this in §4).

### Where the list lives

- **HomeBox** (`inventory` profile, port `7745`): create a location "Medications" and
  one item per drug, with the two photos attached and the label details in the fields.
  This is your durable, searchable record — "what's the pink one for?" answered by
  voice later via the Hermes `memory-book` skill. Structure guidance in
  `memory-book.md`.
- **Grocy** (optional `grocy` profile, port `9283`): if you want **stock tracking** —
  how many pills are left, when a package was opened, refill-due dates — add each med as
  a Grocy product with an amount and a minimum stock level. Grocy is what makes the
  weekly stock check in §5 semi-automatic. Skip it if you'd rather eyeball the bottles;
  the reminders and refill workflow work without it.

> Keep the *clinical* list (doses, timing) as the source of truth with the prescriber.
> HomeBox/Grocy hold the logistics (photos, counts, reorder info), not medical
> direction.

---

## 2. Configure the `medication_reminder` blueprint (one per medication)

The reminder is a **Home Assistant automation**, not the LLM — a missed-dose alert must
fire on schedule every time (`docs/DECISIONS.md`, D10). ElderAssist ships the
`medication_reminder` blueprint for exactly this. Full field-by-field setup, including
importing the blueprint and picking speakers/screens, is in **`ha/README.md`** — don't
duplicate it; the orchestration is here.

Create **one automation per medication per time slot** (morning metoprolol and evening
metoprolol are two automations). For each:

- [ ] **Time**: the actual dose time.
- [ ] **Announce on**: kitchen speaker + the kiosk tablet + cast a card to the TV if
      they're often in the living room. Redundancy is the point — one channel gets
      missed.
- [ ] **Message**: name it in plain words — "Time for your morning heart pill, the
      white one" beats "Take metoprolol 25mg." Reference the HomeBox photo if you want
      a "which one?" fallback.
- [ ] **Acknowledgment required**: yes (this is what enables escalation).
- [ ] **Grace period + escalation target**: see §4 — tune by risk, don't accept the
      default blindly.

### Hearing-loss tuning
If the announcement isn't reliably heard, tune it — quietly missed reminders are just
missed reminders:

- **Announce volume.** The `medication_reminder` blueprint has an optional
  **Announce volume (0–100)** input: it sets the speakers to that level before
  speaking and, on the timeout repeat, raises it by 10 ("louder on repeat"). Leave it
  at 0 to keep the current volume. The shared `script.elder_announce` takes the same
  optional `volume`.
- **Voice & speed.** Piper (`PIPER_VOICE` in `.env`) offers clearer/slower voices;
  browse <https://rhasspy.github.io/piper-samples/>. A slower, lower-pitched voice is
  easier for many older ears than the default rate.

---

## 3. The acknowledgment ritual

The elder needs a frictionless way to mark a dose taken. Offer both; let them settle on
one:

- **The big button.** When a reminder fires, the kiosk shows a large green **"I took
  it"** button. One tap clears the reminder and stops escalation. This is the primary
  path — no voice, no ambiguity.
- **By voice.** Saying *"I took my medicine"* (voice profile, week 3+) hits the same
  acknowledgment intent. Good for when the tablet is across the room.

Teach it as a *ritual*, tied to the physical act: take pill → tap green button, every
time, same order. Practice it together during week 2 (`onboarding.md`). Two honest
notes:

- **Acknowledgment means "they pressed the button," not "the pill is in them."** It's a
  good-enough proxy, not proof. Don't oversell it to worried siblings.
- **A pill organizer is still the backbone.** The reminder tells them *when*; the
  weekly 7-day organizer tells them *whether they already took it* when they can't
  remember two minutes later. Use both — see §6.

---

## 4. Escalation tuning (by risk, not one-size-fits-all)

Escalation = if the dose isn't acknowledged within the grace period, a caregiver gets a
message (Signal/SMS via Hermes/HA). The goal is to catch real misses **without** so
many false alarms that you start ignoring them — alarm fatigue is the failure mode.

Recommended grace periods by what happens if the dose is genuinely missed:

| Risk if missed | Examples (illustrative — confirm with the prescriber) | Grace period before escalation | Escalate to |
|---|---|---|---|
| **High** — time-critical, dangerous to skip | Insulin, anti-seizure, Parkinson's meds, some heart-rhythm drugs | 15–30 min | You immediately; a second person if you don't ack the alert |
| **Medium** — matters, some flexibility | Most blood pressure, cholesterol, thyroid | 45–90 min | You, single message |
| **Low** — fine if late or occasionally skipped | Most vitamins, supplements, stool softeners | 2–3 hours, or no escalation at all | Nobody, or a daily digest |

Tuning guidance:
- **Start loose, tighten later.** Week 2 should not be a week of false alarms. Begin at
  the long end of each range; shorten once you know their real rhythm.
- **A late tap is not a missed dose.** People take the pill, then tap the button five
  minutes later. Grace periods absorb that; don't set them so tight that normal humans
  trip them.
- **Two-stage for high-risk.** First a louder in-home nudge (repeat announcement,
  brighter TV card); *then* the caregiver message. Many "misses" are just "didn't hear
  it."
- **Cap the noise.** Configure escalations so you get at most one message per event, and
  a missed low-risk vitamin never pages anyone. Details in `ha/README.md`.

---

## 5. Refill and ordering workflow

This is where the Hermes **`medication-refill`** skill earns its place — as a *prep
assistant*, never a buyer.

### 5a. Weekly stock check
- [ ] **With Grocy**: the skill reads current stock and flags anything at or below its
      minimum. Do this the same day each week (tie it to the `daily-rhythm` skill).
- [ ] **Without Grocy**: the skill prompts a 60-second manual count — open the organizer
      and bottles, eyeball what's low. Log the counts so next week compares.
- [ ] Anything with fewer than ~7–10 days left goes on the refill list. Order before
      the last few days, not on empty — pharmacies and insurers add delays.

### 5b. Generate the refill list
The skill produces a plain list: medication, strength, pharmacy, Rx number, prescriber,
and whether refills remain or a new prescription is needed. **Review it yourself.** This
list is the input to one of the three ordering paths below — the skill hands it to a
human here and stops.

### 5c. Three ordering paths (pick per medication, per family)

**Path A — Call the pharmacy, with an agent-prepared script.**
Best when the elder is comfortable on the phone and you want them to stay independent.
- The `medication-refill` skill drafts a **call script**: the pharmacy number, "I'd
  like to refill prescription number ___," the Rx numbers, and what to do if they're
  told "no refills left" (ask the pharmacy to fax the doctor).
- The elder (or you) **places the call and speaks.** The agent prepared the words; a
  human dials and talks. Print the script big if the elder is making the call.

**Path B — Pharmacy website/app, with agent guidance.**
Best for a chain with a decent refill site and an elder who can follow steps on the
tablet.
- The skill walks through it as **instruction cards** — cast the steps to the TV or show
  on the kiosk (`tv-and-casting.md`): open the site, log in, find "Refill," enter each
  Rx number, choose pickup/delivery, confirm.
- **The elder taps the final Confirm**, or you do it beside them. The agent guides; it
  does not have the pharmacy login and does not press Confirm.

**Path C — Caregiver orders remotely.**
Best for high-stakes meds or when the elder would rather not deal with it.
- The family user asks Hermes from wherever they are ("what does mom need refilled?"),
  gets the reviewed list, and **you place the order** through your own pharmacy account
  or by calling.
- Then log it back so the household record and next week's stock check are accurate.

> **Repeat of the hard rule:** in all three paths, a *person* — elder, caregiver, or
> pharmacist — completes the order. The agent prepares scripts, fills forms up to the
> confirm step, and tracks stock. It does not hold payment credentials and does not
> submit orders unattended. If a future "just order it" convenience is ever proposed,
> it violates `docs/DECISIONS.md` D10 and this playbook.

---

## 6. Pill organizer + reminder combo

The reminder and the organizer solve *different* problems; use them together.

- **7-day (or 28-slot AM/PM) organizer** answers "did I already take today's?" — the
  question a reminder can't, once the reminder has been dismissed and forgotten.
- **Fill it on a fixed day** (e.g. Sunday) — a caregiver task, or a shared ritual. The
  weekly fill is *also* a natural stock check (§5a): if you can't fill a slot, you're
  low.
- **The reminder points at the organizer**, not the bottles: "Time for your morning
  pills — the Sunday-morning box." One place to look, pre-counted.
- For memory impairment, an **automatic locked dispenser** (beeps and releases only the
  current dose) is worth considering — see `docs/ROADMAP.md` for planned integration;
  today it's a standalone device that runs alongside, not through, this system.

---

## 7. What to log for the doctor visit

Bring data, not vibes. From the adherence records (HA history) plus HomeBox/Grocy,
assemble before an appointment:

- [ ] **Adherence summary**: which meds were missed and how often over the last month
      (the acknowledgment history gives you this).
- [ ] **The current, reconciled list** with strengths and times (§1) — doctors love an
      accurate list; it catches duplicate and discontinued meds.
- [ ] **Refill/timing friction**: anything that ran out early, caused side effects the
      elder mentioned, or that they quietly stopped taking.
- [ ] **Questions queued during the month**: have the elder or family drop these into
      the agent's memory as they come up, then print the list. Nobody remembers them in
      the exam room otherwise.

Hand this to the prescriber and update the master list (§1) with any changes the same
day, before the bottles and the record drift apart again.
