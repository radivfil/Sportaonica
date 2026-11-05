/**
 * Proves that the public (anon) role can NOT read personal data, and that the
 * admin needs 2FA (aal2). Runs the real migrations on a real Postgres.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANON, SERVICE, adminClaims, as, createTestDb, dbAvailable, newToken, payload, seedBasics, sha256, type TestDb } from "./helpers";

const available = await dbAvailable();
if (!available && process.env.CI) throw new Error("TEST_DATABASE_URL is not reachable in CI");

describe.skipIf(!available)("RLS — personal data is admin-only", () => {
  let db: TestDb;
  let adminId: string;
  const token = newToken();

  beforeAll(async () => {
    db = await createTestDb();
    ({ adminId } = await seedBasics(db.pool));
    // one real booking + one inquiry through the public RPCs
    const res = await as(db.pool, ANON, (c) =>
      c.query(`select book_registration(array['slot-big'], $1::jsonb, $2, false) as r`, [JSON.stringify(payload("Lana Test")), sha256(token)]),
    );
    expect(res.rows[0].r.ok).toBe(true);
    await as(db.pool, ANON, (c) =>
      c.query(`select create_inquiry($1::jsonb)`, [JSON.stringify({ type: "birthday", name: "Ivo Upit", email: "ivo@example.com", message: "Rođendan", childrenCount: 10 })]),
    );
  }, 60_000);
  afterAll(async () => db?.drop());

  const PRIVATE_TABLES = ["registrations", "inquiries", "audit_log", "outbox", "email_usage", "admins", "rate_limits"];

  for (const table of PRIVATE_TABLES) {
    it(`anon cannot SELECT from ${table}`, async () => {
      await expect(as(db.pool, ANON, (c) => c.query(`select * from ${table}`))).rejects.toThrow(/permission denied/);
    });
  }

  it("anon cannot INSERT/UPDATE/DELETE registrations directly", async () => {
    await expect(
      as(db.pool, ANON, (c) =>
        c.query(`insert into registrations(slot_id, group_id, status, parent_name, phone, email, child_name, gdpr_consent, cancel_token_hash)
                 values ('slot-1', gen_random_uuid(), 'active', 'x', 'x', 'x', 'x', true, repeat('a', 64))`),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db.pool, ANON, (c) => c.query(`update registrations set paid = true`))).rejects.toThrow(/permission denied/);
    await expect(as(db.pool, ANON, (c) => c.query(`delete from registrations`))).rejects.toThrow(/permission denied/);
  });

  it("logged-in user who is NOT an admin sees zero registrations", async () => {
    const rows = await as(db.pool, { role: "authenticated", sub: "00000000-0000-0000-0000-000000000001", aal: "aal2" }, (c) =>
      c.query(`select * from registrations`),
    );
    expect(rows.rowCount).toBe(0);
  });

  it("admin WITHOUT 2FA (aal1) sees zero registrations", async () => {
    const rows = await as(db.pool, adminClaims(adminId, "aal1"), (c) => c.query(`select * from registrations`));
    expect(rows.rowCount).toBe(0);
  });

  it("admin with 2FA (aal2) can read registrations and inquiries", async () => {
    const regs = await as(db.pool, adminClaims(adminId), (c) => c.query(`select child_name from registrations`));
    expect(regs.rows.map((r) => r.child_name)).toEqual(["Lana Test"]);
    const inq = await as(db.pool, adminClaims(adminId), (c) => c.query(`select type from inquiries`));
    expect(inq.rows[0].type).toBe("birthday");
  });

  it("admin cannot change status directly (only via RPC) and cannot delete", async () => {
    await expect(as(db.pool, adminClaims(adminId), (c) => c.query(`update registrations set status = 'active'`))).rejects.toThrow(/permission denied/);
    await expect(as(db.pool, adminClaims(adminId), (c) => c.query(`delete from registrations`))).rejects.toThrow(/permission denied/);
  });

  it("anon availability API exposes counts but no personal data", async () => {
    const res = await as(db.pool, ANON, (c) => c.query(`select * from list_slots(false)`));
    const big = res.rows.find((r) => r.id === "slot-big");
    expect(big.active_count).toBe(1);
    const columns = Object.keys(big).join(",");
    expect(columns).not.toMatch(/name|email|phone|birth/);
  });

  it("anon cannot use admin-only booking options or admin RPCs", async () => {
    await expect(
      as(db.pool, ANON, (c) =>
        c.query(`select book_registration(array['slot-1'], $1::jsonb, $2, false, '{"force": true}')`, [JSON.stringify(payload("Force Test")), sha256(newToken())]),
      ),
    ).rejects.toThrow(/forbidden|permission denied/);
    for (const sql of [
      `select admin_cancel_registration(gen_random_uuid())`,
      `select anonymize_registration(gen_random_uuid())`,
      `select purge_expired_registrations()`,
      `select * from claim_outbox(10)`,
      `select take_email_quota(100, 70)`,
      `select log_audit('registration.export')`,
    ]) {
      await expect(as(db.pool, ANON, (c) => c.query(sql))).rejects.toThrow(/permission denied|forbidden/);
    }
  });

  it("registrations_by_token returns only the token owner's rows", async () => {
    const mine = await as(db.pool, ANON, (c) => c.query(`select registrations_by_token($1) as r`, [token]));
    expect(mine.rows[0].r).toHaveLength(1);
    const other = await as(db.pool, ANON, (c) => c.query(`select registrations_by_token($1) as r`, [newToken()]));
    expect(other.rows[0].r).toEqual([]);
  });

  it("anon can read only active activities and published posts", async () => {
    await db.pool.query(`update activities set status = 'archived' where id = 'act-adults'`);
    await db.pool.query(`insert into posts(slug, title, status) values ('skica', 'Skica', 'draft'), ('objava', 'Objava', 'published')`);
    const acts = await as(db.pool, ANON, (c) => c.query(`select id from activities`));
    expect(acts.rows.map((r) => r.id)).toEqual(["act-kids"]);
    const posts = await as(db.pool, ANON, (c) => c.query(`select slug from posts`));
    expect(posts.rows.map((r) => r.slug)).toEqual(["objava"]);
  });

  it("anon cannot write catalogue tables", async () => {
    await expect(as(db.pool, ANON, (c) => c.query(`update slots set capacity = 99`))).rejects.toThrow(/permission denied/);
    await expect(as(db.pool, ANON, (c) => c.query(`insert into site_kv(key, value) values ('content', '{}')`))).rejects.toThrow(/permission denied/);
  });

  it("every change to registrations is in the audit log (field names only, no values)", async () => {
    const regId = (await db.pool.query(`select id from registrations limit 1`)).rows[0].id;
    await as(db.pool, adminClaims(adminId), (c) => c.query(`update registrations set paid = true, phone = '099 999 9999' where id = $1`, [regId]));
    const log = await as(db.pool, adminClaims(adminId), (c) => c.query(`select actor, action, details from audit_log where entity_id = $1 order by id`, [regId]));
    const last = log.rows.at(-1);
    expect(last.actor).toBe("vlasnica@example.com");
    expect(last.action).toBe("registration.update");
    expect(last.details).toContain("telefon");
    expect(last.details).not.toContain("099");
    // audit log is append-only even for the admin
    await expect(as(db.pool, adminClaims(adminId), (c) => c.query(`delete from audit_log`))).rejects.toThrow(/permission denied/);
  });

  it("service role can run the outbox", async () => {
    const res = await as(db.pool, SERVICE, (c) => c.query(`select * from claim_outbox(50)`));
    expect(res.rows.map((r) => r.kind).sort()).toEqual(["confirmation", "owner_new_inquiry", "owner_new_registration"]);
  });
});
