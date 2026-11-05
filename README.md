# Sportaonica: web stranica i sustav prijava

Programi za djecu i odrasle u **Brckovljanima** i **Sesvetskom Kraljevcu**: termini sa slobodnim mjestima uživo, online prijava bez korisničkog računa, lista čekanja, otkazivanje osobnom poveznicom, upiti za dječje rođendane i jednostavan admin za vlasnicu (s 2FA).

Next.js 15 (App Router) · TypeScript · Tailwind · Zod · Tiptap · **Supabase** (Postgres, RLS, Auth + TOTP, Storage, EU) · **Cloudflare Workers** (OpenNext) · Resend

Dokumenti: [istraživanje](docs/research.md) · [backup i vraćanje](docs/backup-restore.md) · [runbook „Što ako padne”](docs/runbook.md) · [dizajn](docs/design-brief.md)

---

## 🇭🇷 Sažetak postavljanja

### Dvije faze projekta

| | Faza A: DEMO (sada) | Faza B: PRODUKCIJA (nakon odobrenja) |
|---|---|---|
| Podaci | **samo izmišljeni** (seed), oznaka „DEMO” na svakoj stranici, `noindex` | stvarni |
| Baza | Supabase **Free** (EU) | **novi** Supabase projekt na **Pro** planu, račun klijentice, regija EU |
| Hosting | Cloudflare Workers Free (`*.workers.dev`) | Cloudflare (Free ili Workers Paid), domena `sportaonica.hr` |
| Env | [`env/.env.demo`](env/.env.demo) | [`env/.env.production`](env/.env.production) |

**Prelazak A → B mijenja samo env varijable i pokreće migracije. Kod se ne mijenja** (upute niže).

> Predlošci su u mapi `env/` jer Next.js automatski učitava `.env.production` iz korijena projekta pri svakom buildu. U predloške se nikad ne upisuju tajne: `npm run check:env` to provjerava u CI-ju.

### Pokretanje na računalu (bez ikakvih računa)

```bash
npm install
cp .env.example .env.local        # upišite ADMIN_PASSWORD, ADMIN_TOTP_SECRET, AUTH_SECRET, CRON_SECRET
npm run dev                       # http://localhost:3000
```

Bez `SUPABASE_URL` aplikacija koristi lokalnu datoteku `.data/db.json` s izmišljenim podacima. E-mailovi se ispisuju u konzolu, a poveznica za otkazivanje prikazuje se na ekranu potvrde. Reset podataka: `npm run seed:reset`.

**Lokalni admin** (`/admin`): e-mail i lozinka iz `.env.local`, zatim 6-znamenkasti kod. U aplikaciju za autentifikaciju (Google/Microsoft Authenticator, 1Password) ručno dodajte ključ iz `ADMIN_TOTP_SECRET` (base32, npr. `JBSWY3DPEHPK3PXP` samo lokalno). Lokalna prijava radi isključivo uz `APP_ENV=local`.

### Demo podaci za admin

| | Lokalno | Demo (Supabase) |
|---|---|---|
| Adresa | `http://localhost:3000/admin` | `https://…workers.dev/admin` |
| E-mail | `ADMIN_EMAIL` iz `.env.local` | kreira se skriptom `supabase:create-admin` |
| Lozinka | `ADMIN_PASSWORD` iz `.env.local` | privremena, ispisuje se jednom |
| 2FA | `ADMIN_TOTP_SECRET` | QR kod pri prvoj prijavi (obavezno) |

### Postavljanje Supabase projekta (demo i produkcija jednako)

1. supabase.com → **New project**, regija **EU Central (Frankfurt)**. Demo: Free. Produkcija: **Pro**, organizacija klijentice.
2. Migracije (tablice, RLS, funkcije, Storage bucket):
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # primjenjuje supabase/migrations/*.sql
   ```
3. **Authentication** u Dashboardu (vrijednosti su u [`supabase/config.toml`](supabase/config.toml)): isključite *Allow new users to sign up*, uključite **MFA → TOTP**, JWT expiry 3600 s, minimalna lozinka 12 znakova. Pro plan: *Sessions → Time-box* 8 h. SMTP: Resend (produkcija).
4. Administratorica: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run supabase:create-admin -- vlasnica@…`
5. **Samo demo**: izmišljeni podaci: `… APP_ENV=demo npm run supabase:seed -- --yes` (skripta odbija produkciju).

