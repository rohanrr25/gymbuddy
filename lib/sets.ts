import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool } from "@/lib/db";

// Data access layer for logging. Every function checks who's asking and only
// touches that user's rows. proxy.ts is just the front door (TRACKER decisions).

export type Exercise = { id: string; name: string; muscleGroup: string };
export type LoggedSet = {
  id: string;
  exerciseId: string;
  weight: number; // pounds
  reps: number;
  performedAt: string; // ISO timestamp
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function listExercises(): Promise<Exercise[]> {
  await requireUserId();
  const { rows } = await pool.query(
    "select id, name, muscle_group from exercises order by muscle_group, name",
  );
  return rows.map((r) => ({ id: r.id, name: r.name, muscleGroup: r.muscle_group }));
}

// Recent enough to cover "today" in any timezone; the client picks out its own today.
export async function listRecentSets(): Promise<LoggedSet[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select id, exercise_id, weight, reps, performed_at from sets
     where user_id = $1 and performed_at > now() - interval '36 hours'
     order by performed_at desc`,
    [userId],
  );
  return rows.map(toLoggedSet);
}

// The latest set per exercise, used to pre-fill weight and reps.
export async function listLastSetPerExercise(): Promise<LoggedSet[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select distinct on (exercise_id) id, exercise_id, weight, reps, performed_at from sets
     where user_id = $1
     order by exercise_id, performed_at desc`,
    [userId],
  );
  return rows.map(toLoggedSet);
}

export type NewSet = { id: string; exerciseId: string; weight: number; reps: number; performedAt?: string };

export async function logSet(input: NewSet) {
  const userId = await requireUserId();
  const { id, exerciseId, weight, reps, performedAt } = input;
  if (!UUID.test(id) || !UUID.test(exerciseId)) throw new Error("Invalid id");
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) throw new Error("Weight must be 0–2000 lb");
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error("Reps must be 1–100");
  // Only set when restoring a deleted set (undo) or, later, syncing an offline one.
  const at = performedAt === undefined ? null : new Date(performedAt);
  if (at && (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 5 * 60_000)) {
    throw new Error("Invalid time");
  }

  // The id comes from the client, so a retry after lost signal is a no-op, not a duplicate.
  await pool.query(
    `insert into sets (id, user_id, exercise_id, weight, reps, performed_at)
     values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()))
     on conflict (id) do nothing`,
    [id, userId, exerciseId, weight, reps, at],
  );
}

export async function deleteSet(id: string) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  await pool.query("delete from sets where id = $1 and user_id = $2", [id, userId]);
}

function toLoggedSet(r: { id: string; exercise_id: string; weight: string; reps: number; performed_at: Date }): LoggedSet {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    weight: Number(r.weight), // pg returns numeric as a string
    reps: r.reps,
    performedAt: r.performed_at.toISOString(),
  };
}
