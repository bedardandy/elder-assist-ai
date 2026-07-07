# Scam shield — the money-safety layer

**What you'll have when done:** two golden rules the elder can recite in their sleep, a
one-tap way to run any suspicious call, text, or piece of mail past the assistant *and*
loop you in, the bank and phone and mail defenses that actually reduce the attack surface
set up on the family side, and a calm, blame-free runbook for the day something slips
through — because sometimes it will.

**Time required:** ~30 minutes for the two-rules conversation and teaching the Read /
"Is this a scam?" flow; ~1–2 hours on the family side to set up bank alerts, mail
reduction, and phone blocking (much of it waiting on hold). The drills are ongoing and
should feel like a game, not homework.

> **Read this to the family first, before you read anything to the elder.** People who
> get scammed are not stupid, and treating them as if they were is how you guarantee
> they'll hide the next one from you. These are professional criminals running scripts
> refined on millions of victims, engineered to hijack the exact instincts — trust,
> urgency, love, fear — that make someone a good parent and a good neighbor. Shame is the
> scammer's best friend: a victim who's ashamed doesn't report, doesn't warn others, and
> is measurably *more* likely to be hit again. The whole point of this playbook is to make
> "let me check this with someone" a normal, no-stakes reflex — for everyone in the family,
> including you.

---

## 1. Why elders are targeted (professionals, not fools)

Say this part out loud, to the elder and to yourself:

- **They're not targeted because they're gullible — they're targeted because they're
  reachable, polite, and have assets.** Retirees answer the phone. They were raised to be
  courteous to a caller. They may have a house, savings, good credit, and Medicare — a
  full deck for a criminal to play. That's the profile, and it has nothing to do with
  intelligence.
- **These are industrial operations.** Call centers with scripts, A/B-tested wording, spoofed
  caller ID, and follow-up teams. Judges, professors, and former bank executives get taken.
  "I would never fall for that" is exactly the confidence they're counting on.
