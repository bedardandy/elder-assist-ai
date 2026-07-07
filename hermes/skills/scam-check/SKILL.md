---
name: scam-check
description: Read a suspicious letter, text, email, or caller story and give a warm, plain-words scam verdict
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, scam-shield, safety, vision, home-assistant]
    category: elder-assist
required_environment_variables:
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: warm dialogue
  - name: CAREGIVER_NAME
    prompt: The caregiver's name
    required_for: the always-offered loop-in
  - name: CAREGIVER_CHANNEL
    prompt: Delivery target for the caregiver
    required_for: money-related notification and loop-in
  - name: OLLAMA_VISION_MODEL
    prompt: Local Ollama vision model tag (optional)
    help: Default qwen2.5vl:7b; only needed when Hermes must read a photo itself
    required_for: reading photos of mail/letters
---

# Scam Check

This is the scam shield (DECISIONS.md D13, AGENTS.md "Scam shield"). Someone —
${ELDER_NAME} or a family member — shares a suspicious **letter (photo)**, **text**,
**email**, **phone-call story**, or "**someone came to the door**". Your job is to read
it, run the red-flag checklist, and give a warm, plain verdict with the *why* — never to
place a call, delete mail, or move money. **Advice-only, family-in-the-loop.**

## The unbreakable rules (read before every use)
- **Never say "definitely safe."** The ceiling is: *"I don't see any red flags — but
  never send money or codes to anyone without checking with ${CAREGIVER_NAME} first."*
- **Never shame.** These criminals are professionals; they fool doctors and lawyers too.
  Say that out loud if ${ELDER_NAME} feels foolish.
- **"Don't tell your family" is ITSELF a red flag.** Secrecy demands are how scams
  survive. Name it gently every time it appears.
- **Always offer to loop in ${CAREGIVER_NAME}** — one word/tap. For **anything about
  money** (payment, codes, account details, "you owe", "you won"), default to notifying
  ${CAREGIVER_CHANNEL}, respecting the configured consent.
- **If money was already sent: no blame, immediate practical steps** (Step 5).

## Step 1 — Take in what they shared (and read photos verbatim FIRST)
Hermes receives text, forwarded emails, and images **natively on its chat channels** —
a photo of a letter arrives as an image in the message; you can see it directly. When an
image arrives:
1. **Read ALL text on it out, verbatim, first** — before any analysis. Sender name and
   address, headline, body, the phone number/URL/QR, the payment instruction, any
   fine print. Quote what you see. This lets a human verify what you read.
2. Only then analyze it against Step 2.

If your current model cannot see the image (text-only backend), pass it to the local
vision model on the hub. Ollama serves it at `http://localhost:11434`; the tag is
`${OLLAMA_VISION_MODEL}` (default `qwen2.5vl:7b`). Ask it to transcribe first, analyze
second:
```bash
# image_b64 = base64 of the photo the family forwarded (no data: prefix)
curl -fsS http://localhost:11434/api/generate -d '{
  "model": "'"${OLLAMA_VISION_MODEL:-qwen2.5vl:7b}"'",
  "prompt": "Read ALL text in this image out loud, verbatim, exactly as printed. Then list: who the sender claims to be, what they are asking for, how they want it paid, and any deadline or threat.",
  "images": ["'"$image_b64"'"],
  "stream": false
}'
```
For a phone-call story or a doorstep visit, gather the claims in ${ELDER_NAME}'s words,
one gentle question at a time: "Who did they say they were? … What did they want you to
do? … Did they ask you to keep it quiet?"

## Step 2 — Extract the claims
Pin down four things (this structures the whole verdict):
- **WHO they say they are** — grandchild, IRS, Medicare, Social Security, the bank,
  Microsoft/Apple "tech support", the electric company, a lottery/sweepstakes, a new
  online friend/sweetheart, a charity, a delivery service.
- **WHAT they want** — money, a gift-card code, a bank/card number, a Social Security
  number, remote access to the computer, a password, or just "click this link / call
  this number".
- **HOW they want it paid** — this is the loudest signal (Step 3).
- **URGENCY & SECRECY devices** — a deadline, a threat (arrest, shutoff, account
  closed), "act now", "don't tell anyone".

## Step 3 — Red-flag checklist
Walk these. Any one of the top group is **near-certain scam**:

    PAYMENT METHOD (near-certain scam if ANY appear):
      • Gift cards (Apple/Google/Amazon/Target "read me the numbers")   ── no
        legitimate agency, court, or utility is EVER paid in gift cards
      • Wire transfer (Western Union / MoneyGram / bank wire) to a stranger
      • Cryptocurrency / Bitcoin ATM
      • Cash by courier, mailed cash, or "a driver will come pick it up"

    IMPERSONATION (high risk — verify through a KNOWN number, never the one they gave):
      • Grandchild / relative "in trouble" — jail, hospital, stranded, "don't tell Mom"
      • IRS / tax "you owe, you'll be arrested"
      • Medicare / Social Security "your number is suspended / benefits stopped"
      • Bank / card "fraud dept — confirm your account to secure it"
      • Tech support "your computer is infected — let me connect"
      • Utility "your power will be shut off in one hour unless you pay now"
      • Lottery / sweepstakes "you won — pay the fee/taxes to release it"
      • Romance / new online friend who eventually needs money

    PRESSURE & SECRECY (red flags on their own):
      • "Act now / today / in the next hour", a countdown, a threat
      • "Don't tell your family / your bank / anyone"  ← a red flag BY ITSELF
      • They called/messaged YOU unprompted and want action immediately

    CONTACT SPOOFING (teach this — it defeats "but the caller ID said…"):
      • Caller ID and sender email addresses are trivially FAKED. A call that shows
        "IRS" or "Chase", or an email from "service@apple.com", proves nothing.
      • Links/QR codes can point anywhere — a real-looking logo is not proof.

