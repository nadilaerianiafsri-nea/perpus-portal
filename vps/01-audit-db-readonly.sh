#!/usr/bin/env bash
# HANYA BACA: tidak membuat file, tidak mengubah basis data, tidak menampilkan kata sandi.
set -euo pipefail
cd /opt/perpus-portal
COMPOSE=compose.vps.yaml
[[ -f "$COMPOSE" ]] || { echo "compose.vps.yaml tidak ditemukan" >&2; exit 1; }

echo '=== KONDISI CONTAINER ==='
docker compose -f "$COMPOSE" ps

echo '=== KONDISI DATA BUKU (SELECT ONLY) ==='
docker compose -f "$COMPOSE" exec -T database sh -lc '
  set -eu
  : "${MARIADB_DATABASE:?Database name missing}"
  : "${MARIADB_USER:?Database user missing}"
  : "${MARIADB_PASSWORD:?Database password missing}"
  MYSQL_PWD="$MARIADB_PASSWORD" mariadb -h 127.0.0.1 -u "$MARIADB_USER" "$MARIADB_DATABASE" --table
' <<'SQL'
SELECT COUNT(*) AS total_books FROM books;
SELECT b.id, b.code, LEFT(b.title, 70) AS title,
       COALESCE(b.shelf, '') AS shelf,
       (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id) AS total_copies,
       COALESCE((SELECT c.location FROM book_copies c WHERE c.bookId=b.id ORDER BY c.id LIMIT 1), '[TIDAK ADA]') AS location_from_copies
FROM books b
WHERE b.type = 'FISIK'
ORDER BY b.id DESC LIMIT 15;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books' AND COLUMN_NAME = 'location';
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
SQL
