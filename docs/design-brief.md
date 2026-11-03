# Sportaonica — dizajnerski brief

Izvor: klijentov letak (`docs/flyer.jpg`). Sve boje, oblici i ton izvedeni su iz njega.

## 1. Osobnost brenda

**Razigrano, ali pouzdano.** Djeca vide zabavu (ručno crtani likovi, lopte, zvjezdice), roditelji vide red i stručnost (jasna struktura, oznaka verifikacije Ministarstva, profesor kineziologije, pregledni termini i slobodna mjesta).

- Ton teksta: topao, izravan, kratke rečenice, obraćanje roditelju s „vi”. Bez žargona i bez superlativa koje ne možemo potkrijepiti.
- Ne izmišljamo činjenice (cijene, godine iskustva, preporuke). Sve što je placeholder označeno je u kodu i u sučelju (oznaka „Demo podatak”).

## 2. Logo

- `public/brand/logo.png` — izrezan iz letka (prozirna pozadina, bijeli „sticker” rub oko slova i likova, ~4× povećano s letka niske rezolucije).
- **TODO (klijent):** zamijeniti originalnom vektorskom/visokorezolucijskom datotekom od dizajnera. Zadržati isti naziv datoteke — komponenta `src/components/site/Logo.tsx` ne treba izmjene.
- Na hero sekciji logo stoji na tri preklopljene mrlje (žuta / roza / tirkizna) — isto kao na letku.
- Ilustracije djece (`public/illustrations/*`) izrezane su s letka. **Provjeriti licencu** ilustracija s dizajnerom letka (vjerojatno stock / Canva) prije produkcije.

## 3. Paleta (tokeni u `tailwind.config.ts`)

| Token | HEX | Izvor na letku | Uporaba |
|---|---|---|---|
| `ink` | `#13385A` | tamnoplavi natpisi | sav tekst i naslovi |
| `ink-soft` | `#4A5B70` | — | sekundarni tekst (6,6:1 na kremastoj) |
| `navy` | `#0F4F7D` | slova logotipa | sekundarni gumbi, fokus, ikone |
| `coral` | `#C2453D` | roza mrlja, potamnjena | **glavni CTA** (bijeli tekst 5,0:1) |
| `pink-100/200/300` | `#FFE4EC` / `#FBCFD6` / `#F2ACA4` | roza mrlja i traka | pozadine kartica, mrlje |
| `peach-*` | `#FFE9DA`… | koža likova | akcenti |
| `butter-50/100/200` | `#FFFBEA` / `#FFF6CC` / `#F7EFB5` | žuta mrlja i traka | sekcije, oznake |
| `teal-100/200/300` | `#E3F5F3` / `#BFE7E4` / `#91D2CE` | tirkizna mrlja i traka | sekcije, uspjeh |
| `teal-700` | `#1D6E69` | — | tekst na svijetloj tirkiznoj (5,3:1) |
| `sky-*` | `#E6F3FA` / `#9CCFE3` | plava bilješka | kartica kognitivnog razvoja |
| `lilac-100` | `#FCE8FB` | vrh letka | gradijent heroja |
| `cream` | `#FFFCF3` | sredina letka | pozadina stranice |

Pozadinski gradijent (`.bg-flyer`) prati letak odozgo prema dolje: lila-roza → roza → maslac → krem.

### Kontrast (WCAG AA)
Provjereno za svaku kombinaciju teksta i pozadine koju koristimo:

- `ink` na bijeloj 12,1:1 · na `pink-100` 10,1:1 · na `teal-200` 9,1:1 · na `butter-200` 10,3:1
- `ink-soft` na kremastoj 6,6:1
- bijelo na `coral` 5,0:1 · bijelo na `navy` 8,6:1
- `teal-700` na `teal-100` 5,3:1 · `pink-700` na `pink-50` 6,0:1

**Pravilo:** pastelne boje su isključivo pozadine; tekst je uvijek `ink`, `ink-soft`, `navy`, `coral-700` ili `teal-700`. Lighthouse Accessibility: 100 na svim javnim stranicama.

## 4. Tipografija

- **Naslovi:** Baloo 2 (600–800) — zaobljen, prijateljski, blizak ručno crtanom logu.
- **Tekst:** Nunito Sans (400–800) — vrlo čitljiv, mekan, odličan na malim ekranima.
- Oba fonta su varijabilni, self-hostani (`src/assets/fonts`, SIL OFL licenca) i **podskupljeni** na latinicu + hrvatska slova (č ć đ š ž) + tipografske znakove („ ” – — …). Dvije datoteke ukupno ~52 kB umjesto ~120 kB s Google Fontsa.
- `next/font/local` + `adjustFontFallback` → nema pomaka rasporeda pri učitavanju fonta.

## 5. Oblici i ilustracije

- Velike zaobljene kartice (`rounded-3xl` / `rounded-4xl`), meke sjene (`shadow-soft`, `shadow-lift`).
- Organske mrlje (`Blob`), valoviti razdjelnici sekcija (`Wave`), vijugava podcrtavanja (`Squiggle`).
- Ručno crtani doodle elementi kao inline SVG (`src/components/ui/Doodles.tsx`): lopta za plažu, nogometna lopta, zvjezdica, srce, tenisica, čunj, zviždaljka — tamni obrub `#2A2F3A` + pastelne ispune, kao na letku.
- Četiri kartice „Što dijete dobiva” namjerno imitiraju papirnate predmete s letka: bilješka s pribadačom, rokovnik sa spiralom, balon, oblak.

## 6. Pokret

- Lebdenje doodle elemenata (samo `transform`, kreće nakon 1,5 s da ne opterećuje prvo iscrtavanje).
- Scroll-reveal (IntersectionObserver + CSS; sadržaj je vidljiv i bez JavaScripta).
- Brojači u heroju, glatki akordeon (grid-rows tehnika), animirani koraci prijave (Framer Motion), loader s loptom koja skače.
- Podizanje kartica na hover. Sve se gasi uz `prefers-reduced-motion`.

## 7. Mobile-first

- Ljepljiva donja traka „Nazovi / Prijavi dijete” na dohvat palca.
- Minimalna ciljna površina 44–56 px, polja obrazaca 48 px, `inputMode` za telefon/e-mail.
- Bez vodoravnog pomicanja na 320 px.
