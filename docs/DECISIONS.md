# Decision Records

How we evaluated the FOSS landscape and why the stack is what it is.
Each decision lists the alternatives seriously considered and the reason they lost.
Scores are 1–5 against *this* use case (private, elder-facing, family-operated),
not general quality.

## D1 — Agent harness: Hermes Agent

| Candidate | License | Maturity | Local LLM | Multi-channel (Signal/WA/TG/email) | Memory | Scheduler | Skills/ext | Fit |
|---|---|---|---|---|---|---|---|---|
| **Hermes Agent (NousResearch)** | MIT | 180k★, v0.15+, desktop app Jun 2026 | ✅ Ollama/vLLM/300+ | ✅ all, one shared session | ✅ persistent + user model | ✅ NL cron | ✅ self-improving skills, MCP, agentskills.io std | **5** |
| Open WebUI | BSD-ish (custom clause) | very mature | ✅ | ❌ web only | ~ (RAG) | ❌ | ✅ pipelines | 3 |
| LibreChat | MIT | mature | ✅ | ❌ | ~ | ❌ | ✅ | 3 |
| AnythingLLM | MIT | mature | ✅ | ❌ | ✅ | ❌ | ✅ | 3 |
| Leon AI | MIT | slowed | ✅ | ❌ | ~ | ~ | ✅ | 2 |
| Roll our own on Agent SDK | — | n/a | ✅ | build it all | build | build | build | 2 (maintenance trap) |

**Why it matters here:** the multi-channel gateway is the elder-care killer feature —
the *family* needs remote access to the same agent/memory as the elder, from the chat
apps they already use. Only Hermes ships that. MIT license, single-command installers
for Linux/macOS/Windows/Termux, MCP client support, HA integration.

**Risk & mitigation:** young project moving fast → we pin versions in setup docs,
keep our skills in the open agentskills.io format (portable to other harnesses), and
keep all *guaranteed* behavior (reminders, escalations) in Home Assistant, so a
Hermes regression can never silently drop a medication reminder.

**Fork? No.** 180k-star four-month-old repo; a fork would be stale in weeks. We ship a
*workspace overlay* (persona, skills, config) instead — same customization power,
zero merge burden.

## D2 — Automation hub: Home Assistant

Alternatives: openHAB (smaller voice ecosystem, Java config culture), Gladys Assistant
(nice UX, much smaller integration library), custom cron+scripts (no device
integrations, no dashboards, no companion app).

HA wins on: 2,500+ device integrations (TVs, IR blasters, cast, VoIP), the Assist
voice pipeline with the Wyoming standard, blueprints (shareable automations — our
distribution format for reminder logic), companion apps with GPS/geofencing, and the
largest self-hosted community for a family operator to get help from.
**Used by ~9% of HA installs each**: whisper/piper/wyoming — this is the mainstream
local voice path, not an experiment.

## D3 — Voice pipeline: Wyoming + faster-whisper + Piper + openWakeWord

Alternatives considered:
- **OpenVoiceOS/Neon** (Mycroft heirs): true voice-OS, but a parallel ecosystem to HA
  with a fraction of the integrations; better as satellite firmware than as the hub.
- **Willow**: excellent latency on ESP32-S3-BOX, but development has been quiet;
  HA Voice PE is the actively-shipped satellite hardware now.
- **Speech-to-Phrase**: great on Pi-class hardware, but fixed-phrase only — wrong for
  open-ended elder conversation; we note it as a low-end option.
- Piper is archived upstream (Oct 2025) but continued as OHF-Voice/piper1-gpl and
  remains HA's default; alternative Kokoro-82M documented for higher quality TTS.

## D4 — LLM serving: Ollama

vs llama.cpp raw (no model management UX), vs vLLM (server-grade, heavier ops), vs
LM Studio (not open source). Ollama: trivial install on all three OSes, MLX-accelerated
on Apple Silicon, first-class HA + Hermes + Open WebUI integrations, one-line model
swaps. vLLM documented as the upgrade path for GPU servers.

## D5 — Inventory: HomeBox (+ Grocy optional)

HomeBox is purpose-built for exactly the "appliances, serial numbers, warranties,
manuals, where-is-it" requirement: nested locations, photos/receipts, QR labels,
insurance-ready export. Grocy overlaps but is consumables-first (its equipment module
is weaker); we run Grocy as an *optional* profile for medication stock + groceries.
Snipe-IT considered (asset management) — enterprise-shaped, overkill for a household.

## D6 — Video calls: Jitsi links first, Zoom deep links second

Self-hosting video (Jitsi server) is heavy and NAT-fraught; instead we use the public
meet.jit.si (or a family-chosen instance) with **stable per-person room URLs** baked
into the PWA — one tap, no account, works in the browser. Zoom is closed but
family-mandated sometimes: we ship `zoommtg://` deep-link launchers and a caregiver
playbook for pre-provisioning. Element Call noted as a Matrix-native alternative.

