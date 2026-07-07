# Install & Setup — the guided 30 minutes

This is the hands-on companion to [ARCHITECTURE.md](ARCHITECTURE.md). Follow it
top to bottom and you will have a working hub: Home Assistant, a local LLM,
the elder's kiosk app, and (optionally) fully local voice.

The **caregiver** does this setup. The elder never needs to.

Time budget: ~30 minutes of attention, plus background time while the LLM
model and container images download.

- [1. Hardware prep](#1-hardware-prep)
- [2. Run the setup script](#2-run-the-setup-script)
  - [Linux](#linux)
  - [macOS (Docker Desktop) — and the host-networking caveat](#macos-docker-desktop--and-the-host-networking-caveat)
  - [Windows (Docker Desktop + WSL2)](#windows-docker-desktop--wsl2)
- [3. Onboard Home Assistant](#3-onboard-home-assistant)
- [4. Configure the Assist voice pipeline](#4-configure-the-assist-voice-pipeline)
- [5. Enabling profiles later](#5-enabling-profiles-later)
- [6. Connect a Home Assistant Voice PE satellite](#6-connect-a-home-assistant-voice-pe-satellite)
- [7. HAOS-based alternative path](#7-haos-based-alternative-path-add-ons-instead-of-compose-voice)
- [8. Updating](#8-updating)
- [9. Backups & restore](#9-backups--restore)
- [Service reference (ports & hostnames)](#service-reference-ports--hostnames)
- [Troubleshooting](#troubleshooting)

---

## 1. Hardware prep

| Tier | Hardware | You get |
|---|---|---|
| Minimum | x86 box, 8 GB RAM | HA + voice + HomeBox; a small 3B LLM (slow), or point the agent at a hosted API |
| Recommended | Mini-PC 16 GB (Beelink/NUC) or M-series Mac mini | Whole stack incl. the default 8B LLM at conversational speed |
| Comfortable | Above + used NVIDIA RTX 3060 12 GB | Sub-second voice, larger models (use the GPU override) |

Before you start:

1. **Put the hub on a wired network** if you can — voice latency and casting
   both prefer Ethernet.
2. **Give it a fixed IP** (DHCP reservation in your router). Every tablet,
   phone, and voice satellite will point at this address; you do not want it
   to change. Note the address — this guide calls it `HUB_IP`.
3. **Install Docker**:
   - Linux: `curl -fsSL https://get.docker.com | sh`, then
     `sudo usermod -aG docker $USER` and log out/in.
   - macOS / Windows: install
     [Docker Desktop](https://www.docker.com/products/docker-desktop/).
4. Clone the repo on the hub:
   ```bash
   git clone https://github.com/bedardandy/elder-assist-ai
   cd elder-assist-ai
   ```

---

## 2. Run the setup script

The script checks Docker, writes your `.env`, starts the core stack, and pulls
the local LLM model. Pick your platform below.

Flags (all platforms) add optional pieces and are remembered in `.env`:

| Flag (bash) | Flag (PowerShell) | Adds |
|---|---|---|
| `--voice` | `-Voice` | Local wake word + speech-to-text + text-to-speech |
| `--inventory` | `-Inventory` | HomeBox (appliances, serials, warranties) |
| `--grocy` | `-Grocy` | Grocy (medication stock, groceries) |
| `--webui` | `-WebUI` | Open WebUI (operator chat for Ollama) |
| `--all` | `-All` | Everything above |
| `--no-pull` | `-NoPull` | Skip the model download for now |

### Linux

Linux is the first-class path. Home Assistant runs with **host networking**,
which it needs for device discovery (Chromecast, TVs, voice satellites).

```bash
./setup.sh              # core only
./setup.sh --voice      # add local voice
./setup.sh --all        # everything
```

When it finishes it prints the URLs. Core services:

- Home Assistant → `http://HUB_IP:8123`
- Kiosk PWA → `http://HUB_IP:8880`

**GPU (NVIDIA):** install the
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/),
then start the stack with the override so Ollama and Whisper use the GPU:

```bash
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.gpu.yml \
  up -d
```

### macOS (Docker Desktop) — and the host-networking caveat

**Read this before running the script.** Docker Desktop on macOS runs
containers inside a VM, so **`network_mode: host` does not work** the way it
does on Linux. You must switch Home Assistant to mapped ports first:

1. Open `docker/docker-compose.yml`.
2. In the `homeassistant` service:
   - **comment out** the line `network_mode: host`, and
   - **uncomment** the two blocks labelled `macOS / WINDOWS` — the `ports:`
     block (`"${HA_PORT:-8123}:8123"`) and the `networks:` block
     (`- elderassist`).

That change does two things: Home Assistant becomes reachable at
`http://localhost:8123`, and it joins the `elderassist` network so it can reach
the other containers **by their service name** (`ollama`, `whisper`, `piper`,
`openwakeword`) instead of `localhost`. Remember this — it changes what you
type in [step 4](#4-configure-the-assist-voice-pipeline).

Then:

```bash
./setup.sh --all
```

**Caveat that remains:** with mapped ports, Home Assistant cannot auto-discover
Cast devices / TVs on your LAN via mDNS from inside the VM. Add those
integrations **by IP address** in the HA UI, or run the hub on Linux for the
smoothest experience. This is a Docker Desktop limitation, not an ElderAssist
one.

### Windows (Docker Desktop + WSL2)

1. Install Docker Desktop and keep **"Use the WSL 2 based engine"** checked
   (Settings → General). If WSL is missing, open an **admin** PowerShell and
   run `wsl --install`, then reboot.
2. Apply the **same `network_mode: host` → mapped-ports edit** described in the
   macOS section above (the caveat is identical on Windows).
3. From the repo folder in PowerShell:
   ```powershell
   .\setup.ps1 -All
   ```
   If PowerShell blocks the script, allow it for this session:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

The script checks Docker and the WSL2 backend and prints friendly pointers if
either is missing.

---

## 3. Onboard Home Assistant

Open `http://HUB_IP:8123` (or `http://localhost:8123` on macOS/Windows). On
first launch HA walks you through onboarding.

1. **Create the CAREGIVER admin account.** This is the person who runs the
   system. Use a real name and a strong password — this account holds the keys.
2. Set the home's **name, location, and unit system**. The timezone should
   already match what you entered in setup; confirm it.
3. Let HA finish discovering devices (skip anything you are unsure about; you
   can add it later).

Now create the elder's restricted user and the token the kiosk PWA uses.

4. **Create the restricted elder user.**
   Settings → People → **Users** → **Add User**.
   - Name it (e.g. the elder's first name).
   - **Leave "Administrator" OFF.** The elder is the user, not the admin
     (see principle 3 in the README). NOTE: HA tokens are **not** entity-scoped —
     non-admin only prevents config/user changes; it does **not** stop the token
     from calling any service on any entity via the REST API. The real safeguard is
     keeping dangerous actuators (locks, garage doors, alarm panels) off this HA
     instance (or on a separate instance this token can't reach).
   - Set a simple username/password; the kiosk stays logged in, so the elder
     rarely types it.
5. **Create a long-lived access token for the PWA.**
   - Log in **as the elder user** (or use their profile), open their **profile
     page** → scroll to **Long-Lived Access Tokens** → **Create Token**.
   - Name it `kiosk-pwa`. **Copy the token now** — HA shows it only once.
   - This token is what the six-button kiosk app uses to talk to HA's REST /
     WebSocket (Assist) API on the elder's behalf. Keep it out of git (it lives in
     the PWA's local config, not this repo).

> Creating the token under the **non-admin elder user** is deliberate: if the
> kiosk tablet is lost, the token cannot administer the hub — it cannot change
> configuration or users. It **can**, however, call any service on any entity (HA
> has no per-entity token scoping), so keep locks/garage/alarm actuators off this
> instance and treat the tablet like a house key.

---

## 4. Configure the Assist voice pipeline

Do this only if you started the **voice** profile (`--voice` / `-Voice` /
`--all`). It wires Home Assistant's Assist pipeline to the three local Wyoming
containers and to Ollama.

### Hostnames & ports — pick the right column

The containers listen on these ports (from `docker-compose.yml` / `.env`).
**Which hostname you type into HA depends on how HA is networked:**

| Service | Port | Hostname on **Linux** (HA host-networked) | Hostname on **macOS/Windows** (HA bridged) |
|---|---|---|---|
| Whisper (STT) | `10300` | `localhost` | `whisper` |
| Piper (TTS) | `10200` | `localhost` | `piper` |
| openWakeWord | `10400` | `localhost` | `openwakeword` |
| Ollama (LLM) | `11434` | `http://localhost:11434` | `http://ollama:11434` |

The port numbers are the same in both cases — only the hostname changes,
because on Linux HA shares the host's network and reaches the published ports at
`localhost`, while on Docker Desktop HA is on the `elderassist` network and
reaches its neighbours by service name.

### Add the Wyoming integrations

For **each** of whisper, piper, and openwakeword:

1. Settings → **Devices & Services** → **Add Integration** → search
   **Wyoming Protocol**.
2. Enter the **Host** and **Port** from the table above:
   - Whisper → host `localhost` (or `whisper`), port `10300`
   - Piper → host `localhost` (or `piper`), port `10200`
   - openWakeWord → host `localhost` (or `openwakeword`), port `10400`
3. Submit. HA discovers the service (Whisper appears as a speech-to-text
   engine, Piper as text-to-speech, openWakeWord as a wake-word engine).

### Add Ollama as the conversation agent

1. Settings → Devices & Services → **Add Integration** → **Ollama**.
2. **URL**: `http://localhost:11434` (Linux) or `http://ollama:11434`
   (macOS/Windows).
3. Select the model you pulled — the default is **`qwen3:8b`** (matches
   `OLLAMA_MODEL` in `.env`).
4. Finish. This gives you an Ollama **conversation agent**.

### Assemble the pipeline

Settings → **Voice assistants** → **Add assistant** (or edit the default):

- **Conversation agent**: the Ollama agent you just added.
- **Speech-to-text**: `faster-whisper` (via Wyoming).
- **Text-to-speech**: `piper`, voice `en_US-lessac-medium` (matches
  `PIPER_VOICE`).
- **Wake word**: `openWakeWord`, model `ok_nabu` (matches `WAKEWORD_MODEL`).

Name it something friendly and set it as the **preferred** assistant. Test it
from the "Assist" chat bubble in the HA sidebar — type or speak and confirm the
model replies.

> Keep the reliability rule in mind (DECISION D10): the conversation agent
> *understands and creates* reminders; the reminders themselves run as HA
> automations. Do not make the LLM responsible for firing a medication alert.

---

## 5. Enabling profiles later

Profiles are stored in `.env` as `COMPOSE_PROFILES`. To add one after the fact,
either re-run setup with the flag, or edit `.env` and bring the stack up again.

Re-run setup, listing **all** the profiles you want (flags replace the list):

```bash
./setup.sh --voice --inventory --grocy    # enable exactly these three
```

> Note: passing any flag **replaces** `COMPOSE_PROFILES` with just those flags —
> it does not append. To add one profile without retyping the others, edit
> `.env` directly:
> ```
> COMPOSE_PROFILES=voice,inventory,grocy
> ```
> then `make up` (or `docker compose up -d`).

Manual, explicit control any time:

```bash
docker compose --env-file .env -f docker/docker-compose.yml \
  --profile voice --profile inventory up -d
```

After enabling **inventory** or **grocy**, open the new service and create the
caregiver account there too:

- HomeBox → `http://HUB_IP:7745` (registration is disabled in compose; the
  first account is made from its setup screen).
- Grocy → `http://HUB_IP:9283` (default login `admin` / `admin` — change it
  immediately).
- Open WebUI → `http://HUB_IP:3000` — **create the admin account immediately after
  first start.** The **first** account registered becomes the admin, so register it
  yourself right away before anyone else can reach the page and claim it.

---

## 6. Connect a Home Assistant Voice PE satellite

The [HA Voice Preview Edition](https://www.home-assistant.io/voice-pe/) (~$59)
is the recommended room satellite — a small puck with a mic, speaker, and mute
switch.

1. Power it on within range of your Wi-Fi.
2. In Home Assistant: Settings → Devices & Services. HA usually **discovers**
   the puck automatically (on Linux/host-networking); click **Configure**.
   - On macOS/Windows where discovery is limited, follow the puck's on-device
     Wi-Fi setup, then it registers itself with HA over the network.
3. Assign it the **voice assistant** you built in step 4.
4. Set its **wake word** to `ok_nabu` (or another openWakeWord model) so it
   matches the pipeline.
5. Place one per room the elder uses. Each satellite streams audio to the hub;
   all the STT/LLM/TTS work happens on the hub, not the puck.

Any old Android phone or a Raspberry Pi with a mic can also run a
[Wyoming satellite](https://github.com/rhasspy/wyoming-satellite) and point at
the hub the same way.

---

## 7. HAOS-based alternative path (add-ons instead of compose voice)

If you prefer **Home Assistant OS** on a dedicated mini-PC/Pi (the most
hands-off option for a non-technical operator), you do **not** run our compose
`voice` services. Instead, install the equivalent **HA add-ons**, which provide
the identical Wyoming services:

1. Install HAOS from
   [home-assistant.io/installation](https://www.home-assistant.io/installation/).
2. Settings → Add-ons → Add-on Store, and install:
   - **Whisper** (faster-whisper) — set model `base-int8`.
   - **Piper** — set voice `en_US-lessac-medium`.
   - **openWakeWord** — model `ok_nabu`.
   These auto-register as Wyoming services; you skip the manual host/port
   entry in step 4 (HA wires them internally).
3. For the LLM, run **Ollama** either as an add-on or on a separate box and add
   the Ollama integration pointing at it (`http://OLLAMA_HOST:11434`).
4. HomeBox / Grocy: run them as HAOS add-ons or on a second machine; the agent
   layer reaches them over the network the same way.

Everything else in this guide (accounts, tokens, pipeline assembly, satellites,
backups of the HA config) applies unchanged. The trade-off: HAOS is simpler to
operate but you manage voice/LLM/inventory as add-ons rather than one compose
file. See DECISION D9 for why we ship compose as the primary path.

---

## 8. Updating

Pull the latest images and recreate containers:

```bash
make update
```

or manually:

```bash
docker compose --env-file .env -f docker/docker-compose.yml pull
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

**Back up first** (see below). For a family box you may prefer to **pin image
tags** in `docker-compose.yml` (e.g. replace `:stable` with a dated tag) so
updates are deliberate rather than automatic — the compose file explains where.

To swap the LLM model:

```bash
# edit OLLAMA_MODEL in .env, then:
docker compose exec ollama ollama pull <new-model>
```

---

## 9. Backups & restore

The important, irreplaceable state lives in Docker **named volumes** (HA config,
HomeBox, Grocy). Ollama models are large and re-downloadable, so they are
excluded by default.

**Back up** (writes timestamped archives to `./backups`):

```bash
make backup                    # everything except LLM models
./scripts/backup.sh --with-models   # include the model weights too
```

For a perfectly consistent HA database, stop first:

```bash
make down && make backup && make up
```

**Restore** a single archive (asks for confirmation, then overwrites that
volume):

```bash
make down
make restore ARCHIVE=backups/elderassist_ha_config-20260707-120000.tar.gz
make up
```

The destination volume is inferred from the archive filename, so restore each
volume's archive in turn. Keep a copy of `./backups` off the hub (another
drive, a NAS, or encrypted cloud) — a backup on the same failing disk is not a
backup.

> **These archives hold secrets in cleartext.** The `ha_config` volume contains
> Home Assistant's `secrets.yaml` and the auth tokens in `.storage`. Store the
> archives on **encrypted media**, or encrypt each one, e.g.:
> ```bash
> gpg -c backups/elderassist_ha_config-20260707-120000.tar.gz   # -> .gpg, passphrase-protected
> ```
> Treat the backups like the tokens themselves.

> **Hermes memory is NOT in a Docker volume.** The household memory book and agent
> config live in `~/.hermes/` (Linux/macOS) or `%LOCALAPPDATA%\hermes\` (Windows) —
> outside the compose volumes this script archives. Back that directory up
> **separately** (it holds `memories/`, `config.yaml`, and `.env` secrets — encrypt
> it too).

---

## Service reference (ports & hostnames)

Everything below is defined in `.env` (ports) and `docker/docker-compose.yml`
(service names). Defaults shown.

| Service | Profile | Web/Port | Service name (bridged) | Volume |
|---|---|---|---|---|
| Home Assistant | core | `:8123` | `homeassistant` | `ha_config` |
| Ollama | core | `:11434` | `ollama` | `ollama_models` |
| Kiosk PWA | core | `:8880` | `kiosk` | (serves `../pwa`) |
| Whisper (STT) | voice | `:10300` | `whisper` | `whisper_data` |
| Piper (TTS) | voice | `:10200` | `piper` | `piper_data` |
| openWakeWord | voice | `:10400` | `openwakeword` | `openwakeword_data` |
| HomeBox | inventory | `:7745` | `homebox` | `homebox_data` |
| Grocy | grocy | `:9283` | `grocy` | `grocy_data` |
| Open WebUI | webui | `:3000` | `open-webui` | `openwebui_data` |

Volumes are prefixed with the project name, e.g. `elderassist_ha_config`.

> **Loopback binding (Ollama & Open WebUI).** Ollama's API is **unauthenticated**,
> so the compose file binds it — and Open WebUI — to `127.0.0.1` by default; they
> are reachable from the hub itself but **not** from the rest of the LAN. If another
> host needs Ollama (e.g. Hermes on a different machine), set `OLLAMA_BIND=0.0.0.0`
> (and/or `WEBUI_BIND=0.0.0.0`) in `.env` and bring the stack up again.

---

## The agent layer (next)

This install covers the deployment and voice layers. The conversational agent
that the **family** reaches over Signal/WhatsApp/Telegram — and that holds the
household memory — is set up separately:

- [`docs/playbooks/onboarding.md`](playbooks/onboarding.md) — the human side:
  consent, expectations, and the first week.
- [`hermes/README.md`](../hermes/README.md) — installing and configuring the
  Hermes Agent workspace (persona, elder-care skills, channel setup), pointed
  at the same Ollama (`http://HUB_IP:11434` or `http://ollama:11434`) and Home
  Assistant (`http://HUB_IP:8123`) you set up here.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: permission denied` (Linux) | Add yourself to the docker group: `sudo usermod -aG docker $USER`, then log out/in. |
| Home Assistant not reachable on macOS/Windows | You skipped the `network_mode: host` → mapped-ports edit in step 2. |
| HA can't reach Whisper/Piper/Ollama on macOS/Windows | Use the **service name** hostnames (`whisper`, `piper`, `ollama`), not `localhost`. |
| Assist replies slowly | Small hardware — set a smaller `OLLAMA_MODEL` (e.g. `llama3.2:3b`) in `.env` and re-pull, or add a GPU + the GPU override. |
| Ollama pull failed | `docker compose exec ollama ollama pull <model>` — check disk space and network. |
| Cast devices / TVs not found | On Docker Desktop, add them by IP; for full discovery run the hub on Linux with host networking. |
| See what's running | `make ps` and `make logs`. |
