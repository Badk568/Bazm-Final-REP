import{NextResponse}from"next/server";
import{z}from"zod";
import{authorisedStaff}from"@/lib/admin-api";
import{createTicketTier,reorderTicketTiers}from"@/lib/ticketing";
import{tierInputSchema,toTierInput}from"@/lib/ticket-validation";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Forbidden"},{status:403});try{const{id:eventId}=await params,body=await request.json(),parsed=tierInputSchema.parse(body),tier=await createTicketTier(eventId,toTierInput(parsed,eventId),staff.id);return NextResponse.json(tier,{status:201})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:"Unable to create tier"},{status:400})}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const staff=await authorisedStaff(["ADMIN","EVENT_MANAGER"]);if(!staff)return NextResponse.json({error:"Forbidden"},{status:403});try{const{id:eventId}=await params,body=z.object({ids:z.array(z.string().uuid()).min(1)}).parse(await request.json());return NextResponse.json(await reorderTicketTiers(eventId,body.ids,staff.id))}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:"Unable to reorder tiers"},{status:400})}}
