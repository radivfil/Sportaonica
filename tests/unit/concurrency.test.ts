/**
 * Local JSON store: same guarantees as the database functions
 * (tests/db/booking.test.ts runs the real SQL against Postgres).
 */
import { describe, it, expect, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { JsonRepository } from "@/lib/data/json-repo";
import { createSeed } from "@/lib/data/seed";
import type { BookingRequest, NewRegistration, Slot } from "@/lib/data/types";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const birth = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
};
const input = (i: number, age = 5): NewRegistration => ({
  parentName: `Roditelj ${i}`,
  phone: "091 111 1111",
  email: `r${i}@example.com`,
  childName: `Dijete ${i}`,
  childBirthDate: birth(age),
  gdprConsent: true,
});
const req = (slotIds: string[], i: number, opts: Partial<BookingRequest> = {}) => {
  const token = randomBytes(24).toString("base64url");
  return { token, req: { slotIds, input: input(i), cancelTokenHash: sha(token), allowWaitlist: false, ...opts } };
};

async function freshRepo(capacity: number, extraSlots: Slot[] = []) {
  const repo = new JsonRepository(mkdtempSync(path.join(os.tmpdir(), "sportaonica-test-")), "test", true);
  const seed = createSeed();
  seed.registrations = [];
  seed.outbox = [];
  const base = seed.slots.find((s) => s.activityId === "act-predskolci")!;
  seed.slots = [{ ...base, id: "slot-x", capacity }, ...extraSlots];
  await repo.reset(seed);
  return repo;
}

describe("JSON store: booking concurrency (no overbooking)", () => {
  let repo: JsonRepository;
  beforeEach(async () => {
    repo = await freshRepo(1);
  });

  it("25 simultaneous requests for the last seat → exactly one wins", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => repo.book(req(["slot-x"], i).req)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "SLOT_FULL")).toHaveLength(24);
    const slot = await repo.getSlot("slot-x");
    expect(slot).toMatchObject({ activeCount: 1, remaining: 0, isFull: true });
  });

  it("cancel via token frees the seat and promotes the waitlist FIFO, queues e-mails", async () => {
    const first = req(["slot-x"], 1);
    await repo.book(first.req);
    const w1 = await repo.book(req(["slot-x"], 2, { allowWaitlist: true }).req);
    await repo.book(req(["slot-x"], 3, { allowWaitlist: true }).req);
    expect(w1.ok && w1.registrations[0]).toMatchObject({ status: "waitlist", waitlistPosition: 1 });

    const res = await repo.cancelByToken(first.token);
    expect(res).toMatchObject({ cancelled: [expect.any(String)], promoted: 1 });
    const regs = await repo.listRegistrations({ slotId: "slot-x" });
    expect(regs.find((r) => r.childName === "Dijete 1")?.status).toBe("cancelled_parent");
    expect(regs.find((r) => r.childName === "Dijete 2")?.status).toBe("active");
    expect(regs.find((r) => r.childName === "Dijete 3")?.status).toBe("waitlist");
    const outbox = await repo.claimOutbox(50);
    expect(outbox.map((o) => o.kind)).toEqual(expect.arrayContaining(["confirmation", "owner_new_registration", "cancellation", "promoted"]));
    // idempotent
    expect((await repo.cancelByToken(first.token)).cancelled).toHaveLength(0);
  });

  it("the cancel token is stored only as a hash", async () => {
    const b = req(["slot-x"], 9);
    await repo.book(b.req);
    const [r] = await repo.listRegistrations();
    expect(r.cancelTokenHash).toBe(sha(b.token));
    expect(JSON.stringify(r)).not.toContain(b.token);
  });

  it("rejects duplicates and wrong age", async () => {
    await repo.book(req(["slot-x"], 1).req);
    expect(await repo.book(req(["slot-x"], 1, { allowWaitlist: true }).req)).toMatchObject({ ok: false, code: "DUPLICATE" });
    const old = req(["slot-x"], 2);
    old.req.input.childBirthDate = birth(12);
    expect(await repo.book(old.req)).toMatchObject({ ok: false, code: "AGE_OUT_OF_RANGE" });
  });

  it("concurrent cancel + book never exceeds capacity", async () => {
    repo = await freshRepo(3);
    const tokens: string[] = [];
    for (let i = 0; i < 3; i++) {
      const b = req(["slot-x"], i);
      tokens.push(b.token);
      await repo.book(b.req);
    }
    await Promise.all([
      repo.cancelByToken(tokens[0]),
      repo.cancelByToken(tokens[1]),
      ...Array.from({ length: 10 }, (_, i) => repo.book(req(["slot-x"], 100 + i, { allowWaitlist: true }).req)),
    ]);
    const slot = await repo.getSlot("slot-x");
    expect(slot!.activeCount).toBe(3);
  });

  it("raising capacity promotes the waitlist; lowering below active is refused", async () => {
    await repo.book(req(["slot-x"], 1).req);
    await repo.book(req(["slot-x"], 2, { allowWaitlist: true }).req);
    const slot = (await repo.getSlot("slot-x"))!;
    await repo.saveSlots([{ ...slot, capacity: 2 }]);
    expect((await repo.getSlot("slot-x"))!.activeCount).toBe(2);
    await expect(repo.saveSlots([{ ...slot, capacity: 1 }])).rejects.toThrow(/Kapacitet/);
  });

  it("GDPR anonymisation keeps the row but removes personal data", async () => {
    await repo.book(req(["slot-x"], 1).req);
    const [r] = await repo.listRegistrations();
    await repo.anonymizeRegistration(r.id);
    const after = (await repo.getRegistration(r.id))!;
    expect(after).toMatchObject({ childName: "Obrisano", email: "obrisano@invalid", status: "cancelled_admin" });
    expect(after.anonymizedAt).toBeTruthy();
    const audit = await repo.listAudit();
    expect(audit.map((a) => a.action)).toContain("registration.anonymize");
  });

  it("public caller cannot read registrations", async () => {
    const pub = repo.as("javno", false);
    await expect(pub.listRegistrations()).rejects.toThrow("forbidden");
    await expect(pub.book({ ...req(["slot-x"], 1).req, admin: { force: true } })).rejects.toThrow("forbidden");
  });
});

describe("JSON store: series", () => {
  it("all-or-nothing, one link cancels all", async () => {
    const d = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
    const mk = (id: string, date: string, capacity: number): Slot => ({ id, activityId: "act-predskolci", locationId: "loc-brckovljani", kind: "single", dayOfWeek: 6, date, seriesId: "ser", startTime: "10:00", endTime: "11:00", capacity, status: "active" });
    const repo = await freshRepo(5, [mk("a", d(7), 2), mk("b", d(14), 1), mk("c", d(21), 2)]);
    const first = req(["a", "b", "c"], 1);
    expect((await repo.book(first.req)).ok).toBe(true);
    expect(await repo.book(req(["a", "b", "c"], 2).req)).toMatchObject({ ok: false, code: "SLOT_FULL", slotId: "b" });
    expect((await repo.listRegistrations()).filter((r) => r.childName === "Dijete 2")).toHaveLength(0);
    const third = await repo.book(req(["a", "b", "c"], 3, { allowWaitlist: true }).req);
    expect(third.ok && third.registrations.map((r) => r.status)).toEqual(["active", "waitlist", "active"]);
    const res = await repo.cancelByToken(first.token);
    expect(res.cancelled).toHaveLength(3);
    expect((await repo.listRegistrations()).filter((r) => r.childName === "Dijete 3").every((r) => r.status === "active")).toBe(true);
  });
});
