import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

// Pooled connection for app queries (migrations use the direct URL).
// verify-full pins the strict TLS check that pg v9 would otherwise loosen (TRACKER G9).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full"),
});

// Keeps the function instance alive long enough to close idle connections cleanly.
attachDatabasePool(pool);
