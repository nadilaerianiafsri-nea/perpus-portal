#!/usr/bin/env bash
# Install backend deploy trigger without running a deployment.
set -Eeuo pipefail
umask 077

CANDIDATE="${1:-}"
[[ "$EUID" == 0 ]] || { echo "Must run as root" >&2; exit 1; }
[[ -f "$CANDIDATE" ]] || { echo "Usage: $0 /path/to/vps-backend-deploy.sh" >&2; exit 2; }
[[ -f /opt/perpus-portal/compose.vps.yaml ]] || { echo "Production compose missing" >&2; exit 1; }
bash -n "$CANDIDATE"

TRIGGER=/usr/local/sbin/perpus-gha-trigger
DEPLOYER=/usr/local/sbin/perpus-portal-backend-deploy
[[ -f "$TRIGGER" ]] || { echo "Existing frontend trigger missing; stopping" >&2; exit 1; }
grep -Fq 'perpus-portal-autodeploy' "$TRIGGER" || { echo "Unexpected existing trigger; stopping" >&2; exit 1; }
grep -Fq 'SSH_ORIGINAL_COMMAND' "$TRIGGER" || { echo "Unexpected existing trigger; stopping" >&2; exit 1; }
[[ -x /usr/local/sbin/perpus-portal-autodeploy ]] || {
  echo "Existing frontend deploy script missing" >&2; exit 1;
}
[[ -f /var/lib/perpus-portal-autodeploy/last-success ]] || {
  echo "Existing frontend deploy marker missing" >&2; exit 1;
}

STAMP="$(date -u +%Y%m%d%H%M%S)"
cp -p "$TRIGGER" "$TRIGGER.backup-$STAMP"
if [[ -f "$DEPLOYER" ]]; then cp -p "$DEPLOYER" "$DEPLOYER.backup-$STAMP"; fi
install -m 700 "$CANDIDATE" "$DEPLOYER"

TEMP="$(mktemp /usr/local/sbin/perpus-gha-trigger.XXXXXXXX)"
cat > "$TEMP" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

case "${SSH_ORIGINAL_COMMAND:-}" in
  deploy-frontend)
    /usr/bin/flock -w 900 /run/lock/perpus-portal-autodeploy.lock \
      /usr/local/sbin/perpus-portal-autodeploy >/dev/null
    cat /var/lib/perpus-portal-autodeploy/last-success
    ;;
  "deploy-backend "*)
    if [[ "${SSH_ORIGINAL_COMMAND}" =~ ^deploy-backend[[:space:]]([a-f0-9]{40})$ ]]; then
      SHA="${BASH_REMATCH[1]}"
      /usr/bin/flock -w 900 /run/lock/perpus-portal-autodeploy.lock \
        /usr/local/sbin/perpus-portal-backend-deploy "$SHA" >/dev/null
      cat /var/lib/perpus-portal-backend-deploy/last-success
    else
      echo "Rejected backend command" >&2
      exit 1
    fi
    ;;
  *)
    echo "SSH command not allowed" >&2
    exit 1
    ;;
esac
SCRIPT
bash -n "$TEMP"
chmod 700 "$TEMP"
chown root:root "$TEMP"
mv -f "$TEMP" "$TRIGGER"
echo "INSTALLED: backend deploy trigger; existing frontend still supported."
echo "No Docker containers, files in /opt/perpus-portal, or databases were changed."
