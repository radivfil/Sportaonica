import { describe, it, expect, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { JsonRepository } from "@/lib/data/json-repo";
import { createSeed } from "@/lib/data/seed";
import type { NewRegistration } from "@/lib/data/types";

const input = (i: number): NewRegistration => ({
  slotId: "slot-x",
  parentName: `Roditelj ${i}`,
  phone: "091 111 1111",
  email: `r${i}@example.com`,
  childName: `Dijete ${i}`,
  childBirthDate: "2019-05-05",
  gdprConsent: true,
  marketingConsent: false,
});

function freshRepo(capacity: number, preEnrolled: number) {
  const repo = new JsonRepository(mkdtempSync(path.join(os.tmpdir(), "sportaonica-test-")));
  const seed = createSeed();
  seed.registrations = [];
  seed.slots = [{ ...seed.slots[0], id: "slot-x", capacity, preEnrolled }];
  return { repo, seed };
}

describe("booking concurrency (no overbooking)", () => {
  let repo: JsonRepository;

  beforeEach(async () => {
    const f = freshRepo(10, 9); // exactly ONE seat left
    repo = f.repo;
    await repo.reset(f.seed);
  });

  it("gives the last seat to exactly one of 25 simultaneous requests", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => repo.book("slot-x", input(i), { allowWaitlist: false })));
    const ok = results.filter((r) => r.ok);
    const full = results.filter((r) => !r.ok && r.code === "SLOT_FULL");
    expect(ok).toHaveLength(1);
    expect(full).toHaveLength(24);
    const slot = await repo.getSlot("slot-x");
    expect(slot?.taken).toBe(10);
    expect(slot?.remaining).toBe(0);
    expect(slot?.isFull).toBe(true);
  });

  it("puts overflow on the waitlist in arrival order when allowed", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => repo.book("slot-x", input(i), { allowWaitlist: true })));
    const statuses = results.map((r) => (r.ok ? r.registration.status : "error"));
    expect(statuses.filter((s) => s === "confirmed")).toHaveLength(1);
    expect(statuses.filter((s) => s === "waitlist")).toHaveLength(5);
    const slot = await repo.getSlot("slot-x");
    expect(slot?.confirmedCount).toBe(1);
    expect(slot?.waitlistCount).toBe(5);
  });

  it("cancelling frees the seat and promotes the oldest waitlist entry", async () => {
    const first = await repo.book("slot-x", input(1), { allowWaitlist: true });
    const w1 = await repo.book("slot-x", input(2), { allowWaitlist: true });
    const w2 = await repo.book("slot-x", input(3), { allowWaitlist: true });
    if (!first.ok || !w1.ok || !w2.ok) throw new Error("setup failed");
    expect(w1.registration.status).toBe("waitlist");

    const res = await repo.cancelByToken(first.registration.cancelToken);
    expect(res.cancelled?.status).toBe("cancelled");
    expect(res.promoted?.id).toBe(w1.registration.id);
    expect((await repo.getRegistration(w2.registration.id))?.status).toBe("waitlist");
    const slot = await repo.getSlot("slot-x");
    expect(slot?.remaining).toBe(0);

    // cancelling twice is idempotent and promotes nobody
    const again = await repo.cancelByToken(first.registration.cancelToken);
    expect(again.alreadyCancelled).toBe(true);
    expect(again.promoted).toBeNull();
  });

  it("concurrent cancellations + bookings never exceed capacity", async () => {
    const f = freshRepo(5, 0);
    await f.repo.reset(f.seed);
    const initial = await Promise.all(Array.from({ length: 5 }, (_, i) => f.repo.book("slot-x", input(i), { allowWaitlist: false })));
    const tokens = initial.map((r) => (r.ok ? r.registration.cancelToken : ""));
    await Promise.all([
      ...tokens.slice(0, 2).map((t) => f.repo.cancelByToken(t)),
      ...Array.from({ length: 10 }, (_, i) => f.repo.book("slot-x", input(100 + i), { allowWaitlist: false })),
    ]);
    const slot = await f.repo.getSlot("slot-x");
    expect(slot!.taken).toBeLessThanOrEqual(5);
  });
});
