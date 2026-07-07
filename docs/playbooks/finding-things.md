# Finding things — keys, wallet, and the spare everything

**What you'll have when done:** a layered system for never losing the important things —
starting with a habit no gadget can beat, then voice notes for "where did I put it," then
beeping BLE trackers on the big three (keys, wallet, remote), and finally a light weekly ritual
that keeps the whole memory book honest — with realistic expectations at every layer so nothing
is oversold.

**Time required:** ~15 minutes to set up the habit and teach the voice notes; ~1 hour to buy,
pair, and place BLE trackers and their room proxies if you go that route; 10 minutes a week for
the sweep ritual.

> Finding things is a **layered** strategy, cheapest and most reliable first. Layer 0 is a habit
> and costs nothing; the hardware layers are add-ons for the things that still go missing. Resist
> the urge to jump straight to gadgets — a $5 tag can't out-perform a bowl by the door.

---

## 0. Layer 0 — the habit (the system can't beat a good habit, so say so)

Before any technology: **a home for each important thing, used every time.**

- [ ] **A bowl or hook by the door for keys.** A specific spot for the wallet. The remote lives on
      the arm of the chair. Boring, and it works better than anything below.
- [ ] Make it *stupidly* convenient — right where the thing is set down anyway. A home that
      requires a detour won't get used.
- **Say the honest part out loud:** the assistant can't beat a good habit. When the keys are
  always in the bowl, you never need to find them. The tech in the layers below is for the times
  the habit slips — a backstop, not a replacement. Selling a tracker as a cure for a missing habit
  just adds a gadget to lose *and* keys to lose.

Everything below assumes Layer 0 is in place. It makes each higher layer needed *less*, which is
exactly the goal.

---

## 1. Layer 1 — voice notes ("where did I put it")

Zero hardware, works for anything, especially the things you *can't* put a tracker on — a
passport, a document, the good scissors, "where I hid the spare cash from myself."

- **Recording:** the elder just tells the agent — *"I put the passport in the desk drawer"* — by
  voice (through HA Assist) or in the Hermes chat. The agent stores it in the household memory
  (`docs/ARCHITECTURE.md`, records layer; the `memory-book` "where did I put" skill).
- **Retrieving:** *"OK Nabu, where is the passport?"* → the agent reads it back. Same mechanism as
  "where's the spare key?" in `memory-book.md` §4.
- [ ] Teach the pair as one habit: **say it when you stash it, ask when you need it.** The note is
      only there if they got in the habit of leaving it.
- **Honest limit:** this remembers what they *told* it. It has no idea where the keys "actually"
  are if nobody said. That's what Layer 2 is for.

---

## 2. Layer 2 — BLE trackers for the big three

For the small things that move constantly and *do* take a tracker — **keys, wallet, remote** — a
Bluetooth tag that beeps on command. Keep it to the big three; a tag on everything is a drawer of
dead batteries.

### What to buy (per `docs/DECISIONS.md` D12)

The critical requirement: **Home Assistant must be able to make the tag beep on demand.** That
rules out the popular options and points to a specific kind of tag.

- [ ] **Buy HA-ringable tags** — Chipolo / Pebblebee "works with" variants, or cheap iBeacon-class
      tags that expose a *ring* characteristic HA can call. These are the ones HA can actively make
      beep.
- [ ] **⚠️ AirTag warning: do not buy AirTags for this.** They're locked to Apple's Find My network
      — **HA cannot make an AirTag beep on demand** (`docs/DECISIONS.md` D12). They're a fine
      Apple-only product; they are the wrong tool *here*.
- [ ] **Add an ESPHome Bluetooth proxy per room** — a ~$5 ESP32 flashed as a BT proxy extends
      Bluetooth range so tags are heard across the house (and doubles as presence detection). One
      near where keys/wallet usually live, plus the living room for the remote, covers most homes.

Setup — pairing the tags, flashing the ESP32 proxies, and wiring the `script.find_keys` /
`script.find_wallet` scripts — is in the **`ha/README.md` tracker section**; don't duplicate it,
follow it there.

### Ringing them

- **On the kiosk:** the **Find My Things** page has a giant **beep button per item**
  (`pwa/README.md`) — "Make my keys beep," "Make my wallet beep" — each calling the matching HA
  script (`script.find_keys`, `script.find_wallet`).
- **By voice:** *"OK Nabu, make my keys beep."*
- **Graceful fallback:** when a tag is out of range to ring, HA can still report its **last-seen
  room** from the BT proxies' signal (`docs/DECISIONS.md` D12) — "your keys were last seen near the
  kitchen." Not as good as a beep, better than nothing.

### Realistic expectations (state these plainly)

- **BLE range is short** and walls eat it. The room proxies help, but a tag in a coat in the closet
  may not ring from the kitchen. It's house-scale, not neighborhood-scale — a tag won't help once
  the keys leave the building.
- **Batteries die.** These are coin-cell tags; a dead battery is a silent tag, and it always
  happens when you need it.
  - [ ] **Set a battery-replacement reminder — as a `seasonal_chore_reminder`.** Wire a recurring
        chore (see `neighborhood-and-seasons.md` §3) to prompt "replace the tracker batteries" on a
        sensible cadence (e.g. twice a year, when the clocks change — easy to remember). A tag you
        assume works but doesn't is worse than no tag; the reminder is what keeps this layer real.

---

## 3. Layer 3 — the sweep ritual (keeps the memory book honest)

A light weekly habit that catches everything the other layers miss and keeps HomeBox accurate:

- [ ] **A 10-minute "tidy with photos" once a week.** Walk the main rooms, put stray things back in
      their Layer-0 homes, and while you're at it, **update HomeBox locations** for anything that
      moved (`memory-book.md` §1 — items have locations; that's what makes "where is X?" work).
- [ ] Snap a quick photo when something lands in a new permanent spot, and tell the agent — same
      capture-at-the-moment habit as the memory book (`memory-book.md` §4). "Later" never comes.
- [ ] Great as a **shared ritual** — a caregiver visit, or something the elder does with the Sunday
      medication-organizer fill (`medication.md` §6). Pairing it with an existing weekly habit is
      what makes it stick.

The sweep is the connective tissue: Layer 0 gives things a home, Layer 3 puts them back and tells
the memory book where they are — so the *next* "where did I put it?" already has an answer.

---

## Putting the layers together

| If they're looking for… | Reach for |
|---|---|
| Keys / wallet / remote (has a tag) | **Layer 2** — beep it from Find My Things, or last-seen room |
| A passport, document, "the good scissors" | **Layer 1** — ask the agent, *if* it was noted when stashed |
| Anything, ideally | **Layer 0** — it's in its home, because it always is |
| An appliance / where something *lives* | **Layer 3 / the memory book** — HomeBox knows the location |

Start at Layer 0, add Layer 1 free, and only buy tags (Layer 2) for the big three that genuinely
keep walking off. More gadgets is not more found things — a used habit is.