### Deploy na Cloudflare Workers

```bash
npx wrangler login
# tajne (jednom po okruženju; produkcija: dodajte --env production)
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put AUTH_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put RESEND_API_KEY        # produkcija
npx wrangler secret put TURNSTILE_SECRET_KEY  # neobavezno
# javne vrijednosti potrebne već pri buildu:
NEXT_PUBLIC_APP_ENV=demo NEXT_PUBLIC_SITE_URL=https://… SUPABASE_URL=https://<ref>.supabase.co npm run cf:deploy
```

Ostale ne-tajne vrijednosti nalaze se u [`wrangler.jsonc`](wrangler.jsonc) (`vars`, `env.production.vars`). Automatski deploy: `.github/workflows/deploy.yml` (demo s `main`, produkcija ručno uz odobrenje).

**Nadzor (UptimeRobot Free)**: monitor 1 je `GET /api/health` svakih 5 min (radi `select 1` u bazi i u demo fazi sprječava pauziranje Free projekta). Monitor 2 je `GET /api/cron/tick?key=<CRON_SECRET>` svakih 5 min (ponovno slanje e-mailova iz reda, dnevno GDPR brisanje).

### Domena `.hr` (CARNET) i DNS

1. CARNET je registar .hr domene. Domenu `sportaonica.hr` registrirajte kod **ovlaštenog registrara** (popis na domene.hr) **na ime vlasnice obrta** (potrebni su podaci obrta i OIB). *Uvjete i cijenu provjeriti s registrarom.*
2. Cloudflare → **Add a site** → `sportaonica.hr` (Free) → Cloudflare dodijeli dva nameservera.
3. U sučelju registrara zamijenite nameservere Cloudflareovima. Propagacija traje do 24 h.
4. Cloudflare → Workers → `sportaonica-production` → *Custom domains*: `sportaonica.hr` i `www.sportaonica.hr` (već su u `wrangler.jsonc`). SSL/TLS: **Full (strict)**. Uključite **DNSSEC** (DS zapis upisuje registrar).
5. E-mail domena za Resend: dodajte SPF/DKIM zapise koje Resend prikaže.
6. Datum isteka upišite u GitHub repo varijablu `DOMAIN_EXPIRES`. Workflow javlja **30 dana prije isteka**.

### Računi

