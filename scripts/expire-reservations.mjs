import { expireReservations } from "../lib/ticketing.ts";

const count = await expireReservations();
console.log(`Expired ${count} stale ticket reservation${count === 1 ? "" : "s"}.`);
