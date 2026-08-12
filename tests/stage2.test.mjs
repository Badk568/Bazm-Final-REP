import test, { before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const directory = mkdtempSync(join(tmpdir(), "bazm-stage2-test-"));
process.env.BAZM_DB_PATH = join(directory, "stage2.sqlite");
const database = new DatabaseSync(process.env.BAZM_DB_PATH);
for (const name of ["001_stage1_admin.sql", "002_stage2_events.sql", "003_stage2_event_history.sql"]) database.exec(readFileSync(resolve("db/sqlite", name), "utf8"));
const actor = randomUUID();
database.prepare("INSERT INTO staff_users(id,email,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,?,1,?,?)").run(actor, "stage2@example.test", "test-only", "ADMIN", new Date().toISOString(), new Date().toISOString());
database.close();
const events = await import("../lib/events.ts");
const validation = await import("../lib/event-validation.ts");
let created;

const input = {
  title: "A Future Gathering", slug: "a-future-gathering", shortSummary: "A thoughtful future event for the programme.", fullDescription: "A sufficiently complete description of the future Bazm gathering and what guests can expect.", categoryId: "cat-music", hostArtist: "Bazm programme team", eventDate: "2030-09-18", doorsOpenTime: "19:00", startTime: "19:30", endTime: "21:30", venue: "Bazm, Hyderabad", ageGuidance: "16+", languages: "Urdu / English", accessibilityInformation: "Step-free access is available.", specialInstructions: "Arrive ten minutes early.", featured: true, seoTitle: "A Future Gathering at Bazm", seoDescription: "Join a future cultural gathering at Bazm in Hyderabad.", coverImageKey: undefined,
};

before(() => { created = events.createManagedEvent(input, actor); });

test("draft events stay out of the public programme", () => {
  assert.equal(created.status, "DRAFT");
  assert.equal(events.getPublishedEvents().length, 0);
  assert.equal(events.getPublishedEventBySlug(created.slug), undefined);
});

test("publication validates future dates and exposes the event", () => {
  validation.validateForPublication(created);
  const published = events.changeEventStatus(created.id, "PUBLISHED", actor);
  assert.ok(published.publishedAt);
  assert.equal(events.getPublishedEventBySlug(created.slug)?.title, input.title);
});

test("editing updates the database-backed public event", () => {
  events.updateManagedEvent(created.id, { ...input, title: "An Updated Future Gathering" }, actor);
  assert.equal(events.getPublishedEventBySlug(created.slug)?.title, "An Updated Future Gathering");
});

test("duplicate creates a uniquely slugged draft", () => {
  const duplicate = events.duplicateManagedEvent(created.id, actor);
  assert.equal(duplicate.status, "DRAFT");
  assert.notEqual(duplicate.slug, created.slug);
  assert.match(duplicate.slug, /-copy/);
});

test("postponement and cancellation require and record reasons", () => {
  assert.throws(() => events.changeEventStatus(created.id, "POSTPONED", actor), /reason/);
  const postponed = events.changeEventStatus(created.id, "POSTPONED", actor, "Artist travel disruption");
  assert.equal(postponed.statusReason, "Artist travel disruption");
  const cancelled = events.changeEventStatus(created.id, "CANCELLED", actor, "Venue unavailable for the date");
  assert.equal(cancelled.statusReason, "Venue unavailable for the date");
});

test("assigned categories cannot be deleted", () => {
  assert.throws(() => events.deleteCategory("cat-music"), /assigned/);
  const category = events.createCategory({ name: "Film", slug: "film" }, actor);
  events.deleteCategory(category.id);
  assert.equal(events.listCategories().some((item) => item.id === category.id), false);
});
