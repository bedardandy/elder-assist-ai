#!/usr/bin/env bash
# ============================================================================
# ElderAssist AI — backup
# ============================================================================
# Archives the ElderAssist Docker named volumes into timestamped .tar.gz files
# under ./backups. Safe to run while the stack is up, but for a guaranteed-
# consistent Home Assistant database, stopping first is ideal:
#     make down && ./scripts/backup.sh && make up
#
# Usage:
#     ./scripts/backup.sh                 # back up everything EXCEPT LLM models
#     ./scripts/backup.sh --with-models   # also back up Ollama models (large)
#     ./scripts/backup.sh --help
#
# Ollama models are excluded by default because they are large (GBs) and can
# simply be re-pulled with `ollama pull`. Your configuration and data are the
# irreplaceable parts, and those are always included.
# ============================================================================
set -euo pipefail

# Resolve repo root from this script's location so it works from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${REPO_ROOT}/backups"

# Project name namespaces the volumes; keep in sync with .env / compose.
PROJECT="${COMPOSE_PROJECT_NAME:-elderassist}"
if [ -f "${REPO_ROOT}/.env" ]; then
  # Pull COMPOSE_PROJECT_NAME from .env if the user changed it.
  ENV_PROJECT="$(grep -E '^COMPOSE_PROJECT_NAME=' "${REPO_ROOT}/.env" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  [ -n "${ENV_PROJECT}" ] && PROJECT="${ENV_PROJECT}"
fi

WITH_MODELS=0
for arg in "$@"; do
  case "${arg}" in
    --with-models) WITH_MODELS=1 ;;
    -h|--help)
      grep -E '^# ' "$0" | sed -E 's/^# ?//'
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg} (try --help)" >&2
      exit 2
      ;;
  esac
done

# Volumes to archive. Names must match those created by docker-compose.yml,
# prefixed with the project name (e.g. elderassist_ha_config).
VOLUMES="ha_config homebox_data grocy_data openwebui_data whisper_data piper_data openwakeword_data"
if [ "${WITH_MODELS}" -eq 1 ]; then
  VOLUMES="${VOLUMES} ollama_models"
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"

echo "ElderAssist backup — project '${PROJECT}' — ${TIMESTAMP}"
echo "Writing to: ${BACKUP_DIR}"
echo

archived=0
skipped=0
for vol in ${VOLUMES}; do
  full="${PROJECT}_${vol}"
  if ! docker volume inspect "${full}" >/dev/null 2>&1; then
    echo "  skip  ${full} (does not exist yet)"
    skipped=$((skipped + 1))
    continue
  fi
  out="${BACKUP_DIR}/${full}-${TIMESTAMP}.tar.gz"
  # Mount the volume read-only and the backup dir read-write into a throwaway
  # Alpine container; tar the contents out.
  docker run --rm \
    -v "${full}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine \
    tar czf "/backup/${full}-${TIMESTAMP}.tar.gz" -C /data .
  size="$(du -h "${out}" | cut -f1)"
  echo "  ok    ${full}  ->  $(basename "${out}")  (${size})"
  archived=$((archived + 1))
done

echo
echo "Done: ${archived} archived, ${skipped} skipped."
if [ "${WITH_MODELS}" -eq 0 ]; then
  echo "Ollama models were NOT backed up (re-pull with 'ollama pull', or use --with-models)."
fi
echo "Restore with: ./scripts/restore.sh <path-to-archive.tar.gz>"
