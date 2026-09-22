"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DaySet } from "@/lib/calendar";
import type { RoutineDay } from "@/lib/routines";
import { dayKey } from "@/lib/streak";
import { cn } from "@/lib/utils";
import { daySetsAction, deleteDayAction, setDayRoutineDayAction } from "./actions";

const noSubscribe = () => () => {};
const FREESTYLE = "freestyle";
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const fullDate = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

export function WorkoutCalendar({
  workouts,
  setTimes,
  days,
}: {
  workouts: { completedAt: string; routineDayId: string | null }[];
  setTimes: string[];
  days: RoutineDay[];
}) {
  // Calendar days are the phone's, so the grid renders on the client.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [monthsBack, setMonthsBack] = useState(0);
  const [selected, setSelected] = useState<Date | null>(null);
  const [daySets, setDaySets] = useState<DaySet[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isClient) return <div className="min-h-96" aria-busy="true" />;

  const completed = new Map<string, string | null>();
  for (const w of workouts) completed.set(dayKey(new Date(w.completedAt)), w.routineDayId);
  const logged = new Set(setTimes.map((t) => dayKey(new Date(t))));

  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells: (Date | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null); // pad to Monday
  for (let d = 1; d <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }

  const dayName = (id: string | null) => days.find((d) => d.id === id)?.name ?? "Freestyle";
  const bounds = (date: Date) => {
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    return [from.toISOString(), to.toISOString()] as const;
  };

  function select(date: Date) {
    setSelected(date);
    setDaySets(null);
    setError(null);
    startTransition(async () => {
      try {
        setDaySets(await daySetsAction(...bounds(date)));
      } catch {
        setError("Couldn’t load that day. Check your signal.");
      }
    });
  }

  function change(routineDayId: string | null) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await setDayRoutineDayAction(...bounds(selected), routineDayId);
        setDaySets(await daySetsAction(...bounds(selected)));
      } catch {
        setError("Couldn’t change that day. Check your signal.");
      }
    });
  }

  function removeDay() {
    if (!selected || !daySets) return;
    const label = `${daySets.length} ${daySets.length === 1 ? "set" : "sets"} on ${fullDate.format(selected)}`;
    if (!confirm(`Delete ${label}? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteDayAction(...bounds(selected));
        setDaySets([]);
      } catch {
        setError("Couldn’t delete that day. Check your signal.");
      }
    });
  }

  const selectedKey = selected ? dayKey(selected) : null;
  const selectedRoutineDayId = selectedKey && completed.has(selectedKey) ? completed.get(selectedKey)! : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="size-11" aria-label="Previous month" onClick={() => setMonthsBack(monthsBack + 1)}>
          <ChevronLeft />
        </Button>
        <h2 className="font-display text-xl font-bold">{monthFormat.format(month)}</h2>
        <Button
          variant="ghost"
          className="size-11"
          aria-label="Next month"
          disabled={monthsBack === 0}
          onClick={() => setMonthsBack(monthsBack - 1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthFormat.format(month)}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(2026, 8, 21 + i); // a Monday, for the weekday letters
          return (
            <span key={i} aria-hidden className="pb-1 text-center text-xs text-muted-foreground">
              {weekdayFormat.format(d)}
            </span>
          );
        })}
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const key = dayKey(date);
          const done = completed.has(key);
          const hasSets = logged.has(key);
          const isToday = key === dayKey(today);
          const isSelected = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              disabled={date > today}
              onClick={() => select(date)}
              aria-label={`${fullDate.format(date)}${done ? `, ${dayName(completed.get(key)!)} completed` : hasSets ? ", sets logged, not completed" : ""}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-30",
                done && "bg-plate-blue font-medium text-background",
                !done && hasSets && "border-2 border-plate-blue",
                !done && !hasSets && "bg-secondary text-muted-foreground",
                isToday && !done && "ring-1 ring-foreground",
                isSelected && "ring-2 ring-foreground",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded bg-plate-blue" /> completed
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded border-2 border-plate-blue" /> logged, not completed
        </span>
      </p>

      {selected && (
        <section aria-labelledby="day" className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 id="day" className="font-display text-xl font-bold">
            {fullDate.format(selected)}
          </h2>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {daySets === null ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : daySets.length === 0 ? (
            <p className="text-muted-foreground">Nothing logged that day.</p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {[...new Map(daySets.map((s) => [s.exerciseId, s.exerciseName])).entries()].map(([id, name]) => (
                  <li key={id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {daySets.filter((s) => s.exerciseId === id).map((s) => `${s.weight} × ${s.reps}`).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>

              {days.length > 0 && (
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  This workout was
                  <select
                    value={selectedRoutineDayId ?? FREESTYLE}
                    disabled={pending}
                    onChange={(e) => change(e.target.value === FREESTYLE ? null : e.target.value)}
                    className="h-12 rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                    <option value={FREESTYLE}>Freestyle</option>
                  </select>
                  <span>Changing this also fixes which day comes next in your rotation.</span>
                </label>
              )}

              <Button
                variant="ghost"
                className="h-11 self-start text-destructive hover:text-destructive"
                disabled={pending}
                onClick={removeDay}
              >
                <Trash2 /> Delete this session
              </Button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
