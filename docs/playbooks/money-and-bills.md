# Money and bills — read and remind, never pay

**What you'll have when done:** a dead-simple way to photograph a bill and get a due-date
reminder, a written inventory of every recurring bill and when it lands, an opt-in and
dignified way for family to see due dates (not account numbers, not balances), a deliberate
autopay strategy that cuts both missed bills *and* scam exposure, a weekly digest that
surfaces the early signs of financial trouble, and pointers to the real legal tools — set up
with a lawyer, not this repo.

**Time required:** ~45 minutes to build the bills inventory and wire the first few due-date
reminders; ~30 minutes for the autopay-strategy conversation with the family; the legal-tools
step is a separate appointment with an attorney.

> **The hard rule, first, because it's the whole design (`docs/DECISIONS.md` D14): the
> assistant reads, extracts, schedules, and reminds — a *human* pays. Always. There are no
> stored account numbers, no saved card details, no bill-pay integration, no "just this once."
> That is a deliberate trust boundary, not a missing feature.** A system that can't move money
> can't be *tricked* into moving money, can't be breached into moving money, and can't quietly
> drain an account through a bug. The elder and the family should hear this plainly: *this thing
> literally cannot pay a bill or send a dollar — that's on purpose, and it's what makes it safe
> to let it near your finances at all.*

---

## 1. The bill photo workflow

The everyday loop, powered by the Hermes **`bill-helper`** skill and the local vision model
(`docs/DECISIONS.md` D11):

- **Photograph the bill** with the **"Read Something For Me"** camera on the kiosk Ask page
  (`pwa/README.md`), or send a photo to Hermes in chat (`hermes/README.md`). The vision model
  runs on the hub — the bill never leaves the house.
- **The agent extracts** payee, amount, and due date, and **shows the raw text it read** so a
  human can verify it (the D11 honesty rule — a 7B vision model can misread a due date, so it
  never hides what it saw). "I read this as: PG&E, $142.60, due July 22 — is that right?"
- **You (or the elder) confirm.** On a "yes," the agent creates a **due-date reminder** — a
  Home Assistant calendar/reminder entry (deterministic, `docs/DECISIONS.md` D10), announced a
  few days ahead and again the morning it's due, on speaker + kiosk + optionally the TV card.
- **A human pays** — by whatever channel that bill uses — and marks it paid. The reminder's job
  was to make sure the bill *surfaced*, not to pay it.

That's it. The value is that no bill quietly slips behind the fridge and turns into a late fee
or a shutoff notice — without handing any software the keys to the money.

---

## 2. Build the bills inventory

Reminders are only as good as knowing what to expect. Spend 45 minutes cataloguing the
recurring bills once. This lives in the household memory (Hermes) and/or a HomeBox item —
record the **cadence and payee, never the account credentials** (same discipline as the
important-papers pattern, `memory-book.md` §5).

Fill in a table like this for the household:

| Bill | Payee | Cadence | Typical amount | Usually due | Autopay? (§4) | Notes |
|---|---|---|---|---|---|---|
| Electric | | Monthly | (varies) | | | variable — keep manual+reminded |
| Gas / heating | | Monthly / seasonal | (varies) | | | |
| Water / sewer | | Monthly or quarterly | | | | |
| Phone / internet | | Monthly | (fixed) | | | fixed — autopay candidate |
| Homeowner / renter insurance | | Annual or semi-annual | (fixed) | | | big, infrequent — easy to forget |
| Auto insurance | | Semi-annual | (fixed) | | | |
| Property tax | | Semi-annual / annual | (large) | | | large & infrequent — flag hard |
| Trash / HOA | | Monthly / quarterly | | | | |
| Medications / medical | | Varies | | | | ties to `medication.md` |

- [ ] The **infrequent big ones** — property tax, insurance premiums — are the dangerous
      forgetters precisely because they don't come monthly. Give them a reminder with a long
      lead time (weeks, not days).
- [ ] Note which are **fixed** (same amount every time) vs **variable** (utilities) — that
      split drives the autopay strategy in §4.

---

## 3. Consent — bill visibility for family

Financial data is its own consent row in `onboarding.md` §2, gated by the **`BILLS_FAMILY_VISIBLE`**
flag. Off by default. Turn it on only after a real conversation.

### The dignity conversation: visibility ≠ control

This is the money version of the whole system's dignity principle. Say it clearly:

> "This would let me *see* when your bills are due — just the due dates, so if one's about to
> be missed I can give you a nudge. It doesn't let me pay them, move your money, or see your
> balances or account numbers. You're still in charge of every dollar. It's a second set of
> eyes, not a set of hands."

