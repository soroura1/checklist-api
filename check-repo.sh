#!/usr/bin/env bash
# check-repo.sh — invariants this repository must hold.
# Mirrors citadel-planning/check-plan.sh: things a script can catch should never
# be left to a reviewer. Extend it whenever a defect is found that a grep would
# have caught — that is cheaper than another review round.

set -uo pipefail
fail=0
bad() { printf 'FAIL  %s\n' "$1"; fail=1; }
ok()  { printf 'ok    %s\n' "$1"; }

# --- The scope boundary is a safety property. It must be present, verbatim. ---
if grep -q 'preparedness, exercise and improvement only' README.md; then
  ok "scope-boundary statement present in README"
else
  bad "scope-boundary statement MISSING from README — it is reproduced verbatim in every repository"
fi

# --- G2: the contracts dependency must pin an exact tag, never a branch. ---
if [ -f package.json ]; then
  if grep -q '"contracts"' package.json; then
    if grep -E '"contracts":\s*".*#v[0-9]+\.[0-9]+\.[0-9]+"' package.json >/dev/null; then
      ok "contracts dependency pins an exact tag"
    else
      bad "contracts dependency must pin an exact tag (…#v1.2.3), never a branch"
    fi
  else
    ok "no contracts dependency (expected for contracts itself)"
  fi
fi

# --- No secret material committed. ---
leaked=$(git ls-files 2>/dev/null | grep -E '\.(pem|key|p12)$|^\.env$' || true)
[ -z "$leaked" ] && ok "no secret material tracked" \
  || { bad "secret material is tracked by git"; echo "$leaked" | sed 's/^/      /'; }

# --- RELEASES.md owns the numbering; it must exist. ---
[ -f RELEASES.md ] && ok "RELEASES.md present (owns release numbering)" \
  || bad "RELEASES.md missing — no single file owns this repo's release numbering"

echo
if [ "$fail" -eq 0 ]; then echo "PASS"; else echo "FAILED"; fi
exit $fail
