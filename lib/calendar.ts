import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool, withTransaction } from "@/lib/db";
import type { LoggedSet } from "@/lib/sets";

// Calendar: read and fix one day at a time. A "day" is a local range the phone works
// out and sends, because only the phone knows its timezone. Ranges are capped so a
// forged one can't rewrite a year of training.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RANGE_MS = 36 * 60 * 60 * 1000;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

function range(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const span = to.getTime() - from.getTime();
  if (Number.isNaN(span) || span <= 0 || span > MAX_RANGE_MS) throw new Error("Invalid day");
  return [from, to] as const;
}

export type DaySet = LoggedSet & { exerciseName: string };

export async function listDaySets(fromISO: string, toISO: string): Promise<DaySet[]> {
  const userId = await requireUserId();
  const [from, to] = range(fromISO, toISO);
  const { rows } = await pool.query(
    `select s.id, s.exercise_id, s.weight, s.reps, s.performed_at, s.routine_day_id, s.effort, s.kind, e.name
     from sets s join exercises e on e.id = s.exercise_id
     where s.user_id = $1 and s.performed_at >= $2 and s.performed_at < $3
     order by s.performed_at`,
    [userId, from, to],
  );
  return rows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    weight: Number(r.weight),
    reps: r.reps,
    performedAt: r.performed_at.toISOString(),
    routineDayId: r.routine_day_id,
    effort: r.effort,
    kind: r.kind,
    exerciseName: r.name,
  }));
}

// "That day was actually Pull" (or freestyle). Moves the day's sets and its completion.
export async function setDayRoutineDay(fromISO: string, toISO: string, routineDayId: string | null) {
  const userId = await requireUserId();
  const [from, to] = range(fromISO, toISO);
  if (routineDayId !== null) {
    if (!UUID.test(routineDayId)) throw new Error("Invalid routine day");
    const { rowCount } = await pool.query(
      `select 1 from routine_days d join routines r on r.id = d.routine_id
       where d.id = $1 and r.user_id = $2`,
      [routineDayId, userId],
    );
    if (rowCount === 0) throw new Error("Routine day not found");
  }

  await withTransaction(async (db) => {
    await db.query(
      "update sets set routine_day_id = $4 where user_id = $1 and performed_at >= $2 and performed_at < $3",
      [userId, from, to, routineDayId],
    );
    await db.query(
      "update workouts set routine_day_id = $4 where user_id = $1 and completed_at >= $2 and completed_at < $3",
      [userId, from, to, routineDayId],
    );
  });
}

// Removes a mistaken session: that day's sets and its completion.
export async function deleteDay(fromISO: string, toISO: string) {
  const userId = await requireUserId();
  const [from, to] = range(fromISO, toISO);
  await withTransaction(async (db) => {
    await db.query("delete from sets where user_id = $1 and performed_at >= $2 and performed_at < $3", [
      userId,
      from,
      to,
    ]);
    await db.query("delete from workouts where user_id = $1 and completed_at >= $2 and completed_at < $3", [
      userId,
      from,
      to,
    ]);
  });
}
