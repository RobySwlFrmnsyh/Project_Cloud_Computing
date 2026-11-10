#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

sql="select 'users=' || count(*) from users union all select 'bookings=' || count(*) from bookings union all select 'payments=' || count(*) from payments union all select 'migrations=' || count(*) from schema_migrations order by 1;"

before="$(docker compose exec -T db psql -U ajt -d ajt -Atc "$sql")"
echo "Data sebelum restart:"
printf '%s\n' "$before"

trap 'docker compose up -d >/dev/null 2>&1 || true' EXIT
docker compose down
docker compose up -d

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:8080/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS http://localhost:8080/api/health >/dev/null

after="$(docker compose exec -T db psql -U ajt -d ajt -Atc "$sql")"
echo "Data setelah restart:"
printf '%s\n' "$after"

if [[ "$before" != "$after" ]]; then
  echo "Pemeriksaan persistensi gagal: jumlah data berubah." >&2
  exit 1
fi

echo "Pemeriksaan persistensi lulus: volume PostgreSQL mempertahankan data."
