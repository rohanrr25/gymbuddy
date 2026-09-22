"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import type { Exercise } from "@/lib/sets";
import { cn } from "@/lib/utils";

// Bumper-plate colours per muscle group. Red is kept back for PRs (TRACKER → Design system).
export const PLATE: Record<string, string> = {
  Chest: "bg-plate-blue",
  Back: "bg-plate-green",
  Legs: "bg-plate-yellow",
  Shoulders: "bg-card ring-1 ring-foreground/30",
  Arms: "bg-foreground",
  Core: "bg-muted-foreground",
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Every search word must appear in the name, so "in db press" finds "Incline Dumbbell Press".
function matches(name: string, query: string) {
  const words = normalise(query).split(" ").filter(Boolean);
  const target = ` ${normalise(name)}`;
  return words.every((w) => target.includes(` ${w}`) || normalise(name).includes(w));
}

export function ExerciseSelect({
  exercises,
  value,
  onChange,
  label,
  placeholder = "Choose exercise…",
  size = "lg",
  onCreate,
}: {
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  label: string;
  placeholder?: string;
  size?: "lg" | "md";
  onCreate?: (name: string, muscleGroup: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const selected = exercises.find((e) => e.id === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={selected ? `${label}: ${selected.name}. Change` : label}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-card pr-3 pl-4 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          size === "lg" ? "h-14 text-lg font-medium" : "h-11 text-base",
        )}
      >
        {selected && <span aria-hidden className={cn("size-3 shrink-0 rounded-full", PLATE[selected.muscleGroup])} />}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <PickerSheet
          exercises={exercises}
          label={label}
          value={value}
          onCreate={onCreate}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// A <dialog> gives focus trapping, Escape, and an inert background for free.
function PickerSheet({
  exercises,
  label,
  value,
  onPick,
  onClose,
  onCreate,
}: {
  exercises: Exercise[];
  label: string;
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
  onCreate?: (name: string, muscleGroup: string) => Promise<string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const found = query ? exercises.filter((e) => matches(e.name, query)) : exercises;
  const groups = new Map<string, Exercise[]>();
  for (const e of found) groups.set(e.muscleGroup, [...(groups.get(e.muscleGroup) ?? []), e]);
  const newName = query.trim().replace(/\s+/g, " ");
  const canCreate = !!onCreate && newName.length > 0 && !exercises.some((e) => normalise(e.name) === normalise(newName));

  function create(muscleGroup: string) {
    setFailed(false);
    startTransition(async () => {
      try {
        onPick(await onCreate!(newName, muscleGroup));
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-label={label}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-md rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-foreground/50 sm:mx-auto"
    >
      {/* Focus lands here, not in the search box: opening the keyboard over the list every
          time costs more than it saves, since most picks are a scroll and a tap. */}
      <div autoFocus tabIndex={-1} className="flex max-h-[85dvh] flex-col outline-none">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <span className="relative min-w-0 flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="exercise-search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder="Search exercises…"
              onChange={(e) => {
                setQuery(e.target.value);
                setCreating(false);
              }}
              className="h-12 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </span>
          <Button variant="ghost" className="size-12 shrink-0" aria-label="Close" onClick={() => ref.current?.close()}>
            <X />
          </Button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {canCreate &&
            (creating ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <p className="text-sm text-muted-foreground">
                  Which muscle group is <span className="font-medium text-foreground">{newName}</span>?
                </p>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((group) => (
                    <Button key={group} variant="outline" className="h-11 px-3" disabled={pending} onClick={() => create(group)}>
                      <span aria-hidden className={cn("size-2.5 rounded-full", PLATE[group])} />
                      {group}
                    </Button>
                  ))}
                </div>
                {failed && (
                  <p role="alert" className="text-sm text-destructive">
                    Couldn’t add it. Check your signal and try again.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Plus aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  Add “{newName}” as a new exercise
                </span>
              </button>
            ))}

          {found.length === 0 && !canCreate && (
            <p className="p-3 text-muted-foreground">No exercise matches “{query}”.</p>
          )}

          {[...groups].map(([group, list]) => (
            <section key={group} aria-label={group}>
              <h3 className="px-3 pt-3 pb-1 text-sm text-muted-foreground">{group}</h3>
              <ul>
                {list.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      aria-current={e.id === value ? "true" : undefined}
                      onClick={() => onPick(e.id)}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                        e.id === value && "bg-secondary font-medium",
                      )}
                    >
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", PLATE[group])} />
                      <span className="min-w-0 flex-1 truncate">{e.name}</span>
                      {e.custom && <span className="shrink-0 text-xs text-muted-foreground">Yours</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
