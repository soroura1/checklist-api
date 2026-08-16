#!/bin/sh
# Condition 1 of the deploy gate (woodpecker-ci.md section 3): the SHA being
# deployed must be reachable from protected main. A deployment raised on an
# unmerged commit is REFUSED - exercising this refusal is task G5b.
#
# FULL HISTORY FIRST. `merge-base --is-ancestor` exits non-zero when history
# is incomplete, so on a shallow clone this gate would refuse LEGITIMATE
# deploys - and that refusal is indistinguishable from a real one. A gate that
# fails closed for the wrong reason trains people to bypass it.

set -eu

: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is not set - this script only runs in CI}"

if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow
fi
git fetch --no-tags origin main

if git merge-base --is-ancestor "$CI_COMMIT_SHA" origin/main; then
  echo "gate: $CI_COMMIT_SHA is reachable from protected main - proceed"
else
  echo "REFUSED: $CI_COMMIT_SHA is not reachable from protected main."
  echo "Merge it through a pull request first. (Condition 1 of the deploy gate.)"
  exit 1
fi
