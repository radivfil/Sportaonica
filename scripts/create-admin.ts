/**
 * Creates the owner's admin account (Supabase Auth user + row in public.admins).
 * Run ONCE per project from a trusted machine (service role key never leaves it):
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run supabase:create-admin -- vlasnica@example.com
 *
 * A strong random temporary password is printed once. On first login the owner
 * must set up 2FA (TOTP) — the admin is unusable without it (is_admin() needs aal2).
 * Change the password afterwards in Supabase Studio → Authentication or via "reset password".
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2]?.trim().toLowerCase();
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
if (!email || !email.includes("@")) throw new Error("Usage: npm run supabase:create-admin -- owner@example.com");

const db = createClient(url, key, { auth: { persistSession: false } });
const password = randomBytes(18).toString("base64url");

let userId: string | undefined;
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  // already exists → just make sure it is in public.admins
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  userId = list.data?.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (!userId) throw new Error(created.error.message);
  console.log("User already exists; password unchanged.");
} else {
  userId = created.data.user.id;
  console.log(`Temporary password (shown once): ${password}`);
}
const ins = await db.from("admins").upsert({ user_id: userId, email });
if (ins.error) throw new Error(ins.error.message);
console.log(`✔ ${email} is an admin. First login: /admin/prijava → set up the authenticator app (2FA).`);
