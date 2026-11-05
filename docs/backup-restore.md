# Backup i vraćanje podataka

> Backup koji nije testiran ne smatra se backupom. Test vraćanja radi se automatski svaki mjesec (`restore-test.yml`), a ručno barem jednom prije izlaska u produkciju.

## 1. Što se sprema i gdje

| Sloj | Što | Gdje | Koliko dugo |
|---|---|---|---|
| Supabase Pro (samo produkcija) | Automatski dnevni backup cijele baze | Supabase (EU) | 7 dana (Pro) |
| **Naš backup** (demo i produkcija) | `roles.sql`, `schema.sql`, `data.sql` (`supabase db dump`) + `manifest.tsv` (broj redaka) | Privatni Cloudflare R2 bucket, **šifrirano** (age) | 7 dnevnih (`daily/`) + 4 tjedne (`weekly/`, nedjeljom) |
| Slike | Supabase Storage bucket `uploads` | Supabase | Vidi točku 6 |
| Kod i migracije | `supabase/migrations/*.sql` | GitHub | trajno |

Noćni posao: `.github/workflows/backup.yml` → `scripts/backup/backup.sh`. Na kraju uspješnog uploada šalje se **heartbeat** ping. Ako ping izostane, nadzorni servis šalje e-mail.

Šifriranje: [age](https://age-encryption.org). GitHub Actions ima samo **javni** ključ i ne može dešifrirati backup. **Privatni ključ** čuva vlasnica offline (password manager + ispis u sefu) i, zasebno, GitHub environment `restore-test` za mjesečni test.

## 2. Jednokratno postavljanje

1. **Ključevi** (na računalu vlasnice): `age-keygen -o sportaonica-backup.key`. Javni ključ (`age1…`) ide u GitHub varijablu `AGE_PUBLIC_KEY`. Sadržaj datoteke (`AGE-SECRET-KEY-…`) ide u password manager i u secret `AGE_SECRET_KEY` environmenta `restore-test`.
2. **R2 bucket**: Cloudflare → R2 → Create bucket `sportaonica-backup` (lokacija EU, **bez** javnog pristupa). Zatim R2 → Manage API tokens → token s pravom *Object Read & Write* samo za taj bucket. Vrijednosti upišite u `R2_ACCESS_KEY_ID` i `R2_SECRET_ACCESS_KEY` (secrets) te `R2_ACCOUNT_ID` i `R2_BUCKET` (variables).
3. **Connection string**: Supabase → Project Settings → Database → *Session pooler* URI (IPv4). Upišite ga u secret `SUPABASE_DB_URL`. Preporuka: zaseban DB korisnik samo za čitanje.
4. **Heartbeat**: napravite heartbeat monitor (UptimeRobot ili Healthchecks.io), period 1 dan, tolerancija 2 h. URL upišite u secret `HEARTBEAT_URL`. *Napomena: provjerite nudi li UptimeRobot heartbeat na Free planu u trenutku postavljanja. Ako ne nudi, Healthchecks.io Free ga nudi.*
5. GitHub → Environments: `production` (ili `demo`) s gornjim vrijednostima. Varijabla `BACKUP_ENVIRONMENT` odabire koji se projekt backupira.
6. Ručno pokrenite *Actions → Nightly encrypted backup → Run workflow* i provjerite da se datoteka pojavila u R2 `daily/`.

## 3. Vraćanje u NOVI Supabase projekt (korak po korak)

Potrebno: Supabase CLI, `psql`, `age`, AWS CLI (za R2), privatni ključ.

1. **Novi projekt**: supabase.com → New project → regija **EU Central (Frankfurt)**, plan prema fazi. Spremite lozinku baze.
2. **Preuzmite backup**:
   ```bash
   export R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com AWS_DEFAULT_REGION=auto
   aws s3 ls s3://sportaonica-backup/daily/ --endpoint-url $R2_ENDPOINT
   aws s3 cp s3://sportaonica-backup/daily/backup-<datum>.tar.gz.age . --endpoint-url $R2_ENDPOINT
   ```
3. **Dešifrirajte i raspakirajte**:
   ```bash
   age -d -i sportaonica-backup.key -o backup.tar.gz backup-<datum>.tar.gz.age
   tar xzf backup.tar.gz   # roles.sql schema.sql data.sql manifest.tsv
   ```
4. **Vratite** (službeni Supabase postupak):
   ```bash
   export NEW_DB_URL='postgresql://postgres.<ref>:<lozinka>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
   psql "$NEW_DB_URL" -f roles.sql            # greške "role already exists" su normalne
   psql "$NEW_DB_URL" --single-transaction -v ON_ERROR_STOP=1 \
     -f schema.sql -c 'SET session_replication_role = replica' -f data.sql
   ```
5. **Provjerite** broj redaka prema `manifest.tsv`:
   `psql "$NEW_DB_URL" -c "select count(*) from public.registrations"` (i ostale tablice iz manifesta).
6. **Administratorica**: Auth korisnici se ne prenose uvijek. Pokrenite `npm run supabase:create-admin -- vlasnica@…`. Na prvoj prijavi ponovno postavite 2FA.
7. **Auth postavke** (Dashboard → Authentication): isključite registracije, uključite TOTP MFA, JWT expiry 3600 s (vidi `supabase/config.toml`), SMTP preko Resenda.
8. **Aplikacija**: zamijenite `SUPABASE_URL`, `SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY` (`npx wrangler secret put … --env production`), pokrenite deploy, provjerite `/api/health`.
9. **Slike**: ako je stari projekt nedostupan, ponovno učitajte slike iz izvornika (vidi točku 6). Inače ih kopirajte (Supabase Storage S3 API ili ručno).
10. Ažurirajte `SUPABASE_DB_URL` za backup workflow na novi projekt.

Ciljano vrijeme vraćanja (RTO): **oko 1 sat**. Najveći mogući gubitak (RPO): **24 h** (noćni backup). U produkciji je manji zbog Supabase Pro backupa.

## 4. Mjesečni test vraćanja

- Automatski: `.github/workflows/restore-test.yml` (3. u mjesecu) pokreće lokalnu Supabase bazu u CI-ju, vraća **najnoviji** backup, uspoređuje broj redaka s manifestom, provjerava da je RLS uključen i da poslovne funkcije rade. Ako je najnoviji backup stariji od 48 h, test pada.
- Ručno (lokalno, Docker):
  ```bash
  npx supabase db start
  AGE_KEY_FILE=~/sportaonica-backup.key R2_BUCKET=sportaonica-backup R2_ENDPOINT=… \
  AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… bash scripts/backup/restore-test.sh
  ```
- Rezultat zapišite u tablicu ispod.

| Datum | Tko | Backup | Rezultat |
|---|---|---|---|
| | | | |

## 5. Ako backup ne radi

1. GitHub → Actions → *Nightly encrypted backup* → zadnji neuspjeli run → log.
2. Najčešći uzroci: istekla R2 API lozinka, promijenjena lozinka baze (`SUPABASE_DB_URL`), pauziran Free projekt (demo).
3. Nakon popravka ručno pokrenite workflow i provjerite heartbeat.

## 6. Slike (Storage)

Slike nisu u `db dump`. Objavljene slike su javne, a izvornike vlasnica ionako čuva. Za potpuni backup slika uključite Supabase Storage S3 pristup (Storage → S3 Connection) i dodajte korak `aws s3 sync` iz Supabase S3 endpointa u R2 `storage/` (opcionalno, vidi runbook).
