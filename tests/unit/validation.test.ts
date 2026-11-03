import { describe, it, expect } from "vitest";
import { registrationSchema, contactSchema, fieldErrors, slotSchema, looksAutomated } from "@/lib/validation";
import { ageOn, isAgeInRange } from "@/lib/age";
import { plural, seatsLabel } from "@/lib/format";
import { slugify } from "@/lib/slug";

const valid = {
  slotId: "slot-01",
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
      expect(r.data.marketingConsent).toBe(false);
      expect(r.data.waitlist).toBe(false);
    }
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

  it("rejects filled honeypot", () => {
    expect(registrationSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("validates message length and privacy", () => {
    const r = contactSchema.safeParse({ name: "Ivo", email: "ivo@example.com", message: "kratko", privacy: true });
    expect(r.success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ivo", email: "ivo@example.com", message: "Zanimaju me termini.", privacy: true }).success).toBe(true);
  });
});

describe("slotSchema", () => {
  it("rejects end before start and preEnrolled > capacity", () => {
    const base = { activityId: "a", locationId: "l", dayOfWeek: 1, startTime: "17:00", endTime: "18:00", capacity: 10, preEnrolled: 0, status: "active" };
    expect(slotSchema.safeParse(base).success).toBe(true);
    expect(slotSchema.safeParse({ ...base, endTime: "16:00" }).success).toBe(false);
    expect(slotSchema.safeParse({ ...base, preEnrolled: 11 }).success).toBe(false);
  });
});

describe("age helpers", () => {
  const ref = new Date("2026-11-03T12:00:00");
  it("computes full years correctly around birthdays", () => {
    expect(ageOn("2020-11-03", ref)).toBe(6);
    expect(ageOn("2020-11-04", ref)).toBe(5);
    expect(isAgeInRange("2023-01-01", 3, 5, ref)).toBe(true);
    expect(isAgeInRange("2024-01-01", 3, 5, ref)).toBe(false);
    expect(isAgeInRange("2015-01-01", 3, 10, ref)).toBe(false);
  });
});

describe("Croatian formatting", () => {
  it("pluralises seats", () => {
    expect(seatsLabel(1)).toBe("Još 1 slobodno mjesto");
    expect(seatsLabel(3)).toBe("Još 3 slobodna mjesta");
    expect(seatsLabel(5)).toBe("Još 5 slobodnih mjesta");
    expect(seatsLabel(21)).toBe("Još 21 slobodno mjesto");
    expect(seatsLabel(12)).toBe("Još 12 slobodnih mjesta");
    expect(seatsLabel(0)).toBe("Popunjeno");
    expect(plural(14, "a", "b", "c")).toBe("c");
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
