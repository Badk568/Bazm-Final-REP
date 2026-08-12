import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { events } from "../lib/data.ts";
import { calculateTotal, canTransition, isExpired } from "../lib/domain.ts";
import { money } from "../lib/format.ts";
import { adminSections, mayOpenSection, visibleSections } from "../lib/admin-permissions.ts";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import { ticketPayload, verifyTicket } from "../lib/security.ts";
import {
  available,
  beginReview,
  checkIn,
  createOrder,
  customerOrder,
  expireStale,
  recordRefund,
  review,
  store,
  submitProof,
  undoCheckIn,
} from "../lib/store.ts";
import { receiptMime, validateReceiptBytes } from "../lib/upload.ts";

const baselineSold = new Map(events.flatMap((event) => event.tiers.map((tier) => [tier.id, tier.sold])));
const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

beforeEach(() => {
  store.orders.clear();
  store.proofs.clear();
  store.checkIns.clear();
  store.audit.length = 0;
  store.notifications.length = 0;
  for (const event of events) for (const tier of event.tiers) tier.sold = baselineSold.get(tier.id) ?? 0;
});

function order(quantity = 1, now = new Date("2026-09-01T18:30:00+05:00")) {
  return createOrder({ eventId: "clay", tierId: "clay-seat", quantity, fullName: "A Customer", email: "A@Example.test", phone: "+92 300 1111111" }, now);
}

function proof(version = 1) {
  return { id: `proof-${version}`, storageKey: `private/payment-proofs/${version}`, mime: "image/png", size: png.length, bytes: png, uploadedAt: new Date().toISOString(), sender: "A Customer", transaction: `TX-${version}`, transferAt: new Date().toISOString(), note: "", version, metadataStripped: false };
}

test("integer minor units and quantity totals stay exact", () => {
  assert.equal(calculateTotal(150000, 2), 300000);
  assert.match(money(160000), /1,600/);
});

test("receipt validation uses bytes, dimensions and rejects executable content", () => {
  assert.equal(receiptMime(png), "image/png");
  assert.deepEqual(validateReceiptBytes(png), { mime: "image/png", width: 1, height: 1 });
  assert.throws(() => validateReceiptBytes(new TextEncoder().encode("MZ executable pretending to be png")), /Executable/);
  const huge = png.slice();
  huge.set([0, 0, 0x13, 0x89, 0, 0, 0x13, 0x89], 16);
  assert.throws(() => validateReceiptBytes(huge), /dimensions/);
});

test("signed ticket contains no personal data", () => {
  const payload = ticketPayload("random-ticket", "river");
  const verified = verifyTicket(payload);
  assert.equal(verified?.tid, "random-ticket");
  assert.equal(verified?.eid, "river");
  assert.ok(!payload.includes("email"));
});

test("staff passwords use salted scrypt hashes", () => {
  const encoded = hashPassword("A secure staff password 2026!");
  assert.match(encoded, /^scrypt\$/);
  assert.equal(verifyPassword("A secure staff password 2026!", encoded), true);
  assert.equal(verifyPassword("incorrect password", encoded), false);
  assert.throws(() => hashPassword("too short"), /14 characters/);
});

test("admin navigation permissions are enforced for every role", () => {
  assert.equal(adminSections.length, 10);
  assert.equal(visibleSections("DOOR_STAFF").map((section) => section.slug).join(","), "dashboard,check-in");
  assert.equal(mayOpenSection("EVENT_MANAGER", "events"), true);
  assert.equal(mayOpenSection("EVENT_MANAGER", "settings"), false);
  assert.equal(mayOpenSection("ADMIN", "staff"), true);
});

test("customer booking requires its unguessable access key", () => {
  const created = order();
  assert.equal(customerOrder(created.reference), undefined);
  assert.equal(customerOrder(created.reference, "wrong"), undefined);
  assert.equal(customerOrder(created.reference, created.accessKey)?.reference, created.reference);
});

test("expiry at the deadline is authoritative and releases held stock", () => {
  const created = order(2);
  assert.equal(isExpired(created.expiresAt, Date.parse(created.expiresAt) - 1), false);
  assert.equal(expireStale(Date.parse(created.expiresAt)).length, 1);
  assert.equal(created.status, "EXPIRED");
  assert.equal(available("clay", "clay-seat", Date.parse(created.expiresAt)), 6);
});

test("capacity check prevents oversell across concurrent attempts", async () => {
  const attempts = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => Promise.resolve().then(() => createOrder({ eventId: "clay", tierId: "clay-seat", quantity: 1, fullName: `Customer ${index}`, email: `${index}@example.test`, phone: `${index}` }))));
  assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 6);
  assert.equal(available("clay", "clay-seat"), 0);
});

test("review transitions require submitted proof and rejection reason", () => {
  const created = order();
  assert.throws(() => beginReview(created.reference), /submitted proof/);
  submitProof(created.reference, created.accessKey, proof());
  assert.equal(beginReview(created.reference).status, "UNDER_ORGANISER_REVIEW");
  assert.throws(() => review(created.reference, "reject", "internal"), /reason/);
  assert.equal(review(created.reference, "reject", "internal", "Receipt is cropped").status, "PAYMENT_REJECTED");
  assert.equal(canTransition("PAYMENT_REJECTED", "PAYMENT_PROOF_SUBMITTED"), true);
});

test("replacement proof supersedes bytes and approval is idempotent", () => {
  const created = order(2);
  submitProof(created.reference, created.accessKey, proof(1));
  review(created.reference, "reject", "reviewed", "Try again");
  submitProof(created.reference, created.accessKey, proof(2));
  const soldBefore = events.find((event) => event.id === "clay").tiers[0].sold;
  const approved = review(created.reference, "approve", "matches transfer");
  assert.equal(approved.tickets.length, 2);
  const tickets = approved.tickets.slice();
  review(created.reference, "approve", "retry");
  assert.deepEqual(approved.tickets, tickets);
  assert.equal(events.find((event) => event.id === "clay").tiers[0].sold, soldBefore + 2);
  assert.equal(store.proofs.has("proof-1"), false);
});

test("check-in handles wrong event, duplicates, undo and refunded tickets", () => {
  const created = order();
  submitProof(created.reference, created.accessKey, proof());
  review(created.reference, "approve", "ok");
  const code = created.tickets[0];
  assert.equal(checkIn(code, "DOOR_STAFF", "river").status, "WRONG_EVENT");
  const first = checkIn(code, "DOOR_STAFF", "clay");
  assert.equal(first.status, "VALID");
  assert.equal(checkIn(code, "DOOR_STAFF", "clay").status, "ALREADY_USED");
  undoCheckIn(first.record.ticketId, "Scanned during rehearsal", "ADMIN");
  assert.equal(checkIn(code, "DOOR_STAFF", "clay").status, "VALID");
  recordRefund(created.reference, { amount: created.total, method: "bank", reason: "Event cancellation" });
  assert.equal(checkIn(code, "DOOR_STAFF", "clay").status, "CANCELLED_OR_REFUNDED");
});
