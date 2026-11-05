/**
 * DEMO SEED — ISKLJUČIVO IZMIŠLJENI PODACI.
 * Every programme, age range, time, capacity, person and child below is a
 * placeholder. Real values: see docs/research.md → "Nepotvrđeno".
 * Used by the JSON store and by scripts/seed-supabase.mjs (demo project only).
 */
import { createHash } from "node:crypto";
import type {
  Activity,
  AuditEntry,
  GalleryImage,
  Inquiry,
  Location,
  OutboxItem,
  Post,
  Registration,
  SiteContent,
  SiteSettings,
  Slot,
  Weekday,
} from "./types";
import { datesInRange, weekdayOf, zagrebDate } from "./rules";

export interface DbShape {
  version: 2;
  settings: SiteSettings;
  content: SiteContent;
  locations: Location[];
  activities: Activity[];
  slots: Slot[];
  registrations: Registration[];
  posts: Post[];
  gallery: GalleryImage[];
  inquiries: Inquiry[];
  audit: AuditEntry[];
  outbox: OutboxItem[];
  emailUsage: Record<string, { sent: number; warned: boolean }>;
  rateLimits: Record<string, { windowStart: number; hits: number }>;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** Demo cancel links: /otkazivanje/demo-token-<registration id> */
export const demoToken = (id: string) => `demo-token-${id}-sportaonica`;

const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return x.toISOString().slice(0, 10);
};
const isoDaysAgo = (now: Date, days: number, hour = 10) => {
  const x = new Date(now);
  x.setDate(x.getDate() - days);
  x.setHours(hour, 15, 0, 0);
  return x.toISOString();
};
const birthYearsAgo = (today: string, years: number, months = 3) => {
  const [y, m, d] = today.split("-").map(Number);
  const x = new Date(Date.UTC(y - years, m - 1 - months, Math.min(d, 28)));
  return x.toISOString().slice(0, 10);
};

// Fictional names only.
const PARENTS = ["Ana Horvat", "Marko Kovač", "Ivana Babić", "Petra Marić", "Tomislav Jurić", "Martina Novak", "Luka Knežević", "Maja Vuković", "Ivan Pavić", "Sara Tomić", "Filip Božić", "Lucija Grgić", "Josip Perić", "Nina Matić", "Dario Šarić", "Ema Blažević", "Karlo Lovrić", "Mia Kolar", "Tena Radić", "Bruno Jukić"];
const KIDS = ["Lea", "Jakov", "Mia", "Fran", "Ema", "Luka", "Rita", "Toma", "Nika", "Roko", "Lana", "Vito", "Iva", "Mateo", "Zara", "Leon", "Dora", "Nikola", "Ena", "Gabriel"];

