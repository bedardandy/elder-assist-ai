# Onboarding — the human side comes first

**What you'll have when done:** a system the elder has agreed to, a written record of
what each feature shares and who said yes, a four-week rollout plan so nothing lands
all at once, clear roles (who admins, who's family, what the elder's account can do),
honest expectations on both sides, and a one-page cheat sheet printed and stuck to the
fridge.

**Time required:** 60–90 minutes for the conversation and consent checklist (do this
*before* you plug anything in). The rollout itself is spread over four weeks, ~30
minutes of setup per week.

> This is the most important document in the repo. The technology in `docker/`,
> `ha/`, `hermes/`, and `pwa/` is the easy part. Whether your parent trusts and uses
> it — and keeps their dignity while doing so — is decided here, before install.

---

## 1. The conversation before the technology

Have this face to face, with the elder, before you install anything. Not a demo — a
conversation. The goal is not to sell it. The goal is informed, unpressured agreement,
and to find out where *their* lines are.

### Dignity principles (read these to yourself first)

- **The assistant serves them, it does not watch them.** Everything is framed as "so
  you don't have to remember X," never "so we can check on you."
- **They choose.** Every feature below is opt-in. "No" to any one of them is a
  complete, respected answer — the rest of the system still works.
- **It's their house.** They can turn the microphone off, unplug the tablet, or say
  "take that off my TV" at any time, and that has to actually work. Show them how on
  day one.
- **Blame the computer, never the person.** When something fails — and it will — the
  script is "this thing is being dumb," never "you did it wrong." More on this in §5.

### A consent script you can actually say

Adapt the words, keep the substance. Cover all five in plain language:

1. **What it is.** "It's a helper that lives on a little computer here in the house. It
   can remind you about your pills, let you call us with one big button, put your shows
   on the TV, and answer questions. It runs *here* — it's not the internet company,
   it's ours."
2. **What it records.** "It listens only after you say the wake word, like 'OK Nabu' —
   not the rest of the time. When it does listen, the words are turned into text *on
   this box in your house* and then thrown away. It keeps notes on things you ask it to
   remember, and whether you took your medicine. It does **not** have a camera."
3. **Who can see what.** "I can see whether you took your pills, so I can help if a
   day gets missed. I can't hear your conversations. I can't see where you are unless
   you and I turn that on together, and it's off right now."
4. **What you get out of it.** "One button to call each of us. Your shows without the
   three remotes. Never getting a robocall about a refill again because it tells *me*
   to handle it."
5. **What you're in charge of.** "You can mute the microphone here" (show the button).
   "You can tell it to stop. If you ever hate it, we rip it out, no hard feelings."

### Listen for the real answer

If they say "sure, whatever you think" — that's not yes, that's deference. Slow down.
Ask which parts sound useful and which sound annoying. Write down what they veto. A
grudging install gets unplugged in a week; a chosen one gets used.

---

## 2. Consent checklist

Fill this in *with* the elder, out loud, one row at a time. Keep the filled-in copy —
it's your record of what was agreed, and your reference when someone later asks "wait,
can it see her location?" Nothing gets enabled unless the last column says **yes**.

| Feature | What it shares | With whom | Elder agreed? |
|---|---|---|---|
| **Voice assistant** | Audio, but only after the wake word. Speech is turned to text **on the hub** (`whisper` container) and discarded; no recording is stored or sent out. | No one — stays on the box | ☐ |
| **Medication tracking** | Whether each dose was acknowledged (taken / missed), and the times. Not what the medication is, to anyone outside the household. | Operator + Family users see adherence | ☐ |
| **Location sharing** | Approximate location / "arrived safely" pings from *their own phone*. **Off by default.** Requires installing the HA Companion app and a second explicit yes (see `safety-wellness.md`). | Family users, only if enabled | ☐ |
| **Wellness checks** | Motion *metadata only* — "there was movement in the kitchen by 10am," never where they were sitting or for how long. No cameras. | Operator + chosen Family user on a missed check | ☐ |
| **Conversation memory** | Notes the assistant keeps: preferences, "where I put the spare key," appointment details, names. Stored on the hub (Hermes memory). | Whoever can chat with the agent (Operator + Family) | ☐ |
| **Camera** | **NOT included in v1.** No video is captured anywhere in this system. Listed here so the answer to "is it filming me?" is a documented, permanent **no**. | Nobody — feature absent | n/a |

