---
name: tv-help
description: Fix the TV by symptom via HA before any physical steps
version: 1.0.0
metadata:
  hermes:
    tags: [elder-care, tv, home-assistant, media-player]
    category: elder-assist
required_environment_variables:
  - name: HA_URL
    prompt: Home Assistant base URL
    required_for: reading and fixing TV state
  - name: HA_TOKEN
    prompt: Home Assistant long-lived token
    required_for: reading and fixing TV state
  - name: ELDER_NAME
    prompt: The elder's first name
    required_for: plain-words guidance
---

# TV Help

## When to use
"The TV isn't working", "no picture", "wrong screen", "no sound", "the remote doesn't
work", "put on Jeopardy", "I want to watch Netflix".

## Guiding principle: fix it from Home Assistant FIRST
The elder should not have to hunt for a remote. Before you ask ${ELDER_NAME} to touch
anything physical, read the TV's state and try to fix it via HA `media_player` services.
Find the entities first:
```bash
curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" \
  "${HA_URL}/api/states" | grep media_player   # or use ha_list_entities(domain="media_player")
curl -fsS -H "Authorization: Bearer ${HA_TOKEN}" \
  "${HA_URL}/api/states/media_player.living_room_tv"   # state + attributes (source, volume)
```
`ha_get_state("media_player.living_room_tv")` gives `state` (off/on/playing/idle),
`source`, `source_list`, `volume_level`, `is_volume_muted`.

## Symptom -> HA fix (try these before physical steps)

**"No picture" / TV seems off**
- If state is `off` -> turn on:
  ```bash
  curl -fsS -X POST "${HA_URL}/api/services/media_player/turn_on" \
    -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
    -d '{"entity_id":"media_player.living_room_tv"}'
  ```
- If `on` but blank -> likely wrong input (see below).

**"Wrong screen" / wrong input**
- Read `source` vs what they want. Switch input:
  ```bash
  curl -fsS -X POST "${HA_URL}/api/services/media_player/select_source" \
    -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
    -d '{"entity_id":"media_player.living_room_tv","source":"HDMI 1"}'
  ```
  Pick the target from `source_list` (e.g. the cable box, "Live TV", "Netflix").

**"No sound"**
- Check `is_volume_muted` / `volume_level`. Unmute and raise:
  ```bash
  curl -fsS -X POST "${HA_URL}/api/services/media_player/volume_mute" \
    -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
    -d '{"entity_id":"media_player.living_room_tv","is_volume_muted":false}'
  curl -fsS -X POST "${HA_URL}/api/services/media_player/volume_set" \
    -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
    -d '{"entity_id":"media_player.living_room_tv","volume_level":0.4}'
  ```
- Sound may route to a separate soundbar/receiver media_player — check for one and
  unmute/raise it too.

**"The remote doesn't work"**
- This is exactly why HA exists: do what they wanted directly (turn_on, select_source,
  volume, play). Then, if they still need the physical remote, walk the batteries/aim
  steps (below). Many "remotes" are IR via a Broadlink in HA — you may be able to send
  the key with `remote.send_command`.

**"Put on Jeopardy" / "watch the news" (a named thing)**
- Prefer the family's one-command scripts (from pwa/config tv.buttons), e.g.
  `ha_call_service(domain="script", service="tv_watch_jeopardy")` or:
  ```bash
  curl -fsS -X POST "${HA_URL}/api/services/script/tv_watch_jeopardy" \
    -H "Authorization: Bearer ${HA_TOKEN}"
  ```

## Streaming setup walkthrough (launch an app)
Launch a streaming app on the TV via `media_player.play_media` (Android TV / cast) or
the `remote` integration:
```bash
curl -fsS -X POST "${HA_URL}/api/services/media_player/play_media" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"media_player.living_room_tv",
       "media_content_type":"app","media_content_id":"netflix"}'
```
Then guide ${ELDER_NAME} one step at a time to pick their show. Confirm the app opened
(`ha_get_state`) before telling them it's ready.

## The "cast the instructions to a screen they CAN see" trick
When HA can't fully fix it and physical steps are needed, and a SECOND display exists
(the TV itself if it's on, or the kitchen tablet), cast the step-by-step card there so
${ELDER_NAME} reads big, clear steps instead of holding them in their head:
```bash
curl -fsS -X POST "${HA_URL}/api/services/cast/show_lovelace_view" \
  -H "Authorization: Bearer ${HA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"entity_id":"media_player.kitchen_display","dashboard_path":"help",
       "view_path":"tv-fix"}'
```
Or push a notification card to the tablet (see call-setup Path A). Then read the steps
aloud, one at a time, waiting for "okay" between each.

## Physical fallback (only after HA options are exhausted)
One step at a time, elder tone, patient:
1. "Let's check the remote. Turn it over — are the batteries in the right way?"
2. "Point it right at the TV and try the power button once."
3. "Look at the little cable on the back — is anything loose?"
Never rattle off all three at once. Wait for each "okay".

## Pitfalls
- Don't name entity IDs or services to ${ELDER_NAME}; they hear "your TV", "the news".
- The audio device is often separate from the display — check both for sound issues.
- If nothing works and they're getting frustrated, offer the human: "Let's have
  ${CAREGIVER_NAME} take a look — I'll let them know." (notify CAREGIVER_CHANNEL).

## Verification
After each fix, re-read `ha_get_state("media_player.living_room_tv")` and confirm state/
source/volume changed as intended before telling ${ELDER_NAME} it's fixed.
