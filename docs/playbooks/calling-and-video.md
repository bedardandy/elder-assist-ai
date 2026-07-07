# Calling and video

**What you'll have when done:** one giant photo-button per family member that starts a
video call in one tap, a tested path on the *receiving* end so calls actually connect,
a working doctor-telehealth (Zoom) flow from "family got the email" to "joined on the
TV," options for real phone calls, and a way for the elder to send texts by dictation.

**Time required:** ~30 minutes for Jitsi rooms + PWA contacts + a full test matrix;
~15 minutes to rehearse the Zoom telehealth flow before the first real appointment.

> Calling is the feature that earns trust in week 1 (`onboarding.md`). Lead with it.
> The design rationale — public Jitsi rooms over self-hosting, Zoom deep links for
> mandated telehealth — is in `docs/DECISIONS.md`, D6.

---

## 1. Per-person Jitsi rooms

We use stable, per-person **meet.jit.si** room URLs (or a family-chosen Jitsi
instance): no accounts, no app store, works in the browser, one tap. The trick is that
each family member gets **one permanent room** so the button is always the same URL.

### Naming scheme
Pick names that are **unguessable** (anyone with the URL can join) but stable:

```
https://meet.jit.si/EAssist-<household>-<person>-<randomsuffix>
e.g.  https://meet.jit.si/EAssist-Bedard-Sarah-7f3k9q
      https://meet.jit.si/EAssist-Bedard-Mike-2h8m4p
```

- [ ] One room per family member (the *person the elder calls*, named for them).
- [ ] Add a random suffix — public rooms are open to anyone who knows the name, so don't
      use `EAssist-Sarah` alone.
- [ ] Write the final URLs down; they go into the PWA (§2) and into the family's
      calendars/bookmarks so *they* can join the same room from their side.

### Testing matrix
Test **before** you tell the elder it works. A call that fails on day one poisons the
whole feature.

| From (elder side) | To (family side) | Check |
|---|---|---|
| Kiosk tablet, home Wi-Fi | Sarah's phone (browser) | Video + two-way audio |
| Kiosk tablet | Mike's laptop (browser) | Video + two-way audio |
| Elder's phone PWA (if used) | Any family device | Connects, camera/mic permission granted once |
| Family device | *into the room, elder not yet joined* | Room holds; elder joining later still connects |

- [ ] Grant camera + microphone permission **once** on the kiosk and choose "remember"
      — otherwise every call re-prompts and the elder is stuck.
- [ ] Confirm the tablet doesn't sleep/lock mid-call (kiosk settings, `pwa/README.md`).

---

## 2. Configure the PWA contacts

The elder's Call button lives in the kiosk PWA (`pwa/README.md`, served on port
`8880`). Each contact is a **big photo + name → the person's Jitsi URL**.

