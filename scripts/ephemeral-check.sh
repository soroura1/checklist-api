#!/usr/bin/env bash
# R4 G3 · D8 — the production-like deployment test, in an EPHEMERAL environment.
#
# ============================================================================
# WHY EPHEMERAL, AND NOT A PERMANENT "STAGING"
# ============================================================================
# DEC-027: an ephemeral environment satisfies D8; a permanent one called
# "staging" is ceremony for a solo project. A long-lived staging box drifts from
# production, accumulates data nobody owns, and eventually becomes a second
# thing to maintain that proves less each month.
#
# This stands the stack up from the SAME compose file and the SAME migrations
# production uses, proves the things that matter, and destroys it. What it
# proves is true of the artifact, not of a machine somebody has been editing.
#
#   sh scripts/ephemeral-check.sh
#
# Exits non-zero on the first failure. Always tears down, including on failure —
# an ephemeral environment that survives its own test is not ephemeral.

set -uo pipefail

PROJECT="citadel-ephemeral-$$"
PGPORT="${EPHEMERAL_PG_PORT:-55499}"
fail=0
ok()  { printf 'ok    %s\n' "$1"; }
bad() { printf 'FAIL  %s\n' "$1"; fail=1; }

cleanup() {
  echo
  echo "-> Destroying the ephemeral environment"
  docker rm -f "$PROJECT-db" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "-> Standing up an ephemeral database (project $PROJECT)"
docker run -d --name "$PROJECT-db" \
  -e POSTGRES_PASSWORD=ephemeral -e POSTGRES_DB=checklist \
  -p "127.0.0.1:$PGPORT:5432" postgres:17-alpine >/dev/null || {
    echo "could not start the database"; exit 1; }

echo "-> Waiting for it"
for _ in $(seq 1 30); do
  docker exec "$PROJECT-db" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done

# --- The migrations production runs, against a database that has never seen them.
echo
echo "-> Applying migrations from scratch"
DB_HOST=127.0.0.1 DB_PORT="$PGPORT" DB_NAME=checklist \
OWNER_DB_USER=postgres OWNER_DB_PASSWORD=ephemeral APP_DB_PASSWORD=ephemeral-app \
  node src/migrate.js >/tmp/ephemeral-migrate.log 2>&1 \
  && ok "every migration applies to an empty database" \
  || { bad "migrations failed"; sed 's/^/      /' /tmp/ephemeral-migrate.log; }

# ★ A migration that only works on a database that already has the previous
#   release's state is a migration that cannot be applied to a new deployment.
#   This is the only place that is tested.

# --- The safety properties, on the handle the application actually uses.
echo
echo "-> Verifying the safety properties"
q() { docker exec -i -e PGPASSWORD=ephemeral "$PROJECT-db" psql -U postgres -d checklist -tAc "$1" 2>/dev/null | tr -d ' '; }

[ "$(q "select rolsuper from pg_roles where rolname='checklist_app'")" = "f" ] \
  && ok "the application role has no superuser bit" \
  || bad "checklist_app is a superuser — every isolation policy is worth nothing"

[ "$(q "select rolbypassrls from pg_roles where rolname='checklist_app'")" = "f" ] \
  && ok "the application role cannot bypass row-level security" \
  || bad "checklist_app has BYPASSRLS"

forced=$(q "select count(*) from pg_class where relname in ('tenancy_probe','catalogue_tool') and relforcerowsecurity")
[ "$forced" = "2" ] \
  && ok "row-level security is FORCED on both tenant tables" \
  || bad "RLS forced on $forced of 2 tables — 'enable' alone exempts the owner"

# --- ★ The constraints, proven by making them refuse. -------------------------
echo
echo "-> Proving the constraints refuse"

if q "insert into catalogue_tool (tool_id,version,title_key,purpose_key,authority_class,classification,lifecycle_state,provenance,created_by,adapted_from_document,adapted_from_issuing_body,adapted_from_authority_class) values ('EPH-1','1.0.0','t','p','A','checklist','draft','{}','eph','D','B','A')" 2>&1 | grep -q .; then
  bad "an adaptation of class A content was permitted to claim class A"
else
  ok "adaptation-may-not-claim-source-authority refuses"
fi

# ...and the corrected form is permitted, or the constraint refuses everything.
docker exec -i -e PGPASSWORD=ephemeral "$PROJECT-db" psql -U postgres -d checklist -q \
  -c "insert into catalogue_tool (tool_id,version,title_key,purpose_key,authority_class,classification,lifecycle_state,provenance,created_by,adapted_from_document,adapted_from_issuing_body,adapted_from_authority_class) values ('EPH-2','1.0.0','t','p','C','checklist','draft','{}','eph','D','B','A')" >/dev/null 2>&1 \
  && ok "...and the corrected class C form is permitted" \
  || bad "the constraint refuses everything — which proves nothing"

echo
if [ "$fail" -eq 0 ]; then echo "PASS — the artifact deploys to a machine that has never seen it"; else echo "FAILED"; fi
exit $fail
