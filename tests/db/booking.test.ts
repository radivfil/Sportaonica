/**
 * Booking rules in the database: atomic seat allocation under real
 * concurrency (separate connections), waitlist promotion, cancellation via
 * secret link, deadlines, series, age range, duplicates, GDPR erasure.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANON, SERVICE, adminClaims, as, birthDateForAge, createTestDb, dbAvailable, newToken, payload, seedBasics, sha256, type TestDb } from "./helpers";

const available = await dbAvailable();
if (!available && process.env.CI) throw new Error("TEST_DATABASE_URL is not reachable in CI");

const book = (db: TestDb, slots: string[], p: object, token = newToken(), waitlist = false) =>
  as(db.pool, ANON, (c) =>
    c.query(`select book_registration($1::text[], $2::jsonb, $3, $4) as r`, [slots, JSON.stringify(p), sha256(token), waitlist]),
  ).then((res) => ({ ...res.rows[0].r, token }));

const statuses = async (db: TestDb, slot: string) =>
  (await db.pool.query(`select child_name, status from registrations where slot_id = $1 order by created_at, id`, [slot])).rows;

describe.skipIf(!available)("booking in Postgres", () => {
  let db: TestDb;
  let adminId: string;

  beforeAll(async () => {
    db = await createTestDb();
    ({ adminId } = await seedBasics(db.pool));
  }, 60_000);
  afterAll(async () => db?.drop());

  it("30 simultaneous requests for the LAST seat → exactly one wins", async () => {
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => book(db, ["slot-1"], payload(`Dijete ${i}`))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "SLOT_FULL")).toHaveLength(29);
    const rows = await statuses(db, "slot-1");
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);
  });

  it("concurrent waitlist requests are all stored, none over capacity", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(db, ["slot-1"], payload(`Čekanje ${i}`), newToken(), true)));
    expect(results.every((r) => r.ok)).toBe(true);
    const rows = await statuses(db, "slot-1");
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);
    expect(rows.filter((r) => r.status === "waitlist")).toHaveLength(10);
  });

  it("parent cancels via link → seat freed → first on waitlist promoted (FIFO) + e-mails queued", async () => {
    await db.pool.query(`delete from outbox`);
    const winner = (await db.pool.query(`select id from registrations where slot_id = 'slot-1' and status = 'active'`)).rows[0].id;
    // token of the winner is unknown here, so set a known one
    const token = newToken();
    await db.pool.query(`update registrations set cancel_token_hash = $1 where id = $2`, [sha256(token), winner]);
    const firstWaiting = (await db.pool.query(`select id from registrations where slot_id = 'slot-1' and status = 'waitlist' order by created_at, id limit 1`)).rows[0].id;

    const res = await as(db.pool, ANON, (c) => c.query(`select cancel_by_token($1) as r`, [token]));
    expect(res.rows[0].r.cancelled).toHaveLength(1);
    expect(res.rows[0].r.promoted).toBe(1);
    const promoted = (await db.pool.query(`select status from registrations where id = $1`, [firstWaiting])).rows[0];
    expect(promoted.status).toBe("active");
    const outbox = (await db.pool.query(`select kind, ref_id from outbox order by created_at`)).rows;
    expect(outbox.map((o) => o.kind).sort()).toEqual(["cancellation", "promoted"]);
    expect(outbox.find((o) => o.kind === "promoted").ref_id).toBe(firstWaiting);
    // cancelling twice is a no-op
    const again = await as(db.pool, ANON, (c) => c.query(`select cancel_by_token($1) as r`, [token]));
    expect(again.rows[0].r.cancelled).toHaveLength(0);
  });

  it("concurrent cancel + book never exceeds capacity", async () => {
    const tokens = await Promise.all([0, 1].map(async (i) => (await book(db, ["slot-adult"], { ...payload(`Odrasli ${i}`, 30) })).token));
    const ops = [
      ...tokens.map((t) => as(db.pool, ANON, (c) => c.query(`select cancel_by_token($1)`, [t]))),
      ...Array.from({ length: 15 }, (_, i) => book(db, ["slot-adult"], payload(`Novi ${i}`, 30), newToken(), true)),
    ];
    await Promise.all(ops);
    const active = (await db.pool.query(`select count(*)::int as n from registrations where slot_id = 'slot-adult' and status = 'active'`)).rows[0].n;
    expect(active).toBe(5);
  });

  it("validates age per activity (DB level)", async () => {
    const tooOld = await book(db, ["slot-big"], payload("Prestar", 9));
    expect(tooOld).toMatchObject({ ok: false, code: "AGE_OUT_OF_RANGE" });
    const adultOk = await book(db, ["slot-adult"], payload("Odrasla Osoba", 45), newToken(), true);
    expect(adultOk.ok).toBe(true); // no upper limit
    const childInAdult = await book(db, ["slot-adult"], payload("Dijete", 8));
    expect(childInAdult).toMatchObject({ ok: false, code: "AGE_OUT_OF_RANGE" });
  });

  it("rejects duplicates: same child, same slot (case/space-insensitive)", async () => {
    const p = payload("Marko Marić");
    expect((await book(db, ["slot-big"], p)).ok).toBe(true);
    expect(await book(db, ["slot-big"], { ...p, childName: "  marko marić " })).toMatchObject({ ok: false, code: "DUPLICATE" });
  });

  it("rejects invalid payloads even if the server validation is bypassed", async () => {
    expect(await book(db, ["slot-big"], { ...payload("Bez Privole"), gdprConsent: false })).toMatchObject({ ok: false, code: "INVALID" });
    expect(await book(db, ["slot-big"], { ...payload("Krivi Mail"), email: "nije-email" })).toMatchObject({ ok: false, code: "INVALID" });
    expect(await book(db, ["slot-big"], { ...payload("Budućnost"), childBirthDate: "2999-01-01" })).toMatchObject({ ok: false, code: "INVALID" });
    expect(await book(db, ["nepostojeci"], payload("Nema"))).toMatchObject({ ok: false, code: "SLOT_NOT_FOUND" });
  });

  it("series booking is all-or-nothing; one link cancels the whole series", async () => {
    const d = (n: number) => {
      const x = new Date();
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };
    await db.pool.query(
      `insert into slots(id, activity_id, location_id, kind, day_of_week, session_date, series_id, start_time, end_time, capacity) values
       ('ser-1', 'act-kids', 'loc-a', 'single', 1, $1, 'serija', '10:00', '11:00', 2),
       ('ser-2', 'act-kids', 'loc-a', 'single', 1, $2, 'serija', '10:00', '11:00', 1),
       ('ser-3', 'act-kids', 'loc-a', 'single', 1, $3, 'serija', '10:00', '11:00', 2)`,
      [d(10), d(17), d(24)],
    );
    const first = await book(db, ["ser-1", "ser-2", "ser-3"], payload("Serija Prva"));
    expect(first.ok).toBe(true);
    expect(first.registrations).toHaveLength(3);
    // ser-2 is now full → the whole series request fails without waitlist, nothing inserted
    const second = await book(db, ["ser-1", "ser-2", "ser-3"], payload("Serija Druga"));
    expect(second).toMatchObject({ ok: false, code: "SLOT_FULL", slotId: "ser-2" });
    expect((await db.pool.query(`select count(*)::int n from registrations where child_name = 'Serija Druga'`)).rows[0].n).toBe(0);
    // with waitlist: active where possible, waitlist on ser-2
    const third = await book(db, ["ser-1", "ser-2", "ser-3"], payload("Serija Treća"), newToken(), true);
    expect(third.registrations.map((r: { status: string }) => r.status)).toEqual(["active", "waitlist", "active"]);
    // the first family cancels everything with one link → Treća gets ser-2
    const res = await as(db.pool, ANON, (c) => c.query(`select cancel_by_token($1) as r`, [first.token]));
    expect(res.rows[0].r.cancelled).toHaveLength(3);
    const t = (await db.pool.query(`select s.id, r.status from registrations r join slots s on s.id = r.slot_id where child_name = 'Serija Treća' order by s.id`)).rows;
    expect(t.map((r) => r.status)).toEqual(["active", "active", "active"]);
  });

  it("cancellation deadline: dated sessions closer than X hours cannot be cancelled by link", async () => {
    const tomorrow = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
    await db.pool.query(
      `insert into slots(id, activity_id, location_id, kind, day_of_week, session_date, start_time, end_time, capacity)
       values ('soon', 'act-kids', 'loc-a', 'single', 1, $1, '23:00', '23:30', 5)`,
      [tomorrow],
    );
    await db.pool.query(`update site_kv set value = jsonb_set(value, '{cancelDeadlineHours}', '72') where key = 'settings'`);
    const b = await book(db, ["soon"], payload("Kasno Otkazivanje"));
    const res = await as(db.pool, ANON, (c) => c.query(`select cancel_by_token($1) as r`, [b.token]));
    expect(res.rows[0].r.cancelled).toHaveLength(0);
    expect(res.rows[0].r.tooLate).toHaveLength(1);
    await db.pool.query(`update site_kv set value = jsonb_set(value, '{cancelDeadlineHours}', '24') where key = 'settings'`);
  });

  it("raising capacity promotes the waitlist automatically; capacity can't drop below active", async () => {
    const waiting = (await db.pool.query(`select count(*)::int n from registrations where slot_id = 'slot-1' and status = 'waitlist'`)).rows[0].n;
    await as(db.pool, adminClaims(adminId), (c) => c.query(`update slots set capacity = 3 where id = 'slot-1'`));
    const rows = await statuses(db, "slot-1");
    expect(rows.filter((r) => r.status === "active")).toHaveLength(3);
    expect(rows.filter((r) => r.status === "waitlist")).toHaveLength(waiting - 2);
    await expect(as(db.pool, adminClaims(adminId), (c) => c.query(`update slots set capacity = 1 where id = 'slot-1'`))).rejects.toThrow(/Kapacitet/);
  });

  it("admin cancel → status cancelled_admin + promotion; history kept", async () => {
    const reg = (await db.pool.query(`select id from registrations where slot_id = 'slot-1' and status = 'active' limit 1`)).rows[0].id;
    const res = await as(db.pool, adminClaims(adminId), (c) => c.query(`select admin_cancel_registration($1) as r`, [reg]));
    expect(res.rows[0].r).toMatchObject({ ok: true, promoted: 1 });
    expect((await db.pool.query(`select status, cancelled_at from registrations where id = $1`, [reg])).rows[0].status).toBe("cancelled_admin");
  });

  it("GDPR erasure wipes personal data but keeps the row", async () => {
    const reg = (await db.pool.query(`select id from registrations where child_name = 'Marko Marić'`)).rows[0].id;
    await as(db.pool, adminClaims(adminId), (c) => c.query(`select anonymize_registration($1)`, [reg]));
    const row = (await db.pool.query(`select * from registrations where id = $1`, [reg])).rows[0];
    expect(row).toMatchObject({ child_name: "Obrisano", email: "obrisano@invalid", child_birth_date: null, status: "cancelled_admin" });
    expect(row.anonymized_at).not.toBeNull();
  });

  it("retention purge anonymises old cancelled registrations", async () => {
    await db.pool.query(`update registrations set cancelled_at = now() - interval '3 years' where status = 'cancelled_parent'`);
    const n = (await as(db.pool, SERVICE, (c) => c.query(`select purge_expired_registrations() as n`))).rows[0].n;
    expect(n).toBeGreaterThan(0);
    const left = (await db.pool.query(`select count(*)::int n from registrations where status = 'cancelled_parent' and anonymized_at is null`)).rows[0].n;
    expect(left).toBe(0);
  });

  it("daily e-mail quota: warns once at 70, blocks at 100", async () => {
    let warns = 0;
    let lastAllowed = 0;
    for (let i = 0; i < 105; i++) {
      const r = (await as(db.pool, SERVICE, (c) => c.query(`select take_email_quota(100, 70) as q`))).rows[0].q;
      if (r.warn) warns++;
      if (r.allowed) lastAllowed = r.sent;
    }
    expect(warns).toBe(1);
    expect(lastAllowed).toBe(100);
  });

  it("rate limiter blocks after the limit within the window", async () => {
    const hits = [];
    for (let i = 0; i < 5; i++) hits.push((await as(db.pool, ANON, (c) => c.query(`select rate_limit_hit('ip:test', 3, 60) as ok`))).rows[0].ok);
    expect(hits).toEqual([true, true, true, false, false]);
  });

  it("birth date in the past is required and age is computed in Europe/Zagreb", async () => {
    const r = await book(db, ["slot-big"], { ...payload("Rubni Slučaj"), childBirthDate: birthDateForAge(3) });
    expect(r.ok).toBe(true);
  });
});
