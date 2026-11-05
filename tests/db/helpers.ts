/**
 * Real-Postgres test harness. Every test file gets its own fresh database with
 * the Supabase shim + all migrations from supabase/migrations applied.
 *
 *   docker run -d --name sportaonica-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:16-alpine
 *   npm run test:db
 *
 * TEST_DATABASE_URL overrides the server (CI uses a service container).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

export const SERVER_URL = process.env.TEST_DATABASE_URL || "postgres://postgres:postgres@localhost:54329/postgres";
const root = path.resolve(__dirname, "../..");

export async function dbAvailable(): Promise<boolean> {
  const c = new pg.Client({ connectionString: SERVER_URL, connectionTimeoutMillis: 1500 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

function urlFor(db: string) {
  const u = new URL(SERVER_URL);
  u.pathname = `/${db}`;
  return u.toString();
}

export interface TestDb {
  url: string;
  pool: pg.Pool;
  drop(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const name = `t_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: SERVER_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = urlFor(name);
  const setup = new pg.Client({ connectionString: url });
  await setup.connect();
  await setup.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await setup.query(readFileSync(path.join(dir, f), "utf8"));
  }
  await setup.end();

  const pool = new pg.Pool({ connectionString: url, max: 40 });
  return {
    url,
    pool,
    async drop() {
      await pool.end();
      const c = new pg.Client({ connectionString: SERVER_URL });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}

export type Claims = Record<string, unknown>;
export const ANON: Claims = { role: "anon" };
export const SERVICE: Claims = { role: "service_role" };
export const adminClaims = (sub: string, aal: "aal1" | "aal2" = "aal2"): Claims => ({ role: "authenticated", sub, aal, email: "vlasnica@example.com" });

/** Run `fn` inside a transaction as a PostgREST-style role with JWT claims. */
export async function as<T>(pool: pg.Pool, claims: Claims, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await c.query(`set local role ${String(claims.role)}`);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(24).toString("base64url");

/** Fictional fixtures (superuser, bypasses RLS). */
export async function seedBasics(pool: pg.Pool) {
  const adminId = randomUUID();
  await pool.query(`insert into admins(user_id, email) values ($1, 'vlasnica@example.com')`, [adminId]);
  await pool.query(`insert into site_kv(key, value) values ('settings', '{"cancelDeadlineHours": 24, "retentionMonths": 24}')`);
  await pool.query(`insert into locations(id, slug, name) values ('loc-a', 'lokacija-a', 'Lokacija A')`);
  await pool.query(
    `insert into activities(id, slug, name, age_min, age_max) values ('act-kids', 'djeca', 'Djeca 3-6', 3, 6), ('act-adults', 'odrasli', 'Pilates', 18, null)`,
  );
  await pool.query(
    `insert into slots(id, activity_id, location_id, kind, day_of_week, start_time, end_time, capacity)
     values ('slot-1', 'act-kids', 'loc-a', 'weekly', 1, '17:00', '17:45', 1),
            ('slot-big', 'act-kids', 'loc-a', 'weekly', 2, '17:00', '17:45', 10),
            ('slot-adult', 'act-adults', 'loc-a', 'weekly', 3, '19:00', '20:00', 5)`,
  );
  return { adminId };
}

export function birthDateForAge(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - 2);
  return d.toISOString().slice(0, 10);
}

export const payload = (child: string, age = 4) => ({
  parentName: "Roditelj Testni",
  phone: "091 111 2222",
  email: "roditelj@example.com",
  childName: child,
  childBirthDate: birthDateForAge(age),
  gdprConsent: true,
});
