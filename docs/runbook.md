# Runbook: „Što ako padne”

Kratke upute za vlasnicu i developera. Najprije smirenost: podaci su u bazi (Supabase, EU) i u šifriranom backupu (R2). Web stranica je zaseban sloj i može se ponovno objaviti za nekoliko minuta.

## 1. Računi i pristup

Svi računi glase na **e-mail koji kontrolira klijentica** (npr. `sportaonica@…`). Developer je dodan kao član. **2FA je uključen na svakom računu.**

| Servis | Za što | Vlasnik računa | Član (developer) | 2FA | Plan |
|---|---|---|---|---|---|
| Supabase | baza, prijava u admin, slike | klijentica | da (Developer) | ☐ | Demo: Free / Prod: **Pro** |
| Cloudflare | hosting (Workers), DNS, R2 backup, Turnstile | klijentica | da (Administrator) | ☐ | Free (ili Workers Paid 5 $) |
| GitHub | kod, CI, backup posao | klijentica (organizacija) | da (Maintainer) | ☐ | Free |
| Resend | slanje e-mailova | klijentica | da | ☐ | Free |
| UptimeRobot / Healthchecks.io | nadzor, heartbeat | klijentica | da | ☐ | Free |
| Registrar .hr domene | domena sportaonica.hr | **vlasnica obrta** | ne | ☐ | godišnje |
| Password manager | sve lozinke + age privatni ključ | klijentica | dijeljeni trezor | ☐ | |

Kontakti (popuniti):

| Uloga | Ime | Telefon | E-mail |
|---|---|---|---|
| Vlasnica | | | |
| Developer | | | |
| Registrar domene (podrška) | | | |

## 2. Brza dijagnoza

1. Otvorite `https://sportaonica.hr/api/health`.
   - `{"status":"ok","db":"ok"}` → baza radi. Problem je u sadržaju ili pregledniku.
   - `503 … "db":"unreachable"` → problem s bazom (točka 4).
   - Stranica se ne otvara → hosting ili DNS (točka 3).
2. Status servisa: status.cloudflare.com, status.supabase.com, resend-status.com.
3. UptimeRobot e-mail kaže od kada.

## 3. Web stranica ne radi (hosting/DNS)

- **Cloudflare Workers** → Workers & Pages → `sportaonica-production` → *Deployments* → **Rollback** na zadnju ispravnu verziju (1 klik).
- Ili ponovno objavite: GitHub → Actions → *Deploy* → *Run workflow* → `production`.
- **DNS**: Cloudflare → DNS. Domena mora koristiti Cloudflare nameservere (vidi README → Domena). Ako je domena istekla, odmah je obnovite kod registrara (točka 6).
- Prekoračen limit Workers Free (100 000 zahtjeva dnevno) → u Cloudflareu uključite **Workers Paid (5 $/mj.)**.

## 4. Baza ne radi / podaci su oštećeni

- **Demo (Free)**: projekt se pauzira nakon tjedan dana neaktivnosti. Supabase → *Restore project*. UptimeRobot ping na `/api/health` to inače sprječava.
- **Produkcija (Pro)**:
  1. Kratki ispad Supabasea: pričekajte, pratite status.supabase.com.
  2. Pogrešno obrisani ili izmijenjeni podaci: Supabase → Database → **Backups** → vraćanje na dnevni backup (ili Point-in-Time ako je uključen).
  3. Projekt nedostupan ili izgubljen: **vraćanje u novi projekt** iz našeg šifriranog backupa, vidi [backup-restore.md](backup-restore.md) točku 3 (oko 1 h).
- Nakon vraćanja provjerite: `/api/health`, prijavu u admin (2FA), popis prijava, jednu probnu prijavu i otkazivanje.

## 5. E-mailovi ne stižu

- Admin → Pregled prikazuje broj e-mailova u redu i dnevnu potrošnju. **Ništa se ne gubi**: e-mailovi čekaju u tablici `outbox` i šalju se automatski (cron svakih 5 min, ponovni pokušaji do 8 puta).
- Dnevni limit (100 na Resend Free) dosegnut → ostatak se šalje sutra u 00:05. Ako se to ponavlja, prijeđite na Resend Pro.
- Resend → Logs: odbijeni e-mailovi, provjera domene (SPF/DKIM u Cloudflare DNS-u).

## 6. Domena (.hr)

- Registry za .hr je CARNET, a domena se registrira i obnavlja kod **ovlaštenog registrara** (popis na domene.hr), na ime **vlasnice obrta**.
- Podsjetnik: GitHub workflow *Domain renewal reminder* pada **30 dana prije isteka** (repo varijabla `DOMAIN_EXPIRES`), a GitHub šalje e-mail. Dodatno postavite podsjetnik u kalendar i uključite automatsku obnovu kod registrara ako postoji.
- Nakon obnove ažurirajte `DOMAIN_EXPIRES`.

## 7. Sumnja na neovlašteni pristup

1. Supabase → Authentication → Users → odjavite sve sesije (*Sign out*), promijenite lozinku i ponovno postavite 2FA.
2. Rotirajte ključeve: Supabase *API keys* (novi `service_role`), `AUTH_SECRET`, `CRON_SECRET`, R2 token, Resend ključ (`npx wrangler secret put …`).
3. Admin → **Dnevnik promjena**: tko je što mijenjao ili izvozio.
4. Ako su procurili osobni podaci: obveza prijave AZOP-u u **72 sata** (čl. 33. GDPR-a) i obavijest roditeljima kad je rizik visok.

## 8. Redovito (kontrolna lista)

- [ ] Mjesečno: zeleni *Monthly restore test* (GitHub Actions), zapis u backup-restore.md
- [ ] Mjesečno: Admin → Pregled → nema zaglavljenih e-mailova
- [ ] Kvartalno: provjeriti tko ima pristup računima (točka 1), ukloniti nepotrebne
- [ ] Godišnje: obnova domene, pregled politike privatnosti, rotacija `AUTH_SECRET`/`CRON_SECRET`
