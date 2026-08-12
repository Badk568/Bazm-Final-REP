import { NextResponse } from "next/server";
import { z } from "zod";
import { authorisedStaff } from "@/lib/admin-api";
import { categorySchema } from "@/lib/event-validation";
import { createCategory, reorderCategories } from "@/lib/events";

export async function POST(request:Request){const staff=await authorisedStaff(["ADMIN"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});try{const input=categorySchema.parse(await request.json());return NextResponse.json(await createCategory(input,staff.id),{status:201})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?error.message:"Unable to create category"},{status:400})}}
export async function PUT(request:Request){const staff=await authorisedStaff(["ADMIN"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});try{const input=z.object({ids:z.array(z.string()).min(1)}).parse(await request.json());return NextResponse.json(await reorderCategories(input.ids))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to reorder categories"},{status:400})}}
