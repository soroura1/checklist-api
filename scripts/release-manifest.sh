# Single source of truth for which repository paths constitute a release.
#
# Sourced by BOTH scripts/ci-upload.sh (what to ship) and
# scripts/install-release.sh (what to replace on the VPS). One list, so the
# two can never drift.
#
# Everything listed is CI-OWNED: deleted from the target and replaced on every
# deploy. Anything NOT listed is VPS-OWNED and never touched - .env, named
# Docker volumes, backups, operator-created files.
#
# RELEASE_SHA is written by the deploy step (from CI_COMMIT_SHA) just before
# upload; deploy.sh exports it as COMMIT_SHA so /version reports the deployed
# commit (H2).
RELEASE_PATHS="src migrations package.json package-lock.json Dockerfile docker-compose.prod.yml api-router.Caddyfile deploy.sh deploy.env.example scripts RELEASE_SHA"
