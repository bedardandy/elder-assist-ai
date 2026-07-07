# Food and kitchen — labels, expiry, and what's for dinner

**What you'll have when done:** a one-tap way to read a tiny label or a faded expiry date out
loud, a *small* food-tracking habit that actually sticks (the fridge and the meds, not the whole
pantry), a weekly "eat these first" nudge so food gets used before it's wasted, a grocery
workflow the family can drive without taking away the elder's independence, and a little
delight — "what can I make with this?" — that's honest about its own limits.

**Time required:** ~20 minutes to teach the Read button and the throw-it-out rule; ~30 minutes
to set up a *deliberately small* Grocy scope if you want stock tracking; ongoing seconds when
something's bought or used.

> The kitchen is where the vision model (`docs/DECISIONS.md` D11) earns its keep on small print,
> and where the temptation to over-track is strongest. **Start smaller than you think you should.**
> A food-inventory system the family abandons in three weeks is worse than none, because now the
> data is *wrong* and someone trusts it. This playbook is biased toward the smallest thing that
> helps.

---

## 1. Reading labels and expiry dates (the Read button)

Tiny type, faded date stamps, ingredient lists, cooking instructions, "is this the low-sodium
one?" — the exact things aging eyes struggle with. The Hermes **`label-reader`** skill plus the
local vision model handle it.

- **Photograph it** with the **"Read Something For Me"** camera on the kiosk Ask page
  (`pwa/README.md`), or send a photo to Hermes in chat. Processed on the hub — the photo never
  leaves the house (`docs/DECISIONS.md` D11).
- **It reads it back** — the label text, the date, the instructions — in plain, spoken words.

### The honesty rule — verify dates yourself (D11)

Be straight with the elder and the family about this, because food safety is involved:

- **A 7B-class vision model is not perfect on tiny, embossed, or faded date stamps.** So the
  skill is built to **show you the raw text it read** and to say *"I'm not sure — can you take a
  closer photo?"* rather than guess a date (`docs/DECISIONS.md` D11). It's an aid to tired eyes,
  not an oracle.
- **The model shows you what it read; a human makes the call.** Treat its answer as "here's what
  I *think* it says," then verify on the package.
- [ ] **Teach the fallback rule out loud: when in doubt, throw it out.** Cheaper than a stomach
      bug, and it removes any pressure to trust a shaky reading of a date. For the elder, this is
      liberating — they don't have to squint and agonize; unsure = toss.

---

## 2. Pantry inventory with Grocy — start small (this is the whole trick)

Grocy (`grocy` profile, port `9283`) can track food stock and best-before dates
(`memory-book.md` §3). The failure mode is trying to inventory the *entire* kitchen — it's hours
of data entry that decays the moment someone buys groceries without logging them, and an
abandoned inventory that says you have milk when you don't is actively harmful.

**So scope it deliberately small at first:**

- [ ] **Just the fridge + the meds.** The fridge is where food actually spoils and where "is this
      still good?" matters most; medication stock is already tracked for refills (`medication.md`).
      That's the high-value 10%. Leave the shelf-stable pantry (cans, pasta, rice) *out* — it
      lasts, so tracking it earns nothing.
- [ ] **Add the handful of always-on staples** they never want to run out of — coffee, milk,
      their cereal — with a minimum-stock alert. Not everything. The five things that ruin a
      morning if they're missing.
- [ ] **Use Grocy's barcode scanning** for entry — the Grocy web UI scans a product barcode from
      the tablet/phone camera and fills in the product, which is far faster than typing. Best-before
      dates still get entered by hand (or read via §1).
- [ ] **Only expand if the small version is still alive after a month.** If the fridge scope has
      stuck and the family wants more, grow it. If it's already drifting, shrink it, don't push.

Grocy is entirely optional — if this sounds like more than the household will keep up, **skip it**
and rely on the Read button (§1) and eyeballs. Don't add a system nobody maintains
(`memory-book.md` §3, same warning).

### The "eat these first" nudge

The payoff of the small Grocy scope: a **weekly Hermes reminder** reads Grocy's best-before dates
and nudges *"these are getting old, use them this week"* — the fridge items about to turn. It's a
gentle waste-reducer and a small prompt toward using what's on hand, tied to the household's
daily/weekly rhythm reminders. This nudge is the main reason the fridge scope is worth keeping.

---

## 3. Grocery workflow — help without taking over

Groceries are a place where it's easy to quietly strip an elder's independence. Offer options
along a spectrum and let the household pick what fits — and note that in every case, **the agent
drafts the list; a human places the order** (`docs/DECISIONS.md` D14 — no autonomous purchasing).

- **Family shops from a shared list.** Grocy maintains a **shopping list** (auto-added from
  low-stock staples, plus items the elder or family add by voice: "we're out of coffee"). A family
  member pulls it up and shops — in person or online. Simplest, most human, keeps everyone in the
  loop.
- **Delivery service with a caregiver-managed account.** For an elder who can't easily get out,
  set up a grocery-delivery account **held and paid by the caregiver** (the elder isn't managing a
  login or a card). The agent can **draft the order list** from the shopping list and low stock,
  but **a human reviews and places it** — the account and the payment stay with a person (D14).
- **The elder orders with guidance.** If they're comfortable, the agent walks them through the
  store's app as instruction cards (like the refill flow, `medication.md` §5c) and **they tap the
  final confirm.** The agent guides; it doesn't hold the login or press buy.

Pick per household, and revisit it — the right level of help changes over time, and "we made it
easier" lands better than "we took that over" (`onboarding.md` §5).

---

## 4. "What can I make?" — a delight feature, honestly limited

A small joy: the elder photographs the inside of the fridge and asks *"what can I make with
this?"* The vision model identifies what it can see and the agent suggests a couple of simple
meals. It's a nice moment — and worth setting expectations on so it delights instead of
disappoints:

- **Honest about the VLM's limits.** It'll miss things tucked behind others, guess wrong on a
  wrapped leftover, and can't read a use-by date through a fridge shelf. It's a *fun starting
  point* — "oh, I could do an omelet" — not a reliable inventory. Frame it that way.
- **It pairs with, not replaces, §2.** The photo sees what's visible *now*; Grocy knows what's
  tracked. Neither is complete. Together they're a decent nudge toward "use what's here."
- **Keep it light.** This is the feature that makes the kitchen tablet feel friendly rather than
  clinical. Let it be a little imperfect and a little fun — that's the point.

---

## 5. Kitchen safety — pointer

The stove is the kitchen's real hazard, and it's handled next door. The **`stove_timer_nudge`**
blueprint gives a friendly "is something still cooking?" prompt after a burner's been on too long
with no interaction — a *nudge*, not a shutoff (it can't turn the stove off, and shouldn't be
oversold as fire prevention). Full setup and the honest framing are in
**`safety-wellness.md` §2**. Door-left-open (including a fridge/freezer left ajar) lives there too.

Food safety and stove safety are two different jobs: this playbook keeps the food good; that one
keeps the cooking from being forgotten.
