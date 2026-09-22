"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Trophy, X } from "lucide-react";
import { ExerciseSelect, PLATE } from "@/components/exercise-select";
import { Button } from "@/components/ui/button";
import type { ManualPR, PR } from "@/lib/prs";
import type { Exercise } from "@/lib/sets";
import { cn } from "@/lib/utils";
import { addExerciseAction } from "@/app/actions";
import { addPRAction, deletePRAction } from "./actions";

const noSubscribe = () => () => {};
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
// Entered dates are calendar days with no timezone; noon keeps them on the right day everywhere.
const formatDay = (day: string) => dateFormat.format(new Date(`${day}T12:00:00`));
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function PRBoard({ prs, manual, exercises }: { prs: PR[]; manual: ManualPR[]; exercises: Exercise[] }) {
  // Logged PR dates are shown in the phone's timezone, so the list renders on the client.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  // Same order as the exercise list: by muscle group, then name.
  const ordered = exercises.flatMap((e) => prs.filter((p) => p.exerciseId === e.id));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="records" className="flex flex-col gap-2">
        <h2 id="records" className="sr-only">
          Personal records
        </h2>
        {ordered.length === 0 ? (
          <p className="text-muted-foreground">No PRs yet. Log some sets, or add a PR you already hold below.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {ordered.map((pr) => {
              const exercise = byId.get(pr.exerciseId);
              return (
                <li key={pr.exerciseId} className="flex items-center gap-3 py-3">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", PLATE[exercise?.muscleGroup ?? ""])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{exercise?.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {pr.source === "entered" ? `Entered, ${formatDay(pr.achievedOn!)}` : isClient ? dateFormat.format(new Date(pr.performedAt!)) : " "}
                    </span>
                  </span>
                  <span className="font-display text-2xl font-bold">
                    {pr.weight}
                    <span className="text-base font-semibold text-muted-foreground"> lb × {pr.reps}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AddPR exercises={exercises} isClient={isClient} />

      {manual.length > 0 && <EnteredPRs manual={manual} byId={byId} />}
    </div>
  );
}

function AddPR({ exercises, isClient }: { exercises: Exercise[]; isClient: boolean }) {
  const [exerciseId, setExerciseId] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [dateInput, setDateInput] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "added" | "error">("idle");

  const today = isClient ? localToday() : "";
  const date = dateInput ?? today;
  const valid =
    exerciseId !== "" &&
    weight !== "" &&
    Number(weight) >= 0 &&
    Number(weight) <= 2000 &&
    Number.isInteger(Number(reps)) &&
    Number(reps) >= 1 &&
    Number(reps) <= 100 &&
    date !== "" &&
    date <= today;

  function add() {
    startTransition(async () => {
      try {
        await addPRAction({ exerciseId, weight: Number(weight), reps: Number(reps), achievedOn: date });
        setStatus("added");
        setExerciseId("");
        setWeight("");
        setReps("");
        setDateInput(null);
      } catch {
        setStatus("error");
      }
    });
  }

  const field =
    "h-12 w-full rounded-lg border border-border bg-card px-3 text-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <section aria-labelledby="add-pr" className="flex flex-col gap-3">
      <div>
        <h2 id="add-pr" className="font-display text-2xl font-bold">
          Add a PR
        </h2>
        <p className="text-sm text-muted-foreground">For lifts from before you used GymBuddy. The better of this and your logged sets counts.</p>
      </div>
      <ExerciseSelect
        size="md"
        label="Exercise"
        onCreate={addExerciseAction}
        placeholder="Choose exercise…"
        exercises={exercises}
        value={exerciseId}
        onChange={(id) => {
          setExerciseId(id);
          setStatus("idle");
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Weight (lb)
          <input name="pr-weight" autoComplete="off" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))} className={cn(field, "font-display text-2xl font-semibold tabular-nums")} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Reps
          <input name="pr-reps" autoComplete="off" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))} className={cn(field, "font-display text-2xl font-semibold tabular-nums")} />
        </label>
        {/* Full width: a native date field needs room for the whole date. */}
        <label className="col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
          Date
          <input name="pr-date" type="date" max={today} value={date} onChange={(e) => setDateInput(e.target.value)} className={field} />
        </label>
      </div>
      <Button className="h-12 text-base font-semibold" disabled={!valid || pending} onClick={add}>
        {pending ? "Adding…" : "Add PR"}
      </Button>
      <p aria-live="polite" className="min-h-5 text-center text-sm">
        {status === "added" && <span className="text-muted-foreground">PR added.</span>}
        {status === "error" && <span className="text-destructive">Couldn’t add the PR. Check your signal and try again.</span>}
      </p>
    </section>
  );
}

function EnteredPRs({ manual, byId }: { manual: ManualPR[]; byId: Map<string, Exercise> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function remove(pr: ManualPR, name: string) {
    if (!confirm(`Delete your entered PR for ${name}, ${pr.weight} × ${pr.reps}?`)) return;
    setError(false);
    startTransition(async () => {
      try {
        await deletePRAction(pr.id);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <section aria-labelledby="entered" className="flex flex-col gap-2">
      <h2 id="entered" className="font-display text-xl font-bold">
        PRs you entered
      </h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t delete that PR. Check your signal and try again.
        </p>
      )}
      <ul className="divide-y divide-border">
        {manual.map((pr) => {
          const name = byId.get(pr.exerciseId)?.name ?? "exercise";
          return (
            <li key={pr.id} className="flex items-center gap-3 py-2">
              <Trophy aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="font-display text-lg font-semibold tabular-nums">
                {pr.weight} × {pr.reps}
              </span>
              <span className="w-24 text-right text-sm text-muted-foreground">{formatDay(pr.achievedOn)}</span>
              <Button variant="ghost" className="size-11" disabled={pending} aria-label={`Delete entered PR for ${name}`} onClick={() => remove(pr, name)}>
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
