import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { validateReceiptBytes } from "./upload.ts";

const keyPattern=/^[0-9a-f-]{36}\.(jpg|png|webp)$/;
export function eventImageDirectory(){const configured=process.env.EVENT_IMAGE_DIR||"storage/event-images";return isAbsolute(configured)?configured:resolve(process.cwd(),configured)}
export async function storeEventImage(file:File){const max=Number(process.env.MAX_EVENT_IMAGE_BYTES)||5*1024*1024;if(file.size<1||file.size>max)throw Error(`Cover image must be smaller than ${Math.round(max/1024/1024)} MB`);const bytes=new Uint8Array(await file.arrayBuffer()),result=validateReceiptBytes(bytes),extension=result.mime==="image/jpeg"?"jpg":result.mime.split("/")[1];const key=`${randomUUID()}.${extension}`;await mkdir(eventImageDirectory(),{recursive:true});await writeFile(resolve(eventImageDirectory(),key),bytes,{flag:"wx"});return key}
export async function readEventImage(key:string){if(!keyPattern.test(key))return null;try{return await readFile(resolve(eventImageDirectory(),key))}catch{return null}}
export async function removeEventImage(key?:string){if(!key||!keyPattern.test(key))return;const target=resolve(eventImageDirectory(),key);if(dirname(target)!==eventImageDirectory()||extname(target)==="")return;try{await unlink(target)}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error}}
export function imageMime(key:string){return key.endsWith(".jpg")?"image/jpeg":key.endsWith(".png")?"image/png":"image/webp"}