export function createSeed(now = new Date()): DbShape {
  const today = zagrebDate(now);
  const seasonFrom = addDays(today, -60);
  const seasonTo = addDays(today, 220);

  const locations: Location[] = [
    {
      id: "loc-brckovljani",
      slug: "brckovljani",
      name: "Brckovljani",
      venue: "Novi tržni centar Brckovljani",
      address: "Sportska ulica 1",
      postalCode: "10370",
      city: "Brckovljani",
      lat: 45.8197,
      lng: 16.2925,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Sportska+ulica+1+Brckovljani",
      description: "Dvorana u novom tržnom centru. Parking ispred centra. (Ulaz, parking i naselje u adresi potvrditi s klijentom.)",
      hours: "Pon–Pet: 16:00–20:30\nSub: 9:00–12:00",
      order: 1,
    },
    {
      id: "loc-sesvetski-kraljevec",
      slug: "sesvetski-kraljevec",
      name: "Sesvetski Kraljevec",
      venue: "Sportaonica Sesvetski Kraljevec",
      address: "Dugoselska cesta 44a",
      postalCode: "10361",
      city: "Sesvetski Kraljevec",
      lat: 45.8235,
      lng: 16.1835,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Dugoselska+cesta+44a+Sesvetski+Kraljevec",
      description: "Naziv objekta, ulaz i parking potvrditi s klijentom.",
      hours: "Pon–Pet: 16:00–20:30",
      order: 2,
    },
  ];

  const act = (a: Omit<Activity, "status">): Activity => ({ ...a, status: "active" });
  const activities: Activity[] = [
    act({
      id: "act-mini",
      slug: "mini-sportaonica",
      name: "Mini Sportaonica",
      audience: "kids",
      shortDescription: "Prvi sportski koraci uz mamu ili tatu: puzanje, kotrljanje, penjanje i igre s loptom.",
      description:
        "Program za najmlađe koji dolaze zajedno s roditeljem. Kroz kratke igre dijete razvija grubu motoriku, ravnotežu i koordinaciju, a roditelj dobiva ideje za igru kod kuće. Grupe su male i tempo je prilagođen najmlađima.",
      ageMin: 2,
      ageMax: 3,
      withParent: true,
      keyFacts: ["Uz roditelja", "45 min", "Do 8 parova"],
      icon: "toddler",
      color: "butter",
      order: 1,
    }),
    act({
      id: "act-predskolci",
      slug: "sportska-igraonica",
      name: "Sportska igraonica",
      audience: "kids",
      shortDescription: "Za predškolce: igre s pravilima, poligon spretnosti, lopta i timski rad.",
      description:
        "Kroz raznolike igre i vježbe djeca razvijaju koordinaciju, snagu, izdržljivost i ravnotežu, a usput uče pravila, suradnju i poštivanje drugih. Svaki trening je drugačiji, a naglasak je na zabavi i zdravim navikama.",
      ageMin: 4,
      ageMax: 6,
      withParent: false,
      keyFacts: ["2× tjedno", "45 min", "Male grupe"],
      icon: "ball",
      color: "pink",
      order: 2,
    }),
    act({
      id: "act-skolarci",
      slug: "univerzalna-sportska-skola",
      name: "Univerzalna sportska škola",
      audience: "kids",
      shortDescription: "Za školarce: osnove atletike, gimnastike i sportova s loptom bez prerane specijalizacije.",
      description:
        "Svestran program kroz koji dijete upoznaje osnove više sportova: trčanje, skakanje, bacanje, igre s loptom i ravnotežu. Program ne usmjerava dijete prerano u jedan sport, nego mu daje široku motoričku podlogu za bilo koji sport kasnije.",
      ageMin: 7,
      ageMax: 10,
      withParent: false,
      keyFacts: ["2× tjedno", "60 min", "Do 16 djece"],
      icon: "universal",
      color: "teal",
      order: 3,
    }),
    act({
      id: "act-rolanje",
      slug: "skola-rolanja",
      name: "Škola rolanja",
      audience: "kids",
      shortDescription: "Subotnja škola rolanja u šest susreta: ravnoteža, kočenje i sigurno padanje.",
      description:
        "Sezonski program u kojem djeca uče osnove rolanja: pravilan stav, ravnotežu, kočenje i sigurno padanje. Možete prijaviti dijete na cijelu seriju ili na pojedini susret. Zaštitna oprema je obavezna (kaciga, štitnici).",
      ageMin: 5,
      ageMax: 10,
      withParent: false,
      keyFacts: ["Subotom", "6 susreta", "Kaciga obavezna"],
      icon: "skates",
      color: "sky",
      order: 4,
    }),
    act({
      id: "act-pilates",
      slug: "pilates",
      name: "Pilates",
      audience: "adults",
      shortDescription: "Snaga trupa, pokretljivost i bolje držanje u maloj grupi.",
      description:
        "Pilates na podlozi za sve razine. Vježbe jačaju duboke mišiće trupa, poboljšavaju držanje i pokretljivost. Ponesite prostirku i bočicu vode.",
      ageMin: 18,
      ageMax: null,
      withParent: false,
      keyFacts: ["60 min", "Sve razine", "Do 10 osoba"],
      icon: "pilates",
      color: "teal",
      order: 5,
    }),
    act({
      id: "act-funkcionalni",
      slug: "funkcionalni-trening",
      name: "Funkcionalni trening",
      audience: "adults",
      shortDescription: "Kružni trening s vlastitom težinom i rekvizitima za snagu i kondiciju.",
      description:
        "Raznolik trening koji kombinira snagu, kondiciju i mobilnost. Vježbe se prilagođavaju svakom polazniku, pa je trening primjeren i početnicima.",
      ageMin: 18,
      ageMax: null,
      withParent: false,
      keyFacts: ["50 min", "Početnici dobrodošli", "Do 12 osoba"],
      icon: "functional",
      color: "pink",
      order: 6,
    }),
    act({
      id: "act-radionica",
      slug: "radionica-zdrava-leda",
      name: "Radionica: Zdrava leđa",
      audience: "adults",
      shortDescription: "Jednokratna radionica o vježbama za leđa uz rad za stolom.",
      description: "Praktična radionica: jednostavne vježbe i navike za zdrava leđa koje možete raditi kod kuće i na poslu.",
      ageMin: 18,
      ageMax: null,
      withParent: false,
      keyFacts: ["Jednokratno", "90 min"],
      icon: "workshop",
      color: "butter",
      order: 7,
    }),
  ];

  const weekly = (id: string, activityId: string, locationId: string, day: Weekday, start: string, end: string, capacity: number): Slot => ({
    id,
    activityId,
    locationId,
    kind: "weekly",
    dayOfWeek: day,
    validFrom: seasonFrom,
    validTo: seasonTo,
    startTime: start,
    endTime: end,
    capacity,
    status: "active",
  });

  const slots: Slot[] = [
    weekly("slot-01", "act-mini", "loc-brckovljani", 2, "10:00", "10:45", 8),
    weekly("slot-02", "act-predskolci", "loc-brckovljani", 1, "16:30", "17:15", 12),
    weekly("slot-03", "act-predskolci", "loc-brckovljani", 3, "16:30", "17:15", 12),
    weekly("slot-04", "act-skolarci", "loc-brckovljani", 2, "17:30", "18:30", 16),
    weekly("slot-05", "act-pilates", "loc-brckovljani", 1, "19:30", "20:30", 10),
    weekly("slot-06", "act-funkcionalni", "loc-brckovljani", 4, "19:30", "20:20", 12),
    weekly("slot-07", "act-mini", "loc-sesvetski-kraljevec", 4, "10:00", "10:45", 8),
    weekly("slot-08", "act-predskolci", "loc-sesvetski-kraljevec", 2, "16:30", "17:15", 12),
    weekly("slot-09", "act-skolarci", "loc-sesvetski-kraljevec", 3, "17:30", "18:30", 16),
    weekly("slot-10", "act-pilates", "loc-sesvetski-kraljevec", 3, "19:30", "20:30", 10),
  ];

  // Škola rolanja: a series of six Saturdays starting next week
  const firstSat = datesInRange(addDays(today, 7), addDays(today, 14), [6])[0];
  const rollerDates = datesInRange(firstSat, addDays(firstSat, 35), [6]);
  rollerDates.forEach((date, i) =>
    slots.push({
      id: `slot-rol-${i + 1}`,
      activityId: "act-rolanje",
      locationId: "loc-brckovljani",
      kind: "single",
      dayOfWeek: weekdayOf(date),
      date,
      seriesId: "serija-rolanje",
      startTime: "10:00",
      endTime: "11:00",
      capacity: 10,
      status: "active",
    }),
  );
  const workshopDate = datesInRange(addDays(today, 12), addDays(today, 19), [6])[0];
  slots.push({
    id: "slot-radionica",
    activityId: "act-radionica",
    locationId: "loc-sesvetski-kraljevec",
    kind: "single",
    dayOfWeek: weekdayOf(workshopDate),
    date: workshopDate,
    startTime: "12:00",
    endTime: "13:30",
    capacity: 14,
    status: "active",
  });

  // ---------- fictional registrations ----------
  const registrations: Registration[] = [];
  let n = 0;
  const add = (slotId: string, status: Registration["status"], age: number, daysAgo: number, extra: Partial<Registration> = {}) => {
    n++;
    const id = `reg-${String(n).padStart(3, "0")}`;
    const parent = PARENTS[n % PARENTS.length];
    const surname = parent.split(" ")[1];
    const adult = age >= 18;
    registrations.push({
      id,
      slotId,
      status,
      groupId: `grp-${id}`,
      parentName: parent,
      phone: `091 ${String(100 + n).padStart(3, "0")} ${String(1000 + n * 7).slice(0, 4)}`,
      email: `${parent.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${n}@example.com`,
      childName: adult ? parent : `${KIDS[n % KIDS.length]} ${surname}`,
      childBirthDate: birthYearsAgo(today, age, n % 11),
      gdprConsent: true,
      paid: n % 3 === 0,
      cancelTokenHash: sha(demoToken(id)),
      createdAt: isoDaysAgo(now, daysAgo, 8 + (n % 10)),
      updatedAt: isoDaysAgo(now, daysAgo, 8 + (n % 10)),
      ...(status.startsWith("cancelled") ? { cancelledAt: isoDaysAgo(now, Math.max(0, daysAgo - 1)) } : {}),
      ...extra,
    });
  };
  // slot-02 full + waitlist; slot-08 one seat left; a few in other groups
  for (let i = 0; i < 12; i++) add("slot-02", "active", 4 + (i % 3), 40 - i);
  add("slot-02", "waitlist", 5, 3, { healthNote: "Alergija na orašaste plodove." });
  add("slot-02", "waitlist", 4, 1);
  for (let i = 0; i < 11; i++) add("slot-08", "active", 4 + (i % 3), 30 - i);
  for (let i = 0; i < 6; i++) add("slot-04", "active", 7 + (i % 4), 20 - i);
  for (let i = 0; i < 5; i++) add("slot-01", "active", 2 + (i % 2), 15 - i);
  for (let i = 0; i < 4; i++) add("slot-09", "active", 8, 10 - i);
  for (let i = 0; i < 7; i++) add("slot-05", "active", 30 + i, 12 - i);
  for (let i = 0; i < 3; i++) add("slot-rol-1", "active", 6 + i, 2);
  add("slot-03", "cancelled_parent", 5, 5);
  add("slot-04", "active", 8, 0, { adminNote: "Dolazi od drugog tjedna." });
  add("slot-radionica", "active", 41, 0);

  const post = (id: string, slug: string, title: string, excerpt: string, contentHtml: string, days: number, cover: string, coverAlt: string, images: Post["images"] = []): Post => ({
    id,
    slug,
    title,
    excerpt,
    contentHtml,
    coverImage: cover,
    coverAlt,
    images,
    status: "published",
    publishedAt: isoDaysAgo(now, days, 9),
    createdAt: isoDaysAgo(now, days, 9),
    updatedAt: isoDaysAgo(now, days, 9),
  });

  const posts: Post[] = [
    post(
      "post-01",
      "upisi-su-u-tijeku",
      "Upisi su u tijeku!",
      "Otvorene su prijave za programe u Brckovljanima i Sesvetskom Kraljevcu. Odaberite termin i rezervirajte mjesto online.",
      "<p>Dragi roditelji, <strong>upisi su u tijeku</strong> za programe Sportaonice u Brckovljanima i Sesvetskom Kraljevcu.</p><p>Prijava je jednostavna: odaberite aktivnost i termin, ispunite kratki obrazac i odmah dobivate potvrdu na e-mail. Ako je termin popunjen, upišite se na listu čekanja. Javit ćemo vam se čim se mjesto oslobodi.</p><h2>Što trebate znati</h2><ul><li>Svaki program ima svoj dobni raspon.</li><li>Broj mjesta u svakom terminu je ograničen.</li><li>Za sva pitanja slobodno nas nazovite ili nam pišite.</li></ul><p><em>Demo objava: tekst potvrditi s klijentom.</em></p>",
      2,
      "/gallery/galerija-01.jpg",
      "Djeca na treningu u dvorani (privremena ilustracija)",
      [
        { src: "/gallery/galerija-04.jpg", alt: "Igra s loptom u dvorani (privremena ilustracija)" },
        { src: "/gallery/galerija-07.jpg", alt: "Zajednička fotografija grupe (privremena ilustracija)" },
      ],
    ),
    post(
      "post-02",
      "sto-ponijeti-na-prvi-trening",
      "Što ponijeti na prvi trening?",
      "Udobna odjeća, tenisice za dvoranu i bočica vode: kratki podsjetnik za opušten prvi dolazak.",
      "<p>Prvi trening uvijek je malo uzbudljiv, i za djecu i za roditelje. Evo kratkog podsjetnika:</p><ul><li><strong>Udobna sportska odjeća</strong> u kojoj se dijete može slobodno kretati.</li><li><strong>Tenisice za dvoranu</strong> sa svijetlim potplatom.</li><li><strong>Bočica vode</strong> s imenom djeteta.</li><li>Duga kosa svezana, bez nakita i satova.</li></ul><p>Dođite desetak minuta ranije kako bi se dijete u miru presvuklo i upoznalo s grupom.</p><p><em>Demo objava: tekst potvrditi s klijentom.</em></p>",
      9,
      "/gallery/galerija-03.jpg",
      "Poligon spretnosti (privremena ilustracija)",
    ),
  ];

  const g = (i: number, alt: string, category: GalleryImage["category"], w: number, h: number): GalleryImage => ({
    id: `gal-${i}`,
    src: `/gallery/galerija-0${i}.jpg`,
    alt,
    category,
    width: w,
    height: h,
    order: i,
    createdAt: isoDaysAgo(now, 30 - i),
  });
  const gallery: GalleryImage[] = [
    g(1, "Djeca na zagrijavanju u dvorani (privremena ilustracija)", "treninzi", 1600, 1200),
    g(2, "Igre s loptom za najmlađe (privremena ilustracija)", "treninzi", 1200, 1600),
    g(3, "Poligon spretnosti (privremena ilustracija)", "treninzi", 1600, 1200),
    g(4, "Igra s loptom i šut na gol (privremena ilustracija)", "treninzi", 1600, 1200),
    g(5, "Timska igra i suradnja (privremena ilustracija)", "radionice", 1200, 1600),
    g(6, "Vježbe ravnoteže (privremena ilustracija)", "radionice", 1600, 1200),
    g(7, "Zajednička fotografija na proslavi rođendana (privremena ilustracija)", "rodendani", 1600, 1200),
    g(8, "Osmijesi nakon igre (privremena ilustracija)", "rodendani", 1200, 1600),
  ];

  const content: SiteContent = {
    pricingNote:
      "Iznos članarine i način plaćanja potvrđujemo nakon prijave, ovisno o programu i terminu. Online plaćanje nije potrebno. Sve dogovaramo izravno s vama. (Demo tekst: potvrditi s klijentom.)",
    about: {
      heading: "Sportaonica: sport koji gradi zdrave navike",
      intro:
        "Sportaonica je program sportskih aktivnosti za djecu, verificiran od Ministarstva znanosti, obrazovanja i mladih. Vjerujemo da je kretanje najljepši način da dijete upozna svoje tijelo, stekne prijatelje i nauči da se trud isplati. (Demo tekst: potvrditi s klijentom.)",
      people: [
        {
          id: "person-1",
          name: "Ime Prezime (vlasnica)",
          role: "Vlasnica i voditeljica programa",
          bio: "Kratki opis vlasnice: obrazovanje, iskustvo s djecom i zašto je pokrenula Sportaonicu.\n\nDemo tekst: zamijeniti stvarnim podacima iz admina (Sadržaj → O nama).",
          highlights: ["Potvrditi s klijentom"],
          photo: "",
          photoAlt: "",
        },
        {
          id: "person-2",
          name: "Ime Prezime (trener)",
          role: "Trener",
          bio: "Kratki opis trenera: kvalifikacije i iskustvo.\n\nDemo tekst: zamijeniti stvarnim podacima iz admina.",
          highlights: ["Potvrditi s klijentom"],
          photo: "",
          photoAlt: "",
        },
      ],
    },
    birthdays: {
      intro:
        "Proslavite rođendan uz sport i igru! Animirane igre, poligon i natjecanja prilagođena dobi djece, a vi se opustite. Pošaljite upit s datumom i brojem djece, a mi ćemo vam javiti slobodne termine i ponudu. (Demo tekst: potvrditi s klijentom.)",
      packages: [
        { id: "pkg-1", name: "Paket Mali sportaš", description: "Opis paketa: trajanje, broj djece, uključene aktivnosti. (Placeholder)", priceNote: "Cijena na upit" },
        { id: "pkg-2", name: "Paket Veliki sportaš", description: "Opis paketa: trajanje, broj djece, uključene aktivnosti. (Placeholder)", priceNote: "Cijena na upit" },
      ],
    },
    faq: [
      {
        id: "faq-age",
        question: "Za koju su dob programi namijenjeni?",
        answer:
          "Svaki program ima svoj dobni raspon. On je naveden uz program i provjerava se pri prijavi. Ako niste sigurni koji je program prikladan, javite nam se.",
      },
      {
        id: "faq-how",
        question: "Kako funkcioniraju online prijave?",
        answer:
          "Odaberete program i termin, ispunite kratki obrazac i odmah dobivate potvrdu na e-mail. Uz svaki termin vidi se koliko je još slobodnih mjesta. Ne trebate otvarati korisnički račun.",
      },
      {
        id: "faq-waitlist",
        question: "Što ako je termin popunjen?",
        answer: "Upišite se na listu čekanja. Kad se mjesto oslobodi, prvo dijete s liste automatski dobiva mjesto, a roditelj o tome dobiva e-mail.",
      },
      {
        id: "faq-cancel",
        question: "Kako mogu otkazati prijavu?",
        answer:
          "U potvrdnom e-mailu nalazi se osobna poveznica za otkazivanje. Jednim klikom otkazujete prijavu i oslobađate mjesto za drugo dijete. Pojedinačne termine možete otkazati najkasnije nekoliko sati prije početka (rok je naveden u e-mailu).",
      },
      {
        id: "faq-bring",
        question: "Što ponijeti na trening?",
        answer: "Udobnu sportsku odjeću, tenisice za dvoranu sa svijetlim potplatom i bočicu vode. Dugu kosu svežite, a nakit i satove ostavite kod kuće.",
      },
      {
        id: "faq-payment",
        question: "Kako se plaća članarina?",
        answer: "Online plaćanje nije potrebno. Iznos i način plaćanja potvrđujemo nakon prijave. (Demo tekst: potvrditi s klijentom.)",
      },
      {
        id: "faq-birthday",
        question: "Organizirate li dječje rođendane?",
        answer: "Da. Na stranici Rođendani pošaljite upit s datumom, brojem i dobi djece, a mi ćemo vam se javiti s ponudom.",
      },
    ],
  };

  const settings: SiteSettings = {
    phone: "099 878 1025",
    email: "sportaonica@gmail.com",
    instagramUrl: "https://www.instagram.com/sportaonica/",
    facebookUrl: "https://www.facebook.com/sportaonica",
    bannerEnabled: true,
    bannerText: "Upisi su u tijeku. Rezervirajte mjesto na vrijeme!",
    cancelDeadlineHours: 24,
    retentionMonths: 24,
    business: {
      name: "Naziv obrta (potvrditi s klijentom)",
      owner: "Ime i prezime vlasnice (potvrditi)",
      oib: "",
      address: "Adresa sjedišta obrta (potvrditi)",
    },
  };

  const inquiries: Inquiry[] = [
    {
      id: "inq-1",
      type: "birthday",
      name: "Iva Demo",
      email: "iva.demo@example.com",
      phone: "091 222 3333",
      message: "Zanima nas proslava 7. rođendana.",
      eventDate: addDays(today, 24),
      childrenCount: 12,
      childAge: 7,
      handled: false,
      createdAt: isoDaysAgo(now, 1),
    },
  ];

  return {
    version: 2,
    settings,
    content,
    locations,
    activities,
    slots,
    registrations,
    posts,
    gallery,
    inquiries,
    audit: [],
    outbox: [],
    emailUsage: {},
    rateLimits: {},
  };
}
