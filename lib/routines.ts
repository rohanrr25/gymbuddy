import "server-only";
import { auth } from "@clerk/nextjs/server";
import { pool, withTransaction } from "@/lib/db";

// Data access layer for routines. Same rule as lib/sets.ts: every function checks
// who's asking and only touches that user's routines. Days and exercises are
// reached only through a routine the user owns.

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number | null; // null = recommended from the rep range (lib/rest.ts)
};
export type RoutineDay = { id: string; name: string; exercises: RoutineExercise[] };
export type Routine = { id: string; name: string; isActive: boolean; days: RoutineDay[] };
export type RoutineSummary = { id: string; name: string; isActive: boolean; dayNames: string[] };

export const TEMPLATES = {
  ppl: { name: "Push Pull Legs", days: ["Push", "Pull", "Legs"] },
  "upper-lower": { name: "Upper Lower", days: ["Upper", "Lower"] },
  blank: { name: "New routine", days: ["Day 1"] },
} as const;
export type Template = keyof typeof TEMPLATES;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function listRoutines(): Promise<RoutineSummary[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select r.id, r.name, r.is_active,
            coalesce(array_agg(d.name order by d.position) filter (where d.id is not null), '{}') as day_names
     from routines r left join routine_days d on d.routine_id = r.id
     where r.user_id = $1
     group by r.id
     order by r.is_active desc, r.created_at`,
    [userId],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active, dayNames: r.day_names }));
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const userId = await requireUserId();
  if (!UUID.test(id)) return null;
  const routine = (
    await pool.query("select id, name, is_active from routines where id = $1 and user_id = $2", [id, userId])
  ).rows[0];
  if (!routine) return null;

  const [days, exercises] = await Promise.all([
    pool.query("select id, name from routine_days where routine_id = $1 order by position", [id]),
    pool.query(
      `select e.id, e.day_id, e.exercise_id, e.target_sets, e.rep_min, e.rep_max, e.rest_seconds
       from routine_exercises e join routine_days d on d.id = e.day_id
       where d.routine_id = $1 order by e.position`,
      [id],
    ),
  ]);
  return {
    id: routine.id,
    name: routine.name,
    isActive: routine.is_active,
    days: days.rows.map((d) => ({
      id: d.id,
      name: d.name,
      exercises: exercises.rows
        .filter((e) => e.day_id === d.id)
        .map((e) => ({
          id: e.id,
          exerciseId: e.exercise_id,
          targetSets: e.target_sets,
          repMin: e.rep_min,
          repMax: e.rep_max,
          restSeconds: e.rest_seconds,
        })),
    })),
  };
}

// The active routine plus the last set logged under one of its days, which is
// what rotation needs. The phone decides "today" from its own clock.
export async function getActivePlan(): Promise<{
  routine: Routine;
  lastTrained: { dayId: string; performedAt: string } | null;
  lastCompletion: { dayId: string; completedAt: string } | null;
} | null> {
  const userId = await requireUserId();
  const active = (
    await pool.query("select id from routines where user_id = $1 and is_active", [userId])
  ).rows[0];
  if (!active) return null;

  const [routine, last, completion] = await Promise.all([
    getRoutine(active.id),
    pool.query(
      `select s.routine_day_id, s.performed_at from sets s
       join routine_days d on d.id = s.routine_day_id
       where s.user_id = $1 and d.routine_id = $2
       order by s.performed_at desc limit 1`,
      [userId, active.id],
    ),
    pool.query(
      `select w.routine_day_id, w.completed_at from workouts w
       join routine_days d on d.id = w.routine_day_id
       where w.user_id = $1 and d.routine_id = $2
       order by w.completed_at desc limit 1`,
      [userId, active.id],
    ),
  ]);
  if (!routine) return null;
  const set = last.rows[0];
  const done = completion.rows[0];
  return {
    routine,
    lastTrained: set ? { dayId: set.routine_day_id, performedAt: set.performed_at.toISOString() } : null,
    lastCompletion: done ? { dayId: done.routine_day_id, completedAt: done.completed_at.toISOString() } : null,
  };
}

// "Complete workout". A null day is a freestyle session, which still counts toward streaks.
export async function completeWorkout(dayId: string | null) {
  const userId = await requireUserId();
  if (dayId === null) {
    await pool.query("insert into workouts (user_id, routine_day_id) values ($1, null)", [userId]);
    return;
  }
  if (!UUID.test(dayId)) throw new Error("Invalid day");
  const { rowCount } = await pool.query(
    `insert into workouts (user_id, routine_day_id)
     select $2, d.id from routine_days d join routines r on r.id = d.routine_id
     where d.id = $1 and r.user_id = $2`,
    [dayId, userId],
  );
  if (rowCount === 0) throw new Error("Routine day not found");
}

// When workouts were completed, for streaks and the week strip. The phone groups them
// into its own calendar days.
export async function listRecentWorkoutTimes(days = 120): Promise<string[]> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    `select completed_at from workouts
     where user_id = $1 and completed_at > now() - ($2 || ' days')::interval
     order by completed_at`,
    [userId, days],
  );
  return rows.map((r) => r.completed_at.toISOString());
}

export async function createRoutine(template: Template): Promise<string> {
  const userId = await requireUserId();
  const t = TEMPLATES[template];
  if (!t) throw new Error("Unknown template");

  return withTransaction(async (db) => {
    // Your first routine becomes the active one, so the gym flow has something to show.
    const { rows } = await db.query(
      `insert into routines (user_id, name, is_active)
       values ($1, $2, not exists (select 1 from routines where user_id = $1 and is_active))
       returning id`,
      [userId, t.name],
    );
    const routineId: string = rows[0].id;
    for (const [position, name] of t.days.entries()) {
      await db.query("insert into routine_days (id, routine_id, position, name) values ($1, $2, $3, $4)", [
        crypto.randomUUID(),
        routineId,
        position,
        name,
      ]);
    }
    return routineId;
  });
}

// Saves the whole routine as edited: renames, adds/removes/reorders days and
// exercises. IDs of kept rows are preserved, so history attached to a day survives edits.
export async function saveRoutine(input: Routine) {
  const userId = await requireUserId();
  validate(input);
  const { id: routineId } = input;
  const dayIds = input.days.map((d) => d.id);
  const exerciseIds = input.days.flatMap((d) => d.exercises.map((e) => e.id));

  await withTransaction(async (db) => {
    const renamed = await db.query("update routines set name = $1 where id = $2 and user_id = $3", [
      input.name.trim(),
      routineId,
      userId,
    ]);
    if (renamed.rowCount === 0) throw new Error("Routine not found");

    await db.query("delete from routine_days where routine_id = $1 and id <> all($2::uuid[])", [routineId, dayIds]);
    for (const [position, day] of input.days.entries()) {
      // The WHERE guard means an id belonging to someone else's routine is never updated.
      await db.query(
        `insert into routine_days (id, routine_id, position, name) values ($1, $2, $3, $4)
         on conflict (id) do update set position = excluded.position, name = excluded.name
         where routine_days.routine_id = excluded.routine_id`,
        [day.id, routineId, position, day.name.trim()],
      );
    }
    // Every day in the payload must now belong to this routine.
    const owned = new Set(
      (await db.query("select id from routine_days where routine_id = $1", [routineId])).rows.map((r) => r.id),
    );
    if (dayIds.some((id) => !owned.has(id))) throw new Error("Invalid day");

    await db.query(
      `delete from routine_exercises
       where day_id in (select id from routine_days where routine_id = $1) and id <> all($2::uuid[])`,
      [routineId, exerciseIds],
    );
    for (const day of input.days) {
      for (const [position, e] of day.exercises.entries()) {
        await db.query(
          `insert into routine_exercises (id, day_id, exercise_id, position, target_sets, rep_min, rep_max, rest_seconds)
           values ($1, $2, $3, $4, $5, $6, $7, $9)
           on conflict (id) do update set day_id = excluded.day_id, exercise_id = excluded.exercise_id,
             position = excluded.position, target_sets = excluded.target_sets,
             rep_min = excluded.rep_min, rep_max = excluded.rep_max, rest_seconds = excluded.rest_seconds
           where routine_exercises.day_id in (select id from routine_days where routine_id = $8)`,
          [e.id, day.id, e.exerciseId, position, e.targetSets, e.repMin, e.repMax, routineId, e.restSeconds ?? null],
        );
      }
    }
  });
}

export async function setActiveRoutine(id: string) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  await withTransaction(async (db) => {
    await db.query("update routines set is_active = false where user_id = $1 and is_active", [userId]);
    const { rowCount } = await db.query("update routines set is_active = true where id = $1 and user_id = $2", [
      id,
      userId,
    ]);
    if (rowCount === 0) throw new Error("Routine not found");
  });
}

export async function deleteRoutine(id: string) {
  const userId = await requireUserId();
  if (!UUID.test(id)) throw new Error("Invalid id");
  // Logged sets aren't tied to routines, so your history is untouched.
  await pool.query("delete from routines where id = $1 and user_id = $2", [id, userId]);
}

function validate(r: Routine) {
  const fail = (message: string) => {
    throw new Error(message);
  };
  if (!UUID.test(r.id)) fail("Invalid routine");
  const name = r.name?.trim() ?? "";
  if (name.length < 1 || name.length > 60) fail("Routine name must be 1–60 characters");
  if (r.days.length < 1 || r.days.length > 14) fail("A routine needs 1–14 days");
  for (const d of r.days) {
    if (!UUID.test(d.id)) fail("Invalid day");
    const dayName = d.name?.trim() ?? "";
    if (dayName.length < 1 || dayName.length > 40) fail("Day names must be 1–40 characters");
    if (d.exercises.length > 20) fail("A day can have at most 20 exercises");
    for (const e of d.exercises) {
      if (!UUID.test(e.id) || !UUID.test(e.exerciseId)) fail("Invalid exercise");
      if (!Number.isInteger(e.targetSets) || e.targetSets < 1 || e.targetSets > 20) fail("Sets must be 1–20");
      const repsOk = [e.repMin, e.repMax].every((n) => Number.isInteger(n) && n >= 1 && n <= 100);
      if (!repsOk || e.repMin > e.repMax) fail("Rep range must be 1–100, low to high");
      const rest = e.restSeconds ?? null; // missing (an older page still open) = recommended
      if (rest !== null && (!Number.isInteger(rest) || rest < 15 || rest > 600)) {
        fail("Rest must be 15 s to 10 min");
      }
    }
  }
}
