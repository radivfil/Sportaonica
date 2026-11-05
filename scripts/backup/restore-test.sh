#!/usr/bin/env bash
# Monthly restore test (see docs/backup-restore.md).
# Restores the NEWEST backup into a throw-away database and compares row counts
# with the manifest written at backup time.
#
# CI: .github/workflows/restore-test.yml (local Supabase DB via `supabase db start`)
# Manually: TARGET_DB_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres AGE_KEY_FILE=~/sportaonica-backup.key bash scripts/backup/restore-test.sh
# Required: R2_BUCKET, R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AGE_SECRET_KEY or AGE_KEY_FILE
set -euo pipefail

TARGET_DB_URL="${TARGET_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
s3() { aws s3 --endpoint-url "$R2_ENDPOINT" "$@"; }

LATEST="$(s3 ls "s3://$R2_BUCKET/daily/" | awk '{print $4}' | grep '^backup-' | sort | tail -n 1)"
[ -n "$LATEST" ] || { echo "✖ no backup found in daily/"; exit 1; }
echo "› newest backup: $LATEST"
s3 cp "s3://$R2_BUCKET/daily/$LATEST" backup.age --only-show-errors

if [ -n "${AGE_SECRET_KEY:-}" ]; then
  printf '%s\n' "$AGE_SECRET_KEY" > key.txt
  AGE_KEY_FILE="$WORK/key.txt"
fi
age -d -i "${AGE_KEY_FILE:?set AGE_SECRET_KEY or AGE_KEY_FILE}" -o backup.tar.gz backup.age
tar xzf backup.tar.gz

created="$(grep '^created' manifest.tsv | cut -f2)"
echo "› backup created $created"
# age check: the newest backup must be < 48 h old (nightly job is running)
if [ "$(( $(date -u +%s) - $(date -u -d "$created" +%s 2>/dev/null || echo 0) ))" -gt 172800 ]; then
  echo "✖ newest backup is older than 48 h — nightly backup is not running"; exit 1
fi

echo "› restore (roles → schema → data)"
psql "$TARGET_DB_URL" -q -v ON_ERROR_STOP=0 -f roles.sql >/dev/null 2>&1 || true
psql "$TARGET_DB_URL" --single-transaction -q -v ON_ERROR_STOP=1 \
  -f schema.sql \
  -c 'SET session_replication_role = replica' \
  -f data.sql

echo "› verify row counts"
fail=0
while IFS=$'\t' read -r table expected; do
  [ "$table" = "created" ] && continue
  actual="$(psql "$TARGET_DB_URL" -At -c "select count(*) from public.$table")"
  if [ "$actual" = "$expected" ]; then echo "  ✔ $table: $actual"; else echo "  ✖ $table: expected $expected, got $actual"; fail=1; fi
done < manifest.tsv

echo "› verify business logic still works on the restored copy"
psql "$TARGET_DB_URL" -At -c "select count(*) from public.list_slots(false)" >/dev/null
psql "$TARGET_DB_URL" -At -c "select relrowsecurity from pg_class where relname = 'registrations'" | grep -q t || { echo "✖ RLS is off after restore"; fail=1; }

[ "$fail" = 0 ] && echo "✔ restore test passed ($LATEST)" || { echo "✖ restore test FAILED"; exit 1; }
