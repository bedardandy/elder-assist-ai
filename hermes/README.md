# Hermes Agent — the ElderAssist companion & family co-pilot

This directory is the **workspace overlay** for [Hermes Agent](https://github.com/NousResearch/hermes-agent)
(NousResearch, MIT) as used in ElderAssist AI. Hermes is the *conversational brain with
hands* in the stack: one agent, one shared memory, reachable simultaneously by

- **{ELDER_NAME}, the elder** — by voice (through Home Assistant Assist), on the kiosk
  tablet, or their own chat app; warm, patient, one-thing-at-a-time; and
- **the whole family** — from Signal / WhatsApp / Telegram / email, asking "did mom
  take her meds?", "add her cardiologist Tuesday", "what's the dishwasher serial?".

It plays three roles at once: **elder conversational companion**, **family co-pilot**,
and **household memory book**. What it must NOT do — own deadlines, give medical advice,
place orders, leak the elder's data — is enforced by the persona in
[`AGENTS.md`](AGENTS.md). Read that file; it is the contract the skills assume.

> **The reliability rule (docs/DECISIONS.md D10):** Hermes never owns a deadline.
> Anything that matters if missed is created as a **Home Assistant** automation /
> calendar entry (or a Hermes cron for soft nudges). Hermes converses, remembers, and
> *creates* those entries — Home Assistant runs them. A Hermes outage can never silently
> drop a medication reminder.

What's in this directory:

| File | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The persona + hard guardrails + standing orders. Loaded by Hermes as the session context file. |
| [`skills/`](skills/) | Six elder-care skills in the [agentskills.io](https://agentskills.io) format (`SKILL.md` per directory). |
| [`config/.env.example`](config/.env.example) | Env template for the skills' integrations (HA, HomeBox, Grocy) + channel credentials. |
| [`config/config.yaml.example`](config/config.yaml.example) | Non-secret Hermes settings: Ollama provider, HA gateway, safety, memory. |

---

## 1. Install Hermes (per OS)

Hermes ships single-command installers (verify the latest at
[the install docs](https://hermes-agent.nousresearch.com/docs/getting-started/installation)):

```bash
# Linux · macOS · WSL2 · Android (Termux)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```
```powershell
# Windows (native PowerShell)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

Reload your shell, then run `hermes` (first run offers a setup wizard). Hermes installs
into its **home / workspace directory**:

- Linux / macOS / WSL2: `~/.hermes/`
- Windows: `%LOCALAPPDATA%\hermes\`

That directory holds `config.yaml`, `.env`, `SOUL.md` (global persona/tone), `skills/`,
`memories/` (`MEMORY.md` + `USER.md`), `logs/`, and the `state.db` session store. Pin
the version you install (per D1's risk note) and update deliberately with
`hermes update`.

## 2. Point it at our local Ollama (vs. a hosted API)

Our compose stack runs Ollama at **`http://localhost:11434`**, serving the model from
the repo-root `.env` (`OLLAMA_MODEL`, default `qwen3:8b`). Ollama exposes an
OpenAI-compatible API at `/v1`, which Hermes consumes as a `custom` provider. Copy the
`model:` block from [`config/config.yaml.example`](config/config.yaml.example):

```yaml
model:
  provider: custom
  base_url: http://localhost:11434/v1
  default: qwen3:8b            # keep in sync with OLLAMA_MODEL in the repo-root .env
```

Ollama ignores the API key, but the OpenAI-compatible client wants one present:
```bash
hermes config set OPENAI_API_KEY ollama-local
```
You can also switch interactively with `hermes model`, or per-message with
`/model custom:qwen3:8b`. If Hermes runs on the same host as the compose stack,
`localhost` works; from another host use the hub's LAN address and open the port.

**Local Ollama vs. a hosted API — the trade-off:**

| | Local Ollama (default) | Hosted API (OpenRouter / OpenAI / Nous Portal) |
|---|---|---|
| Privacy | **Nothing leaves the house.** The elder's conversations, health notes, and household facts stay on the hub. Aligns with the repo's "local by default" principle. | Conversation content is sent to a third party. A labeled, opt-in egress. |
| Capability | Bounded by your hardware (8B-class on a 16 GB mini-PC is solid for this use case). | More capable models, better at nuanced conversation and long context. |
| Cost / ops | Free after hardware; you manage the model. | Per-token cost; zero local GPU needed. |
| Setup | `hermes model` → custom → the block above. | `hermes setup --portal`, or set the provider + key via `hermes model`. |

For an elder-care box, **local is the recommended default** — it keeps the most
sensitive data in the home. Choose a hosted API only if the hardware can't give
conversational quality and the family has consented to the egress (document it like
every other cloud toggle).

## 3. Install our workspace (persona + skills)

Hermes discovers a **project context file** by walking from its working directory to the
git root, with precedence `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`
(first match wins). Our persona is `AGENTS.md`, and skills live in `~/.hermes/skills/`.
Two ways to install:

**A) Copy into the Hermes home (simplest):**
```bash
# from the repo root
cp hermes/AGENTS.md          ~/.hermes/AGENTS.md
cp -r hermes/skills/*        ~/.hermes/skills/       # each skill dir -> ~/.hermes/skills/<name>/
cp hermes/config/config.yaml.example ~/.hermes/config.yaml   # then edit
# secrets: copy the values you use out of hermes/config/.env.example into ~/.hermes/.env
```
Run the agent so it uses that context: start it from `~/.hermes` (e.g. `cd ~/.hermes &&
hermes`) or keep `AGENTS.md` wherever you run Hermes from. `SOUL.md` (global tone) is
separate — set a warm, patient default persona there; `AGENTS.md` carries the job.

**B) Keep skills in the repo and point Hermes at them** (survives `git pull`):
```yaml
# ~/.hermes/config.yaml
skills:
  external_dirs:
    - /path/to/elder-assist-ai/hermes/skills
```
Either way, verify with `hermes tools` (the `homeassistant`, `cronjob`, `memory`
toolsets should be present) and by invoking a skill: `/remind-me test in 2 minutes`.
Skills are the six `SKILL.md` procedures — they show up as `/remind-me`, `/memory-book`,
`/medication-refill`, `/call-setup`, `/tv-help`, `/daily-rhythm`.

Fill secrets and settings from [`config/.env.example`](config/.env.example) and
[`config/config.yaml.example`](config/config.yaml.example). Use `hermes config set KEY
VAL` (it routes secrets to `.env`, everything else to `config.yaml`).

## 4. Family channels — one agent, everywhere

The family reaches the same agent/memory over the apps they already use. Configure with
`hermes gateway setup`, set an **allowlist per platform** (never allow-all), then run
`hermes gateway` (or install it as a service: `hermes gateway install`, or
`sudo hermes gateway install --system` on Linux). Approve any unknown sender via DM
pairing: `hermes pairing approve <platform> <code>`.

- **Signal** — best for the elder (no account; links to a phone as a secondary device).
  Runs `signal-cli` as a local daemon; Hermes talks to it over HTTP/JSON-RPC. Env:
  `SIGNAL_HTTP_URL`, `SIGNAL_ACCOUNT`, `SIGNAL_ALLOWED_USERS`, and
  `SIGNAL_GROUP_ALLOWED_USERS` (set a group ID or `*` to enable the family group).
  Guide: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal>
- **WhatsApp** — the Baileys bridge, no Meta account. Pair by QR: `hermes whatsapp`.
  Env: `WHATSAPP_ENABLED=true`, `WHATSAPP_MODE=bot`, `WHATSAPP_ALLOWED_USERS` (country
  code, no `+`). Guide: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp>
- **Telegram** — easy for family. Create a bot with `@BotFather` (`/newbot`); find your
  numeric ID via `@userinfobot`. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`.
  For a family **group**, turn off BotFather → Bot Settings → Group Privacy (then
  re-add the bot), or make it a group admin.
  Guide: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram>

Set `CAREGIVER_CHANNEL` (in `.env`) to the platform escalations and the weekly summary
should go to (e.g. `signal`, or `signal,telegram`). All messaging docs:
<https://hermes-agent.nousresearch.com/docs/user-guide/messaging/>

## 5. Connect Home Assistant (the actuator)

HA is how Hermes checks sensors, casts to the TV, and creates reminders. Two layers:

**Native `homeassistant` toolset (preferred).** It auto-enables the moment `HASS_TOKEN`
is set in `~/.hermes/.env`, and exposes four tools: `ha_list_entities`, `ha_get_state`,
`ha_list_services`, `ha_call_service`. Config:
```bash
# ~/.hermes/.env
HASS_URL=http://homeassistant.local:8123     # optional; this is the default
HASS_TOKEN=<long-lived token for a RESTRICTED, non-admin HA user>
```
The token must be a **Long-Lived Access Token** (HA → profile → Security → Long-lived
access tokens), for the same restricted, non-admin user the kiosk PWA uses — not an
admin account. Because Hermes runs on the LAN, allow private URLs so it can reach HA:
`security: { allow_private_urls: true }` (in `config.yaml`; already in our example).
Optionally let house **events** wake the agent (wellness hooks) via
`platforms.homeassistant.extra` (`watch_entities` / `watch_domains` / `cooldown_seconds`)
— off by default; see `config.yaml.example`. Restart the gateway after editing env.
Reference: <https://hermes-agent.nousresearch.com/docs/user-guide/messaging/homeassistant>

**REST-API fallback (always works).** Every skill also documents raw HA REST calls so it
keeps working even if the toolset changes. Those `curl` patterns read `HA_URL` /
`HA_TOKEN` — set them to the **same** values as `HASS_URL` / `HASS_TOKEN`. Pattern:
```bash
# read state
curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" "${HA_URL}/api/states/<entity_id>"
# call a service
curl -fsS -X POST "${HA_URL}/api/services/<domain>/<service>" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"<entity_id>"}'
```

## 6. Connect HomeBox & Grocy (the records layer)

The `memory-book` and `medication-refill` skills read/write these via REST. Set in
`~/.hermes/.env`:
```bash
HOMEBOX_URL=http://homebox.local:7745
HOMEBOX_TOKEN=<HomeBox API token>          # API base ${HOMEBOX_URL}/api/v1, Bearer auth
GROCY_URL=                                 # optional; empty -> spoken stock check instead
GROCY_API_KEY=                             # header: GROCY-API-KEY: <key>  (not bearer)
```
HomeBox is the durable-goods system of record (appliances, serials, warranties,
manuals). Grocy (optional `grocy` compose profile) tracks medication/grocery stock. The
skills document exact endpoint patterns; HomeBox/Grocy API shapes are their own — verify
against their API references if a call 404s.

## 7. Memory hygiene — what to teach it at setup

Hermes keeps a persistent household memory (`~/.hermes/memories/MEMORY.md` +
`USER.md`, injected at session start; the agent writes with its `memory` tool). At
onboarding, sit with the family and have them tell the agent the durable facts — say
"remember that…" and confirm it saved:

- **People:** each family member (name, relationship to {ELDER_NAME}, how to reach them,
  their call type/room), the caregiver(s), the home-health aide, close neighbors, the
  doctor, the pharmacy.
- **Routines:** wake/sleep times, meal times, medication times, standing appointments
  (day-care, church, the weekly walk), the aide's schedule.
- **House facts:** where the spare key is, the water/gas shutoff locations, who services
  the furnace / plumbing, the Wi-Fi situation, quirks ("the back door sticks").

Then reinforce the boundary: **durable facts belong in a system of record, not only in
chat.** Appliances/serials/warranties → HomeBox; appointments/reminders → HA calendar;
where-is-it notes → HA `input_text.last_thing_*` helpers. The `memory-book` skill mirrors
facts to the right store automatically; memory is the agent's working knowledge, the
stores are the truth. Review memory periodically; it has a size budget and consolidates.

## 8. Safety configuration

This is an elder-care box holding sensitive data — lock Hermes down (the persona
guardrails in `AGENTS.md` are the behavioral half; these are the system half). See the
[security docs](https://hermes-agent.nousresearch.com/docs/user-guide/security).

- **Run as a non-root user.** Create a dedicated `hermes` user; keep `~/.hermes/.env` at
  `chmod 600`. Never run the gateway as root (root-owned pairing files break it).
- **Allowlist channels; never allow-all.** Set per-platform `*_ALLOWED_USERS`; leave
  `GATEWAY_ALLOW_ALL_USERS` unset; approve newcomers with `hermes pairing approve`.
- **Restrict tools to what this use case needs.** Run `hermes tools` and enable only:
  `homeassistant`, `cronjob`, `memory`, `messaging`, `session_search` (and `web` only if
  the family wants "ask anything"). This use case needs **no shell / terminal / code
  execution** — disable the `terminal`, `file`, and `code_execution` toolsets so the
  agent has no shell access. (The skills' `curl` fallbacks assume the family, not the
  elder-facing agent, runs them; with HA/HomeBox toolsets enabled the agent uses tools,
  not a shell.)
- **Keep dangerous-command approval on.** `approvals.mode: manual` (the default) prompts
  a human before anything risky; add `approvals.deny` globs (see `config.yaml.example`).
  Do not use YOLO mode on this box.
- **LAN-only, private URLs.** `security.allow_private_urls: true` to reach HA/HomeBox on
  the LAN; don't expose the gateway to the public internet.
- **Watch the logs** (`~/.hermes/logs/`) for unauthorized attempts, and keep Hermes
  updated with `hermes update`.

---

### Where these facts came from
All Hermes commands, paths, env-var names, and config keys above were verified against
the official docs at <https://hermes-agent.nousresearch.com/docs/> (installation,
configuration, skills, context-files, memory, cron, security, tools, and the
messaging pages for Signal / WhatsApp / Telegram / Home Assistant). Where a service name
depends on your specific HA setup (e.g. the TTS/announce service), the skills tell you to
confirm with `ha_list_services` rather than assume. Hermes moves fast — if a flag differs,
`hermes <command> --help` and `hermes config check` are the source of truth.
