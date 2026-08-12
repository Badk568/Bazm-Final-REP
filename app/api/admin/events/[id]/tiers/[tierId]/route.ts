import{NextResponse}from"next/server";
import{z}from"zod";
import{authorisedStaff}from"@/lib/admin-api";
import{deactivateTicketTier,updateTicketTier}from"@/lib/ticketing";
import{tierInputSchema,toTierInput}from"@/lib/ticket-validation";
export const runtime="nodejs";
export async function PUT(request:Request,{params}:{params:Promise<{id:string;tierId:string}>}){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Forbidden"},{status:403});try{const{id:eventId,tierId}=await params,parsed=tierInputSchema.parse(await request.json());return NextResponse.json(await updateTicketTier(eventId,tierId,toTierInput(parsed,eventId),staff.id))}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:"Unable to update tier"},{status:400})}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string;tierId:string}>}){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Forbidden"},{status:403});try{const{id:eventId,tierId}=await params;return NextResponse.json(await deactivateTicketTier(eventId,tierId,staff.id))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to deactivate tier"},{status:400})}}