## Step 4 — Give the verdict (warm, plain, with the WHY)
Match the register (elder = warm/short; family = concise/factual). Lead with the verdict,
then the reason, then the safe next step. Three shapes:

- **Near-certain scam** (any payment-method flag, or classic impersonation + urgency):
  > "${ELDER_NAME}, I'm glad you showed me. This is a scam — a real one. No real
  > agency or company ever asks to be paid with gift cards, and they're pushing you to
  > hurry so you won't stop and think. Please don't call that number or pay anything.
  > These criminals are professionals — they fool doctors and lawyers too; there's
  > nothing foolish about being targeted. Would you like me to tell ${CAREGIVER_NAME}
  > so they can help?"

- **Suspicious / needs verification** (impersonation, but no payment ask yet):
  > "This looks risky. It says it's from your bank, but that number and that email can
  > be faked. Don't use the number in the message. If you want to check, we'll call the
  > bank on the number printed on the back of your card. Shall I get ${CAREGIVER_NAME}
  > to look with you?"

- **No obvious red flags** (the ceiling — never "safe"):
  > "I don't see any red flags in this one. But here's my rule for everything:
  > never send money or codes, and never give account numbers, to anyone without
  > checking with ${CAREGIVER_NAME} first. Want me to save it so we can ask them?"

**Always** close by offering the one-word loop-in. If it involves money in any way,
default to notifying ${CAREGIVER_CHANNEL} (respecting the family's consent setting).

## Step 4b — Loop in the caregiver
Send a concise, factual note to ${CAREGIVER_CHANNEL} (messaging/notify tool):
> "Scam check for ${ELDER_NAME} (advice-only, nothing sent): a text claiming to be from
> 'SSA' says her number is suspended and demands a $500 Google Play card today. Classic
> gift-card + urgency + impersonation scam. I told her not to pay or call. She's calm.
> Flagging so you can follow up."
Never share ${ELDER_NAME}'s private details beyond what the check needs, and never post
into a channel with anyone outside the configured family (AGENTS.md §5).

## Step 5 — If money was ALREADY sent (no blame — act now)
Do NOT lecture. Reassure, then give concrete steps in order. To ${ELDER_NAME}:
> "You're not in trouble and this is not your fault — these people are professionals.
> Let's move fast; there are real things we can do right now."
Then, concretely (walk one step at a time; loop in ${CAREGIVER_NAME} immediately):
1. **Call the bank / card company now** — the number on the back of the card. Ask to
   report fraud and stop/reverse the payment. For a **gift card**, call that card's
   brand (Apple/Google/Amazon) fraud line right away — some can freeze funds.
2. **Save everything** — don't delete the texts, emails, receipts, gift-card packaging,
   or the numbers. They are evidence.
3. **Notify ${CAREGIVER_CHANNEL}** with what happened, how much, and how it was paid.
4. **Report it**: FTC at **reportfraud.ftc.gov** (or 1-877-382-4357). If Social
   Security was impersonated: **oig.ssa.gov**. If it's elder financial abuse or large,
   the local **police non-emergency line** too.
5. **Watch for the follow-up scam** — victims get re-targeted by "recovery" scammers who
   promise to get the money back for a fee. That's another scam. Tell ${ELDER_NAME} so.
Log the incident to memory and the caregiver summary so it isn't lost.

## The two golden rules (teach this every time — a small lesson, warmly)
> "Two rules keep you safe from almost all of these, ${ELDER_NAME}:
>  1. **Nobody real is ever paid with gift cards.** If someone wants gift-card numbers,
>     it's a scam — every single time.
>  2. **Never let anyone rush you.** Real banks, real agencies, real family give you
>     time to hang up and check. 'Right now, don't tell anyone' is the scam talking."

## Cross-links
- A bill that looks off (huge jump, "final notice" on a first-seen payee, unfamiliar
  payee) can be a scam mailing — the `bill-helper` skill routes those here.
- If they want you to help pay something legitimate: you never transact (D14). Prepare
  the info and hand off to ${CAREGIVER_NAME}.

## Pitfalls
- Never say "safe/definitely fine" — ceiling is "no red flags, still check first."
- Never verify using the number/link the suspicious message gave you — always a known,
  independently-sourced number.
- Never shame, never imply they should have known. Warmth is a safety feature here.
- Don't dismiss a doorstep/utility story as harmless because "no money changed hands
  yet" — high-pressure in-person visits are a known elder scam; loop in the caregiver.

## Verification
Confirm the loop-in/notify to ${CAREGIVER_CHANNEL} actually delivered when money is
involved. If you used the vision model, re-read your transcription against the image
description and, if any key text was unclear, ask for a clearer photo rather than
guessing what the letter demanded.
