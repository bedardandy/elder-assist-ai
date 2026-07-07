# The memory book

**What you'll have when done:** a HomeBox organized by where things live, every major
appliance photographed with its serial/model/warranty and manual attached, an optional
Grocy for consumables and med stock, the household able to *ask* the memory book by
voice, a clear home for the important papers, a running log of who fixed what and when,
and a backup habit so none of it evaporates.

**Time required:** ~2 hours for the rating-plate walk through a typical house (the bulk
of it); 20 minutes to set up the location/label structure first; ongoing minutes
whenever something is bought, fixed, or moved.

> The memory book is HomeBox (`inventory` profile, port `7745`), optionally Grocy
> (`grocy` profile, port `9283`), with Hermes reading/writing both by voice
> (`docs/ARCHITECTURE.md`, records layer; `docs/DECISIONS.md` D5). This playbook is how
> to *populate and use* it — the container setup is in `docs/INSTALL.md`.

---

## 1. HomeBox structure for a household

Set the skeleton up **before** you start photographing, or you'll pile everything into
one flat list and never find it again.

### Locations tree
Model the house. A nested tree, room by room:

```
Home
├── Kitchen
│   ├── (major appliances: fridge, dishwasher, stove, microwave)
│   └── Cabinets / Pantry
├── Laundry
│   └── (washer, dryer, water heater if here)
├── Living Room
│   └── (TV, cable box, soundbar, streaming devices)
├── Basement / Utility
│   └── (furnace, A/C, sump pump, breaker panel, water main)
├── Garage
│   └── (tools, mower, ladders)
└── Office / Papers
    └── (router, computer, the important-papers binder — §5)
```

- [ ] Build the tree first; add items into it as you walk (§2).
- [ ] "Where is the spare key?" works because the *key* is an item whose location is
      "Kitchen → junk drawer." Put findable small things in too, not just appliances.

### Labels
Labels cut across locations for the questions you'll actually ask:

- [ ] `warranty-active` — anything still under warranty (so "what's still covered?" is
      one filter).
- [ ] `has-manual` — items with a PDF attached.
- [ ] `serviced` — anything a technician has touched (pairs with the service log, §6).
- [ ] `medication` — if you track meds in HomeBox rather than Grocy (`medication.md`).
- [ ] Optionally per-owner or per-brand labels if useful.

---

## 2. The rating-plate photo walk

The core task: go appliance to appliance with the tablet/phone and capture each one
once, properly. The **rating plate** (the metal/sticker panel with model and serial —
usually on the back, inside the door, or under the unit) is the treasure.

For **each** appliance, capture:

