# Sportaonica — web stranica i sustav prijava

Demo web stranica za **Sportaonicu**, program sportskih aktivnosti za djecu (3–10 god.) u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu.

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Zod · Tiptap · Supabase (opcionalno)

---

## 🇭🇷 Sažetak za postavljanje

### Pokretanje na računalu

```bash
npm install
cp .env.example .env.local   # po potrebi izmijenite vrijednosti
npm run dev                  # http://localhost:3000
```

Bez ikakvih ključeva stranica radi u **demo načinu**:

- podaci se spremaju u `.data/db.json` (automatski se puni demo podacima),
- e-mailovi (potvrde, obavijesti vlasniku) **ispisuju se u konzolu** umjesto da se šalju,
- na ekranu potvrde prikazuje se poveznica za otkazivanje (jer e-mail ne stiže).

Demo podatke vraćate na početno stanje naredbom `npm run seed:reset`.

### Admin (vlasnik)

| | |
|---|---|
| Adresa | `/admin` |
| E-mail | `vlasnik@sportaonica.hr` |
| Lozinka | `sportaonica-demo` |

Za produkciju **obavezno** postavite `ADMIN_EMAIL`, `ADMIN_PASSWORD` i dugi nasumični `AUTH_SECRET`.

U adminu vlasnik može: pregledati prijave danas/ovaj tjedan i popunjenost termina; dodavati, uređivati, premještati i otkazivati prijave; označiti „plaćeno”; izvesti popis u Excel/CSV; ispisati popis prisutnosti; uređivati aktivnosti, termine (uz dupliciranje), novosti (s uređivačem teksta i slikama), česta pitanja, tekst o treneru, lokacije, kontakt podatke i obavijest na vrhu stranice; trajno obrisati podatke na zahtjev roditelja (GDPR).

### Objava na Vercel

1. Pushajte repozitorij na GitHub i u Vercelu odaberite **Add New → Project → Import**.
2. Framework se prepoznaje automatski (Next.js). Build naredba: `npm run build`.
3. U **Settings → Environment Variables** dodajte varijable iz `.env.example` (barem `NEXT_PUBLIC_SITE_URL`, `ADMIN_*`, `AUTH_SECRET`).
4. Za stvarne prijave **spojite Supabase** (vidi niže) — na Vercelu je demo JSON spremište privremeno (`/tmp`) i briše se pri svakom pokretanju funkcije.
5. Za slanje e-mailova postavite `RESEND_API_KEY` i `EMAIL_FROM` (domena mora biti potvrđena u Resendu).

### Spajanje Supabase baze