## D7 — Elder UI: build a tiny PWA (the one thing we DO build)

Nothing in the ecosystem is an elder-grade front door: HA dashboards are dense,
Open WebUI is a chat app, Hermes desktop is an operator tool. The requirement —
six enormous buttons, voice-first, zero chrome, installable on Android AND iPhone
without app stores — is small enough to own: static HTML/JS/CSS, no build step, no
framework churn, talks to HA's REST/WebSocket (Assist) API. PWA on iOS has
limitations (no push without install, storage eviction) — documented; the kiosk
tablet is the primary surface, phones secondary.

## D8 — Phone calls / SMS

- In-home "intercom + call for help": HA VoIP integration (SIP), works with cheap
  ATA + existing handsets.
- Real PSTN calls/SMS to family: optional Twilio (or any SIP trunk) through HA
  notify/automations — labeled cloud egress, needed mainly for escalation SMS.
- Signal/WhatsApp via Hermes covers most "texting" needs without a phone plan.

## D9 — Distribution: Docker Compose profiles, not k8s, not HAOS-only

Compose runs identically on Linux/macOS/Windows(Docker Desktop or WSL2), supports
`--profile` opt-ins (voice, inventory, grocy, openwebui), and is debuggable by a
motivated family member. Home Assistant OS on a dedicated Pi/mini-PC is documented as
an alternative path (add-ons replace our compose services) for non-technical operators.

## D10 — What stays deterministic vs. what the LLM owns

Hard rule: **anything with a consequence for missing it is an HA automation**
(medication, appointments, wellness checks, escalation). The LLM layer (Assist
conversation agent, Hermes) owns understanding, conversation, memory, and *creating*
those automations — never being the runtime for them. This is the single most
important reliability decision in the design.

## D11 — Vision assistance: local VLM, user-initiated photos only

Requirement: read labels, expiration dates, bills, mail. Options: cloud vision APIs
(best accuracy, but ships photos of mail/medicine/finances off-site — against the
default-local principle), HACS "LLM Vision" custom integration (extra moving part,
still needs a backend), or a local VLM served by the Ollama we already run.
**Chosen:** local VLM (default `qwen2.5vl:7b`, swappable) reached two ways: photos
sent to Hermes over its chat channels, and a kiosk "Read This For Me" camera page that
talks to Ollama through a locked-down nginx proxy on the kiosk service (Ollama itself
stays loopback-bound). Hard policy line: **no passive cameras** — every photo is
deliberately taken by a person, on their initiative. That distinction (user-initiated
capture vs. surveillance) is written into the consent checklist. 7B-class VLM accuracy
on tiny date stamps is imperfect → the skill is instructed to say "I'm not sure" and
ask for a closer photo rather than guess; expiry answers always show the raw text it
read so a human can verify.

## D12 — Finding things: HA-native BLE trackers, not AirTags/Tile-cloud

AirTags are locked to Apple's ecosystem (HA cannot make one beep on demand); Tile's
cloud API is closed/deprecated for third parties. **Chosen:** Bluetooth tags that
Home Assistant can ring directly (Chipolo/Pebblebee "works with" variants, or cheap
iBeacon-class tags with a ring characteristic) heard through **ESPHome Bluetooth
proxies** (~$5 ESP32 per room — also useful for presence). Giant per-item "Make my
keys beep" buttons on the kiosk Find My Things page call HA scripts. Graceful
fallback documented: last-seen room from BLE RSSI when a tag can't ring. The
"where did I put" voice notes remain the zero-hardware baseline.

## D13 — Scam shield: advice-only, family-in-the-loop, no autonomous screening

Elder fraud is the single most financially damaging threat in scope. Options
considered: automated call screening (Asterisk/answering-machine patterns — heavy,
brittle, and blocking a grandchild's real call is catastrophic for trust → roadmap),
inbound email filtering (elder email routing varies too much for v1). **Chosen:** a
Hermes `scam-check` skill + persona training: the elder (or family) reads, forwards,
or photographs the suspicious thing; the agent runs a red-flag checklist (urgency,
gift cards, wire transfer, impersonation of family/IRS/Medicare, "don't tell anyone"),
gives a plain-words verdict with the reasons, and **always offers to loop in the
caregiver** — one tap/word. Hard rules: never shame ("these are professionals, they
fool everyone"), never say "definitely safe" (say "I don't see red flags, but check
with {caregiver} before sending money to anyone"), treat "don't tell my family" as a
red flag itself, and proactively teach the two golden rules (never gift cards, never
rush). The system never answers calls or deletes mail on its own.

## D14 — Money handling: read-and-remind, never transact

Bills, refills, purchases: the assistant photographs/extracts/schedules/notifies, and
a human pays. No stored payment credentials, no bill-pay integrations, no exceptions —
this is a trust boundary, not a missing feature. Family visibility of bill due dates
is opt-in via the consent checklist (financial data is listed as its own row).
