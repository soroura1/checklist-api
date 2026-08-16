#!/bin/bash
# Server-side deploy for checklist-api. Lives at /opt/citadel/checklist-api/deploy.sh,
# installed there by scripts/install-release.sh.
#
# Invoked by ci-upload.sh over SSH, and equally safe to run by hand:
#
#     cd /opt/citadel/checklist-api && ./deploy.sh
#
# That symmetry is the point: debugging a deploy never requires pushing a commit.
#
# Order: validate, then build, then swap, then prove it serves. Nothing mutates
# the running site until the new image builds clean, and the previous image is
# retagged first so a rollback is one command.
#
# It never removes the target directory, .env, or any Docker volume. Deleting
# CI-owned files is install-release.sh's job and nothing else's.

set -euo pipefail

# ---------------------------- PROJECT CONFIG ----------------------------
APP_DIR="${APP_DIR:-/opt/citadel/checklist-api}"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"

# Server-owned, never shipped by CI (not in release-manifest.sh).
ENV_FILE="${DEPLOY_ENV_FILE:-$APP_DIR/.env}"

# Unique per platform on this shared VPS - compose prefixes every resource
# with it, so a collision lets one platform operate another's containers.
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-citadel-checklist-api}"
export COMPOSE_PROJECT_NAME

APP_SERVICES="checklist-api api-router"
MIGRATE_SERVICE="migrate"
HEALTH_SERVICE="checklist-api"
IMAGE_NAME="citadel/checklist-api"

# Probed from INSIDE the container - the app's own port, not the host binding.
HEALTH_PORT="${HEALTH_PORT:-8081}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SEC="${HEALTH_SLEEP_SEC:-2}"

REQUIRED_ENV="APP_BASE_URL OWNER_DB_PASSWORD APP_DB_PASSWORD"
# -------------------------- END PROJECT CONFIG --------------------------

cd "$APP_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" "$@"
}

on_error() {
  local exit_code=$?
  echo ""
  echo "Deployment FAILED (exit code: $exit_code)"
  echo "-> Recent container logs:"
  compose logs --tail=80 "$MIGRATE_SERVICE" 2>&1 || true
  for svc in $APP_SERVICES; do
    compose logs --tail=80 "$svc" 2>&1 || true
  done
  if docker image inspect "$IMAGE_NAME:rollback" >/dev/null 2>&1; then
    echo ""
    echo "-> A rollback image exists. To restore the previous release:"
    echo "     docker image tag $IMAGE_NAME:rollback $IMAGE_NAME:latest"
    echo "     cd $APP_DIR && docker compose --env-file .env -f docker-compose.prod.yml \\"
    echo "       -p $COMPOSE_PROJECT_NAME up -d --no-deps --force-recreate $APP_SERVICES"
  fi
  exit "$exit_code"
}
trap on_error ERR

# ------------------------- Prerequisite check --------------------------
command -v docker >/dev/null 2>&1 || { echo "docker is not installed on this VPS"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "the docker compose plugin is missing"; exit 1; }

# The databases are a separate server-owned stack; refuse to deploy into a
# world where they are absent rather than fail halfway with a network error.
docker network inspect citadel_citadel >/dev/null 2>&1 || {
  echo "The citadel_citadel network does not exist - start the database stack first:"
  echo "     cd /opt/citadel && docker compose up -d"
  exit 1
}

# --------------- Env validation - fail fast BEFORE building ------------
if [ ! -f "$ENV_FILE" ]; then
  echo "No runtime env file found at $ENV_FILE"
  echo "  This is intentional: CI never uploads production secrets. Create it once:"
  echo "     cp $APP_DIR/deploy.env.example $ENV_FILE && chmod 600 $ENV_FILE"
  exit 1
fi

# Server env file first; already-exported (CI-passed) values win.
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|\#*) continue ;; esac
  case "$line" in *=*) ;; *) continue ;; esac
  key="${line%%=*}"
  case "$key" in
    ''|*[!A-Za-z0-9_]*|[0-9]*) continue ;;
  esac
  if [ -z "${!key:-}" ]; then export "${line?}"; fi
