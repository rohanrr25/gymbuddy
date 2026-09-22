import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient } from "pg";

// Pooled connection for app queries (migrations use the direct URL).
// verify-full pins the strict TLS check that pg v9 would otherwise loosen (TRACKER G9).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full"),
});

// Keeps the function instance alive long enough to close idle connections cleanly.
attachDatabasePool(pool);

// Runs fn in one transaction on one connection: all of it commits, or none of it.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
