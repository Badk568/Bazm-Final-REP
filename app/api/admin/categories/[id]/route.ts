import { NextResponse } from "next/server";
import { z } from "zod";
import { authorisedStaff } from "@/lib/admin-api";
import { categorySchema } from "@/lib/event-validation";
import { deleteCategory, updateCategory } from "@/lib/events";

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const staff=await authorisedStaff(["ADMIN"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});try{const input=categorySchema.extend({enabled:z.boolean()}).parse(await request.json());return NextResponse.json(await updateCategory((await params).id,input,staff.id))}catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?error.message:"Unable to update category"},{status:400})}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){const staff=await authorisedStaff(["ADMIN"]);if(!staff)return NextResponse.json({error:"Not authorised"},{status:403});try{await deleteCategory((await params).id);return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to delete category"},{status:400})}}
