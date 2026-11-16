#!/usr/bin/env bash
# Read-only production compatibility checks. Prints no passwords, tokens or env content.
set -euo pipefail
cd /opt/perpus-portal || exit 1
COMPOSE=compose.vps.yaml
echo "=== VPS CODE / PENDING BACKEND CHANGES ==="
git rev-parse --short HEAD
STATUS="$(git status --porcelain --untracked-files=all -- backend shared | sed -E 's/^...//' | grep -Ev '^backend/storage/' || true)"
if [[ -z "$STATUS" ]]; then
  echo "backend/shared drift: NONE"
else
  echo "backend/shared drift: PRESENT (deployment must wait for review)"
  printf '%s\n' "$STATUS" | head -n 30
fi
echo "=== CONTAINER HEALTH ==="
docker compose -f "$COMPOSE" ps --format json | python3 -c '
import json,sys
text=sys.stdin.read().strip()
items=[]
try:
 items=json.loads(text)
 if isinstance(items,dict): items=[items]
except json.JSONDecodeError:
 items=[json.loads(line) for line in text.splitlines()]
for item in items:
 print(item.get("Service"), "State="+str(item.get("State")), "Health="+str(item.get("Health","n/a")))
'
echo "=== BACKEND BUILD AND STORAGE SETTINGS ==="
docker compose -f "$COMPOSE" config --format json | python3 -c '
import json,sys
d=json.load(sys.stdin)
s=d["services"]["backend"]
print("Compose project:",d.get("name"))
print("Backend build context configured:",bool(s.get("build")))
print("Backend image:",s.get("image") or d["name"]+"-backend")
for v in s.get("volumes",[]):
 if v.get("target")=="/app/backend/storage":
  print("Storage target mounted:",v.get("type"),v.get("target"))
'
echo "=== DEPLOY PREREQUISITES ==="
docker buildx version | head -n 1
echo "Backend local endpoint:"
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3101/ || true
echo "AUDIT_FINISHED: No changes made."
