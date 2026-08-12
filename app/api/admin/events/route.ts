import { NextResponse } from "next/server";
import { authorisedStaff } from "@/lib/admin-api";
import { createManagedEvent } from "@/lib/events";
import { removeEventImage, storeEventImage } from "@/lib/event-images";
import { eventInputFromForm, validateEventReferences, validationMessage } from "@/lib/event-validation";

export const runtime="nodejs";
export async function POST(request:Request){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});let uploaded:string|undefined;try{const form=await request.formData(),image=form.get("coverImage");if(image instanceof File&&image.size)uploaded=await storeEventImage(image);const input=eventInputFromForm(form,uploaded);await validateEventReferences(input);return NextResponse.json(await createManagedEvent(input,staff.id),{status:201})}catch(error){await removeEventImage(uploaded);return NextResponse.json({error:validationMessage(error)},{status:400})}}