Notes for the operator:
- The **"With whom" column is a promise you are making.** If you later want to widen it
  (e.g. add a sibling as a Family user who can see adherence), that's a new
  conversation and a new checkmark, not a silent config change.
- Conversation memory is the sleeper item. People are fine with it until they picture a
  particular note being read aloud. Ask: "Is there anything you'd *not* want written
  down?" and honor it.

---

## 3. Week-by-week rollout

Going slow is a feature, not a delay. Each week adds one capability, on top of one that
already works and that they already trust. If a week doesn't stick, stay on it — don't
pile the next thing on a shaky foundation.

Do the technical install from `docs/INSTALL.md` once (it brings up the core stack); the
schedule below is about which features you *turn on and teach*, not re-installing.

### Week 1 — The kiosk and calling (the "why" of the whole thing)
Lead with the single most valuable, least intrusive feature: one-tap calling.
- [ ] Kiosk PWA running on the kitchen tablet (`pwa/README.md`; served on port `8880`).
- [ ] The Call button works: one giant photo-button per family member, tested from
      the receiving end (see `calling-and-video.md`).
- [ ] The elder successfully calls you, unprompted, at least once.
- [ ] Nothing else is enabled yet. No reminders nagging, no voice, no memory.
- **Goal:** they associate the tablet with "I can reach my kids easily," not "the
  monitoring thing."

### Week 2 — Reminders (the first automation they rely on)
- [ ] Medication reminders configured for their real medications (`medication.md`).
- [ ] Appointment reminders wired to a calendar (`appointment_reminder` blueprint).
- [ ] The acknowledgment ritual practiced together — the big "I took it" button, and/or
      saying so out loud.
- [ ] Escalation set *generously* at first (long grace period) so week 2 isn't a week
      of false alarms to you.
- **Goal:** a missed pill becomes rare, and the elder trusts the reminder without
  feeling policed.

### Week 3 — Voice
- [ ] Voice profile up (`docker compose --profile voice`; see `docs/INSTALL.md`).
- [ ] Wake word taught ("OK Nabu" by default) and practiced. Expect it to feel awkward
      for a few days — that's normal.
- [ ] The three commands worth memorizing first: ask the time/weather, "remind me…",
      and one TV command (`tv-and-casting.md`).
- [ ] Show the microphone mute control and confirm they can turn it off themselves.
- **Goal:** hands-free help for the moments a tablet is across the room.

### Week 4 — Memory book and the family agent
- [ ] HomeBox seeded with a first pass of appliances (`memory-book.md`).
- [ ] Hermes agent reachable by the family on Signal/WhatsApp/Telegram
      (`hermes/README.md`).
- [ ] Family practices the useful queries: "did mom take her meds today?", "add her
      cardiologist appointment next Tuesday," "what's the fridge model number?"
- [ ] Conversation memory turned on *if* it was agreed in §2.
- **Goal:** the family co-pilot — the same brain the elder uses, reachable by everyone
  from the apps they already have.

> If you can only do two weeks, do weeks 1 and 2. Calling and medication reminders
> deliver most of the value; everything after is enhancement.

---

## 4. Roles — who is who

Set these up during install. The core principle (from `docs/ARCHITECTURE.md` and
`docs/DECISIONS.md`): **the elder is the user, not the admin.**

| Role | Who | What they hold | What they can do |
|---|---|---|---|
| **Operator** | Usually one primary caregiver (you) | HA admin login, Hermes host access, `.env`, this repo | Everything: install, configure blueprints, add/remove users, see all data, run `scripts/backup.sh` |
| **Family user** | Siblings, spouse, other adult kids | A non-admin login and/or a chat channel to Hermes | Chat with the agent, add appointments, see medication adherence, receive escalations. **Cannot** change automations or add users |
| **The elder** | Your parent | Nothing to remember — the kiosk is PIN-less | Use the six buttons, talk to the voice assistant, mute the mic, call people. A **capability-scoped, non-admin** HA token drives their surfaces (see `docs/ARCHITECTURE.md`) so a tap can never wander into admin settings |

