#!/bin/sh
# Ship a release to the VPS and run the deploy. Copy to scripts/ci-upload.sh.
# Executed BY the Woodpecker runner, not on the server.
#
# Deliberately plain OpenSSH streaming a tar archive rather than the drone-scp
# plugin: that plugin reaches the host but dies mid-transfer with
# "ssh: handshake failed: EOF".
#
# Nontrivial shell lives here rather than inline in .woodpecker.yml because
# Woodpecker's YAML-to-shell conversion mangles quoting and can slice commands
# outright, and because a checked-in script can be tested locally:
#
#     DRY_RUN=1 TARGET=x SSH_OPTS=x REMOTE=x sh scripts/ci-upload.sh
#
# Expects from the environment: TARGET, SSH_OPTS, REMOTE.

set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/release-manifest.sh"

: "${TARGET:?TARGET is not set}"
: "${SSH_OPTS:?SSH_OPTS is not set}"
: "${REMOTE:?REMOTE is not set}"

# Catches the Woodpecker brace-expansion failure early: if VPS_USER/VPS_HOST were
# expanded before the secrets were populated, REMOTE is "@" and ssh silently
# prints its usage screen instead of connecting.
case "$REMOTE" in
  @*|*@) echo "REMOTE looks unpopulated ('$REMOTE') - check the VPS_USER/VPS_HOST secrets"; exit 1 ;;
esac

# Fail before touching the network if the manifest names something that no
# longer exists. A silently-skipped path produces a half-broken deploy that is
# far harder to diagnose than a failed upload.
missing=""
for path in $RELEASE_PATHS; do
  [ -e "$path" ] || missing="$missing $path"
done
if [ -n "$missing" ]; then
  echo "Release paths listed in release-manifest.sh but missing from the checkout:"
  for path in $missing; do echo "    $path"; done
  exit 1
fi

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY RUN - release manifest validates. Would upload:"
  for path in $RELEASE_PATHS; do echo "    $path"; done
  exit 0
fi

# ---------------------------------------------------------------------------
# ★ PROVE THE HOST IS REACHABLE BEFORE ANY CHECK CAN BLAME THE SERVER.
#
# Every check below this line runs over ssh, so a transport failure makes the
# FIRST of them fail - and report its own confident, wrong reason.
#
# On 20 Aug a citadel deployment printed "No /opt/citadel/citadel/.env on the
# VPS - see the bootstrap checklist" while that file was present, complete and
# owned by deploy. The .env was never the problem: ssh had closed and `test -f`
# never ran. The message sent the operator to the wrong checklist entirely.
#
# ⚠️ THE TRAP THAT CAUSED IT. The Woodpecker agent runs ON the VPS, so a deploy
# step is a container on that same host - and a container cannot reliably reach
# its own host's PUBLIC address. The connection is accepted and then dropped
# ("Connection closed by <host> port 22"). The identical container reaches the
# identical sshd without incident over the docker bridge gateway. So while the
# runner lives on the box, VPS_HOST must be 172.17.0.1, NOT the public IP.
#
# A check is only worth its message. One that cannot tell "the server said no"
# from "the server was never asked" is worse than no check.
# ---------------------------------------------------------------------------
echo "-> Checking the VPS is reachable over SSH..."
if ! ssh $SSH_OPTS "$REMOTE" true; then
  echo
  echo "REFUSED: could not open an SSH session to the deploy host."
  echo
  echo "Nothing has been changed on the server. The running release is untouched."
  echo
  echo "Read the ssh error above - the two signatures mean different things:"
  echo
  echo "  'Connection closed by ... port 22'"
  echo "      Reached the host, which then dropped it. If the Woodpecker agent"
  echo "      runs on the VPS itself, a deploy container cannot reach the host's"
  echo "      own public address. Set the VPS_HOST secret to 172.17.0.1."
  echo
  echo "  'Permission denied (publickey)'"
  echo "      Reached sshd and was refused. The VPS_SSH_KEY secret does not match"
  echo "      any key in the deploy user's authorized_keys."
  echo
  echo "  'Connection timed out' / 'No route to host'"
  echo "      Never reached the host. Check VPS_HOST, and that it is not a"
  echo "      Cloudflare-proxied name - those do not carry port 22."
  exit 1
fi
echo "   reachable"

# Precondition: the server-owned env file must already exist. CI never ships
# secrets, so its absence means the VPS was never bootstrapped - better to stop
# here than to upload a release the deploy will refuse to run.
echo "-> Checking for $TARGET/.env on the VPS..."
if ! ssh $SSH_OPTS "$REMOTE" "test -f '$TARGET/.env'"; then
  echo "No $TARGET/.env on the VPS - see the bootstrap checklist"
  exit 1
fi

echo "-> Creating staging directory on the VPS..."
# Upload into a FRESH directory, never straight over the live target: extracting
# onto the target would merge the new release into the old one, leaving deleted
# source files behind to be compiled into the next build.
STAGE=$(ssh $SSH_OPTS "$REMOTE" 'mktemp -d /tmp/citadel-checklist-api-release.XXXXXX')
[ -n "$STAGE" ] || { echo "Failed to create a staging directory"; exit 1; }
echo "   staging at $STAGE"

# Best-effort cleanup: a failed deploy should not leave /tmp filling up.
cleanup() {
  ssh $SSH_OPTS "$REMOTE" "rm -rf '$STAGE'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "-> Streaming release to the VPS..."
# shellcheck disable=SC2086
tar czf - $RELEASE_PATHS | ssh $SSH_OPTS "$REMOTE" "tar xzf - -C '$STAGE'"

echo "-> Installing release into $TARGET..."
ssh $SSH_OPTS "$REMOTE" "sh '$STAGE/scripts/install-release.sh' '$STAGE' '$TARGET'"

echo "-> Running deploy..."
ssh $SSH_OPTS "$REMOTE" "cd '$TARGET' && chmod +x deploy.sh scripts/*.sh && ./deploy.sh"

echo "Release complete"
