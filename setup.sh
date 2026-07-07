#!/usr/bin/env bash
# ============================================================================
# ElderAssist AI — one-command setup (Linux & macOS)
# ============================================================================
# Checks Docker, writes your .env, brings up the core stack, pulls the local
# LLM model, and prints where to go next. Windows users: run setup.ps1 instead.
#
# Usage:
#     ./setup.sh                 # core stack (Home Assistant + Ollama + kiosk)
#     ./setup.sh --voice         # + local wake word / speech-to-text / TTS
#     ./setup.sh --inventory     # + HomeBox
#     ./setup.sh --grocy         # + Grocy
#     ./setup.sh --webui         # + Open WebUI operator chat
#     ./setup.sh --vision        # + pull the local vision model ("Read This For Me")
#     ./setup.sh --all           # everything above
#     ./setup.sh --no-pull       # skip pulling the LLM model (do it later)
#     ./setup.sh --help
#
# Chosen profiles are saved into .env (COMPOSE_PROFILES) so plain
# `docker compose up -d` and the Makefile keep using them afterwards.
# ============================================================================
set -euo pipefail

# --- Locations -------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
COMPOSE_FILE="${REPO_ROOT}/docker/docker-compose.yml"
ENV_FILE="${REPO_ROOT}/.env"
ENV_EXAMPLE="${REPO_ROOT}/.env.example"

# --- Pretty output ---------------------------------------------------------
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"; GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"; RED="$(printf '\033[31m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; RESET=""
fi
say()  { printf '%s\n' "$*"; }
info() { printf '%s->%s %s\n' "${GREEN}" "${RESET}" "$*"; }
warn() { printf '%s!!%s %s\n' "${YELLOW}" "${RESET}" "$*"; }
die()  { printf '%sxx%s %s\n' "${RED}" "${RESET}" "$*" >&2; exit 1; }

# Print a random 32-char hex string (openssl, falling back to /dev/urandom).
# Empty output means neither source was available; callers handle that.
gen_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
  elif [ -r /dev/urandom ]; then
    head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'
  else
    printf ''
  fi
}

# --- Parse flags -----------------------------------------------------------
WANT_VOICE=0; WANT_INVENTORY=0; WANT_GROCY=0; WANT_WEBUI=0; WANT_VISION=0; DO_PULL=1
for arg in "$@"; do
  case "${arg}" in
    --voice)     WANT_VOICE=1 ;;
    --inventory) WANT_INVENTORY=1 ;;
    --grocy)     WANT_GROCY=1 ;;
    --webui)     WANT_WEBUI=1 ;;
    --vision)    WANT_VISION=1 ;;
    --all)       WANT_VOICE=1; WANT_INVENTORY=1; WANT_GROCY=1; WANT_WEBUI=1; WANT_VISION=1 ;;
    --no-pull)   DO_PULL=0 ;;
    -h|--help)
      grep -E '^# ' "$0" | sed -E 's/^# ?//'
      exit 0
      ;;
    *) die "Unknown option: ${arg} (try --help)" ;;
  esac
done

say "${BOLD}ElderAssist AI setup${RESET}"
say "Repo: ${REPO_ROOT}"
say

# --- 1. Detect OS ----------------------------------------------------------
OS="$(uname -s)"
case "${OS}" in
  Linux)  PLATFORM="Linux" ;;
  Darwin) PLATFORM="macOS" ;;
  *)      PLATFORM="${OS}" ;;
esac
info "Platform: ${PLATFORM}"

# --- 2. Check Docker + compose plugin --------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  warn "Docker is not installed."
  if [ "${PLATFORM}" = "macOS" ]; then
    say "  Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    say "  (or: brew install --cask docker), then start it and re-run ./setup.sh"
  else
    say "  Install Docker Engine: https://docs.docker.com/engine/install/"
    say "  Debian/Ubuntu quick path: curl -fsSL https://get.docker.com | sh"
    say "  Then add yourself to the docker group:  sudo usermod -aG docker \$USER"
    say "  (log out/in), and re-run ./setup.sh"
  fi
  die "Docker required."
fi