Rules of thumb:
- **One Operator, clearly named.** Two people both "sort of" admining leads to nobody
  owning the backups. Pick the person; others are Family users.
- **The elder's surface never asks for a password.** That's deliberate — a login screen
  is exactly the barrier this system exists to remove. Security comes from the token
  being capability-scoped, not from a PIN they'll forget.
- **Family users get the least access that does the job.** A sibling who just wants the
  "she took her meds" peace of mind doesn't need HA admin.

---

## 5. Honest expectations

Set these on both sides. Overselling is how these systems get resented and unplugged.

### What it genuinely cannot do
- **Understand every word.** Accents, mumbling, a dry mouth, background TV — the
  speech-to-text will mishear. It's good, not perfect. A weak-hardware setup (small
  Whisper model) misses more; see `docs/ARCHITECTURE.md#hardware-guidance`.
- **Replace human contact.** It reminds and connects; it does not visit. If the honest
  reason you want this is "so I can call less," reconsider — it works best as a reason
  to call *more* (one-tap video makes that easy).
- **Detect a fall.** There is no camera and no fall sensor in v1. It can notice "no
  movement in the kitchen all morning," which is *not* the same thing and is slow. If
  fall risk is real, buy a dedicated medical alert pendant. Said plainly in
  `safety-wellness.md`.
- **Make medical decisions.** It never advises dosage or diagnosis. It reminds and
  records; a human and a doctor decide (`docs/ARCHITECTURE.md`, trust model).
- **Order anything by itself.** The refill workflow always stops for a human to confirm
  (`medication.md`). No autonomous purchasing, ever.

### Failure etiquette (teach this to everyone, including yourself)
When the assistant flubs — mishears, reads the wrong reminder, can't find the show:
- **Blame the computer, out loud.** "Ugh, it's being dumb today," not "you have to
  speak clearly." The elder must never feel the failure was theirs, or they'll stop
  trying.
- **Have a fallback that always works.** The tablet's Call button doesn't depend on
  voice or the LLM. If everything else is confusing today, they can still reach you.
- **Log the real misses, laugh off the rest.** A recurring mishear is worth fixing
  (`ha/README.md`, or swap the Whisper model). A one-off is just Tuesday.
- **Never debug in front of them at length.** If it needs fixing, note it and move on;
  a 20-minute caregiver troubleshooting session at their kitchen table turns "my
  helper" into "my kids' project that I'm the guinea pig for."

---

## 6. Cheat sheet for the elder (print this page)

Print this section, big, and tape it where the tablet lives. Everything here works with
zero passwords. This is the whole system, as far as they need to know.

---

### 📋 MY HELPER — HOW TO USE IT

| To do this… | Do this |
|---|---|
| **Call my family** | Tap the big **Call** button, then tap their photo |
| **See my reminders** | Tap the big **Reminders** button |
| **Say I took my medicine** | Tap the green **I took it** button when it asks — or say *"I took my medicine"* |
| **Ask a question** | Say *"OK Nabu"*, wait for the beep, then ask |
| **Put on the TV** | Tap **TV**, then the show — or say *"OK Nabu, put on the news"* |
| **Find one of my things** | Tap **My Things**, or ask *"OK Nabu, where is the spare key?"* |
| **Get help / see who to call** | Tap the big **Help** button |
| **Make it stop listening** | Press the **microphone mute** button |

**If it's being silly:** it's the computer, not you. Tap **Call** and reach us the
normal way — that button always works.

**Emergency:** this is not a medical alarm. For an emergency, call **911**.

---

*Operator: keep your filled-in §2 consent checklist with your records. Revisit §2 any
time you want to enable location or widen who sees what — that's a new conversation, not
a quiet setting change.*
