/**
 * DEMO SEED DATA — every value here is an editable placeholder that must be
 * confirmed with the client (addresses, schedule, capacities, texts).
 */
import type {
  Activity,
  ContactMessage,
  Location,
  Post,
  Registration,
  SiteContent,
  SiteSettings,
  Slot,
} from "./types";

export interface DbShape {
  version: 1;
  settings: SiteSettings;
  content: SiteContent;
  locations: Location[];
  activities: Activity[];
  slots: Slot[];
  registrations: Registration[];
  posts: Post[];
  contactMessages: ContactMessage[];
}

const daysAgo = (now: Date, d: number, h = 10) => {
  const x = new Date(now);
  x.setDate(x.getDate() - d);
  x.setHours(h, 15, 0, 0);
  return x.toISOString();
};

const birthDateYearsAgo = (now: Date, years: number, monthsExtra = 3) => {
  const x = new Date(now);
  x.setFullYear(x.getFullYear() - years);
  x.setMonth(x.getMonth() - monthsExtra);
  return x.toISOString().slice(0, 10);
};

export function createSeed(now = new Date()): DbShape {
  const locations: Location[] = [
    {
      id: "loc-bozjakovina",
      slug: "bozjakovina",
      name: "Božjakovina",
      venue: "Sportska dvorana (naziv potvrditi)",
      address: "Adresa dvorane — potvrditi",
      postalCode: "10370",
      city: "Božjakovina",
      lat: 45.8125,
      lng: 16.2655,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Bo%C5%BEjakovina",
      description: "Termini u Božjakovini — dvorana, ulaz i parking potvrđuju se s vlasnikom.",
      order: 1,
    },
    {
      id: "loc-brckovljani",
      slug: "brckovljani",
      name: "Brckovljani",
      venue: "Školska dvorana (naziv potvrditi)",
      address: "Adresa dvorane — potvrditi",
      postalCode: "10370",
      city: "Brckovljani",
      lat: 45.8194,
      lng: 16.2919,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Brckovljani",
      description: "Termini u Brckovljanima — dvorana, ulaz i parking potvrđuju se s vlasnikom.",
      order: 2,
    },
    {
      id: "loc-sesvetski-kraljevec",
      slug: "sesvetski-kraljevec",
      name: "Sesvetski Kraljevec",
      venue: "Sportska dvorana (naziv potvrditi)",
      address: "Adresa dvorane — potvrditi",
      postalCode: "10361",
      city: "Sesvetski Kraljevec",
      lat: 45.8272,
      lng: 16.1912,
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Sesvetski+Kraljevec",
      description: "Termini u Sesvetskom Kraljevcu — dvorana, ulaz i parking potvrđuju se s vlasnikom.",
      order: 3,
    },
  ];

  const activities: Activity[] = [
    {
      id: "act-univerzalna",
      slug: "univerzalna-sportska-skola",
      name: "Univerzalna sportska škola",
      shortDescription: "Svestran program kroz koji dijete upoznaje osnove više sportova — trčanje, skakanje, bacanje, igre s loptom i ravnotežu.",
      description:
        "Univerzalna sportska škola temelj je Sportaonice. Kroz raznolike igre i vježbe djeca razvijaju koordinaciju, snagu, izdržljivost i ravnotežu, a usput uče pravila, suradnju i poštivanje drugih. Program ne usmjerava dijete prerano u jedan sport, nego mu daje široku motoričku podlogu za bilo koji sport kasnije.",
      ageMin: 5,
      ageMax: 10,
      icon: "universal",
      color: "teal",
      status: "active",
      order: 1,
    },
    {
      id: "act-mini-rukomet",
      slug: "mini-rukomet",
      name: "Mini rukomet",
      shortDescription: "Prvi koraci u rukometu kroz igru: hvatanje, dodavanje, šut i igra u timu na prilagođenom terenu.",
      description:
        "Mini rukomet je prilagođena verzija rukometa za djecu. Naglasak je na igri i zabavi: hvatanje i dodavanje lopte, kretanje bez lopte, šut na gol te prve timske situacije. Djeca uče surađivati, komunicirati i poštivati pravila igre.",
      ageMin: 6,
      ageMax: 10,
      icon: "handball",
      color: "pink",
      status: "active",
      order: 2,
    },
    {
      id: "act-igre-s-loptom",
      slug: "igre-s-loptom",
      name: "Igre s loptom",
      shortDescription: "Za najmlađe: kotrljanje, bacanje, hvatanje i vođenje lopte kroz kratke, vesele igre.",
      description:
        "Program za predškolce u kojem lopta postaje najbolji prijatelj. Kroz kratke i vesele igre djeca razvijaju grubu i finu motoriku, koordinaciju oko–ruka te koncentraciju i pažnju. Grupe su manje, a tempo prilagođen najmlađima.",
      ageMin: 3,
      ageMax: 5,
      icon: "ball",
      color: "butter",
      status: "active",
      order: 3,
    },
    {
      id: "act-poligon",
      slug: "poligon-spretnosti",
      name: "Poligon spretnosti",
      shortDescription: "Puzanje, provlačenje, penjanje i skakanje kroz šareni poligon koji razvija ravnotežu i prostornu orijentaciju.",
      description:
        "Poligon spretnosti sastoji se od niza postaja na kojima dijete puže, provlači se, penje, skače i održava ravnotežu. Vježbe razvijaju prostornu orijentaciju, ravnotežu i koordinaciju pokreta, a svaki uspješno svladani poligon gradi samopouzdanje.",
      ageMin: 3,
      ageMax: 6,
      icon: "obstacle",
      color: "sky",
      status: "active",
      order: 4,
    },
  ];

  const s = (
    id: string,
    activityId: string,
    locationId: string,
    dayOfWeek: Slot["dayOfWeek"],
    startTime: string,
    endTime: string,
    capacity: number,
    preEnrolled: number,
  ): Slot => ({ id, activityId, locationId, dayOfWeek, startTime, endTime, capacity, preEnrolled, status: "active" });

  const slots: Slot[] = [
    s("slot-01", "act-univerzalna", "loc-bozjakovina", 1, "17:00", "18:00", 16, 10),
    s("slot-02", "act-igre-s-loptom", "loc-bozjakovina", 1, "16:00", "16:45", 12, 11), // becomes FULL (+1 confirmed)
    s("slot-03", "act-mini-rukomet", "loc-bozjakovina", 3, "18:00", "19:00", 16, 6),
    s("slot-04", "act-poligon", "loc-bozjakovina", 5, "16:30", "17:15", 12, 4),
    s("slot-05", "act-univerzalna", "loc-brckovljani", 2, "17:00", "18:00", 16, 13),
    s("slot-06", "act-igre-s-loptom", "loc-brckovljani", 2, "16:00", "16:45", 12, 5),
    s("slot-07", "act-mini-rukomet", "loc-brckovljani", 4, "18:00", "19:00", 16, 9),
    s("slot-08", "act-poligon", "loc-brckovljani", 6, "10:00", "10:45", 12, 2),
    s("slot-09", "act-univerzalna", "loc-sesvetski-kraljevec", 3, "17:00", "18:00", 16, 8),
    s("slot-10", "act-igre-s-loptom", "loc-sesvetski-kraljevec", 4, "16:00", "16:45", 12, 9),
    s("slot-11", "act-poligon", "loc-sesvetski-kraljevec", 1, "16:30", "17:15", 12, 0),
    s("slot-12", "act-mini-rukomet", "loc-sesvetski-kraljevec", 5, "18:00", "19:00", 16, 14),
  ];

  const reg = (
    id: string,
    slotId: string,
    status: Registration["status"],
    parentName: string,
    childName: string,
    childAge: number,
    createdDaysAgo: number,
    extra: Partial<Registration> = {},
  ): Registration => ({
    id,
    slotId,
    status,
    parentName,
    phone: "091 000 0000",
    email: `${parentName.toLowerCase().split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "")}@example.com`,
    childName,
    childBirthDate: birthDateYearsAgo(now, childAge),
    source: "Facebook",
    gdprConsent: true,
    marketingConsent: false,
    paid: false,
    cancelToken: `demo-token-${id}`,
    createdAt: daysAgo(now, createdDaysAgo),
    updatedAt: daysAgo(now, createdDaysAgo),
    ...extra,
  });

  const registrations: Registration[] = [
    reg("reg-01", "slot-02", "confirmed", "Ana Horvat", "Lea Horvat", 4, 6, { paid: true, source: "Preporuka prijatelja" }),
    reg("reg-02", "slot-02", "waitlist", "Marko Kovačević", "Luka Kovačević", 4, 2, { healthNote: "Alergija na orašaste plodove." }),
    reg("reg-03", "slot-02", "waitlist", "Ivana Babić", "Mia Babić", 5, 0),
    reg("reg-04", "slot-05", "confirmed", "Petra Marić", "Jakov Marić", 7, 1, { source: "Instagram", marketingConsent: true }),
    reg("reg-05", "slot-09", "confirmed", "Tomislav Jurić", "Ema Jurić", 6, 3, { paid: true }),
    reg("reg-06", "slot-12", "confirmed", "Martina Novak", "Fran Novak", 8, 0, { source: "Letak" }),
  ];

  const post = (
    id: string,
    slug: string,
    title: string,
    excerpt: string,
    contentHtml: string,
    publishedDaysAgo: number,
    coverImage: string,
    coverAlt: string,
  ): Post => ({
    id,
    slug,
    title,
    excerpt,
    contentHtml,
    coverImage,
    coverAlt,
    status: "published",
    publishedAt: daysAgo(now, publishedDaysAgo, 9),
    createdAt: daysAgo(now, publishedDaysAgo, 9),
    updatedAt: daysAgo(now, publishedDaysAgo, 9),
  });

  const posts: Post[] = [
    post(
      "post-01",
      "upisi-su-u-tijeku",
      "Upisi su u tijeku!",
      "Otvorene su prijave za sve programe na tri lokacije. Odaberite termin koji vam odgovara i rezervirajte mjesto online.",
      "<p>Dragi roditelji, <strong>upisi su u tijeku</strong> za sve programe Sportaonice u Božjakovini, Brckovljanima i Sesvetskom Kraljevcu.</p><p>Prijava je jednostavna: odaberite aktivnost, lokaciju i termin, ispunite kratki obrazac i odmah ćete dobiti potvrdu na e-mail. Ako je termin popunjen, možete se upisati na listu čekanja — javit ćemo vam se čim se mjesto oslobodi.</p><h2>Što trebate znati</h2><ul><li>Grupe su formirane prema dobi djeteta.</li><li>Broj mjesta u svakom terminu je ograničen.</li><li>Za sva pitanja slobodno nas nazovite ili nam pišite.</li></ul><p><em>Demo objava — tekst potvrditi s vlasnikom.</em></p>",
      2,
      "/gallery/galerija-01.jpg",
      "Djeca na treningu u dvorani (ilustracija)",
    ),
    post(
      "post-02",
      "sto-ponijeti-na-prvi-trening",
      "Što ponijeti na prvi trening?",
      "Udobna odjeća, tenisice za dvoranu i bočica vode — kratki podsjetnik za opušten prvi dolazak.",
      "<p>Prvi trening uvijek je malo uzbudljiv — i za djecu i za roditelje. Evo kratkog podsjetnika kako bi sve prošlo opušteno:</p><ul><li><strong>Udobna sportska odjeća</strong> u kojoj se dijete može slobodno kretati.</li><li><strong>Tenisice za dvoranu</strong> sa svijetlim potplatom.</li><li><strong>Bočica vode</strong> s imenom djeteta.</li><li>Duga kosa svezana, bez nakita i satova.</li></ul><p>Dođite desetak minuta ranije kako bi se dijete u miru presvuklo i upoznalo s grupom.</p><p><em>Demo objava — tekst potvrditi s vlasnikom.</em></p>",
      9,
      "/gallery/galerija-03.jpg",
      "Sportska oprema za djecu (ilustracija)",
    ),
    post(
      "post-03",
      "kako-sport-razvija-koncentraciju",
      "Kako sport razvija koncentraciju i pažnju",
      "Igra s pravilima, brze odluke i koordinacija pokreta — zašto je kretanje odličan trening i za glavu.",
      "<p>Kad dijete u igri mora pratiti loptu, suigrače i pravila u isto vrijeme, vježba puno više od mišića. Takve situacije razvijaju <strong>koncentraciju i pažnju</strong>, <strong>brže donošenje odluka</strong>, <strong>prostornu orijentaciju</strong> te <strong>koordinaciju pokreta i razmišljanja</strong>.</p><p>Zato su naši treninzi osmišljeni kao niz kratkih, raznolikih igara koje traže i tijelo i glavu — a djeci su prije svega zabavne.</p><p><em>Demo objava — tekst potvrditi s vlasnikom.</em></p>",
      21,
      "/gallery/galerija-05.jpg",
      "Djeca u igri s loptom (ilustracija)",
    ),
  ];

  const content: SiteContent = {
    pricingNote:
      "Iznos mjesečne članarine i način plaćanja potvrđujemo nakon prijave, ovisno o programu i terminu. Online plaćanje nije potrebno — sve dogovaramo izravno s vama.",
    trainer: {
      name: "Ime i prezime trenera",
      title: "Profesor kineziologije · rukometni trener",
      bio:
        "Sportaonicu vodimo kao obitelj — profesor kineziologije i rukometni trener zajedno sa suprugom. Vjerujemo da je sport najljepši način da dijete upozna svoje tijelo, stekne prijatelje i nauči da se trud isplati.\n\nNa našim treninzima nema pritiska rezultata: važno nam je da se svako dijete osjeća sigurno, prihvaćeno i da se veseli sljedećem dolasku.",
      highlights: [
        "Profesor kineziologije",
        "Rukometni trener",
        "Program verificiran od Ministarstva znanosti, obrazovanja i mladih",
      ],
      photo: "",
    },
    faq: [
      {
        id: "faq-age",
        question: "Za koju su dob programi namijenjeni?",
        answer:
          "Programi su namijenjeni djeci okvirno od 3 do 10 godina. Svaka aktivnost ima svoj dobni raspon (npr. Igre s loptom za najmlađe), a sustav prijava sam će vas upozoriti ako dob djeteta ne odgovara odabranom programu.",
      },
      {
        id: "faq-bring",
        question: "Što dijete treba ponijeti na trening?",
        answer:
          "Udobnu sportsku odjeću, tenisice za dvoranu sa svijetlim potplatom i bočicu vode. Dugu kosu svežite, a nakit i satove ostavite kod kuće.",
      },
      {
        id: "faq-how",
        question: "Kako funkcioniraju online prijave?",
        answer:
          "Odaberete aktivnost, lokaciju i termin, ispunite kratki obrazac i odmah dobivate potvrdu na e-mail. Uz svaki termin vidi se koliko je još slobodnih mjesta. Ako je termin popunjen, dijete možete upisati na listu čekanja.",
      },
      {
        id: "faq-waitlist",
        question: "Što ako je termin popunjen?",
        answer:
          "Upišite se na listu čekanja. Kad se mjesto oslobodi, prvo dijete s liste automatski dobiva mjesto, a roditelj o tome dobiva e-mail.",
      },
      {
        id: "faq-cancel",
        question: "Kako mogu otkazati prijavu?",
        answer:
          "U potvrdnom e-mailu nalazi se osobna poveznica za otkazivanje. Jednim klikom otkazujete prijavu i oslobađate mjesto za drugo dijete. Možete nas i nazvati ili nam poslati e-mail.",
      },
      {
        id: "faq-safety",
        question: "Kako brinete o sigurnosti djece?",
        answer:
          "Treninge vodi profesor kineziologije, a vježbe su prilagođene dobi i mogućnostima djece. Grupe su ograničenog broja kako bi svako dijete imalo dovoljno pažnje. Ako dijete ima zdravstvene posebnosti ili alergije, navedite ih u prijavi.",
      },
      {
        id: "faq-payment",
        question: "Kako se plaća članarina?",
        answer:
          "Online plaćanje nije potrebno. Iznos članarine i način plaćanja potvrđujemo nakon prijave, ovisno o programu i terminu.",
      },
      {
        id: "faq-trial",
        question: "Mogu li roditelji gledati trening?",
        answer:
          "O pravilima za roditelje tijekom treninga dogovorit ćemo se pri prvom dolasku — slobodno nas pitajte unaprijed.",
      },
    ],
  };

  const settings: SiteSettings = {
    phone: "099 878 1025",
    email: "sportaonica@gmail.com",
    instagramUrl: "https://www.instagram.com/",
    facebookUrl: "https://www.facebook.com/",
    bannerEnabled: true,
    bannerText: "Upisi su u tijeku — rezervirajte mjesto na vrijeme!",
    business: {
      name: "Sportaonica, obrt za sportske djelatnosti (naziv potvrditi)",
      owner: "Ime i prezime vlasnika",
      oib: "00000000000",
      address: "Adresa obrta, 10370 Dugo Selo (potvrditi)",
    },
  };

  return { version: 1, settings, content, locations, activities, slots, registrations, posts, contactMessages: [] };
}