if ! docker compose version >/dev/null 2>&1; then
  warn "The Docker Compose plugin was not found."
  say "  It ships with Docker Desktop and modern Docker Engine."
  say "  Linux: sudo apt-get install docker-compose-plugin"
  say "         (or see https://docs.docker.com/compose/install/)"
  die "Docker Compose plugin required."
fi

if ! docker info >/dev/null 2>&1; then
  warn "Docker is installed but not responding."
  if [ "${PLATFORM}" = "macOS" ]; then
    say "  Start Docker Desktop and wait for the whale icon to settle, then re-run."
  else
    say "  Start it:  sudo systemctl start docker"
    say "  Permission denied? Add yourself to the docker group (see above)."
  fi
  die "Docker daemon not reachable."
fi
info "Docker $(docker --version | awk '{print $3}' | tr -d ',') with Compose $(docker compose version --short 2>/dev/null || echo '?')"

# --- 3. Create .env if missing --------------------------------------------
if [ ! -f "${ENV_FILE}" ]; then
  [ -f "${ENV_EXAMPLE}" ] || die "Missing ${ENV_EXAMPLE}"
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  info "Created .env from .env.example"
else
  info ".env already exists — keeping it"
fi

# --- 4. Timezone -----------------------------------------------------------
# Best-effort detection of the system timezone as the default suggestion.
DETECTED_TZ=""
if [ -f /etc/timezone ]; then
  DETECTED_TZ="$(cat /etc/timezone 2>/dev/null || true)"
elif command -v readlink >/dev/null 2>&1 && [ -L /etc/localtime ]; then
  DETECTED_TZ="$(readlink /etc/localtime | sed -E 's#.*/zoneinfo/##' || true)"
fi
CURRENT_TZ="$(grep -E '^TZ=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
# An existing, user-chosen TZ in .env wins (idempotent re-runs shouldn't clobber it),
# matching setup.ps1. "America/New_York" is the .env.example placeholder, so a value
# equal to it counts as "not yet chosen" and we fall back to detection (first run).
PLACEHOLDER_TZ="America/New_York"
if [ -n "${CURRENT_TZ}" ] && [ "${CURRENT_TZ}" != "${PLACEHOLDER_TZ}" ]; then
  DEFAULT_TZ="${CURRENT_TZ}"
else
  DEFAULT_TZ="${DETECTED_TZ:-${CURRENT_TZ:-${PLACEHOLDER_TZ}}}"
fi

if [ -t 0 ]; then
  printf 'Timezone for reminders/logs [%s]: ' "${DEFAULT_TZ}"
  read -r TZ_INPUT || TZ_INPUT=""
else
  TZ_INPUT=""
fi
TZ_VALUE="${TZ_INPUT:-${DEFAULT_TZ}}"

# Portable in-place edit of the TZ= line (works on both GNU and BSD sed).
tmp="$(mktemp)"
awk -v tz="${TZ_VALUE}" '/^TZ=/{print "TZ=" tz; next} {print}' "${ENV_FILE}" >"${tmp}" && mv "${tmp}" "${ENV_FILE}"
info "Timezone: ${TZ_VALUE}"

# --- 4b. Auto-generate required secrets left empty in .env -----------------
# HomeBox refuses to boot without a >=32-byte HBOX_AUTH_API_KEY_PEPPER, so we
# always make sure one exists (harmless if the inventory profile is unused).
# Generated ONCE and kept: rotating it invalidates issued HomeBox API keys.
# A .env from an older version may lack the line entirely — add it, then fill it.
grep -qE '^HOMEBOX_API_KEY_PEPPER=' "${ENV_FILE}" || printf 'HOMEBOX_API_KEY_PEPPER=\n' >>"${ENV_FILE}"
CURRENT_PEPPER="$(grep -E '^HOMEBOX_API_KEY_PEPPER=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
if [ -z "${CURRENT_PEPPER}" ]; then
  NEW_PEPPER="$(gen_key)$(gen_key)"   # 64 hex chars, comfortably >= 32 bytes
  if [ -n "${NEW_PEPPER}" ]; then
    tmp="$(mktemp)"
    awk -v k="${NEW_PEPPER}" '/^HOMEBOX_API_KEY_PEPPER=/{print "HOMEBOX_API_KEY_PEPPER=" k; next} {print}' "${ENV_FILE}" >"${tmp}" && mv "${tmp}" "${ENV_FILE}"
    info "Generated HOMEBOX_API_KEY_PEPPER (HomeBox requires it to start)."
  else
    warn "Couldn't generate HOMEBOX_API_KEY_PEPPER (no openssl or /dev/urandom)."
    say  "   HomeBox will crash-loop until you set it in .env by hand."
  fi
