#!/usr/bin/env bash
# Backend-only production deploy. Never executes database migrations.
set -Eeuo pipefail
umask 077

SHA="${1:-}"
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 2; }

ROOT=/opt/perpus-portal
COMPOSE="$ROOT/compose.vps.yaml"
MARKER_DIR=/var/lib/perpus-portal-backend-deploy
STAGE=''
CANARY_ID=''
IMAGE_SWITCHED=0
OLD_IMAGE=''
TARGET_IMAGE=''

cleanup() {
  if [[ -n "$CANARY_ID" ]]; then
    docker rm -f "$CANARY_ID" >/dev/null 2>&1 || true
  fi
  [[ -z "$STAGE" ]] || rm -rf -- "$STAGE"
}
rollback() {
  local code=$?
  trap - ERR
  if [[ "$IMAGE_SWITCHED" == 1 && -n "$OLD_IMAGE" && -n "$TARGET_IMAGE" ]]; then
    # Store diagnostic logs locally, not in public GitHub Actions output.
    local failed_container log_file
    failed_container="$(docker compose -f "$COMPOSE" ps -a -q backend 2>/dev/null || true)"
    log_file=/root/perpus-backend-deploy-last-failure.log
    if [[ -n "$failed_container" ]]; then
      docker logs --tail 200 "$failed_container" > "$log_file" 2>&1 || true
      chmod 600 "$log_file" || true
      echo "Startup diagnostics saved privately to $log_file" >&2
      docker inspect -f 'Failed container exit status: {{.State.ExitCode}}, running: {{.State.Running}}' "$failed_container" >&2 || true
    fi
    echo "Backend check failed: rolling back old image" >&2
    docker tag "$OLD_IMAGE" "$TARGET_IMAGE" >&2 || true
    (cd "$ROOT" && docker compose -f "$COMPOSE" up -d --no-deps --no-build --force-recreate backend >&2) || true
  fi
  exit "$code"
}
trap cleanup EXIT
trap rollback ERR

[[ "$EUID" == 0 ]] || { echo "Must run as root" >&2; exit 1; }
[[ -f "$COMPOSE" ]] || { echo "Production compose missing" >&2; exit 1; }
cd "$ROOT"

docker compose -f "$COMPOSE" config -q
DB_CONTAINER="$(docker compose -f "$COMPOSE" ps -q database)"
[[ -n "$DB_CONTAINER" ]] || { echo "Database container not found" >&2; exit 1; }
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER")" == "healthy" ]] || {
  echo "Database not healthy: refusing backend deploy" >&2; exit 1;
}

# User-uploaded covers, ebooks, and avatars must stay on the host bind mount.
TARGET_IMAGE="$(docker compose -f "$COMPOSE" config --format json | python3 -c '
import json,sys
cfg=json.load(sys.stdin)
svc=cfg["services"]["backend"]
vols=svc.get("volumes",[])
if not any(v.get("target")=="/app/backend/storage" and v.get("type")=="bind" for v in vols):
    sys.exit("BLOCKED: backend storage bind mount missing")
print(svc.get("image") or cfg["name"]+"-backend")
')"
[[ -n "$TARGET_IMAGE" ]] || exit 1
OLD_IMAGE="$(docker image inspect -f '{{.Id}}' "$TARGET_IMAGE")"
[[ -n "$OLD_IMAGE" ]] || { echo "Existing backend image not found" >&2; exit 1; }

STAGE="$(mktemp -d /tmp/perpus-backend-deploy.XXXXXXXX)"
git -C "$STAGE" init -q
git -C "$STAGE" remote add origin https://github.com/nadilaerianiafsri-nea/perpus-portal.git
git -C "$STAGE" fetch --quiet --depth=1 origin main
FETCHED="$(git -C "$STAGE" rev-parse FETCH_HEAD)"
[[ "$FETCHED" == "$SHA" ]] || {
  echo "BLOCKED: main moved after this workflow started" >&2; exit 1;
}
git -C "$STAGE" checkout --quiet --detach "$SHA"

