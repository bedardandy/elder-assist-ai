# Safety and wellness

**What you'll have when done:** a dignified "are they up and about?" check that watches
for *absence* of normal activity rather than surveilling them, a door-left-open and a
stove-timer nudge, a morning "I'm OK" ritual, an escalation chain that reaches the right
person without crying wolf, an opt-in location setup with real consent, and an emergency
info card both on the fridge and in the app.

**Time required:** ~45 minutes for the wellness/door/stove blueprints and the escalation
chain; ~20 minutes more if you enable location (plus a real consent conversation, not
counted here).

> **Read this line first: ElderAssist is NOT a medical alert system.** It has no camera
> and no fall detection (`docs/ARCHITECTURE.md`, "what we did NOT build"). If fall risk
> is real, buy a dedicated medical alert pendant — see §6. This playbook makes the house
> *helpful and aware*, not a monitor.

---

## 1. Wellness check — configure with dignity

The `wellness_check` blueprint watches for the **absence** of expected normal activity
(e.g. "no motion anywhere by 10am") and, only then, nudges — first the elder, then a
caregiver. Field-by-field setup is in `ha/README.md`; the human design choices are here.

### Sensor choice matters most
**Where** you place the motion sensor is a dignity decision, not just a coverage one:

- [ ] **Kitchen / hallway / main living area — yes.** Everyone passes through these in a
      normal morning. Detecting "they got up and moved through the house" needs nothing
      more.
- [ ] **Bedroom — avoid.** A bedroom sensor reads as being watched where people are most
      private, and it's a *worse* signal anyway (someone can be up and fine but not back
      in the bedroom). Kitchen motion beats bedroom motion on both dignity and accuracy.
- [ ] **Bathroom — never.** Not worth the intrusion; find the signal elsewhere.

The rule: pick the sensor that answers "did normal life happen this morning?" from the
**most public** room that reliably sees it. You want the *least* intrusive sensor that
still works.

### Tuning
- [ ] Set the check window to *their* rhythm — a late riser tripping a 9am check every
      day is noise that trains you to ignore it.
