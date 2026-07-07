# The Install Rehearsal

Before recommending this stack to anyone's family, we installed it for real —
start to finish, exactly as `docs/INSTALL.md` instructs, on a clean Linux box with
the same specs as our "recommended tier" hardware (4 cores, 16 GB RAM). This file
is the record: what happened, how long it took, what broke, and what we fixed.
Re-run this rehearsal after any significant change to the stack.

## Environment

- Clean Linux (Debian-family), Docker Engine 29 + Compose v5, 4 CPU / 16 GB RAM
- Note: the rehearsal network had a TLS-intercepting proxy, which produced two
  *environment* artifacts worth knowing about (marked ⚠ below) — they will not
  occur on a normal home network, but they show what the failure looks like.

## What happened, step by step

| Step (from INSTALL.md) | Result | Time / notes |
|---|---|---|
| `./setup.sh --voice --inventory --no-pull` | ✅ 7 containers created and started, `.env` written, profiles persisted | **2 min 27 s** (image downloads; add ~5–20 min for the LLM pull on a real run) |
| Re-run of `setup.sh` (the "after an update" path) | ✅ idempotent — timezone kept, profiles kept, secrets generated exactly once | seconds |
| Home Assistant | ✅ healthy, onboarding page served | ~20 s after start |
| Kiosk PWA at `:8880` | ✅ healthy, app served | immediate |
| Ollama | ✅ healthy, **loopback-bound as designed** (verified from the host) | immediate |
| Piper (TTS) + openWakeWord | ✅ up, Wyoming ports open | immediate |
| Whisper (STT) | ⚠ crash-looped **in this sandbox only**: it downloads its model from huggingface.co on first start and the rehearsal proxy broke TLS. On a home network it just downloads. Lesson: **first boot needs internet**; if it loops, `docker logs elderassist-whisper` | — |
| HomeBox | ❌→✅ **real bug found**: current HomeBox refuses to boot without a ≥32-byte `HBOX_AUTH_API_KEY_PEPPER`. Fixed: setup now auto-generates `HOMEBOX_API_KEY_PEPPER` into `.env`; healthy + HTTP 200 after the fix | — |
| Copy `ha/` files + packages include (per `ha/README.md`) | ✅ | 1 min |
| `check_config` inside the real HA | ✅ exit 0 — package, sentences, dashboards all valid | ~30 s |
| HA restart + log check | ✅ zero config errors (⚠ one TLS error to `alerts.home-assistant.io` — rehearsal proxy artifact) | ~25 s |
| Onboarding: create caregiver owner account | ✅ (done via the same API the browser uses) | — |
| **All 11 package entities exist** (med booleans, put-away texts, I'm-OK button, announce/cast/remind/find scripts) | ✅ verified against `/api/states` | — |
| Wire Piper via the Wyoming integration flow | ✅ `create_entry: piper` → `tts.piper` available | seconds |
| **Voice intents through the real conversation engine** | ✅ all five: "I put the glasses in the kitchen drawer" → stored + confirmed; "where did I put the glasses" → correct answer; "I took my medicine" → boolean ON; "I took my evening pills" → second boolean ON; "I'm okay" → button pressed | — |
| **Create an automation from the medication blueprint** | ❌→✅ **real bug found** (see below); after the fix: `{"result":"ok"}`, `automation.rehearsal_morning_pill → on` | — |
| Kiosk vision proxy with no key configured | ✅ 403 with no key AND with a guessed key — closed by default, as designed | — |

## Bugs the rehearsal caught (all fixed)

1. **HomeBox crash-loop out of the box.** Upstream HomeBox now *requires*
   `HBOX_AUTH_API_KEY_PEPPER` (≥32 bytes) and panics without it — every fresh
   install would have hit this. Fix: compose passes `HOMEBOX_API_KEY_PEPPER`
   through, and `setup.sh`/`setup.ps1` generate it once (rotating it later
   invalidates issued HomeBox API keys, so it's kept).
2. **The flagship medication blueprint couldn't be saved without a phone.** The
   optional *device selector* for push notifications left `device_id: null` in the
   rendered automation, which fails HA's static config validation — so any family
   that skipped the optional field couldn't create the automation at all. Fix:
   replaced with an optional templated notify *service* (guarded by an if), which
   skips cleanly when empty. This is exactly the class of bug that only shows up
   against a running Home Assistant.
3. **"Where did I put my keys" didn't match "I put my keys…".** The sentence
   wildcards capture articles/possessives verbatim, so the stored thing ("my keys")
   never equaled the asked thing ("keys"). Fix: normalize both sides (strip
   my/the/…, lowercase) at store and lookup; confirmed live in four phrasings.
   Also fixed the confirmation grammar ("Your glasses is…" → echo-back phrasing).
4. Cosmetic: a next-steps line in `setup.sh` printed "`.`" instead of its number.

## What a real first install should look like

On a mini-PC on a normal home network, expect roughly:
**~15 min** OS + Docker install (if not already present) → **~3 min** `setup.sh`
(plus 5–20 min of model download in the background) → **~10 min** HA onboarding +
copying the `ha/` files → **~10 min** wiring the voice pipeline integrations →
then the human parts (contacts, meds, consent) at their own pace. If anything
crash-loops, `docker logs <container>` first — both real bugs and both environment
artifacts in this rehearsal were immediately obvious from the logs.

## Re-running this rehearsal

Everything above was driven with plain `curl` against the documented APIs — no
UI required — so it can be repeated headlessly after changes: run `setup.sh`,
verify `docker ps` shows healthy, copy the `ha/` files, run
`docker exec elderassist-homeassistant python -m homeassistant --script check_config --config /config`,
onboard, and replay the conversation tests in `ha/README.md`'s test checklist.
The wargame (adversarial review) and the rehearsal (live install) are complementary:
the wargame found design flaws, the rehearsal found the bugs that only exist at
runtime. Do both.