- [ ] Add one contact per family member: a clear, recent, **face-filling photo** (not a
      group shot — they tap the face), the name they call them by ("Sarah," not "Sarah
      Bedard"), and the room URL from §1.
- [ ] Order by who they call most, top-left first.
- [ ] Keep it to the real handful of people. Twelve tiny contacts defeat the purpose;
      four giant ones don't.
- [ ] Test each button from the tablet after saving — tap should open the room and
      auto-join with camera on.

---

## 3. The receiving side (family devices)

Half of "the call didn't work" is the family end. Set expectations with them:

- [ ] Everyone bookmarks **their own** room URL (the same one behind the elder's
      button) so they can jump in from phone or laptop.
- [ ] **Optional but kind: notifications.** Public Jitsi doesn't ring the family
      automatically. Two fixes: (a) the elder's tap also pokes Hermes to message the
      family "Mom is calling — join here [link]" over Signal/WhatsApp; or (b) agree on a
      convention (elder taps, then the agent texts). Wire the poke via the `call-setup`
      skill (`hermes/README.md`).
- [ ] Family grants camera/mic permission once and picks "remember."
- [ ] Tell family: **answer even if you can't talk** — a waved hello beats a call that
      appears to fail, which teaches the elder the button is broken.

---

## 4. Zoom telehealth — end to end

Doctors mandate Zoom; it's closed, so we pre-provision rather than fight it
(`docs/DECISIONS.md`, D6). The whole point is the elder does **one tap at the right
time**, and everything before that is handled by family + the agent.

The flow, start to finish:

1. **Family forwards the appointment email** (the one with the Zoom link) to the agent —
   email in, via the Hermes channel (`hermes/README.md`).
2. **Hermes `call-setup` skill parses it**: extracts the Zoom meeting URL / ID +
   passcode and the date/time, and builds a `zoommtg://` deep link that opens the Zoom
   app straight into the meeting (no ID typing).
3. **It creates a reminder** (an HA automation — deterministic, `appointment_reminder`)
   for the day before and ~10 minutes before, announced on speaker + tablet + TV.
4. **At the time, a one-tap "Join Dr. ___" card** appears on the kiosk. One tap opens
   Zoom into the waiting room.
5. **Cast a joining card to the TV** so a family member (remote, watching the same
   agent) can confirm the elder got in, and so the elder sees a big "you're connected,
   the doctor will join shortly" reassurance (`tv-and-casting.md`).

Rehearse it once with a test Zoom meeting before a real appointment. Prerequisites:
- [ ] Zoom app installed on the kiosk tablet (the `zoommtg://` link needs the app).
- [ ] A test run confirms the deep link opens the app into the meeting without typing.
- [ ] Family knows the "forward the email to the agent" step — that's the only thing
      *they* must remember.

---

## 5. Phone-call options

Video isn't always right — sometimes they just want to phone someone, or need a real
handset. Two paths, in increasing effort (`docs/DECISIONS.md`, D8):

- **Simple: `tel:` on the tablet.** If the kiosk tablet has a SIM (or you add a cheap
  data+voice one), Call contacts can be plain `tel:` links — tap the photo, it dials a
  normal phone number. No video, no Jitsi, works like a phone. Good for the elder who
  finds video fussy. Configure as a contact type in `pwa/README.md`.
- **Advanced: HA VoIP with an ATA for real handsets.** If they want to keep using a
  physical phone (a big-button desk phone they already love), the HA VoIP integration +
  a cheap **ATA** (analog telephone adapter) lets Home Assistant ring and answer that
  handset — in-home intercom and "call for help" patterns. This is a real project
  (SIP config, hardware); it's an *overview and pointer* here — full steps in
  `ha/README.md`. Don't start here; add it later if the tablet path isn't enough.

---

## 6. Texting by dictation

The elder speaks; the agent drafts; the elder approves; it sends. Never
send-without-review — a misheard text is worse than no text.

The loop (over Hermes channels, `hermes/README.md`):
1. **Elder dictates** by voice: "Tell Sarah I'll be ready at noon for the ride."
2. **Agent drafts** the message and **reads it back / shows it** on the kiosk.
3. **Elder approves** — "yes, send it" or the big **Send** button. A "no" lets them
   redo it.
4. **Agent sends** to the right person over the channel they use (Signal/WhatsApp/
   Telegram), or SMS if that's set up (Twilio/SIP, `docs/DECISIONS.md` D8).

- [ ] Confirm each family member has a channel the agent can reach them on.
- [ ] Keep the read-back step — it's the guardrail against speech-to-text errors going
      out under the elder's name.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| **No audio** (can't hear / not heard) | Mic or speaker permission denied, or wrong device selected | Re-grant mic permission in the browser and pick "remember"; check the tablet isn't muted or on Bluetooth to a dead speaker |
| **No video** | Camera permission denied, or camera in use by another app | Grant camera permission once; close other camera apps; reload the room |
| **Echo** | Both ends on speakerphone in the same/near room, or no echo cancellation | Have one side use earbuds/headset; lower speaker volume; ensure only one device per physical room is in the call |
| **Call won't connect** | Weak Wi-Fi, or family side never joined | Check the tablet's signal; confirm the family member actually opened their room link |
| **Button opens nothing** | Wrong/typo'd room URL, or (Zoom) app not installed | Re-check the URL in `pwa/README.md`; for Zoom confirm the app is installed and the `zoommtg://` link is correct |
| **Family never knows they're being called** | No ring on public Jitsi | Wire the "elder tapped → agent texts you a join link" poke (§3, `call-setup` skill) |
| **Re-prompts for camera/mic every call** | Permission not remembered | Grant once, choose "remember for this site"; on the kiosk set it as a site permission (`pwa/README.md`) |

If a fix requires more than a minute of fiddling, do it later, not at the elder's
kitchen table (`onboarding.md`, failure etiquette). The Call button is the one thing
that should never feel broken.