1. Napravite projekt na [supabase.com](https://supabase.com) (regija **EU — Frankfurt**).
2. U **SQL Editoru** pokrenite `supabase/migrations/0001_init.sql` (tablice, RLS, atomarne funkcije za prijave).
3. U **Storage** napravite javni bucket `uploads` (za slike novosti i fotografiju trenera).
4. Postavite varijable: `DATA_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (samo na serveru — nikad u `NEXT_PUBLIC_*`).
5. Prijavite se u admin i jednom pozovite `POST /api/admin/seed-supabase` (npr. iz konzole preglednika: `fetch('/api/admin/seed-supabase',{method:'POST'})`) — prenosi demo aktivnosti, termine, lokacije i tekstove u praznu bazu.

### Zamjena logotipa i fotografija

- **Logo:** zamijenite `public/brand/logo.png` (preporuka: PNG s prozirnom pozadinom, širina ≥ 1200 px, ili izvezite iz vektora). Ime datoteke ostaje isto.
- **Galerija:** zamijenite datoteke u `public/gallery/` (isti nazivi) ili uredite popis u `src/lib/gallery.ts` (putanja, opis za slabovidne, dimenzije). Fotografije djece objavljujte samo uz pisanu privolu roditelja.
- **Fotografija trenera:** Admin → Sadržaj stranice → O treneru → „Odaberi sliku”.
- **Ilustracije djece** (`public/illustrations/`) izrezane su s letka — provjerite licencu s autorom letka.
- **Favicon / ikona:** `public/icon.svg`, `public/apple-icon.png`. OG slika za društvene mreže generira se automatski (`src/app/opengraph-image.tsx`).

---

## 🇬🇧 Technical notes

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + TS) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (validation, CSV/BOM, Croatian plurals, **booking concurrency**) |
| `npm run test:e2e` | Playwright smoke tests against a production build (`npm run build` first) |
| `npm run seed:reset` | Delete the local JSON store so it re-seeds |

### Environment variables

See [`.env.example`](.env.example). Everything is optional in demo mode.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG, links in e-mails |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Owner credentials |
| `AUTH_SECRET` | HMAC key for the admin session cookie (required on Vercel production) |
| `DATA_PROVIDER` | `json` (default) or `supabase` |
| `DATA_DIR` | Location of the JSON store (default `.data`, `/tmp/…` on Vercel) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Supabase backend |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` | Transactional e-mail (console when unset) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional Cloudflare Turnstile on booking + contact forms |
| `NEXT_PUBLIC_DEMO_BADGES` | `0` hides the “Demo podatak” markers on placeholder content |
| `RATE_LIMIT_DISABLED` | `1` disables the in-memory limiter (tests only) |

### Architecture

```
src/
  app/(site)/        public pages (home, aktivnosti, upisi, lokacije, o-nama, novosti, galerija, cesta-pitanja, kontakt, politika-privatnosti, otkazivanje/[token])
  app/admin/         owner area — /admin/prijava (login) + (panel)/… guarded by middleware AND requireAdmin()
  app/admin/actions.ts   server actions for every admin mutation
  app/api/           registrations, slots (public availability), contact, uploads, admin export/upload/seed
  components/        ui (doodles, icons, reveal…), site (header, footer, cookie banner…), home sections, booking wizard, admin
  lib/data/          Repository interface + JsonRepository + SupabaseRepository + seed
  lib/booking.ts     public booking rules (age check, duplicates) + e-mail notifications
  lib/email/         Resend-over-fetch sender (console fallback) + Croatian HTML/text templates
supabase/migrations/ SQL schema, RLS, atomic RPCs
tests/unit, tests/e2e
```

**Swapping storage.** UI code only talks to `repo()` (`src/lib/data/index.ts`), which returns the implementation selected by `DATA_PROVIDER`. Both implementations satisfy the same `Repository` interface.

### Overbooking protection

- **JSON store:** every mutation runs inside `withLock()` — an in-process promise queue *plus* an `O_EXCL` lock file (so several Node workers sharing a disk are serialised too). Reading capacity and inserting the registration happen in that single critical section. Writes are atomic (`tmp` + `rename`).
- **Supabase:** `book_registration()` does `SELECT … FROM slots WHERE id = $1 FOR UPDATE`, counts confirmed seats and inserts in one transaction. `cancel_registration()` / `move_registration()` lock the slot row and call `promote_waitlist()`, which moves the oldest waitlisted child in (FIFO, `FOR UPDATE SKIP LOCKED`).
- `tests/unit/concurrency.test.ts` fires 25 simultaneous requests at the last free seat and asserts exactly one succeeds; further tests cover FIFO waitlist promotion, idempotent cancellation and mixed concurrent cancel/book.

Capacity = `capacity`, occupied = `preEnrolled` (members enrolled outside the website) + confirmed web registrations.

### Anti-spam

Honeypot field, minimum fill time (2.5 s), per-IP sliding-window rate limit (in-memory — swap for Upstash/Vercel KV on multi-region deployments; the `rateLimit()` signature stays the same), server-side Zod validation, optional Cloudflare Turnstile.

### Security & privacy

- Admin session: HMAC-SHA256 signed cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production), 12 h lifetime, login rate-limited.
- Every server action calls `requireAdmin()` in addition to middleware.
- Rich text is sanitised (`sanitize-html` allow-list) on save and on render; JSON-LD is escaped.
- Uploads: JPG/PNG/WebP only, 5 MB max, magic-byte check.
- CSV export neutralises spreadsheet formulas and is UTF-8 with BOM (`;`-separated “Excel” variant for Croatian-locale Excel).
- No analytics or third-party embeds; the cookie banner is ready for opt-in analytics (`readConsent()`). Maps open as external links.
- Children’s data is minimised (name, birth date, optional health note). Owner can permanently erase a record.

### SEO

Per-page Croatian titles/descriptions, canonical URLs, Open Graph/Twitter with generated OG image, `sitemap.xml`, `robots.txt`, JSON-LD: `SportsOrganization`, `SportsActivityLocation` (geo + opening hours derived from slots), `Event` with weekly `eventSchedule`, `FAQPage`, `NewsArticle`, `BreadcrumbList`.

### Performance

Self-hosted subset variable fonts (~52 kB total), `next/image` AVIF/WebP, `content-visibility: auto` for below-the-fold sections, CSS-only decorative motion (transform), no animation library on most public pages (Framer Motion only in the booking wizard).

Lighthouse (mobile, simulated throttling, local production build): see the final report in the PR / hand-over notes.
