import { cookies } from "next/headers";
import { getStaffForSession, staffCookieName } from "./staff-session.ts";
import type { Role } from "./types.ts";

export async function authorisedStaff(roles:readonly Role[]){const staff=await getStaffForSession((await cookies()).get(staffCookieName)?.value);return staff&&roles.includes(staff.role)?staff:null}
