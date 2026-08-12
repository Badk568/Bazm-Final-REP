import{NextResponse}from"next/server";
import{z}from"zod";
import{createCheckoutOrder}from"@/lib/ticketing";
export const runtime="nodejs";
const schema=z.object({eventId:z.string().uuid(),tierId:z.string().uuid(),quantity:z.number().int().min(1).max(100),fullName:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254),phone:z.string().trim().min(7).max(32),consent:z.literal(true)});
export async function POST(request:Request){try{const input=schema.parse(await request.json()),order=await createCheckoutOrder(input);return NextResponse.json({reference:order.reference,accessKey:order.accessKey,expiresAt:order.expiresAt},{status:201,headers:{"cache-control":"no-store"}})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:"Unable to create booking"},{status:400,headers:{"cache-control":"no-store"}})}}
