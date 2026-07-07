# Wargame Report

Before first release, the entire repo was subjected to an adversarial review by three
independent reviewers with different mandates, each reading (and where possible
*executing*) the actual code and docs — not the intentions:

1. **Security & privacy red team** — hostile LAN, kiosk physical access, scams routed
   *through* the assistant, prompt injection, egress, supply chain, data sovereignty.
2. **Gerontology-informed UX adversary** — dementia scenarios, double-dose risk,
   hearing loss, 2am confusion, tremor, abandonment, alarm fatigue, multi-elder homes.
3. **Reliability & correctness auditor** — empirical: ran the CI checks, resolved the
   compose config, diffed every port/entity-id/script-name across all five layers,
   traced blueprint wait/timeout logic, checked every doc link.

27 findings survived verification. Every finding was either **fixed** or **honestly
documented** — none silently dropped. The highlights below are kept on purpose:
knowing what *was* wrong tells you what class of thing to re-check when you modify
the system.

## Critical & high findings (all fixed)

| # | Finding | Resolution |
|---|---|---|
| W1 | **"Ask for Help" home button opened the AI chat**, while the real emergency Help page (call caregiver, "Something is wrong" family alert) was orphaned — unreachable except by typing `#/help` | Home button relabeled **Get Help** → routes to the Help page; AI chat reachable as a calm, clearly-non-emergency tile from Help |
| W2 | **Medication ack flag was wiped seconds after acknowledgment** by an unconditional end-of-run reset — so the "taken today" indicator reverted and could invite a double dose | Reset now happens only at the *start* of the next dose window; the ✓ state persists all day on tablet and dashboard |
| W3 | **HA token scoping was overstated.** Docs claimed the kiosk/agent token could be entity-scoped; Home Assistant has no per-entity/token authorization — any user token can call any service | All docs corrected to the honest model: non-admin only blocks config changes; the real mitigation is keeping locks/garage/alarm off the elder-facing HA instance; the kiosk tablet is a house key |
| W4 | **`pwa/config.js` (contains a live HA token) was not gitignored** — one `git add -A` from a caregiver away from a public token leak | Gitignored + rotation guidance |
| W5 | **Ollama & Open WebUI bound to 0.0.0.0** — an unauthenticated LLM API exposed to every device on the home LAN (compromised IoT is in-scope) | Default bind is now `127.0.0.1`, opt-out documented for multi-host setups |
| W6 | **Shipped Jitsi example rooms were guessable** (`ElderAssist-Susan`) — contradicting our own playbook; anyone guessing the name can join grandma's family calls on public Jitsi | All examples/skills/fallbacks use long random suffixes; help page no longer falls back to a guessable default room |
| W7 | **No hub-down watchdog** — if HA itself is down during a medication window, no reminder fires, no escalation fires, and *nobody is told* | Dead-man's-switch pattern shipped (heartbeat ping automation + healthchecks.io-style monitor that alerts the caregiver when pings stop) and the blind spot documented in the safety playbook |
| W8 | **The printed fridge cheat sheet named buttons that don't exist** ("Reminders", "Help") — the elder's canonical reference was wrong about the UI | Cheat sheet reconciled with the real home screen, kept in sync with W1's relabel |
| W9 | Voice "I took my pills" **always acknowledged medication slot 1**, making a second med unacknowledgeable by voice | Morning/evening phrasings added mapping to each slot; the single-slot behavior of the generic phrase documented |
| W10 | **Prompt injection via forwarded content**: the call-setup skill parses forwarded Zoom emails; combined with W3, injected instructions had a plausible path to actuating the house | Skills now treat forwarded content as untrusted *data* (extract meeting details only, never follow instructions); Hermes config guidance restricts the agent to curated `script.*` calls and human approval for lock/alarm/cover domains |

## Medium findings (fixed)

- False doc claim that the CORS snippet "ships with the HA package" (it didn't; without
  CORS every kiosk API call fails) → real CORS step added to `ha/README.md`.
- `setup.sh` clobbered a hand-set timezone on rerun (PowerShell version was correct) → precedence fixed.
- "Help is on the way" spoken after a fire-and-forget notification → honest copy
  ("I have told {caregiver}. If you are in danger, call 911 now.").
- Persona had no plan for **night-time/dementia distress** ("where is my husband?" at
  2am) and escalated every event → comfort-and-reorient guidance, never delivering
  painful news afresh at night, and escalation rate-limiting (morning digest for
  recurring confusion; immediate page only for safety triggers).
