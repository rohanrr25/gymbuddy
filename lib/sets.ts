import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool } from "@/lib/db";
import { isMuscleGroup } from "@/lib/muscle-groups";

// Data access layer for logging. Every function checks who's asking and only
// touches that user's rows. proxy.ts is just the front door (TRACKER decisions).

export type Exercise = { id: string; name: string; muscleGroup: string; custom?: boolean };
export const EFFORTS = ["easy", "on_target", "hard"] as const;
export type Effort = (typeof EFFORTS)[number];
export type LoggedSet = {
  id: string;
  exerciseId: string;
  weight: number; // pounds
  reps: number;
  performedAt: string; // ISO timestamp
  routineDayId: string | null; // the routine day it was logged under, if any
  effort: Effort | null; // how it felt, if you said
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, exercise_id, weight, reps, performed_at, routine_day_id, effort";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

// Built-in exercises (user_id null) plus your own.
export async function listExercises(): Promise<Exercise[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select id, name, muscle_group, user_id is not null as custom from exercises
     where user_id is null or user_id = $1
     order by muscle_group, name`,
    [userId],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, muscleGroup: r.muscle_group, custom: r.custom }));
}

// Adds an exercise private to you, or returns the existing one with that name.
export async function addExercise(name: string, muscleGroup: string): Promise<string> {
  const userId = await requireUserId();
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 60) throw new Error("Name must be 1–60 characters");
  if (!isMuscleGroup(muscleGroup)) throw new Error("Unknown muscle group");

  const inserted = await pool.query(
    `insert into exercises (name, muscle_group, user_id) values ($1, $2, $3)
     on conflict do nothing returning id`,
    [trimmed, muscleGroup, userId],
  );
  if (inserted.rows[0]) return inserted.rows[0].id;

  // Same name as a built-in or one of yours: use that one instead of a duplicate.
  const existing = await pool.query(
    `select id from exercises where lower(name) = lower($1) and (user_id is null or user_id = $2)
     order by user_id nulls last limit 1`,
    [trimmed, userId],
  );
  if (!existing.rows[0]) throw new Error("Couldn’t add that exercise");
  return existing.rows[0].id;
}

// Recent enough to cover "today" in any timezone; the client picks out its own today.
export async function listRecentSets(): Promise<LoggedSet[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select ${COLUMNS} from sets
     where user_id = $1 and performed_at > now() - interval '36 hours'
     order by performed_at desc`,
    [userId],
  );
  return rows.map(toLoggedSet);
}

// Enough history for the logger to replay your last session of each exercise, set by set.
// The phone groups these into its own calendar days. Exercises you haven't trained in this
// window simply start blank.
export async function listSetsSince(days = 30): Promise<LoggedSet[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select ${COLUMNS} from sets
     where user_id = $1 and performed_at > now() - ($2 || ' days')::interval
     order by performed_at desc`,
    [userId, days],
  );
  return rows.map(toLoggedSet);
}

// Exercises you've logged, most recently trained first (for the progress picker).
export async function listLoggedExerciseIds(): Promise<string[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select exercise_id from sets where user_id = $1
     group by exercise_id order by max(performed_at) desc`,
    [userId],
  );
  return rows.map((r) => r.exercise_id);
}

// Every set of one exercise, oldest first. The phone groups them into sessions by its own
// calendar day. ponytail: capped at 5,000 sets; paginate or pre-aggregate if anyone gets near it.
export async function listSetsForExercise(exerciseId: string): Promise<LoggedSet[]> {
  const userId = await requireUserId();
  if (!UUID.test(exerciseId)) return [];
  const { rows } = await pool.query(
    `select ${COLUMNS} from sets where user_id = $1 and exercise_id = $2
     order by performed_at limit 5000`,
    [userId, exerciseId],
  );
  return rows.map(toLoggedSet);
}

// Timestamps of recent sets, for the streak and the week strip. The phone groups them
// into its own calendar days.
export async function listRecentSetTimes(days = 120): Promise<string[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select performed_at from sets
     where user_id = $1 and performed_at > now() - ($2 || ' days')::interval
     order by performed_at`,
    [userId, days],
  );
  return rows.map((r) => r.performed_at.toISOString());
}

export type NewSet = {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  performedAt?: string;
  routineDayId?: string | null;
};

export async function logSet(input: NewSet) {
  const userId = await requireUserId();
  const { id, exerciseId, weight, reps, performedAt, routineDayId = null } = input;
  if (!UUID.test(id) || !UUID.test(exerciseId)) throw new Error("Invalid id");
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) throw new Error("Weight must be 0–2000 lb");
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error("Reps must be 1–100");
  // Only set when restoring a deleted set (undo) or, later, syncing an offline one.
  const at = performedAt === undefined ? null : new Date(performedAt);
  if (at && (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 5 * 60_000)) {
    throw new Error("Invalid time");
  }
  if (routineDayId !== null) {
    if (!UUID.test(routineDayId)) throw new Error("Invalid routine day");
    const { rowCount } = await pool.query(
      `select 1 from routine_days d join routines r on r.id = d.routine_id
       where d.id = $1 and r.user_id = $2`,
      [routineDayId, userId],
    );
    if (rowCount === 0) throw new Error("Routine day not found");
  }

  // The id comes from the client, so a retry after lost signal is a no-op, not a duplicate.
  await pool.query(
    `insert into sets (id, user_id, exercise_id, weight, reps, performed_at, routine_day_id)
     values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()), $7)
     on conflict (id) do nothing`,
    [id, userId, exerciseId, weight, reps, at, routineDayId],
  );
}

// Fix a typo in a logged set.
export async function updateSet(id: string, weight: number, reps: number) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  if (!Number.isFinite(weight) || weight < 0 || weight > 2000) throw new Error("Weight must be 0–2000 lb");
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) throw new Error("Reps must be 1–100");
  await pool.query("update sets set weight = $3, reps = $4 where id = $1 and user_id = $2", [
    id,
    userId,
    weight,
    reps,
  ]);
}

// How a set felt. Optional, and changeable.
export async function setEffort(id: string, effort: Effort | null) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  if (effort !== null && !EFFORTS.includes(effort)) throw new Error("Unknown effort");
  await pool.query("update sets set effort = $3 where id = $1 and user_id = $2", [id, userId, effort]);
}

export async function deleteSet(id: string) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  await pool.query("delete from sets where id = $1 and user_id = $2", [id, userId]);
}

function toLoggedSet(r: {
  id: string;
  exercise_id: string;
  weight: string;
  reps: number;
  performed_at: Date;
  routine_day_id: string | null;
  effort: Effort | null;
}): LoggedSet {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    weight: Number(r.weight), // pg returns numeric as a string
    reps: r.reps,
    performedAt: r.performed_at.toISOString(),
    routineDayId: r.routine_day_id,
    effort: r.effort,
  };
}
