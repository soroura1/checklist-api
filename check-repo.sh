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
  has_remote=$(git remote 2>/dev/null | head -1)

  if [ "$self" = "@citadel/contracts" ]; then
    ok "this is contracts itself — no self-dependency expected"
  elif node -p "!!(require('./package.json').dependencies||{})['@citadel/contracts']" 2>/dev/null | grep -q true; then
    spec=$(node -p "require('./package.json').dependencies['@citadel/contracts']")

    if echo "$spec" | grep -qE '#v[0-9]+\.[0-9]+\.[0-9]+$'; then
      ok "@citadel/contracts pins an exact tag ($spec)"

    elif echo "$spec" | grep -qE '#'; then
      # A ref that is not a version tag — a branch. This is the failure the whole
      # five-repository structure risks: the contract changes without any consumer
      # committing anything.
      bad "@citadel/contracts pins a non-tag ref ($spec). NEVER a branch — everything compiles, nothing works, and the error appears at runtime in a third place"

    elif [ -z "$has_remote" ] && echo "$spec" | grep -qE '^file:'; then
      # Pre-remote local development. Legitimate, and TEMPORARY.
      # `git+file://../contracts#tag` does NOT work — npm reads file://../x as the
      # absolute path /x. The tag pin is the PRODUCTION form and requires a real
      # remote, which does not exist yet.
      ok "@citadel/contracts is a local path ($spec) — valid ONLY until this repo has a remote"

    elif [ -n "$has_remote" ] && echo "$spec" | grep -qE '^file:'; then
      bad "@citadel/contracts is still a local path ($spec) but this repo HAS a remote ($has_remote). Switch to an exact tag pin — a local path in CI tests against someone's laptop"

    else
      bad "@citadel/contracts spec not understood: $spec"
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
