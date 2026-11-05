#!/usr/bin/env bash
# Encrypted Supabase backup → Cloudflare R2 (S3 API). Used by .github/workflows/backup.yml.
# Required env: SUPABASE_DB_URL, AGE_PUBLIC_KEY, R2_BUCKET, R2_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# Retention: 7 daily copies (daily/) + 4 weekly copies (weekly/, Sundays).
set -euo pipefail

: "${SUPABASE_DB_URL:?}" "${AGE_PUBLIC_KEY:?}" "${R2_BUCKET:?}" "${R2_ENDPOINT:?}"
STAMP="$(date -u +%Y-%m-%dT%H%MZ)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
s3() { aws s3 --endpoint-url "$R2_ENDPOINT" "$@"; }

echo "› dump roles, schema, data"
supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only

echo "› manifest (row counts, used by the monthly restore test)"
psql "$SUPABASE_DB_URL" -At -F $'\t' -c "
  select 'registrations', count(*) from public.registrations union all
  select 'slots', count(*) from public.slots union all
  select 'activities', count(*) from public.activities union all
  select 'inquiries', count(*) from public.inquiries union all
  select 'posts', count(*) from public.posts union all
  select 'gallery_images', count(*) from public.gallery_images union all
  select 'audit_log', count(*) from public.audit_log" > manifest.tsv
echo "created	$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> manifest.tsv
cat manifest.tsv

# sanity: refuse to upload an empty/broken dump
[ -s schema.sql ] && grep -q "registrations" schema.sql || { echo "✖ schema dump looks wrong"; exit 1; }

tar czf "backup-$STAMP.tar.gz" roles.sql schema.sql data.sql manifest.tsv
# encrypt with the PUBLIC key only — this runner cannot decrypt backups
age -r "$AGE_PUBLIC_KEY" -o "backup-$STAMP.tar.gz.age" "backup-$STAMP.tar.gz"
shred -u data.sql "backup-$STAMP.tar.gz" 2>/dev/null || rm -f data.sql "backup-$STAMP.tar.gz"

echo "› upload"
s3 cp "backup-$STAMP.tar.gz.age" "s3://$R2_BUCKET/daily/backup-$STAMP.tar.gz.age" --only-show-errors
if [ "$(date -u +%u)" = "7" ]; then
  s3 cp "backup-$STAMP.tar.gz.age" "s3://$R2_BUCKET/weekly/backup-$STAMP.tar.gz.age" --only-show-errors
fi
s3 ls "s3://$R2_BUCKET/daily/backup-$STAMP.tar.gz.age" >/dev/null || { echo "✖ upload not found"; exit 1; }

echo "› retention: keep newest 7 daily, 4 weekly"
prune() {
  local prefix="$1" keep="$2"
  s3 ls "s3://$R2_BUCKET/$prefix/" | awk '{print $4}' | grep '^backup-' | sort -r | tail -n +"$((keep + 1))" | while read -r f; do
    echo "  delete $prefix/$f"
    s3 rm "s3://$R2_BUCKET/$prefix/$f" --only-show-errors
  done
}
prune daily 7
prune weekly 4
echo "✔ backup $STAMP done"