fi

# --- 5. Persist chosen profiles into .env ----------------------------------
PROFILES=""
[ "${WANT_VOICE}" -eq 1 ]     && PROFILES="${PROFILES}${PROFILES:+,}voice"
[ "${WANT_INVENTORY}" -eq 1 ] && PROFILES="${PROFILES}${PROFILES:+,}inventory"
[ "${WANT_GROCY}" -eq 1 ]     && PROFILES="${PROFILES}${PROFILES:+,}grocy"
[ "${WANT_WEBUI}" -eq 1 ]     && PROFILES="${PROFILES}${PROFILES:+,}webui"

# If no flags were passed, keep whatever COMPOSE_PROFILES is already in .env.
if [ -n "${PROFILES}" ]; then
  tmp="$(mktemp)"
  awk -v p="${PROFILES}" '/^COMPOSE_PROFILES=/{print "COMPOSE_PROFILES=" p; next} {print}' "${ENV_FILE}" >"${tmp}" && mv "${tmp}" "${ENV_FILE}"
  info "Profiles enabled: ${PROFILES}"
else
  EXISTING="$(grep -E '^COMPOSE_PROFILES=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
  if [ -n "${EXISTING}" ]; then
    info "Profiles enabled (from .env): ${EXISTING}"
  else
    info "Core stack only (no optional profiles)"
  fi
fi

# --- 6. macOS networking note ----------------------------------------------
if [ "${PLATFORM}" = "macOS" ]; then
  warn "macOS note: Home Assistant host networking does not work on Docker Desktop."
  say  "   Edit docker/docker-compose.yml: comment 'network_mode: host' and"
  say  "   uncomment the 'ports:' and 'networks:' blocks in the homeassistant"
  say  "   service before HA will be reachable. See docs/INSTALL.md (macOS)."
fi

# --- 7. Bring up the core stack --------------------------------------------
say
info "Starting the stack (docker compose up -d)…"
# --env-file makes compose read our .env (incl. COMPOSE_PROFILES) regardless
# of the current directory.
DC=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")
"${DC[@]}" up -d

# --- 8. Wait for Ollama, then pull the model -------------------------------
OLLAMA_MODEL="$(grep -E '^OLLAMA_MODEL=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:8b}"

say
info "Waiting for Ollama to be ready…"
ready=0
for _ in $(seq 1 60); do
  if "${DC[@]}" exec -T ollama ollama list >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [ "${ready}" -ne 1 ]; then
  warn "Ollama did not report ready in time. Check: docker compose logs ollama"
elif [ "${DO_PULL}" -eq 1 ]; then
  info "Pulling LLM model '${OLLAMA_MODEL}' (first run downloads several GB)…"
  if ! "${DC[@]}" exec -T ollama ollama pull "${OLLAMA_MODEL}"; then
    warn "Model pull failed. Retry later: docker compose exec ollama ollama pull ${OLLAMA_MODEL}"
  else
    info "Model '${OLLAMA_MODEL}' ready."
  fi
else
  info "Skipping model pull (--no-pull). Later: docker compose exec ollama ollama pull ${OLLAMA_MODEL}"
fi

