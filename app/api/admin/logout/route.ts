import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeStaffSession, staffCookieName } from "@/lib/staff-session";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const cookieStore = await cookies();
  await revokeStaffSession(cookieStore.get(staffCookieName)?.value);
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(staffCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
