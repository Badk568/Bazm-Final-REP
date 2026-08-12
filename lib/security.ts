import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getStaffForSession } from "./staff-session.ts";
import type { Role } from "./types.ts";

const secret = () => process.env.APP_SECRET || "development-only-change-this-secret";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
export const token = (length = 18) => randomBytes(length).toString("base64url");
export const reference = () => `BZM-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
export const ticketPayload = (id: string, eventId: string) => {
  const body = encode({ v: 1, tid: id, eid: eventId });
  return `${body}.${sign(body)}`;
};
export function verifyTicket(value: string) {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as { v: number; tid: string; eid: string };
  } catch {
    return null;
  }
}

// Compatibility gate for pre-Stage-1 API files: authentication now resolves
// opaque, revocable database sessions instead of trusting a role in the cookie.
export async function readStaff(sessionToken?: string): Promise<Role | null> {
  return (await getStaffForSession(sessionToken))?.role ?? null;
}