- [ ] First response is a **gentle in-home prompt** ("Good morning — tap here to say
      you're up"), not a caregiver alarm. Most "no motion" is "sensor missed them" or
      "sleeping in," not an emergency. Only escalate after the elder doesn't respond.

---

## 2. Door-left-open and stove-timer nudges

Two small, high-value safety patterns — helpful reminders, not alarms:

- **`door_left_open`** — a door (front, back, garage, or a fridge/freezer with the right
  sensor) left open past a threshold triggers a gentle reminder on speaker/tablet.
  - [ ] Choose which doors and a sensible delay (a few minutes — not so short it fires
        while groceries come in).
  - [ ] Decide if a *repeated* open-door escalates to a caregiver (front door open at
        night might; the fridge probably shouldn't page anyone).
- **`stove_timer_nudge`** — after the stove/burner has been on for a set time with no
  interaction, a friendly "is something still cooking?" nudge (optionally cast to the
  TV, `tv-and-casting.md`).
  - [ ] Set the duration to real cooking times so it doesn't nag during a normal roast.
  - [ ] This is a *nudge*, not a shutoff — it can't turn the stove off. Frame it that
        way and don't oversell it as fire prevention.

Both are HA blueprints (`ha/README.md`), deterministic by design (`docs/DECISIONS.md`
D10).

**Weather is a wellness issue too.** Heat waves and icy sidewalks put more elders in
the hospital than most of the hazards on this page. The `weather_safety` blueprint
announces heat-risk guidance on hot days, "the mail can wait" warnings on icy
mornings, and notifies the caregiver — configure it alongside the nudges above. The
full heat plan and ice plan (and the snow/plow workflow) live in
`neighborhood-and-seasons.md`.

---

## 3. The "I'm OK" morning ritual

Flip the wellness check from passive surveillance to an active, dignified check-in the
elder *owns*:

- A single big **"I'm OK / Good morning"** button on the kiosk (`pwa/README.md`). Tapping
  it each morning satisfies the wellness check — no caregiver notification needed.
- [ ] Teach it as *their* signal to the family ("this tells the kids I'm up and fine"),
      not a test they can fail. It's them reassuring *you*, on their terms.
- [ ] If they tap it, the day's check is done — no motion-sensor second-guessing.
- [ ] If they *don't* tap it by the window, the motion check (§1) is the backstop before
      anything escalates. Two soft signals before one caregiver alert.

This ritual is the most dignified version of wellness monitoring: the elder is a
participant, not a subject.

---

## 4. Escalation chain — design against alarm fatigue

The single biggest failure mode is **too many alerts**, until you tune them all out and
miss the real one. Design the chain deliberately:

- [ ] **Stage 0 — the house asks first.** Every check nudges the *elder* before anyone
      else (repeat announcement, big button). Most events resolve here.
- [ ] **Stage 1 — one primary caregiver.** If no response after the grace period, one
      message to one person (the Operator), over the channel they'll actually see
      (Signal/WhatsApp/SMS via Hermes/HA).
- [ ] **Stage 2 — a second person**, only if Stage 1 goes unacknowledged for a further
      window. This is your safety net for when the primary is asleep or driving.
- [ ] **Never blast everyone at once.** Simultaneous alerts to five people mean each
      assumes another is handling it, and all of them are annoyed. Sequential, with
      acknowledgment, beats parallel.

Anti-fatigue rules:
- **Match urgency to risk** — a left-open fridge is a whisper; no morning motion *and* no
  "I'm OK" tap is a real call. Don't send them at the same volume.
- **Acknowledgment stops escalation.** Once someone says "I've got it," the chain halts.
- **Review monthly.** If an alert has fired ten times and never mattered, it's
  miscalibrated — loosen or remove it. An ignored alert is worse than no alert.

Escalation targets and timing align with the medication escalations in `medication.md` —
keep them consistent so the family learns one mental model.

> **What v1 ships vs. what you design.** Be clear-eyed about the gap: the shipped
> blueprints send **one notification to one target** — fire-and-forget, no
> acknowledgment tracking, no read-receipts. The staged, sequential multi-person chain
> described above is a **design pattern you build**, not an out-of-the-box feature. To
> get Stage 2, you assemble it yourself — e.g. **duplicate the blueprint** with a second
> target and a longer grace, or point the escalation at an **HA notify group** — and you
> won't know whether Stage 1 was actually seen (there are no read-receipts). Plan the
> chain on paper, then wire it from these single-shot parts.

---

## 5. What this is NOT

State it plainly to the family and the elder:

- **Not a medical alert system.** No pendant, no fall detection, no 24/7 monitoring
  center.
- **Not fall detection.** "No motion by morning" is slow and indirect — it can be *hours*
  before a no-motion check even runs, and it can't tell a fall from a lie-in. Do not let
  anyone believe this catches falls.
- **Not a stove shutoff, not a lock, not a nurse.** It nudges and reminds; humans and
  real safety devices do the rest.

If the honest risk profile includes falls or medical emergencies, the responsible move
is to **add a real medical alert device** (§6) *alongside* ElderAssist, and tell the
family clearly that this system does not replace it.

---

## 6. If fall risk is real — get a real medical alert

Said plainly because it matters: for genuine fall or medical-emergency risk, buy a
**dedicated medical alert system** — a wearable pendant/watch with a monitoring service,
ideally with automatic fall detection and a waterproof button for the shower (where many
falls happen and where this system has no sensors anyway).

- ElderAssist and a medical alert **coexist** — one for daily help and connection, the
  other for emergencies. They don't conflict.
- Don't let "we have the smart-home thing" become a reason to *not* buy the pendant.
  That's the dangerous misread this section exists to prevent.
- Camera-free fall detection (mmWave radar) is on the roadmap (`docs/ROADMAP.md`) but is
  **research, not shipping** — it does not change today's recommendation.

---

## 7. GPS / location — opt-in, with re-checked consent

Location is **off by default** and requires a genuine yes (`onboarding.md` §2 consent
row; `docs/ARCHITECTURE.md` trust model). Enable it only after that conversation.

- **Setup**: install the **HA Companion app** on the elder's *own* phone and grant
  location (`ha/README.md` for the app-side steps). Location comes from their phone, not
  a tracker hidden on them.
- **Useful, dignified automations** (not tailing them):
  - [ ] **"Arrived safely"** geofence — an optional ping to a chosen family member when
        they get home (or reach a destination they asked to share), not a live map the
        family watches all day.
  - [ ] Leave live tracking off unless there's a specific, agreed reason (e.g.
        wandering risk with dementia — a different, weightier conversation).
- **Re-check consent.** Location is the feature most likely to drift from "helpful" to
  "surveilled." Revisit it periodically: is it still wanted, still off when it should
  be, still shared only with who was agreed? If in doubt, turn it off — the system works
  without it.

---

## 8. Emergency info card

When something goes wrong, the information has to be findable **without** the tablet or
the network — and also in the app for whoever's remote.

- [ ] **On the fridge (paper).** A printed **ICE** ("In Case of Emergency") card: the
      elder's name, key medical conditions and allergies, current medication list
      (from `medication.md`), doctor, pharmacy, and two emergency contacts with numbers.
      Big print. This is for paramedics and anyone in the house — it must not depend on
      power or Wi-Fi.
- [ ] **In the PWA Help page** (`pwa/README.md`). The same information behind the big
      **Help** button: contacts to call, the ICE details, and the plain reminder that
      **for an emergency, call 911** (`onboarding.md` cheat sheet).
- [ ] **Keep both in sync.** When meds or contacts change, update the fridge card *and*
      the Help page the same day. A stale emergency card is a dangerous one.

---

## 9. When the hub itself dies (the watchdog blind spot)

Be honest about this one: **no automation inside Home Assistant can tell you that HA
itself, or the whole hub, has died.** A crashed process, a pulled plug, a dead internet
line, a failed SD card — the box simply goes silent, and a stopped automation can't
report that it stopped. Every reminder and escalation in this repo depends on the hub
being alive, so a dead hub silently takes them all with it.

The fix is an **external dead-man's switch**: the hub pings a healthcheck service every
few minutes, and if the pings *stop*, that external service — not the hub — alerts the
caregiver.

- [ ] **Create a check** at [healthchecks.io](https://healthchecks.io) (free tier) or a
      self-hosted Healthchecks instance. Set the period to 5 minutes and a grace of
      ~10–15 minutes.
- [ ] **Point its failure alert at the caregiver** (email / SMS / push). *This* alert —
      "the hub hasn't checked in" — is the whole point.
- [ ] **Enable the ping in HA.** Uncomment the `rest_command: heartbeat_ping` +
      `automation: ElderAssist Heartbeat` block in `ha/packages/elder_assist.yaml`,
      paste your ping URL, and restart HA. It's shipped commented so the package loads
      with zero external dependencies until you opt in.

This costs nothing and closes the scariest gap: it catches the failure no in-house
automation ever can — the house going dark.
