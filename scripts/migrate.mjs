// Applies db/migrations/*.sql in filename order, each once, each in a transaction.
// Run: npm run db:migrate   (uses the direct, unpooled connection, per Neon's guidance)
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED?.replace("sslmode=require", "sslmode=verify-full");
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set. Run `vercel env pull` first.");

const dir = new URL("../db/migrations/", import.meta.url);
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const pending = (await readdir(dir)).filter((f) => f.endsWith(".sql") && !applied.has(f)).sort();

  for (const name of pending) {
    await client.query("begin");
    try {
      await client.query(await readFile(new URL(name, dir), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`applied ${name}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${name} failed and was rolled back: ${err.message}`);
    }
  }
  if (pending.length === 0) console.log("up to date");
} finally {
  await client.end();
}
