import { Pool, type PoolClient, type QueryResultRow } from "pg";

type DatabaseGlobal = typeof globalThis & { bazmPool?: Pool; bazmDatabaseUrl?: string };
const databaseGlobal = globalThis as DatabaseGlobal;

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw Error("DATABASE_URL is required for Supabase PostgreSQL persistence.");
  return url;
}

export function getPool() {
  const url = databaseUrl();
  if (databaseGlobal.bazmPool && databaseGlobal.bazmDatabaseUrl === url) return databaseGlobal.bazmPool;
  const ssl = process.env.NODE_ENV === "production" || url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined;
  const pool = new Pool({ connectionString: url, ssl });
  databaseGlobal.bazmPool = pool;
  databaseGlobal.bazmDatabaseUrl = url;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = [], client?: PoolClient) {
  return (client ?? getPool()).query<T>(text, values);
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = [], client?: PoolClient) {
  const result = await query<T>(text, values, client);
  return result.rows[0];
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type DashboardSummary = {
  upcomingEvents: number;
  draftEvents: number;
  publishedEvents: number;
  ticketsSold: number;
  paymentProofsAwaitingReview: number;
  todaysCheckIns: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const count = async (sql: string) => Number((await one<{ count: string }>(sql))?.count ?? 0);
  return {
    upcomingEvents: await count("SELECT COUNT(*) AS count FROM admin_events WHERE status = 'PUBLISHED' AND event_date >= to_char((now() AT TIME ZONE 'Asia/Karachi')::date, 'YYYY-MM-DD')"),
    draftEvents: await count("SELECT COUNT(*) AS count FROM admin_events WHERE status = 'DRAFT'"),
    publishedEvents: await count("SELECT COUNT(*) AS count FROM admin_events WHERE status = 'PUBLISHED' AND published_at IS NOT NULL"),
    ticketsSold: await count("SELECT (SELECT COUNT(*) FROM admin_tickets) + (SELECT COALESCE(SUM(i.quantity),0) FROM checkout_order_items i JOIN checkout_orders o ON o.id=i.order_id WHERE o.status='CONFIRMED') AS count"),
    paymentProofsAwaitingReview: await count("SELECT COUNT(*) AS count FROM admin_payment_proofs WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')"),
    todaysCheckIns: await count("SELECT COUNT(*) AS count FROM admin_check_ins WHERE undone_at IS NULL AND (checked_in_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date"),
  };
}
