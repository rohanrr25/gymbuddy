import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool } from "@/lib/db";

// Data access layer for PRs. Same rule as the others: every function checks who's
// asking and only touches that user's rows.

export type PR = {
  exerciseId: string;
  weight: number; // pounds
  reps: number;
  source: "logged" | "entered";
  performedAt: string | null; // logged: ISO timestamp (the phone formats it in its timezone)
  achievedOn: string | null; // entered: YYYY-MM-DD, a calendar date with no timezone
};
export type ManualPR = { id: string; exerciseId: string; weight: number; reps: number; achievedOn: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

// Your best per exercise across logged sets and entered PRs. Same rule as beats() in
// lib/progress.ts: heavier wins, then more reps; on an exact tie, the earliest counts.
export async function listPRs(): Promise<PR[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select distinct on (exercise_id) exercise_id, weight, reps, source, performed_at, achieved_on::text
     from (
       select exercise_id, weight, reps, 'logged' as source, performed_at, null::date as achieved_on
       from sets where user_id = $1
       union all
       select exercise_id, weight, reps, 'entered', null, achieved_on
       from manual_prs where user_id = $1
     ) candidates
     order by exercise_id, weight desc, reps desc, coalesce(performed_at, achieved_on::timestamptz)`,
    [userId],
  );
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    weight: Number(r.weight),
    reps: r.reps,
    source: r.source,
    performedAt: r.performed_at ? r.performed_at.toISOString() : null,
    achievedOn: r.achieved_on,
  }));
}

export async function listManualPRs(): Promise<ManualPR[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select id, exercise_id, weight, reps, achieved_on::text from manual_prs
     where user_id = $1 order by achieved_on desc, created_at desc`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    weight: Number(r.weight),
    reps: r.reps,
    achievedOn: r.achieved_on,
  }));
}

export async function addManualPR(input: { exerciseId: string; weight: number; reps: number; achievedOn: string }) {
  const userId = await requireUserId();
  const { exerciseId, weight, reps, achievedOn } = input;
  if (!UUID.test(exerciseId)) throw new Error("Invalid exercise");
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) throw new Error("Weight must be 0–2000 lb");
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error("Reps must be 1–100");
  // A day of slack: the phone's "today" can be tomorrow in UTC.
  const date = new Date(`${achievedOn}T00:00:00Z`);
  if (!DATE.test(achievedOn) || Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) {
    throw new Error("Pick a date that isn't in the future");
  }
  await pool.query(
    "insert into manual_prs (user_id, exercise_id, weight, reps, achieved_on) values ($1, $2, $3, $4, $5)",
    [userId, exerciseId, weight, reps, achievedOn],
  );
}

export async function deleteManualPR(id: string) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  await pool.query("delete from manual_prs where id = $1 and user_id = $2", [id, userId]);
}
