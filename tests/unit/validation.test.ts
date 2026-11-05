import { describe, it, expect } from "vitest";
import { birthdaySchema, contactSchema, fieldErrors, looksAutomated, registrationSchema, seriesSchema, slotSchema, activitySchema } from "@/lib/validation";
import { plural, seatsLabel, slotWhen } from "@/lib/format";
import { slugify } from "@/lib/slug";

const valid = {
  slotIds: ["slot-01"],
  parentName: "Ana Horvat",
  phone: "099 878 1025",
  email: "Ana@Example.com ",
  childName: "Lea Horvat",
  childBirthDate: "2019-03-14",
  gdprConsent: true as const,
};

describe("registrationSchema", () => {
  it("accepts a valid registration and normalises e-mail", () => {
    const r = registrationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("ana@example.com");
      expect(r.data.waitlist).toBe(false);
      expect(r.data.healthNote).toBe("");
    }
  });

  it("only collects the necessary fields (data minimisation)", () => {
    const r = registrationSchema.safeParse({ ...valid, oib: "12345678901", address: "Ulica 1" });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).not.toContain("oib");
  });

  it("requires GDPR consent", () => {
    const r = registrationSchema.safeParse({ ...valid, gdprConsent: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).gdprConsent).toMatch(/privola/);
  });

  it("rejects invalid phone, e-mail and birth date with Croatian messages", () => {
    const r = registrationSchema.safeParse({ ...valid, phone: "abc", email: "nije-email", childBirthDate: "2999-01-01" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(e.phone).toBe("Upišite ispravan broj telefona.");
      expect(e.email).toBe("Upišite ispravnu e-mail adresu.");
      expect(e.childBirthDate).toBe("Datum rođenja nije ispravan.");
    }
  });

  it("limits a series to 60 sessions and requires at least one", () => {
    expect(registrationSchema.safeParse({ ...valid, slotIds: [] }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...valid, slotIds: Array.from({ length: 61 }, (_, i) => `s${i}`) }).success).toBe(false);
  });

  it("rejects filled honeypot", () => {
    expect(registrationSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});

describe("contact & birthday schemas", () => {
  it("validates message length and privacy", () => {
    expect(contactSchema.safeParse({ name: "Ivo", email: "ivo@example.com", message: "kratko", privacy: true }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ivo", email: "ivo@example.com", message: "Zanimaju me termini.", privacy: true }).success).toBe(true);
  });
  it("birthday inquiry needs a future date, children count and age", () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);
    const ok = { name: "Iva Ivić", email: "iva@example.com", phone: "091 222 3333", eventDate: future, childrenCount: "12", childAge: "7", privacy: true };
    expect(birthdaySchema.safeParse(ok).success).toBe(true);
    expect(birthdaySchema.safeParse({ ...ok, eventDate: "2020-01-01" }).success).toBe(false);
    expect(birthdaySchema.safeParse({ ...ok, childrenCount: "0" }).success).toBe(false);
  });
});

describe("admin schemas", () => {
  const slot = { activityId: "a", locationId: "l", kind: "weekly", dayOfWeek: 1, startTime: "17:00", endTime: "18:00", capacity: 10, status: "active" };
  it("slot: rejects end before start; single needs a date", () => {
    expect(slotSchema.safeParse(slot).success).toBe(true);
    expect(slotSchema.safeParse({ ...slot, endTime: "16:00" }).success).toBe(false);
    expect(slotSchema.safeParse({ ...slot, kind: "single" }).success).toBe(false);
    expect(slotSchema.safeParse({ ...slot, kind: "single", date: "2026-12-05" }).success).toBe(true);
  });
  it("series generator validates the period", () => {
    const s = { activityId: "a", locationId: "l", kind: "single", days: ["6"], from: "2026-12-01", to: "2026-11-01", startTime: "10:00", endTime: "11:00", capacity: 10 };
    expect(seriesSchema.safeParse(s).success).toBe(false);
    expect(seriesSchema.safeParse({ ...s, to: "2026-12-31" }).success).toBe(true);
  });
  it("activity: empty upper age = no limit; upper ≥ lower", () => {
    const a = { name: "Pilates", audience: "adults", shortDescription: "Snaga trupa i držanje.", ageMin: "18", ageMax: "", withParent: false, keyFacts: [], icon: "pilates", color: "teal", status: "active" };
    const r = activitySchema.safeParse(a);
    expect(r.success && r.data.ageMax).toBe(null);
    expect(activitySchema.safeParse({ ...a, ageMin: "10", ageMax: "5" }).success).toBe(false);
  });
});

describe("Croatian formatting", () => {
  it("pluralises seats", () => {
    expect(seatsLabel(1)).toBe("Još 1 slobodno mjesto");
    expect(seatsLabel(3)).toBe("Još 3 slobodna mjesta");
    expect(seatsLabel(8)).toBe("Još 8 slobodnih mjesta");
    expect(seatsLabel(21)).toBe("Još 21 slobodno mjesto");
    expect(seatsLabel(12)).toBe("Još 12 slobodnih mjesta");
    expect(seatsLabel(0)).toBe("Popunjeno");
    expect(plural(14, "a", "b", "c")).toBe("c");
  });
  it("describes weekly and dated sessions", () => {
    expect(slotWhen({ kind: "weekly", dayOfWeek: 2, startTime: "17:00", endTime: "17:45" })).toBe("Utorak, 17:00–17:45, svaki tjedan");
    expect(slotWhen({ kind: "single", dayOfWeek: 6, date: "2026-11-14", startTime: "10:00", endTime: "11:00" })).toBe("Subota, 14. 11. 2026., 10:00–11:00");
  });
  it("slugifies Croatian characters", () => {
    expect(slugify("Što ponijeti na prvi trening?")).toBe("sto-ponijeti-na-prvi-trening");
    expect(slugify("Đurđevac i Čakovec")).toBe("durdevac-i-cakovec");
  });
  it("detects instant (bot) submissions", () => {
    expect(looksAutomated(Date.now() - 500)).toBe(true);
    expect(looksAutomated(Date.now() - 10_000)).toBe(false);
  });
});
