"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  variant = "field",
  onCreate,
  leadGroup,
}: {
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  label: string;
  placeholder?: string;
  size?: "lg" | "md";
  variant?: "field" | "link"; // "link" is a quiet button for when the screen already names the exercise
  onCreate?: (name: string, muscleGroup: string) => Promise<string>;
  leadGroup?: string; // today's muscle group: sorted to the top so the usual picks are one scroll away
}) {
  const [open, setOpen] = useState(false);
  const selected = exercises.find((e) => e.id === value);

  // A plain overlay, not <dialog>: React resets a dialog's open state on re-render, which
  // left the sheet either stuck open or refusing to open at all. This is fully ours.
  const closedAt = useRef(0);

  function openSheet() {
    // A tap that closes the sheet can land on the trigger underneath and reopen it at once.
    if (Date.now() - closedAt.current < 400) return;
    setOpen(true);
  }

  function closeSheet() {
    closedAt.current = Date.now();
    setOpen(false);
  }

  // Escape closes it, and the page behind doesn't scroll while it's up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={openSheet}
          className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Search aria-hidden className="size-4" />
          {placeholder}
        </button>
      ) : (
        <button
          type="button"
          onClick={openSheet}
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
      )}

      {/* Rendered on <body>: inside the page it inherited a <label>, whose activation
          behaviour reopened the sheet the instant a row closed it. */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50"
            onClick={(e) => e.target === e.currentTarget && closeSheet()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label}
              className="h-[80dvh] w-full max-w-md rounded-t-2xl border-t border-border bg-background text-foreground"
            >
              <PickerSheet
                exercises={exercises}
                value={value}
                leadGroup={leadGroup}
                onCreate={onCreate}
                onClose={closeSheet}
                onPick={(id) => {
                  closeSheet();
                  onChange(id);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// The contents of the sheet. The <dialog> itself lives in ExerciseSelect, which owns
// opening and closing; this only has to render and report what you picked.
function PickerSheet({
  exercises,
  value,
  onPick,
  onClose,
  onCreate,
  leadGroup,
}: {
  exercises: Exercise[];
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
  onCreate?: (name: string, muscleGroup: string) => Promise<string>;
  leadGroup?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const found = query ? exercises.filter((e) => matches(e.name, query)) : exercises;
  const groups = new Map<string, Exercise[]>();
  for (const e of found) groups.set(e.muscleGroup, [...(groups.get(e.muscleGroup) ?? []), e]);
  // Today's muscle group first. Sort is stable, so every other group keeps its usual order.
  const ordered = [...groups].sort(([a], [b]) => (a === leadGroup ? -1 : b === leadGroup ? 1 : 0));
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
    // Focus lands here, not in the search box: opening the keyboard over the list every
    // time costs more than it saves, since most picks are a scroll and a tap.
    <div autoFocus tabIndex={-1} className="flex h-full flex-col outline-none">
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
        <Button variant="ghost" className="size-12 shrink-0" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
              <span className="min-w-0 flex-1 truncate">Add “{newName}” as a new exercise</span>
            </button>
          ))}

        {found.length === 0 && !canCreate && <p className="p-3 text-muted-foreground">No exercise matches “{query}”.</p>}

        {ordered.map(([group, list]) => (
          <section key={group} aria-label={group}>
            <h3 className="px-3 pt-3 pb-1 text-sm text-muted-foreground">
              {group}
              {group === leadGroup && <span className="text-foreground"> · today</span>}
            </h3>
            <ul>
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-current={e.id === value ? "true" : undefined}
                    // Pointer-up fires reliably on iOS, where a click can go missing after a
                    // scroll. detail === 0 means the "click" came from a keyboard, not a finger.
                    onPointerUp={() => onPick(e.id)}
                    onClick={(event) => event.detail === 0 && onPick(e.id)}
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
  );
}
