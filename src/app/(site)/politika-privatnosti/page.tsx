import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { CookieSettingsButton } from "@/components/site/CookieBanner";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Politika privatnosti i kolačića",
  description: "Kako Sportaonica prikuplja, koristi i štiti osobne podatke roditelja i djece.",
  alternates: { canonical: "/politika-privatnosti" },
};

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero title="Politika privatnosti" crumbs={[{ name: "Politika privatnosti", path: "/politika-privatnosti" }]} />
      <div className="container max-w-3xl py-12">
        <p role="note" className="mb-10 rounded-3xl border-2 border-dashed border-coral bg-coral-100 p-5 font-semibold text-coral-700">
          PREDLOŽAK — ovaj tekst je nacrt i mora ga pregledati pravni stručnjak prije objave. Podatke u uglatim zagradama potrebno je potvrditi.
        </p>
        <div className="prose-sport">
          <h2>1. Voditelj obrade</h2>
          <p>
            {s.business.name}, OIB {s.business.oib}, {s.business.address} (u daljnjem tekstu: „Sportaonica”). Kontakt za pitanja o privatnosti:{" "}
            <a href={`mailto:${s.email}`}>{s.email}</a>, tel. {s.phone}.
          </p>

          <h2>2. Koje podatke prikupljamo</h2>
          <ul>
            <li><strong>Podaci roditelja/skrbnika:</strong> ime i prezime, broj telefona, e-mail adresa.</li>
            <li><strong>Podaci djeteta:</strong> ime i prezime, datum rođenja (radi raspoređivanja u dobnu skupinu) te, ako ih dobrovoljno navedete, napomene o zdravlju ili alergijama.</li>
            <li><strong>Ostalo:</strong> kako ste čuli za nas (neobavezno), privole koje ste dali te tehnički zapisi nužni za sigurnost (npr. IP adresa u svrhu zaštite od zlouporabe, kratkotrajno).</li>
          </ul>
          <p>Prikupljamo samo podatke koji su nužni za provedbu programa (načelo smanjenja količine podataka).</p>

          <h2>3. Svrha i pravna osnova</h2>
          <ul>
            <li>Provedba prijave i sudjelovanja djeteta u programu — izvršenje ugovora (čl. 6. st. 1. t. b) GDPR-a) i privola roditelja za podatke djeteta.</li>
            <li>Podaci o zdravlju (posebna kategorija) — isključivo uz izričitu privolu (čl. 9. st. 2. t. a) GDPR-a), radi sigurnosti djeteta na treningu.</li>
            <li>Slanje obavijesti o novim programima — samo uz zasebnu, neobaveznu privolu koju možete povući u bilo kojem trenutku.</li>
            <li>Odgovaranje na upite putem kontakt obrasca — legitimni interes / predugovorne radnje.</li>
          </ul>

          <h2>4. Koliko dugo čuvamo podatke</h2>
          <p>
            Podatke o prijavi čuvamo dok dijete sudjeluje u programu i najviše [12 mjeseci — potvrditi] nakon završetka sezone, osim ako propisi
            zahtijevaju dulje čuvanje (npr. računovodstvena dokumentacija). Podatke s liste čekanja brišemo na kraju sezone.
          </p>

          <h2>5. Tko ima pristup podacima</h2>
          <p>
            Pristup imaju isključivo vlasnici i treneri Sportaonice. Koristimo pouzdane pružatelje usluga (hosting [Vercel], baza podataka [Supabase,
            EU regija], slanje e-pošte [Resend]) s kojima su sklopljeni ugovori o obradi podataka. Podatke ne prodajemo niti ih ustupamo trećim
            stranama u marketinške svrhe.
          </p>

          <h2>6. Fotografije djece</h2>
          <p>Fotografije i videozapise na kojima su djeca prepoznatljiva objavljujemo isključivo uz prethodnu pisanu privolu roditelja.</p>

          <h2>7. Vaša prava</h2>
          <p>
            Imate pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka te pravo na prigovor i povlačenje privole. Zahtjev
            pošaljite na <a href={`mailto:${s.email}`}>{s.email}</a> — odgovorit ćemo u roku od 30 dana. Prijavu možete otkazati i putem osobne
            poveznice iz potvrdnog e-maila. Pritužbu možete podnijeti Agenciji za zaštitu osobnih podataka (azop.hr).
          </p>

          <h2 id="kolacici">8. Kolačići</h2>
          <p>
            Stranica koristi samo <strong>nužne kolačiće</strong> (npr. zapis vašeg odabira o kolačićima i, za vlasnika, kolačić prijave u
            administraciju). Analitičke ili marketinške kolačiće ne postavljamo bez vaše izričite privole. Karte se otvaraju kao vanjske poveznice
            pa se na stranici ne učitavaju kolačići trećih strana.
          </p>
          <p>
            <CookieSettingsButton className="font-bold text-navy underline" />
          </p>

          <h2>9. Izmjene</h2>
          <p>O značajnim izmjenama ove politike obavijestit ćemo vas na ovoj stranici. Zadnja izmjena: [datum — potvrditi].</p>
        </div>
      </div>
    </>
  );
}
