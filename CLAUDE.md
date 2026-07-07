# CLAUDE.md — agent context for working on this repository

This file is for the **coding agent working on the repo** (Claude Code, any model).
It is not the assistant's runtime persona — that is `hermes/AGENTS.md`, which the
*deployed* Hermes agent loads inside the elder's home. Do not confuse the two:
`hermes/AGENTS.md` tells the household companion how to behave; this file tells
*you* how to change the project safely.

## What this project is

A private, open-source AI assistant for elderly family members: one always-on box
running Home Assistant (deterministic automations), a local voice pipeline
(Wyoming: faster-whisper / Piper / openWakeWord), Ollama (local LLM + vision),
Hermes Agent (family-facing chat channels), HomeBox/Grocy (household records), and
a big-button PWA kiosk. Everything is glue over mature upstreams — **we do not
fork anything** (see `docs/DECISIONS.md`).

## Read these before making non-trivial changes

| Document | What it holds |
|---|---|
| `docs/HANDOFF.md` | **Start here for takeover.** Project state, what's verified vs untested, consistency map, how to resume |
| `docs/DECISIONS.md` | D1–D14 decision records with evaluation matrices — the *why* behind every component choice |
| `docs/ARCHITECTURE.md` | Hub-and-spoke design, feature→mechanism map, trust model, hardware tiers |
| `docs/WARGAME.md` | 32 adversarial-review findings across two rounds; fixed vs. accepted-and-documented |
| `docs/REHEARSAL.md` | Live-install record: the bugs only runtime catches, and how to re-run the rehearsal |
| `docs/ROADMAP.md` | What is deliberately *not* in v1, with reasons — check before "adding a missing feature" |

## Non-negotiable design invariants

These were adversarially reviewed and are promised to families in the onboarding
consent checklist. Do not weaken them, and do not merge features that bypass them.

1. **Local by default, egress by choice.** Every cloud touchpoint is a labeled,
   off-by-default toggle. Ollama/Open WebUI bind to loopback by default
   (`${OLLAMA_BIND:-127.0.0.1}` in compose) — never rebind to `0.0.0.0` by default.
2. **The LLM never owns a deadline** (D10). Medication, appointments, wellness
   checks live in Home Assistant automations. The LLM converses, remembers, and
   *creates* automations — it is never the thing that fires them.
3. **No passive cameras, ever** (D11). Vision is user-initiated photos only. This
   is a *permanent* consent-checklist promise, not a v1 limitation. A "fridge
   camera" style feature has already been explicitly rejected (`docs/ROADMAP.md`).
4. **Scam shield is advice-only** (D13). It never says "definitely safe," never
   shames, always offers to loop in family, never acts on mail/calls itself.
5. **Money is read-and-remind, never transact** (D14). No stored payment
   credentials, no account numbers (last 4 digits max), no bill-pay, no ordering.
6. **The elder is the user, not the admin.** Elder-facing surfaces are PIN-less
   and simple; dangerous actuators (locks, alarm, garage) stay **off the
   elder-facing HA instance** entirely — because HA tokens are NOT entity-scoped
   (a wargame finding; never claim otherwise in docs).
7. **Glue, don't fork.** Customization lives in overlays (compose files, HA
   packages/blueprints, Hermes skills, a static PWA) that survive upstream releases.

## Repository map

```
docker/          Compose stack. Profiles: core, voice, inventory, grocy, webui.
                 docker/kiosk/ = nginx kiosk + locked-down Ollama vision proxy.
ha/              HA overlay: packages/elder_assist.yaml (all helpers/scripts/
                 intent_script), blueprints/automation/elder_assist/ (7 blueprints,
                 medication_reminder.yaml is the flagship), custom_sentences/,
                 dashboards/. ha/README.md has the copy-in steps + test checklist.
hermes/          Hermes Agent workspace: AGENTS.md (runtime persona), config/,
                 skills/ (11 elder-care skills, one dir each).
pwa/             Static big-button kiosk app. NO build step — keep it that way.
                 config.example.js is the template; config.js is gitignored.
docs/            Strategy, records, install guide. docs/playbooks/ = 12 operator
                 guides written for non-technical family members.
scripts/         backup.sh / restore.sh (volume archives).
setup.sh/.ps1    Idempotent installers; generate secrets exactly once into .env.
```

## How to validate changes

