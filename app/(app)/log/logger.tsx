"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Trophy, X } from "lucide-react";
import { ExerciseSelect, PLATE } from "@/components/exercise-select";
import { useRestTimer } from "@/components/rest-timer";
import { recommendedRest, restForRange } from "@/lib/rest";
import { Button } from "@/components/ui/button";
import { prefillSet } from "@/lib/prefill";
import { beats } from "@/lib/progress";
import type { PR } from "@/lib/prs";
import type { getActivePlan } from "@/lib/routines";
import { rotationDay } from "@/lib/rotation";
import type { Exercise, LoggedSet, NewSet } from "@/lib/sets";
import { cn } from "@/lib/utils";
import { addExerciseAction, completeWorkoutAction, deleteSetAction, logSetAction } from "@/app/actions";

type Plan = Awaited<ReturnType<typeof getActivePlan>>;
type SetRow = LoggedSet & { pending?: boolean };
type Change = { type: "add"; set: SetRow } | { type: "remove"; id: string };

const noSubscribe = () => () => {};
const OFF_PLAN = "off-plan";

export function Logger({
  exercises,
  recentSets,
  plan,
  prs,
}: {
  exercises: Exercise[];
  recentSets: LoggedSet[]; // last ~30 days, newest first
  plan: Plan;
  prs: PR[];
}) {
  const [sets, applyChange] = useOptimistic<SetRow[], Change>(recentSets, (state, change) =>
    change.type === "add"
      ? [change.set, ...state.filter((s) => s.id !== change.set.id)]
      : state.filter((s) => s.id !== change.id),
  );
  const [, startTransition] = useTransition();
  const [completing, startCompleting] = useTransition();
  const [completeError, setCompleteError] = useState(false);
  // "Today" and clock times depend on the phone's timezone, so they render on the client only.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);

  // null = automatic. Choosing a day, exercise, weight or reps overrides the automatic value.
  const [chosenDayId, setChosenDayId] = useState<string | null>(null);
  const [chosenExerciseId, setChosenExerciseId] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const [repsInput, setRepsInput] = useState<string | null>(null);
  const [failed, setFailed] = useState<NewSet | null>(null);
  const [deleted, setDeleted] = useState<LoggedSet | null>(null); // offered for undo
  const [deleteError, setDeleteError] = useState(false);
  // Best set per exercise logged on this screen, so a second PR in one session is caught too.
  const [sessionBests, setSessionBests] = useState(new Map<string, LoggedSet>());
  const [newPR, setNewPR] = useState<{ set: NewSet; previous: { weight: number; reps: number } } | null>(null);
  const timer = useRestTimer();

  const byId = new Map(exercises.map((e) => [e.id, e]));

  const todayKey = isClient ? new Date().toDateString() : null;
  const today = todayKey ? sets.filter((s) => new Date(s.performedAt).toDateString() === todayKey) : [];
  const doneToday = (exerciseId: string) => today.filter((s) => s.exerciseId === exerciseId).length;

  // Today's routine day. Sets logged on this screen (including just now) count toward rotation.
  const days = plan?.routine.days ?? [];
  const dayIds = new Set(days.map((d) => d.id));
  const newestDaySet = sets.find((s) => s.routineDayId && dayIds.has(s.routineDayId));
  const lastTrained = newestDaySet
    ? { dayId: newestDaySet.routineDayId!, performedAt: newestDaySet.performedAt }
    : (plan?.lastTrained ?? null);
  const lastCompletion = plan?.lastCompletion ?? null;
  const day =
    !isClient || chosenDayId === OFF_PLAN
      ? null
      : (days.find((d) => d.id === chosenDayId) ?? rotationDay(days, lastTrained, lastCompletion));

  // After "Complete workout", show what you did today on that day.
  const completedDay =
    todayKey && lastCompletion && new Date(lastCompletion.completedAt).toDateString() === todayKey
      ? days.find((d) => d.id === lastCompletion.dayId && d.id !== day?.id)
      : undefined;
  const completedSets = completedDay ? today.filter((s) => s.routineDayId === completedDay.id) : [];
  const daySetsToday = day ? today.filter((s) => s.routineDayId === day.id).length : 0;

  // The next planned exercise you haven't finished today, unless you picked one yourself.
  const nextPlanned =
    day?.exercises.find((e) => doneToday(e.exerciseId) < e.targetSets) ?? day?.exercises[0];
  const exerciseId =
    chosenExerciseId ?? nextPlanned?.exerciseId ?? recentSets[0]?.exerciseId ?? exercises[0]?.id ?? "";
  const target = day?.exercises.find((e) => e.exerciseId === exerciseId);

  // Pre-fill replays your last session of this exercise, set by set (lib/prefill.ts).
  const template = todayKey ? prefillSet(sets, exerciseId, todayKey, doneToday(exerciseId)) : undefined;
  const weight = weightInput ?? (template ? String(template.weight) : "");
  const reps = repsInput ?? (template ? String(template.reps) : "");
  const weightNum = Number(weight);
  const repsNum = Number(reps);
  const valid =
    byId.has(exerciseId) &&
    weight !== "" &&
    weightNum >= 0 &&
    weightNum <= 2000 &&
    Number.isInteger(repsNum) &&
    repsNum >= 1 &&
    repsNum <= 100;

  function selectExercise(id: string | null) {
    setChosenExerciseId(id);
    setWeightInput(null); // fall back to the pre-fill for that exercise
    setRepsInput(null);
  }

  function selectDay(id: string) {
    setChosenDayId(id);
    selectExercise(null);
  }

  function save(payload: NewSet) {
    setFailed(null);
    setDeleted(null);
    startTransition(async () => {
      applyChange({
        type: "add",
        set: {
          ...payload,
          routineDayId: payload.routineDayId ?? null,
          performedAt: payload.performedAt ?? new Date().toISOString(),
          pending: true,
        },
      });
      try {
        await logSetAction(payload);
      } catch {
        setFailed(payload); // Retry resends the same id, so it can't double-log.
      }
    });
  }

  function logSet() {
    const set = { id: crypto.randomUUID(), exerciseId, weight: weightNum, reps: repsNum, routineDayId: day?.id ?? null };
    save(set);
    setWeightInput(null); // the next set pre-fills from last session's next set
    setRepsInput(null);

    // New PR? Only against a best you had before; a first-ever session shouldn't cheer every warm-up.
    const saved = prs.find((p) => p.exerciseId === exerciseId);
    const earlier = sessionBests.get(exerciseId);
    const best = saved && earlier ? (beats(earlier, saved) ? earlier : saved) : (saved ?? earlier);
    setNewPR(saved && best && beats(set, best) ? { set, previous: { weight: best.weight, reps: best.reps } } : null);
    if (!earlier || beats(set, earlier)) {
      setSessionBests(new Map(sessionBests).set(exerciseId, { ...set, performedAt: new Date().toISOString() }));
    }

    // Hit the target number of sets? Move on to the next planned exercise, with no rest timer:
    // the timer is for rest between sets, not between exercises (user's call).
    const finishesExercise = !!target && doneToday(exerciseId) + 1 >= target.targetSets;
    if (finishesExercise) selectExercise(null);
    if (timer.enabled && !finishesExercise) {
      timer.start(target ? (target.restSeconds ?? restForRange(target.repMin, target.repMax)) : recommendedRest(repsNum));
    } else {
      timer.stop();
    }
  }

  // Deletes immediately (no confirmation slows you down) and offers undo instead.
  function remove(set: LoggedSet) {
    setDeleteError(false);
    setDeleted(null);
    if (newPR?.set.id === set.id) setNewPR(null);
    if (sessionBests.get(set.exerciseId)?.id === set.id) {
      const next = new Map(sessionBests);
      next.delete(set.exerciseId);
      setSessionBests(next);
    }
    startTransition(async () => {
      applyChange({ type: "remove", id: set.id });
      try {
        await deleteSetAction(set.id);
        // Offer undo only once the delete has landed; otherwise the restore could arrive
        // first, be skipped as a duplicate, and then lose to the delete.
        setDeleted(set);
      } catch {
        setDeleteError(true);
      }
    });
  }

  // Moves on to the next day. Logging under this day again reopens it, so no undo needed.
  function completeDay(dayId: string | null) {
    setCompleteError(false);
    startCompleting(async () => {
      try {
        await completeWorkoutAction(dayId);
        setChosenDayId(null);
        selectExercise(null);
      } catch {
        setCompleteError(true);
      }
    });
  }

  // Restores the set with its original id, time and routine day.
  const undoDelete = (set: LoggedSet) =>
    save({
      id: set.id,
      exerciseId: set.exerciseId,
      weight: set.weight,
      reps: set.reps,
      performedAt: set.performedAt,
      routineDayId: set.routineDayId,
    });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-4 pt-4 pb-28">
      {plan && isClient ? (
        <section aria-labelledby="plan" className="flex flex-col gap-3">
          {completedDay && (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm">
              <Check aria-hidden className="size-5 shrink-0 text-plate-green" />
              <span>
                {completedDay.name} complete: {completedSets.length} {completedSets.length === 1 ? "set" : "sets"},{" "}
                {completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0).toLocaleString()} lb total volume.
              </span>
            </p>
          )}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{plan.routine.name}</p>
              <h1 id="plan" className="truncate font-display text-3xl font-bold">
                {day?.name ?? "Off-plan"}
              </h1>
            </div>
            <label className="relative shrink-0">
              <span className="sr-only">Today’s routine day</span>
              <select
                name="day"
                value={day?.id ?? OFF_PLAN}
                onChange={(e) => selectDay(e.target.value)}
                className="h-11 appearance-none rounded-lg border border-border bg-card pr-9 pl-3 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value={OFF_PLAN}>Off-plan</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </label>
          </div>

          {day && day.exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {day.name} has no exercises yet.{" "}
              <Link href={`/routines/${plan.routine.id}`} className="font-medium text-foreground underline underline-offset-4">
                Add them to your routine
              </Link>
              , or log anything below.
            </p>
          )}

          {day && day.exercises.length > 0 && (
            <ul className="flex flex-col gap-1">
              {day.exercises.map((row) => {
                const exercise = byId.get(row.exerciseId);
                const done = doneToday(row.exerciseId);
                const complete = done >= row.targetSets;
                const selected = row.exerciseId === exerciseId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectExercise(row.exerciseId)}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected ? "border-primary bg-card" : "border-transparent hover:bg-muted",
                      )}
                    >
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", PLATE[exercise?.muscleGroup ?? ""])} />
                      <span className={cn("min-w-0 flex-1 truncate", complete && "text-muted-foreground")}>
                        {exercise?.name}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {row.targetSets} × {row.repMin}–{row.repMax}
                      </span>
                      <span className="flex w-10 justify-end font-display text-lg font-semibold tabular-nums">
                        {complete ? (
                          <Check aria-label={`${exercise?.name} done`} className="size-5 text-plate-green" />
                        ) : (
                          <span aria-label={`${done} of ${row.targetSets} sets done`}>
                            {done}/{row.targetSets}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <>
          <h1 className="sr-only">Log a set</h1>
          {!plan && (
            <p className="text-sm text-muted-foreground">
              <Link href="/routines" className="font-medium text-foreground underline underline-offset-4">
                Set up a routine
              </Link>{" "}
              and this screen will show today’s workout.
            </p>
          )}
        </>
      )}

      <section aria-label="Set" className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Exercise</span>
          <ExerciseSelect
            exercises={exercises}
            value={exerciseId}
            onChange={selectExercise}
            onCreate={addExerciseAction}
            label="Exercise"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <NumberField name="Weight" unit="lb" value={weight} onChange={setWeightInput} step={5} min={0} decimal />
          <span aria-hidden className="pt-3 font-display text-5xl font-semibold text-muted-foreground">
            ×
          </span>
          <NumberField
            name="Reps"
            unit={target ? `reps (aim ${target.repMin}–${target.repMax})` : "reps"}
            value={reps}
            onChange={setRepsInput}
            step={1}
            min={1}
          />
        </div>

        <Button className="h-16 w-full text-lg font-semibold" disabled={!valid} onClick={logSet}>
          Log set
        </Button>
        {!valid && (
          <p className="-mt-2 text-center text-sm text-muted-foreground">Enter a weight and 1–100 reps to log.</p>
        )}

        {timer.panel}

        {/* Plate red is reserved for PRs (TRACKER → Design system). Text stays in ink. */}
        {newPR && (
          <div role="status" className="flex items-center gap-3 rounded-lg border-2 border-plate-red bg-card p-3">
            <Trophy aria-hidden className="size-6 shrink-0 text-plate-red" />
            <p className="text-sm">
              <span className="font-display text-lg font-bold">
                New PR: {byId.get(newPR.set.exerciseId)?.name} {newPR.set.weight} × {newPR.set.reps}
              </span>
              <span className="block text-muted-foreground">
                Your previous best was {newPR.previous.weight} × {newPR.previous.reps}.
              </span>
            </p>
          </div>
        )}

        {failed && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
            <span>
              Not saved: {byId.get(failed.exerciseId)?.name} {failed.weight} × {failed.reps}. Check your signal,
              then retry.
            </span>
            <Button variant="outline" className="h-11 shrink-0 px-4" onClick={() => save(failed)}>
              Retry
            </Button>
          </div>
        )}

        {timer.toggle}
      </section>

      <section aria-labelledby="today" className="flex flex-col gap-2">
        <h2 id="today" className="font-display text-2xl font-bold">
          Today
        </h2>
        {deleteError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn’t delete that set. Check your signal and try again.
          </p>
        )}
        {deleted && (
          <div role="status" className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3 text-sm">
            <span>
              Deleted {byId.get(deleted.exerciseId)?.name} {deleted.weight} × {deleted.reps}.
            </span>
            <Button variant="outline" className="h-11 shrink-0 px-4" onClick={() => undoDelete(deleted)}>
              Undo
            </Button>
          </div>
        )}
        {isClient && today.length === 0 && (
          <p className="text-muted-foreground">No sets yet today. Pick an exercise and log your first set.</p>
        )}
        <ul className="divide-y divide-border">
          {today.map((s) => {
            const exercise = byId.get(s.exerciseId);
            return (
              <li key={s.id} className={cn("flex items-center gap-3 py-2", s.pending && "opacity-60")}>
                <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", PLATE[exercise?.muscleGroup ?? ""])} />
                <span className="min-w-0 flex-1 truncate">{exercise?.name}</span>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {s.weight} × {s.reps}
                </span>
                <time dateTime={s.performedAt} className="w-16 text-right text-sm text-muted-foreground tabular-nums">
                  {new Date(s.performedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </time>
                <Button
                  variant="ghost"
                  className="size-11"
                  disabled={s.pending}
                  aria-label={`Delete ${exercise?.name} ${s.weight} × ${s.reps}`}
                  onClick={() => remove(s)}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>

        {/* Completing is what makes a day count toward your streak, so a freestyle
            session (no routine day) can be completed too. */}
        {today.length > 0 && (day ? daySetsToday > 0 : true) && (
          <Button
            variant="outline"
            className="mt-4 h-14 text-lg font-semibold"
            disabled={completing}
            onClick={() => completeDay(day?.id ?? null)}
          >
            <Check /> {completing ? "Completing…" : day ? `Complete ${day.name}` : "Complete workout"}
          </Button>
        )}
        {completeError && (
          <p role="alert" className="text-center text-sm text-destructive">
            Couldn’t complete the workout. Check your signal and try again.
          </p>
        )}
      </section>
    </main>
  );
}

function NumberField({
  name,
  unit,
  value,
  onChange,
  step,
  min,
  decimal = false,
}: {
  name: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  decimal?: boolean;
}) {
  const nudge = (delta: number) => onChange(String(Math.max(min, (Number(value) || 0) + delta)));

  return (
    <div className="flex flex-col items-center">
      <input
        aria-label={`${name} (${unit})`}
        name={name.toLowerCase()}
        autoComplete="off"
        inputMode={decimal ? "decimal" : "numeric"}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.]/g : /\D/g, ""))}
        onFocus={(e) => e.target.select()}
        className="w-full rounded-lg bg-transparent text-center font-display text-7xl font-bold tabular-nums leading-tight outline-none placeholder:text-muted-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <span className="text-center text-sm text-muted-foreground">{unit}</span>
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <Button variant="secondary" className="h-12 text-lg" aria-label={`${name} minus ${step}`} onClick={() => nudge(-step)}>
          −{step}
        </Button>
        <Button variant="secondary" className="h-12 text-lg" aria-label={`${name} plus ${step}`} onClick={() => nudge(step)}>
          +{step}
        </Button>
      </div>
    </div>
  );
}
