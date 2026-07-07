#!/usr/bin/env bash
# ============================================================================
# ElderAssist AI — restore
# ============================================================================
# Restores a single volume archive produced by scripts/backup.sh back into its
# Docker named volume. This OVERWRITES the current contents of that volume, so
# it asks for confirmation first.
#
# Usage:
#     ./scripts/restore.sh backups/elderassist_ha_config-20260707-120000.tar.gz
#     ./scripts/restore.sh --yes <archive>   # skip the confirmation prompt
#     ./scripts/restore.sh --help
#
# Stop the stack before restoring so nothing is writing to the volume:
#     make down
#     ./scripts/restore.sh backups/elderassist_ha_config-YYYYMMDD-HHMMSS.tar.gz
#     make up
#
# The target volume name is taken from the archive filename (everything before
# the -TIMESTAMP), e.g. `elderassist_ha_config-20260707-120000.tar.gz`
# restores into the volume `elderassist_ha_config`.
# ============================================================================
set -euo pipefail

ASSUME_YES=0
ARCHIVE=""
for arg in "$@"; do
  case "${arg}" in
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help)
      grep -E '^# ' "$0" | sed -E 's/^# ?//'
      exit 0
      ;;
    -*)
      echo "Unknown option: ${arg} (try --help)" >&2
      exit 2
      ;;
    *)
      if [ -n "${ARCHIVE}" ]; then
        echo "Only one archive can be restored at a time." >&2
        exit 2
      fi
      ARCHIVE="${arg}"
      ;;
  esac
done

if [ -z "${ARCHIVE}" ]; then
  echo "Usage: $0 [--yes] <path-to-archive.tar.gz>   (try --help)" >&2
  exit 2
fi

if [ ! -f "${ARCHIVE}" ]; then
  echo "Archive not found: ${ARCHIVE}" >&2
  exit 1
fi

# Derive the destination volume name from the filename:
#   <volume>-<YYYYMMDD>-<HHMMSS>.tar.gz  ->  <volume>
BASENAME="$(basename "${ARCHIVE}")"
VOLUME="$(echo "${BASENAME}" | sed -E 's/-[0-9]{8}-[0-9]{6}\.tar\.gz$//')"

if [ -z "${VOLUME}" ] || [ "${VOLUME}" = "${BASENAME}" ]; then
  echo "Could not determine the target volume from '${BASENAME}'." >&2
  echo "Expected a name like 'elderassist_ha_config-YYYYMMDD-HHMMSS.tar.gz'." >&2
  exit 1
fi

echo "About to restore:"
echo "  archive : ${ARCHIVE}"
echo "  into    : docker volume '${VOLUME}'"
echo
echo "This will DELETE the current contents of '${VOLUME}' and replace them."

if [ "${ASSUME_YES}" -ne 1 ]; then
  printf "Type 'yes' to continue: "
  read -r reply
  if [ "${reply}" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# Make sure the volume exists (create it empty if this is a fresh machine).
docker volume create "${VOLUME}" >/dev/null

# Resolve the archive to an absolute path for the container mount.
ARCHIVE_ABS="$(cd "$(dirname "${ARCHIVE}")" && pwd)/$(basename "${ARCHIVE}")"

# Wipe the volume, then extract the archive into it, all inside a throwaway
# Alpine container.
docker run --rm \
  -v "${VOLUME}:/data" \
  -v "${ARCHIVE_ABS}:/backup/archive.tar.gz:ro" \
  alpine \
  sh -c 'rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /backup/archive.tar.gz -C /data'

echo
echo "Restored '${VOLUME}'. Start the stack with 'make up' (or ./setup.sh)."