- **What `BILLS_FAMILY_VISIBLE` shares:** due dates and payees the elder photographed — the
  *calendar* of bills. **Not** balances, not account numbers, not payment credentials (there
  are none stored, per D14).
- **It is opt-in and reversible.** Like every consent row, widening it later (adding a sibling)
  is a new conversation and a new checkmark, not a silent config change (`onboarding.md` §2).
- **Watch for deference.** "Sure, whatever's easier" isn't a yes to financial visibility. Money
  is where people most feel the difference between *helped* and *managed*. If they hesitate,
  leave it off — the reminders still work for *them* without family visibility.

---

## 4. Autopay strategy — cut missed bills *and* scam surface

Autopay isn't all-or-nothing. The smart split reduces both failure modes at once — the missed
bill *and* the fraudulent or wrong charge you didn't catch. The rule of thumb:

- **Autopay the fixed, recurring bills — at the *bank*, not the biller.** Phone, internet,
  insurance premiums, trash — anything that's the same amount every cycle. Set these up through
  the elder's **bank bill-pay**, which pushes a fixed payment on a schedule, rather than handing
  each company a card number to pull whatever they like. Fewer credentials scattered across
  vendors = smaller attack surface, and the bank's own fraud protections sit in front.
- **Keep the *variable* bills manual + reminded.** Electric, gas, water — anything that changes
  month to month. Autopaying a variable bill means a billing error, a leak, or a fraudulent
  spike gets pulled silently before a human ever looks. Keep these on the photo → confirm →
  remind → human-pays loop from §1, so a *person* eyes the amount every time.

Why this beats "autopay everything":
- It **prevents missed bills** on the boring fixed ones nobody wants to think about.
- It **preserves a human check** on exactly the bills where a wrong or fraudulent amount would
  show up — the variable ones.
- It **shrinks the number of companies holding a card number**, which is one of the quieter
  fraud exposures for an older adult with a long financial history.

Decide it bill by bill, in the §2 table's autopay column. There's no universal answer — a
household drowning in late fees leans more autopay; one worried about fraud leans more manual.

---

## 5. Signs of financial trouble the weekly digest can surface

The `bill-helper` skill can fold a short financial note into the weekly digest — but be honest
about the line between **what the agent can flag** and **what a human still has to watch for.**

**What the agent can flag (from what it's been shown):**
- [ ] A **bill photographed twice**, or a payment logged twice — a possible duplicate.
- [ ] An **amount well outside the usual range** for a variable bill ("the electric bill is 3×
      last month's").
- [ ] A **due date approaching with no 'paid' mark** — the core missed-bill catch.
- [ ] A bill from a **payee that's never appeared before** — worth a second look (see
      `scam-shield.md` for fake-invoice scams).

**What only a human can catch (because the agent never sees the accounts — D14):**
- Money *leaving* accounts the agent doesn't have eyes on — the assistant can't see balances or
  transactions, by design. **Bank transaction alerts** (`scam-shield.md` §5b) are the tool for
  that, not this system.
- Behavioral change: unopened mail piling up, sudden secrecy about money, new "friends" or
  "advisors," charges to unfamiliar companies. These are the early signs of both cognitive
  decline and active exploitation, and they're a family's job to notice, gently.

The digest is a smoke detector for the paperwork the elder chooses to share — not a full audit
of their finances. Say so, so nobody over-trusts it.

---

## 6. Legal and financial tools — done right, with a lawyer

At some point the family should put real legal instruments in place. This repo is **not legal
advice**, and the details vary by state — the pointers below are so you know what to *ask a
qualified elder-law attorney about*, not a substitute for one.

- **Durable Power of Attorney (POA) for finances.** Lets a trusted person manage money if the
  elder can't — the single most important document to have *before* it's needed, because once
  capacity is in question it's far harder to set up. A lawyer drafts it to fit the state and the
  family; a form off the internet often isn't honored by banks.
- **Trusted contact on financial accounts.** The lightweight, no-control option covered in
  `scam-shield.md` §5b — a person the institution may *call* about suspected fraud or decline,
  without any authority over the account. Set this up now regardless; it's free and reversible.
- **Talk to an elder-law attorney about the rest** — wills, healthcare proxy, whether a trust
  makes sense, how POA interacts with the bank's own forms. Many Area Agencies on Aging
  (`neighborhood-and-seasons.md`) can point to low-cost legal help for seniors.

> **Say it plainly to the family: this playbook and this software do not give legal or
> financial advice, and nothing here replaces an attorney.** The system's job stops at reading a
> bill and reminding a human. Who has authority over the money is a legal question for a lawyer,
> settled on paper, ideally while the elder can fully take part in the decision — which is the
> most dignified time to do it.
