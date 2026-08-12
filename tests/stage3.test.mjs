import test,{before}from"node:test";
import assert from"node:assert/strict";
import{randomUUID}from"node:crypto";
import{mkdtempSync,readFileSync}from"node:fs";
import{tmpdir}from"node:os";
import{join,resolve}from"node:path";
import{DatabaseSync}from"node:sqlite";

const directory=mkdtempSync(join(tmpdir(),"bazm-stage3-test-"));
process.env.BAZM_DB_PATH=join(directory,"stage3.sqlite");
process.env.RESERVATION_TTL_MINUTES="45";
const database=new DatabaseSync(process.env.BAZM_DB_PATH);
for(const name of["001_stage1_admin.sql","002_stage2_events.sql","003_stage2_event_history.sql","004_stage3_ticketing.sql"])database.exec(readFileSync(resolve("db/sqlite",name),"utf8"));
const actor=randomUUID(),eventId=randomUUID(),now=new Date().toISOString();
database.prepare("INSERT INTO staff_users(id,email,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,?,1,?,?)").run(actor,"stage3@example.test","test-only","ADMIN",now,now);
database.prepare(`INSERT INTO admin_events(id,title,slug,short_summary,full_description,category_id,host_artist,event_date,doors_open_time,start_time,end_time,venue,age_guidance,languages,accessibility_information,special_instructions,featured,seo_title,seo_description,status,published_at,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(eventId,"Stage Three Gathering","stage-three-gathering","A public Stage 3 event.","A complete event description for ticket inventory testing.","cat-music","Bazm","2030-09-18","19:00","19:30","21:30","Bazm, Hyderabad","16+","Urdu / English","Step-free access.","",0,"","","PUBLISHED",now,actor,actor,now,now);
database.close();
const ticketing=await import("../lib/ticketing.ts"),events=await import("../lib/events.ts"),permissions=await import("../lib/admin-permissions.ts");
let general,supporter;
const base={eventId,name:"General Admission",description:"Standard entry",price:80000,capacity:3,maxPerOrder:2,salesStart:"2020-01-01T00:00:00.000Z",salesEnd:"2040-01-01T00:00:00.000Z",active:true};

before(()=>{general=ticketing.createTicketTier(eventId,base,actor);supporter=ticketing.createTicketTier(eventId,{...base,name:"Supporter Seat",price:120000,capacity:5,maxPerOrder:4},actor)});

test("admin creates multiple ordered ticket tiers",()=>{const tiers=ticketing.listTicketTiers(eventId);assert.equal(tiers.length,2);assert.deepEqual(tiers.map(tier=>tier.name),["General Admission","Supporter Seat"]);assert.equal(tiers.reduce((sum,tier)=>sum+tier.capacity,0),8)});
test("public event exposes live tiers and prices",()=>{const event=events.toPublicEvent(events.getPublishedEventBySlug("stage-three-gathering"));assert.equal(event.ticketingState,"OPEN");assert.equal(event.tiers[0].price,80000);assert.equal(event.tiers[0].available,3)});
test("checkout recalculates totals and reserves inventory",()=>{const order=ticketing.createCheckoutOrder({eventId,tierId:general.id,quantity:2,fullName:"Customer One",email:"one@example.test",phone:"+923001111111",consent:true,price:1,total:1},new Date("2030-01-01T00:00:00.000Z"));assert.equal(order.unitPrice,80000);assert.equal(order.total,160000);assert.equal(ticketing.listTicketTiers(eventId,new Date("2030-01-01T00:01:00.000Z"))[0].reserved,2)});
test("capacity cannot drop below active reservations",()=>{assert.throws(()=>ticketing.updateTicketTier(eventId,general.id,{...base,capacity:1},actor),/below 2/)});
test("expired reservations release inventory",()=>{assert.equal(ticketing.expireReservations(new Date("2030-01-01T00:46:00.000Z")),1);assert.equal(ticketing.listTicketTiers(eventId,new Date("2030-01-01T00:46:00.000Z"))[0].remaining,3)});
test("per-order limits are enforced",()=>{assert.throws(()=>ticketing.createCheckoutOrder({eventId,tierId:general.id,quantity:3,fullName:"Limit Test",email:"limit@example.test",phone:"+923002222222",consent:true},new Date("2030-01-02T00:00:00.000Z")),/between 1 and 2/)});
test("two purchases cannot oversell the final ticket",async()=>{const final=ticketing.createTicketTier(eventId,{...base,name:"Final Seat",capacity:1,maxPerOrder:1},actor),request=index=>Promise.resolve().then(()=>ticketing.createCheckoutOrder({eventId,tierId:final.id,quantity:1,fullName:`Customer ${index}`,email:`final${index}@example.test`,phone:`+92300333333${index}`,consent:true},new Date("2030-01-03T00:00:00.000Z"))),results=await Promise.allSettled([request(1),request(2)]);assert.equal(results.filter(result=>result.status==="fulfilled").length,1);assert.equal(results.filter(result=>result.status==="rejected").length,1);assert.equal(ticketing.listTicketTiers(eventId,new Date("2030-01-03T00:01:00.000Z")).find(tier=>tier.id===final.id).remaining,0)});
test("sold-out tiers cannot be ordered",()=>{const final=ticketing.listTicketTiers(eventId,new Date("2030-01-03T00:01:00.000Z")).find(tier=>tier.name==="Final Seat");assert.equal(final.state,"SOLD_OUT");assert.throws(()=>ticketing.createCheckoutOrder({eventId,tierId:final.id,quantity:1,fullName:"Too Late",email:"late@example.test",phone:"+923004444444",consent:true},new Date("2030-01-03T00:01:00.000Z")),/not enough/)});
test("Door Staff cannot access tiers or orders navigation",()=>{assert.equal(permissions.mayOpenSection("DOOR_STAFF","events"),false);assert.equal(permissions.mayOpenSection("DOOR_STAFF","orders"),false)});