```bash
make validate     # compose config (core + all profiles + GPU), yamllint, shellcheck
```

CI (`.github/workflows/validate.yml`) runs the same checks on every push. But:

- **`check_config` and yamllint are not enough for HA blueprints.** HA's UI-level
  validation rejects things static checks pass — e.g. an *optional device selector*
  left empty renders `device_id: null` and fails automation creation (found live;
  `docs/REHEARSAL.md` bug 2). After any blueprint/package/sentence change, re-run
  the live rehearsal per `docs/REHEARSAL.md` §"Re-running this rehearsal".
- The PWA has no tests; smoke-test it headless (Chromium is at
  `/opt/pw-browsers/chromium` in the remote env) if you change `pwa/js/`.

## Gotchas learned the hard way (do not re-break these)

- **HomeBox requires `HBOX_AUTH_API_KEY_PEPPER` ≥32 bytes** or it panics on boot.
  Setup scripts auto-generate `HOMEBOX_API_KEY_PEPPER` once; rotating it
  invalidates issued HomeBox API keys — never regenerate an existing value.
- **The kiosk nginx proxy must keep request-time DNS** (`resolver 127.0.0.11 …;
  set $ollama_upstream ollama;`). A literal `proxy_pass http://ollama:…` makes
  nginx crash the *whole kiosk* at startup whenever Ollama's name doesn't resolve.
- The kiosk vision proxy is **closed by default**: empty `KIOSK_OLLAMA_KEY` → 403
  for everything. Only `POST /ollama/api/chat` and `/api/generate` are proxied.
  Keep it that way.
- **Push notifications in blueprints**: use the templated-service pattern
  (`action: "{{ notify_service }}"` behind an if-guard), never a device selector
  (see invariant above about empty selectors).
- **Custom-sentence wildcards capture articles** ("my keys" ≠ "keys"). Store and
  look up through the same normalization
  (`regex_replace('^(my|the|his|her|our|some) ', '')`, lowercase) — see
  `ha/packages/elder_assist.yaml` intent_script.
- **`00:00:00` is the "unused slot" sentinel** for optional dose times in
  `medication_reminder.yaml`; the condition filters midnight firings. Don't
  "clean up" the sentinel without replacing the mechanism.
- HA YAML uses the **modern syntax** (`triggers:`/`conditions:`/`actions:`,
  `action:` not `service:`); keep new YAML consistent with it.
- `pwa/sw.js`: bump `SHELL_VERSION` whenever shell assets change; `/ollama/` must
  **never** be intercepted by the service worker.
- Secrets/keys are generated by `setup.sh` **and mirrored in `setup.ps1`** — any
  change to env generation must land in both scripts *and* `.env.example` *and*
  (if compose consumes it) `docker/docker-compose.yml`. CI synthesizes `.env`
  from `.env.example`, so a variable missing there breaks CI interpolation.

## Cross-layer consistency (the #1 source of wargame findings)

Entity IDs, script names, ports, hostnames, and button labels are referenced from
up to five layers at once: `ha/packages` ↔ `ha/blueprints` ↔ `pwa/config.example.js`
+ `pwa/js/pages/` ↔ `hermes/skills/` ↔ `docs/playbooks/` (including the elder cheat
sheet in `onboarding.md`). **When you rename or add one, grep all five.** Several
round-1 findings were exactly this class of drift.

## Documentation discipline

- The docs are as much the product as the code; the audience is a motivated but
  non-technical family member. Plain language, honest about limitations.
- Every user-facing feature needs a playbook (or a section in one), and any new
  *sensing* (camera, mic, location, presence) needs a row in the onboarding
  consent checklist **before** it ships.
- New adversarial findings go in `docs/WARGAME.md` (numbered, fixed-vs-accepted);
  new install-time discoveries go in `docs/REHEARSAL.md`. Never silently fix a
  class of bug these files claim can't happen.
- The bar for shipping anything is at the bottom of `docs/ROADMAP.md` (local by
  default; no deterministic guarantee inside the LLM; installable by a family
  operator). Safety-critical items also need a false-alarm/failure-mode review.

## Workflow

- Develop on the designated feature branch; commit with clear messages; push with
  `git push -u origin <branch>`. Don't open PRs unless asked.
- Run `make validate` before every commit. If you touched `ha/`, plan a rehearsal
  re-run before claiming the change works.
