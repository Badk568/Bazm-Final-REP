import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createStaffSession, findStaffByEmail, sessionTtlSeconds, staffCookieName } from "@/lib/staff-session";

export const runtime = "nodejs";
const inputSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(512) });
const dummyPasswordHash = hashPassword("Bazm invalid credential sentinel");
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const prior = attempts.get(key);
  if (prior && prior.resetAt > now && prior.count >= 8) return NextResponse.json({ error: "Unable to sign in. Try again later." }, { status: 429 });
  try {
    const input = inputSchema.parse(await request.json());
    const staff = await findStaffByEmail(input.email.toLowerCase());
    const valid = verifyPassword(input.password, staff?.password_hash || dummyPasswordHash);
    if (!staff || !staff.active || !valid) {
      attempts.set(key, { count: prior && prior.resetAt > now ? prior.count + 1 : 1, resetAt: now + 15 * 60 * 1000 });
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401, headers: { "cache-control": "no-store" } });
    }
    attempts.delete(key);
    const session = await createStaffSession(staff.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/admin" }, { headers: { "cache-control": "no-store" } });
    response.cookies.set(staffCookieName, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: sessionTtlSeconds(), priority: "high" });
    return response;
  } catch {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401, headers: { "cache-control": "no-store" } });
  }
}
