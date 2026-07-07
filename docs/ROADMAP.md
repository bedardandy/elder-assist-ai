# Roadmap

An honest v-next list. Everything here is **deliberately not in v1** — either because it
carries real risk (safety-critical, hard to get right), needs upstream work that isn't
ready, or would balloon scope past "a strong starting kit a family can run"
(`README.md`, Status). Each item says roughly how much effort it is and *why it waited*.

The bar for v1 was: local-by-default, deterministic where it matters, and installable by
a motivated family member. Items graduate off this list when they clear that same bar.

Effort is a rough t-shirt size for a competent contributor: **S** (days), **M** (a
couple of weeks), **L** (a month-plus or needs upstream), **XL** (research-grade,
open-ended).

---

## Safety and sensing

### Camera-free fall detection (mmWave radar) — **L/XL**
60GHz mmWave sensors can detect falls and presence *without* a camera, addressing the
biggest gap in `docs/playbooks/safety-wellness.md` (§5/§6) while respecting the
no-camera principle.
- **Why not v1:** high stakes and high false-alarm cost — a fall detector that cries wolf
  gets muted, and a muted one is worse than none. It needs careful per-home calibration,
  and the HA integrations for these sensors are uneven. `docs/ARCHITECTURE.md` explicitly
  scoped camera-based detection out; radar is the promising successor but is still
  research, not shipping.
- **Until then:** the documented answer stays a **dedicated medical alert pendant**
  (`safety-wellness.md` §6). This feature does not change that recommendation until it's
  proven.

### Medication dispenser hardware integration — **M**
Integrate automatic locked pill dispensers (beep + release only the current dose) so the
`medication_reminder` flow can confirm a dose was physically *dispensed*, not just
acknowledged — closing the "the button says taken but is the pill in them?" gap in
`docs/playbooks/medication.md` (§3, §6).
- **Why not v1:** these devices have proprietary or absent APIs; most integration would
  be brittle reverse-engineering. Today the dispenser runs *alongside* the system, not
  through it.

---

## Voice and language

### Local Speech-to-Phrase for low-end hardware — **S/M**
A fixed-phrase, very-low-resource recognition path (`docs/DECISIONS.md` D3 notes it) so
the Minimum hardware tier (`docs/ARCHITECTURE.md`, 8GB, no GPU) gets fast, reliable
command recognition — "put on the news," "I took my medicine," "call Sarah" — without a
sluggish Whisper model.
- **Why not v1:** fixed-phrase only, so it can't do open-ended conversation; it's a
  *degraded mode* for weak boxes, and shipping it well means curating the phrase set and
  documenting the trade-off clearly enough that families don't expect full conversation.

### Multilingual voices — **M**
First-class support for non-English households: Piper voices and Whisper languages are
already configurable (`.env`: `PIPER_VOICE`, `WHISPER_LANGUAGE`), but the blueprints,
Hermes persona, playbooks, and the elder cheat sheet (`onboarding.md`) are
English-first. This item makes another language a supported, documented path end to end,
including mixed-language households (elder speaks one language, family another).
- **Why not v1:** the plumbing supports it, but *quality* localization is more than a
  language code — it's translated prompts, culturally appropriate phrasing, and testing
  with native speakers. Half-translated is worse than honestly English-only.

---

## Video and communication

### Self-hosted video: Matrix / Element Call — **M/L**
A self-hosted, Matrix-native video option (`docs/DECISIONS.md` D6 notes Element Call) as
an alternative to public meet.jit.si — for families who want calls that never touch a
third-party server.
- **Why not v1:** self-hosting real-time video is NAT-fraught and operationally heavy —
  exactly the burden `docs/DECISIONS.md` D6 chose to avoid by using public Jitsi rooms.
  Worth offering as an advanced path once it can be made turnkey; not a default a family
  should have to debug.

---

## Records and integration

### HomeBox ↔ Home Assistant sync — **M**
A tighter bridge so HomeBox items surface as HA entities (and vice versa): warranty-expiry
reminders as HA automations, "serviced" events on the HA timeline, a low-med-stock flag
from Grocy driving a reminder without going through the agent
(`docs/playbooks/memory-book.md`, `medication.md`).
- **Why not v1:** today Hermes bridges these by API on demand (`docs/ARCHITECTURE.md`,
  records layer), which is enough for queries. A *persistent* sync is a real integration
  with edge cases (conflict handling, deletes) that needs design before it's trustworthy
  for anything deterministic.

### Community blueprint gallery — **S/M**
A curated, versioned gallery of HA blueprints beyond the shipped seven
(`medication_reminder`, `appointment_reminder`, `wellness_check`, `door_left_open`,
`stove_timer_nudge`, `weather_safety`, `seasonal_chore_reminder`) — contributed
patterns like "no-fridge-open-all-day" nutrition checks, hydration nudges, with a
review process so families can trust what they import.
- **Why not v1:** the six core blueprints had to be solid and CI-validated first
  (`README.md`, Status). A gallery needs contribution guidelines, review, and a curation
  process to stay trustworthy — that's a community-process build, best done once there's
  a community.

---

## Scams, money, and paperwork

### Automated phone call screening — **L**
Answering-machine-style screening (Asterisk/FreePBX patterns) that intercepts unknown
callers before the phone rings, or an on-device robocall filter tied into the scam
shield (`docs/playbooks/scam-shield.md`).
- **Why not v1:** `docs/DECISIONS.md` D13 — blocking a grandchild's real call from an
  unrecognized number is a catastrophic trust failure, and screening infrastructure is
  heavy and brittle. Carrier-level scam blocking + the advice-only scam-check skill
  cover most of the value today. Revisit when a false-negative-safe design exists.

### Medicare / insurance paperwork helper — **M/L (research)**
Photograph an EOB, denial letter, or enrollment form; the vision model explains what it
actually says, what (if anything) is owed, and what the deadline is — the same
read-and-remind (never transact, D14) discipline as `bill-helper`.
- **Why not v1:** these documents are high-stakes and jargon-dense; a 7B local model
  misreading "this is not a bill" as a bill (or vice versa) causes real fear or real
  missed deadlines. Needs accuracy evaluation against real document samples first.

### Pharmacy price shopping — **M (research)**
GoodRx-style comparison for cash-price prescriptions, feeding the refill checklist.
- **Why not v1:** no stable open API; scraping is fragile and ToS-fraught. The refill
  playbook's "ask the pharmacist about the cash price and discount programs" line
  captures much of the value manually.

### Passive fridge/pantry camera inventory — **rejected, not deferred**
A camera watching the fridge to auto-track food would violate the no-passive-cameras
line (`docs/DECISIONS.md` D11) that the consent checklist promises permanently. The
user-initiated path (photograph the label, Grocy stock) is the supported design.

---

## How items leave this list

An item ships when it (1) works local-by-default or documents its egress as a labeled
toggle, (2) doesn't put a deterministic guarantee inside the LLM
(`docs/DECISIONS.md` D10), and (3) can be installed and understood by a motivated family
operator, not just its author. Anything safety-critical (fall detection, dispensers) also
has to clear a false-alarm and failure-mode review like the one behind
`docs/WARGAME.md` before it's recommended for real homes.
