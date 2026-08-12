import { NextResponse } from "next/server";
import { authorisedStaff } from "@/lib/admin-api";
import { getManagedEvent, updateManagedEvent } from "@/lib/events";
import { removeEventImage, storeEventImage } from "@/lib/event-images";
import { eventInputFromForm, validateEventReferences, validationMessage } from "@/lib/event-validation";

export const runtime="nodejs";
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});const{id}=await params,existing=await getManagedEvent(id);if(!existing)return NextResponse.json({error:"Event not found"},{status:404});let uploaded:string|undefined;try{const form=await request.formData(),image=form.get("coverImage");if(image instanceof File&&image.size)uploaded=await storeEventImage(image);const input=eventInputFromForm(form,uploaded??existing.coverImageKey);await validateEventReferences(input,id);const updated=await updateManagedEvent(id,input,staff.id);if(uploaded)await removeEventImage(existing.coverImageKey);return NextResponse.json(updated)}catch(error){await removeEventImage(uploaded);return NextResponse.json({error:validationMessage(error)},{status:400})}}
