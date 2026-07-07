# Handoff — state of the project and how to take it over

**Audience:** the next maintainer — human or AI coding agent — picking this
project up cold. `CLAUDE.md` at the repo root is the condensed rulebook; this file
is the narrative: what exists, how it was verified, what has *never* been tested,
and where the seams are.

---

## 1. Where the project stands

Built in three waves on branch `claude/elderly-ai-assistant-setup-y08gxd`
(14 commits as of `7894df1`):

1. **Core build** — architecture + decision records, the Docker stack, the HA
   overlay (package, 7 blueprints, custom sentences, dashboards), the big-button
   PWA, the Hermes workspace with elder-care skills, 12 playbooks, CI.
2. **Living-alone expansion** — local vision reading (labels, expiry dates,
   bills), scam shield, BLE key/wallet trackers, weather safety, local-resources
   search, seasonal chores (plow/mow/gutters), plus the kiosk→Ollama vision proxy.
3. **Install rehearsal + shopping guide** — the whole stack installed for real in
   a clean environment following `INSTALL.md` verbatim; four bugs found and fixed
   (`REHEARSAL.md`); hardware paths and exact shopping search terms
   (`playbooks/hardware-and-shopping.md`).

Each wave was followed by an adversarial review pass ("wargame") — 32 findings
total, every one either fixed or explicitly accepted-and-documented in
`WARGAME.md`. Nothing was silently dropped.

**All three of the original user requests are delivered.** There is no
half-finished work in the tree; the working tree at handoff is clean and CI is
green.

## 2. What has been verified — and at what strength

Not all "done" is equally done. Three tiers, strongest first:

**Tier 1 — exercised live against real software** (`REHEARSAL.md`):
- `setup.sh --voice --inventory` on clean Linux: 7 containers healthy, idempotent
  re-run, secrets generated exactly once.
- The HA overlay passes HA's own `check_config` *and* all 11 package entities
  exist in a live HA after the documented copy-in steps.
- All five voice intents through the real conversation engine (store/find a
  thing, med ack morning + evening, "I'm okay").
- Blueprint → automation creation via the real API (`{"result":"ok"}`), including
  the empty-optional-field path that used to fail.
- Piper wired through the real Wyoming config flow.
- Kiosk vision proxy: 403 with no key and with a wrong key; kiosk survives Ollama
  being absent (request-time DNS); proxy template rendered with the real image
  entrypoint and `nginx -t`-validated.
- Ollama loopback binding verified from the host.

**Tier 2 — statically validated, reviewed, internally consistent:**
- Compose for every profile + GPU override (CI), shellcheck, yamllint.
- Cross-layer name/port/entity consistency (verified by grep during the wargame,
  re-breakable — see the consistency map in `CLAUDE.md`).
- Blueprint service-call shapes checked against current HA docs.
- PWA touch targets/contrast measured (WCAG AAA); PWA smoke-tested headless.

**Tier 3 — designed and documented, never executed against the real thing:**
- **`setup.ps1` has never been run on a real Windows machine** (it mirrors
  `setup.sh` logic and was reviewed, not executed). Same for the macOS
  host-networking variation in `INSTALL.md`.
- **Hermes Agent has never been run against real Signal/WhatsApp/Telegram
  channels** in this project. The workspace, persona (`hermes/AGENTS.md`), and 11
  skills are complete and internally consistent, but end-to-end
  "family texts the agent → agent creates an HA automation" is unproven.
- **No real hardware**: no Voice PE satellite, no Chromecast/TV casting, no
  BLE tags + ESPHome proxy, no Broadlink IR, no Grandstream ATA, no GPU compose
  override on a real GPU. The shopping guide's items are researched, not owned.
- **Whisper STT** never completed a first boot in the rehearsal (the sandbox's
  TLS-intercepting proxy broke its model download — environment artifact, noted
  in `REHEARSAL.md`). On a normal network it should just download; nobody has
  watched it do so here.
- **Real mobile push notifications** (the `notify.mobile_app_*` path in the
  medication blueprint) — the templated-service pattern is validated, an actual
  phone receiving an actionable notification is not.
- **Grocy flows** (pantry stock, "eat these first") are documented and the
  profile starts, but no data flow was exercised.

If you take one thing from this section: **the first session on real hardware
will find bugs, and that is expected.** The rehearsal found four despite two
wargame rounds. Treat `REHEARSAL.md` as a living document — append what the real
install teaches.

## 3. Deliberately open items

Two lists, two meanings:

