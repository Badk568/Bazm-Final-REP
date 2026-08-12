# Bazm website and Stage 3 ticket reservations

The approved public Bazm programme remains available at `/`, `/events`, event details, checkout, booking lookup and the supporting information pages. Stage 1 established protected staff access, Stage 2 added event/category management, and Stage 3 adds database-backed ticket tiers, checkout orders and temporary inventory reservations while retaining the public design.

## Requirements

- Node.js 24 or newer (the admin database uses the built-in `node:sqlite` module)
- npm or pnpm

## Local setup

```powershell
cd "C:\Users\kisha\Downloads\bazm references"
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run db:migrate
```

Create the first administrator with a real staff email. When no password is supplied, the command generates a strong one-time password and prints it once:

```powershell
npm.cmd run seed:admin -- owner@example.com
```

Store the generated password in a password manager. To supply a password instead, set `INITIAL_ADMIN_PASSWORD` to at least 14 characters before running the seed command, then remove both variables from the shell. Running the command again for the same email safely rotates that account’s password and restores its `ADMIN` role.

Start the website:

```powershell
npm.cmd run dev
```

- Public website: `http://localhost:3000`
- Staff login: `http://localhost:3000/admin/login`
- Protected dashboard: `http://localhost:3000/admin`

## Administration routes

- `/admin`: database summary dashboard
- `/admin/events`: searchable/filterable event list
- `/admin/events/new`: create a draft
- `/admin/events/[id]`: edit and manage state
- `/admin/events/[id]/preview`: secure unpublished preview
- `/admin/categories`: category management
- `/admin/orders`: searchable/filterable order list
- `/admin/orders/[reference]`: protected order detail

Ticket tiers are managed at the bottom of `/admin/events/[id]`. Other navigation entries remain clearly labelled later-stage placeholders.

## Access model

Staff roles are persisted in `staff_users`:

- `ADMIN`: complete event/category/tier management and order visibility
- `EVENT_MANAGER`: Dashboard plus event/tier management and order visibility
- `DOOR_STAFF`: Dashboard and Check-in

Every `/admin` page and mutation resolves the opaque session token against the database on the server. Hiding a link is not treated as authorisation. `DOOR_STAFF` cannot access event management, and only `ADMIN` can manage categories or postpone, cancel and archive events.

## Security notes

- Passwords are stored as salted scrypt hashes, never plaintext.
- Session cookies are random, `HttpOnly`, `SameSite=Strict`, high priority, and `Secure` in production.
- Only SHA-256 hashes of session tokens are stored in the database.
- Sessions expire after `SESSION_TTL_HOURS` (8 by default), are revocable, and logout revokes the database record.
- Login responses use generic credential errors and apply a bounded per-client attempt limit.
- `.data/` and `.env.local` are excluded from version control.

The SQLite adapter is appropriate for this local/single-host stage. A multi-instance production deployment should move these models to managed PostgreSQL, use HTTPS, protect and back up the database, add organisation-wide rate limiting and establish staff lifecycle/password-reset procedures.

## Event publishing and public data

`/events`, `/events/[slug]`, the home-page featured event and public category links now query SQLite. Draft, archived and unpublished events return 404 publicly. Publication requires a unique slug, valid category and future date evaluated in `Asia/Karachi`. Postponement and cancellation reasons are retained in `event_status_history`.

Published public event pages query active ticket tiers in their PKT sales window and expose only currently available inventory. Prices and remaining quantities are recalculated from the database. Checkout never accepts a price, total, capacity or availability decision from the browser.

## Ticket inventory and checkout

Stage 3 stores tiers in `ticket_tiers`, orders in `checkout_orders`, and immutable purchase snapshots in `checkout_order_items`. Monetary values use integer minor units. Customer order URLs contain a random access key; only its SHA-256 hash is stored.

SQLite checkout uses `BEGIN IMMEDIATE` before it expires stale reservations, recounts active reservations and confirmed items, and inserts the order/item. This serialises competing writers, so two customers cannot both reserve the final ticket. Capacity edits run under the same write lock and cannot move below reserved plus confirmed inventory. The PostgreSQL production contract in `db/migrations/002_stage3_reservation_locking.sql` uses `SELECT ... FOR UPDATE` on the tier row before recounting and inserting the hold in the order transaction.

Reservations default to 45 minutes and can be configured with `RESERVATION_TTL_MINUTES` (5–1440). Expiry is enforced lazily on availability, checkout and order reads, and proactively with:

```powershell
npm.cmd run orders:expire
```

In production, run that idempotent command every minute using the host scheduler/cron. Lazy expiry remains a safety net if the scheduled job is delayed.

Stage 3 intentionally stops before payment-proof upload/review, confirmation, QR issuance and check-in. The transfer page clearly labels payment review as Stage 4 functionality.

## Image storage

Event covers are stored under `EVENT_IMAGE_DIR` (`storage/event-images` by default), outside public source assets. The database stores only a random UUID filename. The controlled `/api/event-images/[key]` route verifies that the image belongs to an event and requires a staff session for unpublished images. Uploads are limited to JPEG, PNG or WebP, checked from their bytes and dimensions, capped by `MAX_EVENT_IMAGE_BYTES`, served with `nosniff`, and safely replaced.

For multi-instance production, move image bytes to private object storage while retaining the same random-key and publication checks.

## Dashboard data

All six dashboard values are queried from SQLite and may correctly show zero:

- Upcoming events
- Draft events
- Published events
- Tickets sold
- Payment proofs awaiting review
- Today’s check-ins (Pakistan Standard Time)

Payment approval, QR issuance and operational check-in remain intentionally unavailable until later stages.

## Quality checks

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The PostgreSQL design in `db/migrations/001_initial.sql` remains a future production contract. Executable local migrations live in `db/sqlite/`; run `npm.cmd run db:migrate` after pulling schema changes.
