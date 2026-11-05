import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createSeed } from "../../src/lib/data/seed";

export const E2E_DIR = path.resolve(".data/e2e");

/**
 * Fresh fictional data for every run, plus one programme with very long
 * Croatian words to prove nothing overflows at 360 / 768 / 1280 px.
 */
export default function globalSetup() {
  rmSync(E2E_DIR, { recursive: true, force: true });
  mkdirSync(E2E_DIR, { recursive: true });
  const db = createSeed();
  db.activities.push({
    id: "act-dugo",
    slug: "dugi-naziv",
    name: "Najpredškolskijemu sportskopedagoškom prijeprijavljivanju",
    audience: "kids",
    shortDescription: "Nepredvidljivoprolazni test za prelamanje dugačkih hrvatskih riječi u karticama i redovima termina.",
    description: "Najneprijateljskijemu nepredvidljivoprolaznom opisu namijenjenom provjeri prelamanja: protuustavnosti, prijevoznička, najneodgovornijima.",
    ageMin: 3,
    ageMax: 10,
    withParent: false,
    keyFacts: ["Prijevozničko-sportskopedagoški", "Najnepristupačnijemu"],
    icon: "universal",
    color: "sky",
    status: "active",
    order: 99,
  });
  const base = db.slots.find((s) => s.id === "slot-04")!;
  db.slots.push({ ...base, id: "slot-dugo", activityId: "act-dugo", capacity: 3 });
  writeFileSync(path.join(E2E_DIR, "db.json"), JSON.stringify(db, null, 2));
}