# Four previously reviewed production hotfixes are present in the old VPS
# checkout. Verify their precise Git blob hashes against the reviewed baseline.
# New GitHub commits may safely evolve these files; new local edits are blocked.
DRIFT="$(git status --porcelain --untracked-files=all -- backend shared | sed -E 's/^...//' | grep -Ev '^backend/storage/' || true)"
if [[ -n "$DRIFT" ]]; then
  while IFS= read -r path; do
    expected=''
    case "$path" in
      backend/src/members/ebook-circulation.service.ts)
        expected=2cc3143dc7ca4ed79a30bc3da1a312d11cf97e28 ;;
      backend/src/members/members.service.ts)
        expected=cc39942b0d70749fd998af7a7f864d3cc547e14f ;;
      backend/src/prisma/prisma.service.ts)
        expected=d2f3d4dcb0c505d1fae7c7512f35b838c5e40bc3 ;;
      shared/requestSecurity.cjs)
        expected=471caa2d0a5c6d83eab835603aba19da3651c60e ;;
      *)
        echo "BLOCKED: unreviewed local backend/shared change: $path" >&2
        exit 1 ;;
    esac
    actual="$(git hash-object -- "$ROOT/$path")"
    if [[ "$actual" != "$expected" ]]; then
      echo "BLOCKED: local hotfix changed from reviewed baseline: $path" >&2
      exit 1
    fi
  done <<< "$DRIFT"
fi

# Never deploy schema/migration differences without backup and human review.
diff -q "$ROOT/backend/prisma/schema.prisma" "$STAGE/backend/prisma/schema.prisma" >/dev/null || {
  echo "BLOCKED: Prisma schema changed. Review/backup/migrate first." >&2; exit 1;
}
diff -qr "$ROOT/backend/prisma/migrations" "$STAGE/backend/prisma/migrations" >/dev/null || {
  echo "BLOCKED: Prisma migrations changed. Review/backup first." >&2; exit 1;
}

docker buildx version >/dev/null
BUILT_IMAGE="perpus-portal-backend-ci:${SHA:0:12}"
docker buildx build --load --build-context "shared=$STAGE/shared" \
  -f "$STAGE/backend/Dockerfile" -t "$BUILT_IMAGE" "$STAGE/backend"

# Start the new image as a temporary, unexposed container before touching
# the running backend. Disable existing scheduled maintenance in the canary.
cat > "$STAGE/canary.override.yaml" <<CANARY_YAML
services:
  backend:
    image: $BUILT_IMAGE
CANARY_YAML
CANARY_ID="$(docker compose -f "$COMPOSE" -f "$STAGE/canary.override.yaml" \
  run --no-deps --no-build -d -e PERPUS_DISABLE_BACKGROUND_JOBS=true backend)"
if [[ ! "$CANARY_ID" =~ ^[a-f0-9]{64}$ ]]; then
  echo "BLOCKED: canary did not return container ID" >&2
  exit 1
fi
CANARY_OK=0
for attempt in {1..15}; do
  if docker exec "$CANARY_ID" node -e \
    'fetch("http://127.0.0.1:3001/").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' \
    >/dev/null 2>&1; then
    CANARY_OK=1
    break
  fi
  sleep 2
done
if [[ "$CANARY_OK" != 1 ]]; then
  docker logs --tail 200 "$CANARY_ID" \
    > /root/perpus-backend-deploy-last-failure.log 2>&1 || true
  chmod 600 /root/perpus-backend-deploy-last-failure.log || true
  echo "BLOCKED: new backend cannot start. Production backend unchanged." >&2
  echo "Private diagnostics: /root/perpus-backend-deploy-last-failure.log" >&2
  exit 1
fi
docker rm -f "$CANARY_ID" >/dev/null
CANARY_ID=''

docker tag "$OLD_IMAGE" "perpus-portal-backend-rollback:$(date -u +%Y%m%d%H%M%S)"
docker tag "$BUILT_IMAGE" "$TARGET_IMAGE"
IMAGE_SWITCHED=1
docker compose -f "$COMPOSE" up -d --no-deps --no-build --force-recreate backend

curl -fsS --retry 12 --retry-all-errors --retry-delay 2 --max-time 10 \
  http://127.0.0.1:3101/ >/dev/null

[[ "$(docker compose -f "$COMPOSE" ps -q database)" == "$DB_CONTAINER" ]] || {
  echo "Database container unexpectedly changed" >&2; exit 1;
}
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER")" == "healthy" ]] || {
  echo "Database no longer healthy" >&2; exit 1;
}

install -d -m 700 "$MARKER_DIR"
printf '%s\n' "$SHA" > "$MARKER_DIR/last-success.tmp"
mv "$MARKER_DIR/last-success.tmp" "$MARKER_DIR/last-success"
IMAGE_SWITCHED=0
echo "Backend deployed: $SHA" >&2
printf '%s\n' "$SHA"
