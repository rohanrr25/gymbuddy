import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool } from "@/lib/db";

// Bodyweight over time, in pounds. One entry per day: weighing twice replaces the first.

export type Weighing = { weighedOn: string; weight: number }; // YYYY-MM-DD

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function listBodyweights(days = 365): Promise<Weighing[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select weighed_on::text, weight from bodyweights
     where user_id = $1 and weighed_on > current_date - $2::integer
     order by weighed_on desc`,
    [userId, days],
  );
  return rows.map((r) => ({ weighedOn: r.weighed_on, weight: Number(r.weight) }));
}

export async function saveBodyweight(weighedOn: string, weight: number) {
  const userId = await requireUserId();
  if (!DATE.test(weighedOn) || Number.isNaN(Date.parse(weighedOn))) throw new Error("Invalid date");
  // A day of slack: the phone's "today" can already be tomorrow in UTC.
  if (new Date(`${weighedOn}T00:00:00Z`).getTime() > Date.now() + 86_400_000) {
    throw new Error("That date is in the future");
  }
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) throw new Error("Weight must be 1–1000 lb");

  await pool.query(
    `insert into bodyweights (user_id, weighed_on, weight) values ($1, $2, $3)
     on conflict (user_id, weighed_on) do update set weight = excluded.weight`,
    [userId, weighedOn, Math.round(weight * 10) / 10],
  );
}