- **Accepted limitations** (`WARGAME.md` §"Documented limitations") — disclosed,
  not scheduled: single-elder assumption; overlapping grace windows can
  cross-acknowledge; DST spring-forward can skip a dose in the missing hour;
  SMS/caller-ID is not identity; this is **not a medical alert system** (the
  pendant recommendation is load-bearing — don't remove it).
- **Roadmap** (`ROADMAP.md`) — v-next items with effort sizes and the *reason
  each waited*. Highest-leverage next builds, in rough order of value-per-effort:
  1. **Speech-to-Phrase degraded mode** (S/M) — makes the 8 GB tier genuinely good.
  2. **HomeBox ↔ HA sync** (M) — warranty/stock reminders without the agent hop.
  3. **Multilingual end-to-end** (M) — plumbing exists, quality localization doesn't.
  4. **mmWave fall detection** (L/XL) — the biggest safety gap, and the one with
     the strictest shipping bar (false-alarm review required).
  Passive cameras of any kind are **rejected, not deferred** — see D11.

## 4. Things a successor might not guess

- **`hermes/AGENTS.md` is runtime cargo, not repo instructions.** It ships to the
  elder's hub as the deployed agent's persona. If you edit guardrails there
  (medical, money, scam, escalation), you are editing a *safety surface* — treat
  it like the blueprints, and keep it in lockstep with D13/D14 and the playbooks.
- **The consent checklist in `playbooks/onboarding.md` contains permanent
  promises** (notably "no passive cameras, ever"). Features must conform to it;
  it does not get amended to fit features.
- **HA token scoping is the reason for the two-instance guidance.** HA long-lived
  tokens are all-or-nothing per user; a non-admin user only blocks *config*
  changes, not entity access. That's why locks/alarm/garage stay off the
  elder-facing instance entirely. An early doc draft claimed entity-scoped tokens
  exist — that was wrong and was purged; don't reintroduce it.
- **Secrets lifecycle:** `setup.sh`/`setup.ps1` generate `KIOSK_OLLAMA_KEY` and
  `HOMEBOX_API_KEY_PEPPER` only when empty. The pepper must never be rotated
  casually (invalidates HomeBox API keys). Everything env-shaped lives in *four*
  places that must agree: `.env.example`, `setup.sh`, `setup.ps1`,
  `docker/docker-compose.yml`.
- **The rehearsal is repeatable headlessly** — everything in `REHEARSAL.md` was
  driven with `curl` against documented APIs (HA onboarding via
  `/api/onboarding/users`, integrations via `/api/config/config_entries/flow`,
  blueprint automations via `/api/config/automation/config/<id>` with
  `use_blueprint`, intents via the conversation API). That makes "re-verify after
  an HA-layer change" an automatable afternoon, not a manual week.
- **Model defaults**: chat `qwen3:8b`, vision `qwen2.5vl:7b` (`OLLAMA_MODEL`,
  `OLLAMA_VISION_MODEL`). The 8 GB fallback documented for weak hardware is
  `llama3.2:3b`. These were chosen for the 16 GB-RAM/no-GPU tier; revisit as
  local models improve, but re-test the vision prompts (verbatim-first, never
  guess dates, no dosage advice — `pwa/js/pages/ask.js`) against any new VLM.
- **Why no upstream fork:** evaluated in `DECISIONS.md` (Hermes vs Open WebUI,
  LibreChat, AnythingLLM, Leon, etc.). The overlay approach is a considered
  decision with a matrix behind it — re-read it before proposing a fork or a
  platform switch.

## 5. How to resume work (first hour checklist)

1. Read `CLAUDE.md`, then skim `ARCHITECTURE.md` and the D10–D14 records.
2. `make validate` — confirm the baseline is green before touching anything.
3. If the task touches `ha/`: budget a rehearsal re-run
   (`REHEARSAL.md` §"Re-running this rehearsal").
4. If the task adds a feature: check `ROADMAP.md` first (it may be deliberately
   deferred or rejected), then the shipping bar at the bottom of that file, then
   plan the playbook + consent-checklist rows alongside the code.
5. If the task is "get it running for a real family": that is not a repo task —
   follow `INSTALL.md` + `playbooks/hardware-and-shopping.md` +
   `playbooks/onboarding.md`, and file whatever breaks back into `REHEARSAL.md`
   and the code.

The guiding editorial rule for everything here: **this repo's credibility rests
on it being honest** — about what is verified, what is designed, and what is out
of scope. Keep the tiers in §2 true as the project moves.
