import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eventUsingImage } from "@/lib/events";
import { imageMime, readEventImage } from "@/lib/event-images";
import { getStaffForSession, staffCookieName } from "@/lib/staff-session";

export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{key:string}>}){const{key}=await params,event=await eventUsingImage(key);if(!event)return NextResponse.json({error:"Not found"},{status:404});if(!event.isPublic&&!(await getStaffForSession((await cookies()).get(staffCookieName)?.value)))return NextResponse.json({error:"Not found"},{status:404});const bytes=await readEventImage(key);if(!bytes)return NextResponse.json({error:"Not found"},{status:404});return new NextResponse(bytes,{headers:{"content-type":imageMime(key),"content-length":String(bytes.length),"cache-control":event.isPublic?"public, max-age=3600":"private, no-store","x-content-type-options":"nosniff"}})}
