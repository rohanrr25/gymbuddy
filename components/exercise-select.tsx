"use client";

import { ChevronDown } from "lucide-react";
import type { Exercise } from "@/lib/sets";
import { cn } from "@/lib/utils";

// Bumper-plate colours per muscle group. Red is kept back for PRs (TRACKER → Design system).
export const PLATE: Record<string, string> = {
  Chest: "bg-plate-blue",
  Back: "bg-plate-green",
  Legs: "bg-plate-yellow",
  Shoulders: "bg-card ring-1 ring-foreground/30",
  Arms: "bg-foreground",
};

// Native select: on iPhone it opens the system wheel picker, grouped by muscle.
export function ExerciseSelect({
  exercises,
  value,
  onChange,
  label,
  placeholder,
  size = "lg",
}: {
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  label: string;
  placeholder?: string;
  size?: "lg" | "md";
}) {
  const groups = new Map<string, Exercise[]>();
  for (const e of exercises) groups.set(e.muscleGroup, [...(groups.get(e.muscleGroup) ?? []), e]);
  const group = exercises.find((e) => e.id === value)?.muscleGroup;

  return (
    <span className="relative block min-w-0">
      {group && (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute top-1/2 left-4 size-3 -translate-y-1/2 rounded-full", PLATE[group])}
        />
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none truncate rounded-xl border border-border bg-card pr-11 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          size === "lg" ? "h-14 text-lg font-medium" : "h-11 text-base",
          group ? "pl-11" : "pl-4 text-muted-foreground",
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {[...groups].map(([name, list]) => (
          <optgroup key={name} label={name}>
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
  );
}