- **The tell is emotional, not logical.** Every scam manufactures a feeling — panic ("your
  grandson is in jail"), fear ("the IRS is sending police"), greed ("you won"), or love
  (romance) — because a person feeling something urgent stops thinking clearly. The
  assistant's job, and yours, is to insert a pause into that feeling.

So the family rule is the same as everywhere else in this system: **blame the criminal,
never the person.** Nobody in this house "should have known better." The scripts are built
so that knowing better isn't enough — which is why we drill the two rules below instead of
relying on being clever in the moment.

---

## 2. The two golden rules — drill these until they're reflex

Everything else is detail. If the elder remembers only two things, make it these. Print
them big; tape them by the phone.

> ### 🛑 RULE 1 — Nobody legitimate is ever paid with gift cards, wire transfers, or crypto.
> The IRS, Medicare, the power company, the police, Amazon, Apple, your bank, your
> grandson's lawyer — **none** of them will *ever* ask for a gift card, a wire transfer,
> a payment app, or cryptocurrency. Not one, not ever. The instant anyone who contacted
> *you* wants to be paid that way, it is a scam. Full stop. This single rule stops the
> majority of the money loss.

> ### 🛑 RULE 2 — Real organizations wait. Scammers rush.
> "Act now, or else." "Don't hang up." "Don't tell anyone." Urgency is the weapon.
> A real bank, agency, or family member is *fine* with "let me call you back" or "let me
> check with my daughter first." Anyone who won't let you slow down and verify is telling
> you, in the clearest possible language, that they're a scammer. **When in doubt, hang up
> and call back on a number you looked up yourself** — never the number they gave you.

A third rule for the family to internalize: **"Don't tell your family" is itself a red
flag.** Isolation is step one of every scam. The assistant is trained to treat "keep this
secret" as a warning sign, not a confidence to honor — and so should you.

---

## 3. Know the plays — the scam taxonomy

You don't need to memorize these; the assistant knows them. But recognizing the *shape* of
a scam is the fastest defense. Each has a tell.

| The scam | How it opens | The tell |
|---|---|---|
| **Grandchild in trouble** | Call/text: "Grandma, it's me, I'm in jail / in an accident / arrested abroad — I need bail money, and please don't tell Mom." | Secrecy + urgency + a payment method you can't reverse. Hang up and call the grandchild directly on their real number. |
| **IRS / SSA / Medicare** | "You owe back taxes / your Social Security is suspended / your Medicare card is being cancelled — pay now or face arrest." | These agencies **contact you by mail first** and never demand instant payment by phone, never by gift card, never threaten immediate arrest. |
| **Tech-support pop-up** | A scary full-screen "VIRUS DETECTED — call Microsoft/Apple at this number" with a siren, or a cold call claiming to be tech support. | Real tech companies don't cold-call you or put a phone number in a virus warning. Never let anyone you didn't call have remote access to the computer. |
| **Utility shutoff** | "This is the power/water/gas company — your service will be cut off in 30 minutes unless you pay right now." | Real utilities send written notice and offer normal payment channels; they don't demand a gift card in the next half hour. Hang up, call the number on your actual bill. |
| **Lottery / sweepstakes / prize** | "You've won! Just pay the taxes/fees first to release your prize." | You can't win a lottery you didn't enter, and no real prize requires you to pay money to receive it. Money only flows *to* you, never first from you. |
| **Romance** | A warm online relationship — often over weeks or months — that eventually needs money for an emergency, a plane ticket, or an "investment." | They can never video-call or meet, and there's always a reason they need money and can't get it themselves. Slow-burn, so the family often sees it before the elder does. |
| **Contractor at the door** | "We were doing your neighbor's roof/driveway and noticed yours needs work — cash discount if you decide today." | High-pressure, cash-only, today-only, unsolicited. Real contractors give written estimates and let you get a second one. |

Whenever the elder isn't sure which of these they're looking at — or whether it's a scam at
all — that's exactly the moment for §4.

---

## 4. How to use the system

The assistant runs the Hermes **`scam-check`** skill: advice-only, family-in-the-loop,
never autonomous (`docs/DECISIONS.md` D13). Three ways to reach it, matched to how the scam
arrived:

- **Mail or a letter → photograph it with the Read button.** On the kiosk Ask page, the
  **"Read Something For Me"** camera (`pwa/README.md`) sends the photo to the local vision
  model. "Is this real, or should I be worried about it?" The agent reads the text, runs the
  red-flag checklist, and gives a plain-words verdict. Nothing leaves the house — the photo is
  processed on the hub (`docs/DECISIONS.md` D11).
- **A text message → forward it to the agent.** In the Signal/WhatsApp/Telegram chat with
  Hermes (`hermes/README.md`), the elder or a family member forwards the suspicious text and
  asks. The agent analyzes the wording, links, and sender.
- **A phone call → tell the agent about it.** Either while it's happening ("someone's on the
  phone saying they're from Medicare and I owe money — is that real?") or after. The safe move
  is always: **tell the caller "I'll call you back," hang up, and ask the assistant.** A real
  caller doesn't mind. The tile is right there.
- **The fast panic button: the "Is this a scam?" tile on the Help page.** One tap on the kiosk
  (`pwa/README.md`) opens the scam-check flow and offers, in the same breath, to **loop you
  in** — the caregiver gets the message with one more tap. This is the single most important
  button in this playbook: it turns "I'm not sure and I'm embarrassed to ask" into one tap.

What the agent will and won't say (the D13 guardrails, so you can trust it):
- It **never says "definitely safe."** The most it will say is "I don't see red flags, but
  check with {caregiver} before sending any money or sharing any numbers."
- It **never shames.** Its tone is "these fool everyone, good instinct to check."
- It **always offers to loop in the caregiver** — one tap or word.
- It **never answers a call, deletes mail, or acts on its own.** It advises; a human decides.

Teach it as a habit, not an emergency tool: *any* money request, any "act now," any stranger
who called *them* → check first. Checking is free, and it's never annoying.

---

## 5. Family-side setup — the defenses that actually work

The assistant is the last line, not the only line. Most fraud loss is prevented upstream, by
the family, once. Work through these.

### 5a. The money-talk conversation (do this like the onboarding consent talk)

Frame it as protecting *everyone*, not policing them — model it on the dignity approach in
`onboarding.md` §1. A script you can adapt:

> "The scammers targeting people our whole family's age have gotten really good — they've
> fooled judges and bankers. So I want us to have a rule that protects all of us: before
> anybody in this family sends money to someone who contacted *them* first, we run it past
> one other person. Not because anyone's not sharp — because that pause is the one thing
> the scammers can't beat. Deal?"

Make it mutual: you agree to run *your* suspicious things past *them* too. A two-way rule
isn't surveillance; a one-way rule is.

### 5b. Bank protections that actually exist

Call the bank (or do it in-branch, with the elder, on their accounts, with their consent).
Ask specifically for:

- [ ] **Transaction alerts.** Text/email/push on any transaction over a set amount, any
      wire, any international charge. Route a copy to a trusted family member if the elder
      agrees. Early warning beats after-the-fact.
- [ ] **A "trusted contact" on the account.** FINRA and most banks let an account holder name
      a **trusted contact** the institution may call if they suspect fraud or diminished
      capacity. It does **not** give that person control — it just gives the bank someone to
      warn. Low-friction, high-value, dignity-preserving.
- [ ] **View-only / read-only access** for a family member, where offered — visibility without
      the ability to move money. (Visibility ≠ control — same principle as `money-and-bills.md`.)
- [ ] **The bank's own elder-fraud team.** Most large banks now have a dedicated financial
      abuse / elder-fraud unit and can flag an account for extra scrutiny on unusual transfers.
      Ask for it by name and get the direct number for the runbook in §6.

### 5c. Mail reduction — shrink the paper attack surface

Less junk mail means fewer fake invoices, prize letters, and prescreened-credit offers for a
scammer (or a confused moment) to exploit.

- [ ] **DMAchoice** — [dmachoice.thedma.org](https://www.dmachoice.org/) — opt out of a large
      swath of marketing mail (small one-time fee, lasts years).
- [ ] **Opt out of prescreened credit/insurance offers** — [optoutprescreen.com](https://www.optoutprescreen.com/)
      or **1-888-567-8688** (1-888-5-OPT-OUT), run by the credit bureaus. These pre-approved
      offers are a favorite for identity theft; opting out for five years or permanently is
      free.

### 5d. Phone defenses

- [ ] **Turn on the carrier's free scam blocking.** Every major US carrier now offers free
      spam/scam call labeling and blocking (AT&T ActiveArmor, Verizon Call Filter, T-Mobile
      Scam Shield). Enable it on the elder's line.
- [ ] **Consider contacts-only ringing during certain hours** — most phones can silence calls
      from unknown numbers (they still go to voicemail). **The trade-off, stated honestly:** a
      new doctor's office, a pharmacy callback, or a legitimate stranger goes to voicemail too.
      Good for an elder overwhelmed by robocalls; wrong for one who's waiting on real calls from
      unknown numbers. Decide together, and know it's reversible.

### 5e. Where to report (teach the family these exist)

Reporting doesn't usually recover money, but it feeds law enforcement and — importantly —
takes the shame out of it. Keep these where the family can find them:

- [ ] **FTC** — [reportfraud.ftc.gov](https://reportfraud.ftc.gov/) or **1-877-382-4357**
      (1-877-FTC-HELP). The front door for scams and identity theft.
- [ ] **Your state Attorney General's consumer-protection office** — search "[state] attorney
      general consumer complaint." They pursue local scams and contractor fraud.
- [ ] **AARP Fraud Watch Network Helpline** — **877-908-3360** — free guidance *and* emotional
      support for a target or victim; you don't have to be a member.
- [ ] **Medicare fraud** — **1-800-MEDICARE** (1-800-633-4227), or your **Senior Medicare
      Patrol** at **877-808-2468**, for anything touching Medicare cards or billing.

---

## 6. If it already happened — the no-blame runbook

Sometimes one gets through. The worst thing the family can do is make the elder feel stupid —
that's how you ensure they hide the next one, and there is very often a next one. Lead with
"I'm so glad you told me — these fool everyone," then move fast, in this order:

- [ ] **Call the bank's fraud department immediately.** Speed is everything — a wire or transfer
      caught within hours can sometimes be reversed; a day later, rarely. Use the direct
      elder-fraud number you saved in §5b. If a card is involved, freeze/replace it now.
- [ ] **Save all the evidence.** Don't delete anything: the texts, emails, the caller's number,
      gift-card numbers and receipts, wire confirmations, screenshots. This is what any
      investigation or reimbursement claim runs on.
- [ ] **Report to the FTC** at [reportfraud.ftc.gov](https://reportfraud.ftc.gov/) and, if a
      federal crime, the **FBI IC3** at [ic3.gov](https://www.ic3.gov/). If you'll seek
      reimbursement (from a bank, gift-card issuer, or insurer), **file a police report** — many
      claims require the report number.
- [ ] **Change credentials and watch the accounts.** If any login, SSN, or account number was
      shared, change passwords, consider a credit freeze at all three bureaus, and watch
      statements closely for the next several months.
- [ ] **Brace for the recovery scam — this is critical.** Fraudsters sell and re-target lists of
      known victims. Within weeks, someone will call claiming to be a "recovery agent," "law
      firm," or "government fund" who can get the lost money back — **for a fee.** It is a
      second scam aimed squarely at the person still reeling from the first. Warn the elder
      explicitly: **nobody legitimate charges an upfront fee to recover scammed money.** Feed it
      straight back into Rules 1 and 2.

Then, gently, treat it as data, not a verdict: which rule got bypassed, and does a defense in
§5 need tightening? Not a lecture — a tune-up.

---

## 7. Drill it — make it a game, not a test

Skills you never practice evaporate under pressure, and pressure is the scammer's whole game.
Keep the reflexes warm without ever making the elder feel quizzed:

- [ ] **Role-play a fake IRS (or grandchild) call at a family dinner.** One person plays the
      scammer, laying on the urgency; everyone — elder included — practices saying the magic
      words: *"I'm going to hang up and call back on a number I look up myself."* Make it funny.
      Whoever spots the tell first wins.
- [ ] **Share the scam of the week.** When *you* get a scam text (you will), show it to them:
      "Look at this junk I got — see the fake urgency?" It normalizes the topic and quietly
      says *this happens to me too*, which dissolves the shame.
- [ ] **Praise every check-in, especially the false alarms.** When they run a *legitimate*
      call past the assistant "for nothing," celebrate it: "That's exactly right — checking is
      always the smart move." You are training the reflex, and false alarms are the reflex
      working. Never, ever make them feel silly for asking.
- [ ] **Re-drill after any real attempt or any cognitive change.** Same rule as consent
      (`onboarding.md` §5): what was solid last year may need refreshing now.

The goal isn't a parent who can pass a scam quiz. It's a household where "let me check this
first" is as automatic as looking both ways — and where nobody is ever ashamed to ask.