# --- 8b. Vision model + kiosk proxy key (--vision) -------------------------
# Pull the local vision-language model for "Read This For Me", and make sure the
# kiosk's Ollama proxy has a key (generate a random one if the caregiver left it
# blank), then re-apply so the kiosk nginx template picks it up.
if [ "${WANT_VISION}" -eq 1 ]; then
  say
  CURRENT_KEY="$(grep -E '^KIOSK_OLLAMA_KEY=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
  if [ -z "${CURRENT_KEY}" ]; then
    NEW_KEY="$(gen_key)"
    if [ -n "${NEW_KEY}" ]; then
      tmp="$(mktemp)"
      awk -v k="${NEW_KEY}" '/^KIOSK_OLLAMA_KEY=/{print "KIOSK_OLLAMA_KEY=" k; next} {print}' "${ENV_FILE}" >"${tmp}" && mv "${tmp}" "${ENV_FILE}"
      info "Generated a random KIOSK_OLLAMA_KEY for the vision proxy."
      say  "   Put this SAME value in pwa/config.js as 'kioskKey' to enable the camera button."
      # Recreate the kiosk container so envsubst re-renders the proxy with the key.
      "${DC[@]}" up -d kiosk >/dev/null
    else
      warn "Couldn't generate a random key (no openssl or /dev/urandom)."
      say  "   Set KIOSK_OLLAMA_KEY in .env by hand, then: docker compose up -d kiosk"
    fi
  else
    info "KIOSK_OLLAMA_KEY already set — keeping it."
  fi

  VISION_MODEL="$(grep -E '^OLLAMA_VISION_MODEL=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
  VISION_MODEL="${VISION_MODEL:-qwen2.5vl:7b}"
  if [ "${ready}" -ne 1 ]; then
    warn "Ollama isn't ready — skipping the vision model pull. Retry later:"
    say  "   docker compose exec ollama ollama pull ${VISION_MODEL}"
  elif [ "${DO_PULL}" -eq 1 ]; then
    info "Pulling vision model '${VISION_MODEL}' (first run downloads several GB)…"
    if ! "${DC[@]}" exec -T ollama ollama pull "${VISION_MODEL}"; then
      warn "Vision model pull failed. Retry later: docker compose exec ollama ollama pull ${VISION_MODEL}"
    else
      info "Vision model '${VISION_MODEL}' ready."
    fi
  else
    info "Skipping vision model pull (--no-pull). Later: docker compose exec ollama ollama pull ${VISION_MODEL}"
  fi
fi

# --- 9. Next steps ---------------------------------------------------------
HA_PORT="$(grep -E '^HA_PORT=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || echo 8123)"
KIOSK_PORT="$(grep -E '^KIOSK_PORT=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || echo 8880)"
HOMEBOX_PORT="$(grep -E '^HOMEBOX_PORT=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || echo 7745)"
GROCY_PORT="$(grep -E '^GROCY_PORT=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || echo 9283)"
OPENWEBUI_PORT="$(grep -E '^OPENWEBUI_PORT=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || echo 3000)"

# Prefer the LAN IP so a family member can open these from a tablet/phone.
HOST_HINT="localhost"
if command -v hostname >/dev/null 2>&1; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  [ -n "${LAN_IP:-}" ] && HOST_HINT="${LAN_IP}"
fi

say
say "${BOLD}${GREEN}ElderAssist core is up.${RESET}"
say
say "Open these in a browser (replace ${HOST_HINT} with the hub's IP if needed):"
say "  ${BOLD}Home Assistant${RESET}  http://${HOST_HINT}:${HA_PORT}   <- create the CAREGIVER admin account here first"
say "  ${BOLD}Kiosk PWA${RESET}       http://${HOST_HINT}:${KIOSK_PORT}   <- the elder's six-button app"
[ "${WANT_INVENTORY}" -eq 1 ] && say "  ${BOLD}HomeBox${RESET}         http://${HOST_HINT}:${HOMEBOX_PORT}"
[ "${WANT_GROCY}" -eq 1 ]     && say "  ${BOLD}Grocy${RESET}           http://${HOST_HINT}:${GROCY_PORT}"
[ "${WANT_WEBUI}" -eq 1 ]     && say "  ${BOLD}Open WebUI${RESET}      http://${HOST_HINT}:${OPENWEBUI_PORT}"
say
say "Next, follow the guided setup:  ${BOLD}docs/INSTALL.md${RESET}"
say "  1. Create the caregiver admin + restricted elder user in Home Assistant."
NEXT_STEP=2
if [ "${WANT_VOICE}" -eq 1 ]; then
  say "  2. Add the Wyoming voice integrations (whisper/piper/openwakeword) — see INSTALL.md."
  NEXT_STEP=3
fi
say "  ${NEXT_STEP}. Set Ollama as HA's conversation agent, then bring in the agent layer (hermes/README.md)."
say
say "Useful commands:  make ps | make logs | make down | make backup"
