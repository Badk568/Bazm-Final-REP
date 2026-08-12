import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

const email = (process.env.INITIAL_ADMIN_EMAIL || process.argv[2])?.trim().toLowerCase();
if (!email || !email.includes("@")) throw new Error("Pass a valid staff email or set INITIAL_ADMIN_EMAIL.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const generated = !process.env.INITIAL_ADMIN_PASSWORD;
const password = process.env.INITIAL_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
if (password.length < 14) throw new Error("INITIAL_ADMIN_PASSWORD must contain at least 14 characters.");
const salt = randomBytes(16);
const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const now = new Date().toISOString();

try {
  await pool.query(`INSERT INTO staff_users(id,email,password_hash,role,active,created_at,updated_at)
    VALUES($1,$2,$3,'ADMIN',true,$4,$5)
    ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,role='ADMIN',active=true,updated_at=excluded.updated_at`, [randomUUID(), email, passwordHash, now, now]);
} catch (error) {
  throw new Error(`Unable to seed the administrator. Run the Supabase SQL setup first. ${error instanceof Error ? error.message : ""}`);
} finally {
  await pool.end();
}

console.log(`Initial ADMIN ready: ${email}`);
if (generated) console.log(`Generated one-time password: ${password}`);
else console.log("Password loaded from INITIAL_ADMIN_PASSWORD.");
