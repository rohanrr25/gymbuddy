"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exercise, LoggedSet, NewSet } from "@/lib/sets";
import { cn } from "@/lib/utils";
import { deleteSetAction, logSetAction } from "./actions";

type SetRow = LoggedSet & { pending?: boolean };
type Change = { type: "add"; set: SetRow } | { type: "remove"; id: string };

// Bumper-plate colours per muscle group. Red is kept back for PRs.
const PLATE: Record<string, string> = {
  Chest: "bg-plate-blue",
  Back: "bg-plate-green",
  Legs: "bg-plate-yellow",
  Shoulders: "bg-card ring-1 ring-foreground/30",
  Arms: "bg-foreground",
};

const noSubscribe = () => () => {};

export function Logger({
  exercises,
  recentSets,
  lastSets,
}: {
  exercises: Exercise[];
  recentSets: LoggedSet[];
  lastSets: LoggedSet[];
}) {
  const [sets, applyChange] = useOptimistic<SetRow[], Change>(recentSets, (state, change) =>
    change.type === "add"
      ? [change.set, ...state.filter((s) => s.id !== change.set.id)]
      : state.filter((s) => s.id !== change.id),
  );
  const [, startTransition] = useTransition();
  // "Today" and clock times depend on the phone's timezone, so they render on the client only.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const latestFor = (exerciseId: string) =>
    sets.find((s) => s.exerciseId === exerciseId) ?? lastSets.find((s) => s.exerciseId === exerciseId);

  const [exerciseId, setExerciseId] = useState(() => recentSets[0]?.exerciseId ?? exercises[0]?.id ?? "");
  const [weight, setWeight] = useState(() => String(latestFor(exerciseId)?.weight ?? ""));
  const [reps, setReps] = useState(() => String(latestFor(exerciseId)?.reps ?? ""));
  const [failed, setFailed] = useState<NewSet | null>(null);
  const [deleted, setDeleted] = useState<LoggedSet | null>(null); // offered for undo
  const [deleteError, setDeleteError] = useState(false);

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

  function selectExercise(id: string) {
    setExerciseId(id);
    const last = latestFor(id);
    setWeight(last ? String(last.weight) : "");
    setReps(last ? String(last.reps) : "");
  }

  function save(payload: NewSet) {
    setFailed(null);
    setDeleted(null);
    startTransition(async () => {
      applyChange({
        type: "add",
        set: { ...payload, performedAt: payload.performedAt ?? new Date().toISOString(), pending: true },
      });
      try {
        await logSetAction(payload);
      } catch {
        setFailed(payload); // Retry resends the same id, so it can't double-log.
      }
    });
  }

  // Deletes immediately (no confirmation slows you down) and offers undo instead.
  function remove(set: LoggedSet) {
    setDeleteError(false);
    setDeleted(null);
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

  // Restores the set with its original id and time.
  const undoDelete = (set: LoggedSet) =>
    save({ id: set.id, exerciseId: set.exerciseId, weight: set.weight, reps: set.reps, performedAt: set.performedAt });

  const groups: [string, Exercise[]][] = [];
  for (const e of exercises) {
    const last = groups.at(-1);
    if (last?.[0] === e.muscleGroup) last[1].push(e);
    else groups.push([e.muscleGroup, [e]]);
  }

  const todayKey = isClient ? new Date().toDateString() : null;
  const today = todayKey ? sets.filter((s) => new Date(s.performedAt).toDateString() === todayKey) : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-4 pb-12">
      <h1 className="sr-only">Log a set</h1>
      {/* Native select: on iPhone it opens the system wheel picker, grouped by muscle. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Exercise</span>
        <span className="relative">
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 size-3 -translate-y-1/2 rounded-full",
              PLATE[byId.get(exerciseId)?.muscleGroup ?? ""],
            )}
          />
          <select
            name="exercise"
            value={exerciseId}
            onChange={(e) => selectExercise(e.target.value)}
            className="h-14 w-full appearance-none rounded-xl border border-border bg-card pr-11 pl-11 text-lg font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {groups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
        </span>
      </label>

      <section aria-label="Set" className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <NumberField name="Weight" unit="lb" value={weight} onChange={setWeight} step={5} min={0} decimal />
          <span aria-hidden className="pt-3 font-display text-5xl font-semibold text-muted-foreground">
            ×
          </span>
          <NumberField name="Reps" unit="reps" value={reps} onChange={setReps} step={1} min={1} />
        </div>

        <Button
          className="h-16 w-full text-lg font-semibold"
          disabled={!valid}
          onClick={() => save({ id: crypto.randomUUID(), exerciseId, weight: weightNum, reps: repsNum })}
        >
          Log set
        </Button>
        {!valid && (
          <p className="-mt-2 text-center text-sm text-muted-foreground">Enter a weight and 1–100 reps to log.</p>
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
      <span className="text-sm text-muted-foreground">{unit}</span>
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
