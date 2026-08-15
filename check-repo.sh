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
# The dependency is "@citadel/contracts". An earlier version of this check looked
# for "contracts" and reported a FALSE PASS on every consumer — a check that passes
# when it should not is worse than no check at all.
if [ -f package.json ]; then
  self=$(node -p "require('./package.json').name" 2>/dev/null || echo "")
  if [ "$self" = "@citadel/contracts" ]; then
    ok "this is contracts itself — no self-dependency expected"
  elif node -p "!!(require('./package.json').dependencies||{})['@citadel/contracts']" 2>/dev/null | grep -q true; then
    if grep -E '"@citadel/contracts":\s*"[^"]*#v[0-9]+\.[0-9]+\.[0-9]+"' package.json >/dev/null; then
      ok "@citadel/contracts pins an exact tag"
    else
      bad "@citadel/contracts must pin an exact tag (…#v1.2.3), NEVER a branch — a branch dependency changes the contract without any consumer committing anything"
    fi
  else
    bad "no @citadel/contracts dependency found — every consumer must pin the contract"
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
