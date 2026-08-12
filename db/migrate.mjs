import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at text NOT NULL);");
  const directory = join(process.cwd(), "db", "migrations");
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".sql")).sort()) {
    if (!name.includes("supabase")) continue;
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE name=$1", [name]);
    if (applied.rowCount) continue;
    const sql = readFileSync(join(directory, name), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations(name, applied_at) VALUES($1, $2)", [name, new Date().toISOString()]);
      await pool.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
  console.log("Supabase database ready");
} finally {
  await pool.end();
}