Svi računi (Supabase, Cloudflare, GitHub, Resend, UptimeRobot) otvaraju se na **e-mail koji kontrolira klijentica**, a developer je član. **2FA je uključen svugdje.** Popis je u [runbooku](docs/runbook.md#1-računi-i-pristup).

### Troškovi

| Stavka | Demo | Produkcija |
|---|---|---|
| Supabase | Free: 0 $ | **Pro: oko 25 $/mj.** (dnevni backupi, bez pauziranja) |
| Cloudflare Workers | Free: 0 $ | Free 0 $ **ili Workers Paid 5 $/mj.** (vidi napomenu) |
| Cloudflare R2 (backup) | 0 $ (10 GB besplatno) | 0 $ |
| Resend | Free: 0 $ (3.000/mj., 100/dan) | 0 $ (Pro tek ako treba više) |
| UptimeRobot | Free: 0 $ | 0 $ |
| GitHub Actions | besplatne minute: 0 $ | 0 $ |
| Domena .hr | n/a | prema cjeniku registrara (godišnje) |
| **Ukupno** | **0 $** | **oko 25–30 $/mj.** (plaća klijentica) |

**Workers Free ili Paid**: izmjereni bundle je **2.723 KiB gzip**, ispod Free limita od 3 MiB (`npm run cf:size`, provjerava se u CI-ju). Free plan ima i limit od **10 ms CPU vremena po zahtjevu** te 100.000 zahtjeva dnevno. Server-rendering stranica može taj CPU limit povremeno premašiti. Ako Cloudflare → Workers → *Metrics* pokaže greške „CPU time limit exceeded” (1102), ili bundle naraste preko 3 MiB, uključite **Workers Paid (5 $/mj.)**. Nije potrebna nikakva izmjena koda.

### Prelazak iz A (demo) u B (produkcija)

1. Klijentica kreira Supabase organizaciju i **novi** projekt (Pro, EU Central). Demo projekt se ne „nadograđuje” jer sadrži izmišljene podatke.
2. `npx supabase link --project-ref <prod-ref> && npx supabase db push`.
3. Auth postavke kao gore (MFA TOTP, bez registracija, SMTP Resend, time-box sesija).
4. `npm run supabase:create-admin -- <e-mail vlasnice>`. **Ne pokretati seed.**
5. Popunite env iz [`env/.env.production`](env/.env.production): `wrangler secret put … --env production`, GitHub environment `production` (variables i secrets).
6. Resend: potvrdite domenu `sportaonica.hr`. Postavite `RESEND_API_KEY`.
7. Deploy: *Actions → Deploy → production* (ili `npx wrangler deploy --env production`).
8. **Smoke test**: `/api/health`, prijava u admin s 2FA, unos stvarnih programa i termina, probna prijava, e-mail potvrda, otkazivanje poveznicom, oslobađanje mjesta, izvoz u Excel, pa brisanje probne prijave (GDPR).
9. **Backup**: `SUPABASE_DB_URL`, R2 bucket `sportaonica-backup`, `AGE_PUBLIC_KEY`, `HEARTBEAT_URL` u environment `production`. `BACKUP_ENVIRONMENT=production`. Ručno pokrenite backup, zatim *Monthly restore test*.
10. UptimeRobot monitori na novu domenu. Demo projekt zatim ugasite ili zadržite za testiranje.

---

## 🇬🇧 Technical notes

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `typecheck` · `test` | ESLint · tsc · Vitest unit tests (rules, validation, TOTP, uploads, CSV, JSON-store concurrency) |
| `npm run test:db` | **Real Postgres** tests of the migrations: RLS (anon cannot read personal data), atomic booking with 30 concurrent connections, waitlist, series, deadlines, GDPR, quota, rate limit. Start a DB with `npm run db:test-up` (Docker) or set `TEST_DATABASE_URL`. |
| `npm run test:e2e` | Playwright smoke against a production build: booking → cancellation, series, waitlist, age, duplicate, birthday inquiry, admin login with 2FA, no overflow at 360/768/1280 px with long Croatian words |
| `npm run cf:build` · `cf:size` · `cf:deploy` | OpenNext build · gzip size vs. Workers Free limit · deploy |
| `npm run supabase:seed -- --yes` · `supabase:create-admin -- email` | demo data (refuses production) · owner account |
| `npm run check:env` | committed env templates contain no secrets |

### Architecture

```
src/app/(site)/           public pages: home, aktivnosti (timetable), upisi (booking form), rodendani, lokacije, o-nama,
                          novosti, galerija, cesta-pitanja, kontakt, politika-privatnosti, otkazivanje/[token]
src/app/admin/            /admin/prijava (+2fa) and (panel)/… dashboard, prijave, termini (+generator, prisutnost),
                          aktivnosti, upiti, novosti, galerija, sadrzaj, postavke, dnevnik
src/app/api/              registrations, slots, contact, birthday, health, cron/tick, admin/{export,child-export,upload}, uploads/[name]
src/lib/data/             Repository interface · JsonRepository (local/tests) · SupabaseRepository · rules.ts (shared, pure) · seed (fictional)
src/lib/notifications.ts  e-mail outbox dispatcher (quota-aware, retries)
src/lib/auth/             admin session (Supabase MFA aal2 / local signed cookie + RFC 6238 TOTP)
supabase/migrations/      schema · business logic (SECURITY DEFINER functions, triggers) · RLS & grants
tests/unit · tests/db · tests/e2e
```

**Three privilege levels, enforced by the database.** `publicRepo()` uses the **anon** key: RLS allows reading the catalogue and executing a handful of RPCs (`book_registration`, `registrations_by_token`, `cancel_by_token`, `create_inquiry`, `rate_limit_hit`, `list_slots`, `health_check`). `adminRepo()` uses the owner's **own JWT**, and `is_admin()` requires a row in `public.admins` **and** `aal = aal2` (completed TOTP), so a stolen password alone reads nothing. `systemRepo()` uses the **service role** only for the e-mail outbox and retention. No key ever reaches the browser: the browser only talks to our server.

**Seats are never stored.** `remaining = capacity − count(status = 'active')`, computed in `list_slots()` / `withStats()`.

**Atomic booking.** `book_registration()` locks all requested slot rows in id order (`SELECT … FOR UPDATE`, deadlock-free for series), validates age range, duplicates (also a partial unique index), past/inactive sessions and capacity for **all** sessions, then inserts. All or nothing. Cancelling locks the slot, sets `cancelled_parent`/`cancelled_admin` (soft delete, history kept) and promotes the oldest waitlist entry (FIFO) in the same transaction. Raising capacity promotes automatically (trigger); lowering below active registrations is refused (trigger). `tests/db/booking.test.ts` fires 30 concurrent connections at the last seat: exactly one wins.

**Cancel links.** 24 random bytes (base64url). Only the **SHA-256 hash** is stored. A series shares one token. The page is a GET (safe for e-mail link scanners) and cancelling is a POST. Dated sessions honour the admin-editable deadline (`cancelDeadlineHours`); weekly groups can always be left.

**Series.** The admin generator creates either weekly groups for a season (enrolment = whole season) or dated single sessions sharing a `seriesId`. Parents pick one session or the whole remaining series in one atomic request.

**E-mail outbox.** Every e-mail-worthy event inserts an `outbox` row in the same transaction. The server sends right away and `/api/cron/tick` retries with back-off (max 8 attempts). The daily quota (`take_email_quota`, 100/day) defers to the next day **without losing anything** and warns the owner once at 70 (e-mail + dashboard banner). Templates are Croatian. Owner notifications carry minimal personal data (details are behind 2FA).

**Audit log.** Triggers log every insert/update of registrations (field **names** only, no values) plus exports, attendance prints and logins. Append-only: nobody has UPDATE/DELETE rights.

**Security.** RLS on every table (`FORCE` on personal-data tables) and column-level UPDATE grants. Nonce-based CSP, HSTS, `X-Frame-Options: DENY`, COOP. CSRF: same-origin check on every non-GET request plus Next.js server-action origin checks. XSS: React escaping and `sanitize-html` allow-list for rich text (on save and on render). SQL injection: only parameterised PostgREST/RPC calls. Uploads: JPEG/PNG/WebP by magic bytes, ≤ 5 MB, Storage bucket MIME/size limits. Rate limits are DB-backed (shared across Worker isolates; IPs hashed with a daily salt). Honeypot, minimum fill time, optional Turnstile. Admin: Supabase Auth, mandatory TOTP, 1 h JWT, 8 h absolute session after 2FA, login rate limit, `enable_signup = false`.

**GDPR.** Data minimisation (parent name, e-mail, phone, child name, birth date, consent, optional health note; nothing else). Per-child **export (JSON)** and **erasure** (anonymisation keeps an anonymous row for statistics) from the admin. Automatic anonymisation after `retentionMonths` (admin setting, default 24, *legal check pending*). Cookie banner (only necessary cookies). Privacy policy **template for legal review**. EU region for DB and backups.

**SEO.** Croatian meta + OG per page, canonical URLs, `sitemap.xml`, `robots.txt` (demo: disallow all + `noindex`), JSON-LD: `SportsOrganization`, `SportsActivityLocation`+`LocalBusiness` (address, geo, opening hours parsed from the admin text), `Event` (weekly `eventSchedule` / dated), `FAQPage`, `NewsArticle`, `BreadcrumbList`.

**Performance.** Self-hosted subset fonts (~52 kB), `next/image` (AVIF/WebP, Cloudflare Images binding on Workers), no animation library (framer-motion removed), first-load JS ≈ 103–120 kB on public pages.