- No announce-volume control (a low speaker turned hearing loss into false "missed
  dose" escalations) → optional volume-set with louder-on-repeat in the blueprint.
- A+ text mode could clip home-button labels on short screens — the low-vision user
  lost labels first → clamped scaling, verified across viewports headlessly.
- 1.8s auto-proceed on calls was too fast for slow readers (accidental odd-hour
  calls) → 3.5s with giant Cancel; native `alert()` replaced with friendly banner.
- `use_x_forwarded_for` recommended without `trusted_proxies` → removed from default snippet.
- Backups were cleartext credential dumps and **Hermes memory (the most sensitive
  store) wasn't backed up at all** → encryption guidance + `~/.hermes` documented.
- Escalation playbook described a staged multi-person chain the blueprints don't
  implement → honestly relabeled "what v1 ships vs what you design".
- Divergent notify-target placeholders across dashboard/blueprints/PWA → unified.
- Voice reminder range (4h) didn't match the script (24h) → parity.

## Documented limitations (disclosed, not fixed in v1)

- **Single-elder assumption** — couples sharing a tablet can't be distinguished for
  acks/greetings (workarounds documented; multi-profile is a roadmap item).
- Overlapping grace windows on one medication can cross-acknowledge if grace exceeds
  the inter-dose gap (blueprint header warns; keep grace short).
- DST spring-forward can skip a dose scheduled inside the missing hour (header warns).
- SMS/caller-ID are spoofable and must never be treated as identity for privileged
  requests; wildcard channel allowlists discouraged.
- Open WebUI first account becomes admin — create it immediately (and it's
  loopback-bound by default now).
- This is **not a medical alert system**; fall detection is explicitly out of scope
  (see the safety playbook's pendant recommendation).

## What already held up (verified, no action)

- CI (`validate.yml`) passes as committed: compose config for every profile + GPU
  override, shellcheck, yamllint.
- Ports, hostnames, entity IDs, script names, and the model default are consistent
  across all five layers (verified by grep/diff, not by trust).
- Blueprint service-call shapes (`tts.speak`, `calendar.get_events` response handling,
  custom-sentence wildcard rules, `todo.get_items` return_response) match current HA.
- Boot ordering self-heals (HA integrations retry Wyoming/Ollama).
- PWA button contrast genuinely meets WCAG AAA (measured); 120px touch targets.
- Backup volume naming matches the resolved compose project naming.
- `.env` files are properly gitignored at every depth.

## Round 2 — the living-alone expansion

The second feature wave (local vision reading, scam shield, BLE trackers, bills,
local resources, weather/seasonal chores) got its own adversarial pass, focused on
the new attack surface. The reviewer went further than reading: it rendered the
kiosk's nginx proxy template with the real image entrypoint, ran `nginx -t`, and
drove live requests through a running container against a fake Ollama upstream.

**What held up (verified live):** the vision proxy's access control is airtight —
wrong key 403, missing key 403, GET 403, `/ollama/api/tags` and every other Ollama
endpoint unreachable, genuinely closed-by-default with an empty key, no
path-normalization or encoded-slash bypass. All round-2 hotline numbers
(reportfraud.ftc.gov, Eldercare Locator 1-800-677-1116, 211) verified correct; the
scam and money skills honor every guardrail (no "definitely safe", no shaming,
no payment credentials anywhere).

**What it caught (fixed):**

| # | Finding | Resolution |
|---|---|---|
| W28 | **A literal `proxy_pass` hostname coupled the entire kiosk — the elder's emergency surface — to Ollama's existence.** If the kiosk container started before/without Ollama (host reboot ordering, Ollama removed or OOM-crashed), nginx aborted at config load and the whole six-button app crash-looped. Reproduced live. | Request-time DNS resolution (`resolver 127.0.0.11` + variable upstream). Re-verified live: kiosk now starts with no Ollama, serves everything, returns a friendly error for vision only, and self-heals the moment Ollama appears |
| W29 | Template comment claimed an *unset* key means 403; actually an unset (vs empty) variable makes nginx refuse to start when run outside our compose file (still fail-closed, but not as described) | Comment corrected to the true behavior |
| W30 | `label-reader` used `{CAREGIVER_NAME}` in its medicine redirect without declaring the variable — rendering an empty name | Declared in the skill's requirements |
| W31 | Tapping the mic while a photo was being read silently discarded the spoken question | Mic now guarded by the busy flag |
| W32 | Weather guardian can announce twice when a severe change lands near the morning check (and snowy-rainy days speak both ice and snow guidance) | Accepted and documented in the blueprint header — harmless but chatty, with tuning advice |

## Method note

Each reviewer was independent and read the code cold, with an explicit instruction to
verify claims against file contents before reporting and to skip anything the docs
already honestly disclose. Findings were then re-verified during fixing, and the fix
batch re-ran the full validation suite (compose config, shellcheck, yamllint, YAML
parse of every touched file, `node --check`, and headless-browser layout checks at
five viewports). Re-run this playbook after any significant change: the reviewer
prompts live in the project history.