done < "$ENV_FILE"

for var in $REQUIRED_ENV; do
  val="${!var:-}"
  [ -n "$val" ] || { echo "required env var $var is empty in $ENV_FILE"; exit 1; }
done

case "$APP_BASE_URL" in
  https://*) ;;
  *) echo "APP_BASE_URL must be an https:// public origin, got: $APP_BASE_URL"; exit 1 ;;
esac

# CASE-FOLD before matching - shell case globs are case-sensitive, and the
# uppercase placeholder is the exact form setup instructions use.
APP_BASE_URL_LC=$(printf '%s' "$APP_BASE_URL" | tr '[:upper:]' '[:lower:]')
case "$APP_BASE_URL_LC" in
  *localhost*|*127.0.0.1*|*0.0.0.0*|\
  *your-domain*|*yourdomain*|*your_domain*|*mydomain*|\
  *example.org*|*example.com*|*example.net*|*.invalid*|*.local*|\
  *replace_me*|*replaceme*|*changeme*|*change-me*|*todo*|*xxx*|\
  *'<'*|*'>'*)
    echo "APP_BASE_URL still holds a placeholder/local value: $APP_BASE_URL"
    exit 1 ;;
esac

HOST_BIND_IP="${HOST_BIND_IP:-172.17.0.1}"
if [ "$HOST_BIND_IP" = "0.0.0.0" ]; then
  echo "HOST_BIND_IP=0.0.0.0 would publish the app publicly and bypass TLS."
  exit 1
fi

# The deployed commit, written by CI next to this script. /version reporting
# it is task H2 - an externally verifiable deployment.
if [ -f "$APP_DIR/RELEASE_SHA" ]; then
  COMMIT_SHA=$(cat "$APP_DIR/RELEASE_SHA")
  export COMMIT_SHA
  echo "Deploying commit $COMMIT_SHA"
else
  echo "WARNING: no RELEASE_SHA file - /version will report 'unknown' (H2 fails)"
fi

echo "Env validated - $APP_BASE_URL via $HOST_BIND_IP:${HOST_APP_PORT:-8081}"

compose config --quiet

# ------------------------------ Rollback point -------------------------
if docker image inspect "$IMAGE_NAME:latest" >/dev/null 2>&1; then
  docker image tag "$IMAGE_NAME:latest" "$IMAGE_NAME:rollback"
  echo "-> Tagged the outgoing image as $IMAGE_NAME:rollback"
else
  echo "-> No previous image found (first deploy) - no rollback point yet"
fi

# --------------------------------- Build -------------------------------
echo "-> Building..."
compose build checklist-api

echo "-> Running database migrations..."
compose run --rm "$MIGRATE_SERVICE"

# ------------------------------- Restart -------------------------------
echo "-> Restarting app containers..."
# shellcheck disable=SC2086
compose up -d --no-deps --remove-orphans $APP_SERVICES

# ----------------------------- Health probe ----------------------------
echo "-> Waiting for $HEALTH_SERVICE on :$HEALTH_PORT$HEALTH_PATH..."
HEALTHY=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if compose exec -T "$HEALTH_SERVICE" sh -c \
      "wget -q -O /dev/null http://127.0.0.1:$HEALTH_PORT$HEALTH_PATH" \
      >/dev/null 2>&1; then
    echo "   $HEALTH_SERVICE is healthy (attempt $i)"
    HEALTHY=1
    break
  fi
  sleep "$HEALTH_SLEEP_SEC"
done
if [ "$HEALTHY" -ne 1 ]; then
  echo "$HEALTH_SERVICE did not become healthy within $((HEALTH_RETRIES * HEALTH_SLEEP_SEC))s"
  exit 1
fi

echo "-> Pruning dangling images..."
# Untagged layers only - :rollback keeps the previous release pinned.
docker image prune -f >/dev/null || true

echo ""
echo "Deployment complete - $APP_BASE_URL"
echo "  Internal health passed. Verify the public origin separately (H2-H4):"
echo "     curl -fsS $APP_BASE_URL/content/version"