- [ ] **A photo of the item** (so it's recognizable in the app).
- [ ] **A photo of the rating plate**, close and legible — this alone saves you retyping
      serial numbers.
- [ ] **Serial number** and **model number** (typed in, from the plate photo).
- [ ] **Purchase date** (approx. is fine) and **where bought**, if known.
- [ ] **Warranty**: length and expiry; label `warranty-active` if still covered.
- [ ] **The manual PDF**: download it from the manufacturer's site by model number and
      attach it to the item. Do this *now*, at the appliance — you have the model number
      in hand and won't come back for it.

Do them in a sensible order (kitchen, then laundry, then utility, then living room) so
you don't crisscross the house. Two hours, one pass, done.

> Why serials matter: warranty claims, recall lookups, ordering the *right* filter or
> part, and telling a repair tech the model over the phone. This walk is the single
> highest-value hour in the whole memory book.

---

## 3. Grocy for meds and groceries (optional)

Grocy (`grocy` profile, port `9283`) is **consumables** — things that get used up —
where HomeBox is durable goods (`docs/DECISIONS.md` D5). Add it only if you want:

- **Medication stock tracking** — pill counts, open-package dates, refill-due dates.
  This is what makes the weekly stock check in `medication.md` semi-automatic. This is
  the main reason to bother with Grocy for an elder-care setup.
- **Groceries / staples** — minimum-stock alerts for the things they always want on
  hand (coffee, milk, their cereal).
- **Chores** — recurring household tasks with reminders, if useful.

Skip Grocy entirely if you'll eyeball the bottles and the pantry — HomeBox + the med
reminders work without it. Don't add complexity the family won't maintain.

---

## 4. Teaching the household to USE it (by voice)

A memory book nobody queries is a database nobody updates. The Hermes **`memory-book`**
skill makes it conversational for the whole household (`hermes/README.md`).

Practice the two directions:

- **Asking** (read): "What's the model number of the fridge?" · "Where's the spare
  key?" · "Is the dishwasher still under warranty?" · "Who has the manual for the
  furnace?" The agent reads HomeBox/Grocy and answers by voice or chat.
- **Adding** (write): "Remember the spare car key is in the blue dish by the door." ·
  "We bought a new microwave today, it's a Panasonic." The agent creates/updates the
  item. Snap the rating-plate photo later to complete it.

- [ ] During week 4 (`onboarding.md`), have the elder ask one real question and add one
      real note, so it's a tool they own — not just a caregiver's spreadsheet.
- [ ] Encourage capture *at the moment*: bought something, moved something, someone
      fixed something → tell the agent then, not "later" (later never comes).

---

## 5. The important-papers pattern

Deeds, insurance policies, wills, account lists, passwords — these matter most and are
the **most sensitive**. Keep the scope disciplined:

- **Primary home is a physical binder.** A labeled binder (or fireproof lockbox) with
  the actual documents, in a known place (Office → §1). In HomeBox, create an item
  "Important Papers Binder" that records *where the binder is and what's in it* — an
  index, **not** the sensitive contents. "The house deed is in the binder, section 3"
  is safe to store; the deed's details are not.
- [ ] Make sure the Operator and one trusted family member both know where the binder
      is and can access it.
- **Passwords/credentials: keep out of HomeBox.** HomeBox is not a secrets vault.
  - *Advanced, optional:* a self-hosted **Vaultwarden** password manager is the proper
    home for logins — but it's out of scope for v1 of this repo and adds real
    operational burden (master password, backups, recovery). Only take it on if you
    already run a password manager and understand the failure modes. Otherwise, a
    written credential sheet in the physical binder is the pragmatic choice for a
    household.
- **Keep it boring.** The important-papers pattern is 90% "everyone knows where the
  binder is" and 10% software. Don't over-engineer the thing families most need to just
  *find in a hurry.*

---

## 6. Service-visit log

Every time a technician touches something, log it — against the item in HomeBox:

- [ ] **Who** (company + name if known), **when**, **what they did**, **what it cost**,
      and **any part numbers** they mentioned.
- [ ] Attach the **invoice/receipt** photo to the item and add the `serviced` label.
- [ ] Note the **next-service** date if there is one (furnace filter, A/C tune-up).

Payoff: "who fixed the furnace last time and what did they charge?" is answerable by
voice via the `memory-book` skill — no shoebox of receipts, no "I think it was the guy
your dad used." This is the README's "who came to fix the furnace and when" promise,
delivered.

---

## 7. Back it up

The memory book is hours of work and irreplaceable (serials, manuals, service history).
Protect it.

- [ ] Run **`scripts/backup.sh`** on a schedule — it archives the HomeBox and Grocy
      volumes (`homebox_data`, `grocy_data`) along with the rest of your data. It skips
      the large LLM models by default (re-pullable); your *data* is always included.
- [ ] Store at least one copy **off the hub** (external drive, another machine, or
      encrypted cloud) — a backup that lives only on the box it's backing up dies with
      the box.
- [ ] Test a restore once (`scripts/restore.sh <archive>`) so you know the backup is
      real before you need it.
- [ ] Do a fresh backup right after the big rating-plate walk (§2) — that's when you've
      just added the most, and have the most to lose.
- [ ] **Back up Hermes memory separately.** The agent's household memory lives in
      `~/.hermes/` (not a Docker volume), so `scripts/backup.sh` does **not** capture
      it. Archive `~/.hermes/` on its own schedule — and because both it and the volume
      archives hold secrets/tokens in cleartext, store them on encrypted media (or
      `gpg -c` each archive).
