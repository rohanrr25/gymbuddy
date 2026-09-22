"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { formatRest, REST_CHOICES, restForRange } from "@/lib/rest";
import { ExerciseSelect } from "@/components/exercise-select";
import { Button } from "@/components/ui/button";
import type { Routine, RoutineDay, RoutineExercise } from "@/lib/routines";
import type { Exercise } from "@/lib/sets";
import { addExerciseAction } from "@/app/actions";
import { deleteRoutineAction, saveRoutineAction, setActiveRoutineAction } from "../actions";

// The whole routine is edited locally and saved in one go. Kept rows keep their IDs.
export function RoutineEditor({ routine, exercises }: { routine: Routine; exercises: Exercise[] }) {
  const [draft, setDraft] = useState(routine);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  // Only the editable parts count; "Set active" changes isActive on the server, not an edit.
  const editable = (r: Routine) => JSON.stringify({ name: r.name, days: r.days });
  const dirty = editable(draft) !== editable(routine);
  const problem = findProblem(draft);

  // Closing or reloading the tab with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (next: Routine) => {
    setDraft(next);
    setStatus("idle");
  };
  const editDay = (dayId: string, change: (day: RoutineDay) => RoutineDay) =>
    edit({ ...draft, days: draft.days.map((d) => (d.id === dayId ? change(d) : d)) });
  const editExercise = (dayId: string, rowId: string, change: Partial<RoutineExercise>) =>
    editDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === rowId ? { ...e, ...change } : e)) }));

  function save() {
    const trimmed: Routine = {
      ...draft,
      name: draft.name.trim(),
      days: draft.days.map((d) => ({ ...d, name: d.name.trim() })),
    };
    setDraft(trimmed);
    startTransition(async () => {
      try {
        await saveRoutineAction(trimmed);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-12">
      <h1 className="sr-only">Edit routine</h1>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Routine name</span>
          <input
            name="routine-name"
            autoComplete="off"
            value={draft.name}
            maxLength={60}
            onChange={(e) => edit({ ...draft, name: e.target.value })}
            className="h-12 rounded-lg border-b-2 border-border bg-transparent font-display text-3xl font-bold outline-none focus-visible:border-ring"
          />
        </label>
        {routine.isActive ? (
          <p className="text-sm text-muted-foreground">
            <span className="mr-2 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">Active</span>
            This is the routine the gym screen follows.
          </p>
        ) : (
          <Button
            variant="outline"
            className="h-11 self-start px-4"
            onClick={() => startTransition(() => setActiveRoutineAction(routine.id))}
          >
            Set as active routine
          </Button>
        )}
      </div>

      {draft.days.map((day, dayIndex) => (
        <section key={day.id} aria-label={day.name || `Day ${dayIndex + 1}`} className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="font-display text-2xl font-bold text-muted-foreground tabular-nums">
              {dayIndex + 1}
            </span>
            <input
              aria-label={`Day ${dayIndex + 1} name`}
              name={`day-${dayIndex + 1}`}
              autoComplete="off"
              value={day.name}
              maxLength={40}
              onChange={(e) => editDay(day.id, (d) => ({ ...d, name: e.target.value }))}
              className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 font-display text-2xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              variant="ghost"
              className="size-11"
              disabled={draft.days.length === 1}
              aria-label={`Remove ${day.name || `day ${dayIndex + 1}`}`}
              onClick={() => edit({ ...draft, days: draft.days.filter((d) => d.id !== day.id) })}
            >
              <Trash2 />
            </Button>
          </div>

          {day.exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">No exercises yet. Add the first one below.</p>
          )}

          <ul className="flex flex-col gap-4">
            {day.exercises.map((row) => {
              const name = exercises.find((e) => e.id === row.exerciseId)?.name ?? "exercise";
              return (
                <li key={row.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <ExerciseSelect
                        size="md"
                        label="Exercise"
                        onCreate={addExerciseAction}
                        exercises={exercises}
                        value={row.exerciseId}
                        onChange={(exerciseId) => editExercise(day.id, row.id, { exerciseId })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      className="size-11"
                      aria-label={`Remove ${name}`}
                      onClick={() =>
                        editDay(day.id, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== row.id) }))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 pl-1 text-muted-foreground">
                    <SmallNumber label={`${name} sets`} value={row.targetSets} onChange={(targetSets) => editExercise(day.id, row.id, { targetSets })} />
                    <span>sets ×</span>
                    <SmallNumber label={`${name} minimum reps`} value={row.repMin} onChange={(repMin) => editExercise(day.id, row.id, { repMin })} />
                    <span>–</span>
                    <SmallNumber label={`${name} maximum reps`} value={row.repMax} onChange={(repMax) => editExercise(day.id, row.id, { repMax })} />
                    <span>reps</span>
                  </div>
                  <label className="flex items-center gap-2 pl-1 text-muted-foreground">
                    <span>Rest</span>
                    <span className="relative">
                      <select
                        aria-label={`${name} rest between sets`}
                        value={row.restSeconds ?? ""}
                        onChange={(e) =>
                          editExercise(day.id, row.id, {
                            restSeconds: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="h-11 appearance-none rounded-lg border border-border bg-card pr-9 pl-3 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Recommended ({formatRest(restForRange(row.repMin, row.repMax))})</option>
                        {REST_CHOICES.map((s) => (
                          <option key={s} value={s}>
                            {formatRest(s)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {day.exercises.length < 20 && (
            <ExerciseSelect
              size="md"
              label={`Add exercise to ${day.name || `day ${dayIndex + 1}`}`}
              placeholder="Add exercise…"
              onCreate={addExerciseAction}
              exercises={exercises}
              value=""
              onChange={(exerciseId) =>
                editDay(day.id, (d) => ({
                  ...d,
                  exercises: [...d.exercises, { id: crypto.randomUUID(), exerciseId, targetSets: 3, repMin: 8, repMax: 12, restSeconds: null }],
                }))
              }
            />
          )}
        </section>
      ))}

      {draft.days.length < 14 && (
        <Button
          variant="outline"
          className="h-12"
          onClick={() =>
            edit({
              ...draft,
              days: [...draft.days, { id: crypto.randomUUID(), name: `Day ${draft.days.length + 1}`, exercises: [] }],
            })
          }
        >
          <Plus /> Add day
        </Button>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <Button className="h-14 text-lg font-semibold" disabled={!dirty || !!problem || pending} onClick={save}>
          {pending ? "Saving…" : "Save routine"}
        </Button>
        <p aria-live="polite" className="min-h-5 text-center text-sm">
          {problem && dirty ? (
            <span className="text-destructive">{problem}</span>
          ) : status === "saved" && !dirty ? (
            <span className="text-muted-foreground">Saved.</span>
          ) : status === "error" ? (
            <span className="text-destructive">Couldn’t save. Check your signal and try again.</span>
          ) : dirty ? (
            <span className="text-muted-foreground">Unsaved changes.</span>
          ) : null}
        </p>
      </div>

      <Button
        variant="ghost"
        className="h-11 self-center text-destructive hover:text-destructive"
        onClick={() => {
          if (confirm(`Delete “${routine.name}”? Your logged sets are kept.`)) {
            startTransition(() => deleteRoutineAction(routine.id));
          }
        }}
      >
        Delete routine
      </Button>
    </main>
  );
}

function SmallNumber({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      value={value === 0 ? "" : String(value)}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 3)))}
      onFocus={(e) => e.target.select()}
      className="h-11 w-14 rounded-lg border border-border bg-card text-center font-display text-xl font-semibold text-foreground tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

// Mirrors the server's checks so problems show before you tap Save.
function findProblem(r: Routine): string | null {
  if (!r.name.trim()) return "Give the routine a name.";
  if (r.days.some((d) => !d.name.trim())) return "Every day needs a name.";
  for (const d of r.days) {
    for (const e of d.exercises) {
      if (e.targetSets < 1 || e.targetSets > 20) return `${d.name}: sets must be 1–20.`;
      if (e.repMin < 1 || e.repMax > 100 || e.repMin > e.repMax) return `${d.name}: rep range must be 1–100, low to high.`;
    }
  }
  return null;
}
