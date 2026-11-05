import { describe, expect, it } from "vitest";
import { ageRangeLabel, ageYears, canCancelByLink, datesInRange, isAgeAllowed, isSlotPast, weekdayOf, zagrebInstant, withStats } from "@/lib/data/rules";
import type { Registration, Slot } from "@/lib/data/types";
import { detectImage, readImageSize } from "@/lib/image-check";
import { base32Decode, hotp, totp, verifyTotp } from "@/lib/auth/totp";
import { csvEscape, toCsv } from "@/lib/csv";
import { sanitizePostHtml } from "@/lib/sanitize";

describe("age per activity", () => {
  it("full years around the birthday", () => {
    expect(ageYears("2020-11-03", "2026-11-03")).toBe(6);
    expect(ageYears("2020-11-04", "2026-11-03")).toBe(5);
  });
  it("respects each activity's own range; null = no upper limit", () => {
    const toddlers = { ageMin: 2, ageMax: 3 };
    const adults = { ageMin: 18, ageMax: null };
    expect(isAgeAllowed(toddlers, "2024-01-01", "2026-11-05")).toBe(true);
    expect(isAgeAllowed(toddlers, "2020-01-01", "2026-11-05")).toBe(false);
    expect(isAgeAllowed(adults, "1960-01-01", "2026-11-05")).toBe(true);
    expect(isAgeAllowed(adults, "2010-01-01", "2026-11-05")).toBe(false);
    expect(ageRangeLabel({ ageMin: 18, ageMax: null, audience: "adults" })).toBe("Odrasli");
    expect(ageRangeLabel({ ageMin: 4, ageMax: 6, audience: "kids" })).toBe("4–6 god.");
  });
});

describe("dates & deadlines (Europe/Zagreb)", () => {
  it("converts wall-clock time incl. DST", () => {
    expect(zagrebInstant("2026-07-01", "10:00").toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(zagrebInstant("2026-12-01", "10:00").toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });
  it("weekday and date ranges", () => {
    expect(weekdayOf("2026-11-07")).toBe(6); // Saturday
    expect(datesInRange("2026-11-01", "2026-11-30", [6])).toEqual(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"]);
  });
  const single: Slot = { id: "s", activityId: "a", locationId: "l", kind: "single", dayOfWeek: 6, date: "2026-11-14", startTime: "10:00", endTime: "11:00", capacity: 5, status: "active" };
  it("cancel deadline only for dated sessions", () => {
    expect(canCancelByLink(single, 24, new Date("2026-11-13T08:00:00Z"))).toBe(true);
    expect(canCancelByLink(single, 24, new Date("2026-11-13T10:00:00Z"))).toBe(false);
    expect(canCancelByLink({ ...single, kind: "weekly", date: undefined }, 24, new Date("2030-01-01"))).toBe(true);
  });
  it("past sessions", () => {
    expect(isSlotPast(single, "2026-11-15")).toBe(true);
    expect(isSlotPast(single, "2026-11-14")).toBe(false);
  });
});

describe("seats are computed, never stored", () => {
  const slot: Slot = { id: "s", activityId: "a", locationId: "l", kind: "weekly", dayOfWeek: 1, startTime: "17:00", endTime: "18:00", capacity: 3, status: "active" };
  const reg = (status: Registration["status"]) => ({ slotId: "s", status }) as Registration;
  it("capacity − active registrations", () => {
    const st = withStats(slot, [reg("active"), reg("active"), reg("waitlist"), reg("cancelled_parent"), reg("cancelled_admin")]);
    expect(st).toMatchObject({ activeCount: 2, waitlistCount: 1, remaining: 1, isFull: false });
    expect(withStats(slot, [reg("active"), reg("active"), reg("active")]).isFull).toBe(true);
  });
});

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC test vector (SHA-1, 59 s)", async () => {
    // RFC 6238 secret "12345678901234567890" → base32
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(base32Decode(secret)).toEqual(new TextEncoder().encode("12345678901234567890"));
    expect(await totp(secret, 59_000)).toBe("287082");
    expect(await hotp(base32Decode(secret), 1)).toBe("287082");
  });
  it("accepts ±1 step, rejects others", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = Date.now();
    expect(await verifyTotp(secret, await totp(secret, now - 30_000), now)).toBe(true);
    expect(await verifyTotp(secret, await totp(secret, now - 120_000), now)).toBe(false);
    expect(await verifyTotp(secret, "abc123", now)).toBe(false);
  });
});

describe("upload validation", () => {
  it("detects real image types by magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 4, 0, 0, 0, 3, 0]);
    expect(detectImage(png)?.mime).toBe("image/png");
    expect(readImageSize(png, detectImage(png)!)).toEqual({ width: 1024, height: 768 });
    expect(detectImage(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBeNull();
    expect(detectImage(new TextEncoder().encode("GIF89a.........."))).toBeNull();
  });
});

describe("CSV export & sanitising", () => {
  it("UTF-8 BOM, Croatian letters, formula injection neutralised", () => {
    const out = toCsv(["Ime"], [["Đurđica Čačić"], ["=HYPERLINK(\"x\")"]], ";");
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain("Đurđica Čačić");
    expect(csvEscape("=1+1", ";")).toBe("'=1+1");
  });
  it("rich text loses scripts and event handlers", () => {
    const html = sanitizePostHtml('<p onclick="x()">Bok<script>alert(1)</script><img src="javascript:alert(1)"><a href="javascript:x">l</a></p>');
    expect(html).not.toMatch(/script|onclick|javascript/i);
  });
});
