import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaffForSession, staffCookieName, type StaffIdentity } from "./staff-session.ts";
import type { Role } from "./types.ts";

export async function getCurrentStaff(): Promise<StaffIdentity | null> {
  return getStaffForSession((await cookies()).get(staffCookieName)?.value);
}

export async function role() {
  return (await getCurrentStaff())?.role ?? null;
}

export async function requireStaff(allowed?: readonly Role[]) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");
  if (allowed && !allowed.includes(staff.role)) redirect("/admin");
  return staff;
}
