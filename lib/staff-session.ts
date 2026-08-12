import { createHash, randomBytes } from "node:crypto";
import { one, query } from "./database.ts";
import type { Role } from "./types.ts";

export const staffCookieName = "bazm_admin_session";
export type StaffIdentity = { id: string; email: string; role: Role };
type StaffRow = { id: string; email: string; password_hash: string; role: Role; active: boolean };

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function sessionTtlSeconds() {
  const hours = Math.min(72, Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 8));
  return hours * 60 * 60;
}

export async function findStaffByEmail(email: string) {
  return one<StaffRow>("SELECT id,email,password_hash,role,active FROM staff_users WHERE lower(email)=lower($1) LIMIT 1", [email]);
}

export async function createStaffSession(staffUserId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlSeconds() * 1000);
  await query("DELETE FROM staff_sessions WHERE expires_at <= $1 OR revoked_at IS NOT NULL", [now.toISOString()]);
  await query("INSERT INTO staff_sessions(token_hash,staff_user_id,created_at,expires_at) VALUES($1,$2,$3,$4)", [tokenHash(token), staffUserId, now.toISOString(), expiresAt.toISOString()]);
  return { token, expiresAt };
}

export async function getStaffForSession(token?: string): Promise<StaffIdentity | null> {
  if (!token || token.length < 32) return null;
  const now = new Date().toISOString();
  const row = await one<StaffIdentity>(`SELECT u.id,u.email,u.role
    FROM staff_sessions s JOIN staff_users u ON u.id=s.staff_user_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>$2 AND u.active=true LIMIT 1`, [tokenHash(token), now]);
  return row ? { id: row.id, email: row.email, role: row.role } : null;
}

export async function revokeStaffSession(token?: string) {
  if (!token) return;
  await query("UPDATE staff_sessions SET revoked_at=$1 WHERE token_hash=$2 AND revoked_at IS NULL", [new Date().toISOString(), tokenHash(token)]);
}
