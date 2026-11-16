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
IMAGE_SWITCHED=0
OLD_IMAGE=''
TARGET_IMAGE=''

cleanup() { [[ -z "$STAGE" ]] || rm -rf -- "$STAGE"; }
rollback() {
  local code=$?
  trap - ERR
  if [[ "$IMAGE_SWITCHED" == 1 && -n "$OLD_IMAGE" && -n "$TARGET_IMAGE" ]]; then
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
