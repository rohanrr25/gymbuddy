"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { PLATE } from "@/components/exercise-select";
import { Button } from "@/components/ui/button";
import type { Weighing } from "@/lib/bodyweight";
import type { Profile } from "@/lib/profile";
import type { getActivePlan } from "@/lib/routines";
import { rotationDay } from "@/lib/rotation";
import type { Exercise } from "@/lib/sets";
import { currentWeek, dayKey, streakWeeks, trainingDays, workoutsThisWeek } from "@/lib/streak";
import { Bodyweight } from "./bodyweight";
import { cn } from "@/lib/utils";

type Plan = Awaited<ReturnType<typeof getActivePlan>>;

const noSubscribe = () => () => {};
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

export function Home({
  profile,
  plan,
  workoutTimes,
  setTimes,
  exercises,
  bodyweights,
}: {
  profile: Profile;
  plan: Plan;
  workoutTimes: string[];
  setTimes: string[];
  exercises: Exercise[];
  bodyweights: Weighing[];
}) {
  // Weeks, days and "today" are the phone's, so this renders on the client.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!isClient) return <main className="min-h-96" aria-busy="true" />;

  // A day counts once you tap "Complete workout", not just because you logged a set.
  const days = trainingDays(workoutTimes);
  const streak = streakWeeks(days, profile.weeklyTarget);
  const thisWeek = workoutsThisWeek(days);
  const todayKey = dayKey(new Date());
  const unfinished = !days.has(todayKey) && trainingDays(setTimes).has(todayKey);
  const day = plan ? rotationDay(plan.routine.days, plan.lastTrained, plan.lastCompletion) : null;
  const byId = new Map(exercises.map((e) => [e.id, e]));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="truncate font-display text-3xl font-bold">{profile.displayName}</h1>
      </div>

      {/* Today's workout: the one thing you came here to start. */}
      <section aria-labelledby="today" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        {plan && day ? (
          <>
            <div>
              <p className="truncate text-sm text-muted-foreground">{plan.routine.name}</p>
              <h2 id="today" className="truncate font-display text-3xl font-bold">
                {day.name}
              </h2>
            </div>
            {day.exercises.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {day.exercises.map((row) => (
                  <li key={row.id} className="flex items-center gap-1.5">
                    <span aria-hidden className={cn("size-2 rounded-full", PLATE[byId.get(row.exerciseId)?.muscleGroup ?? ""])} />
                    {byId.get(row.exerciseId)?.name}
                  </li>
                ))}
              </ul>
            )}
            <Button className="h-14 text-lg font-semibold" nativeButton={false} render={<Link href="/log" />}>
              Start {day.name}
            </Button>
          </>
        ) : (
          <>
            <h2 id="today" className="font-display text-2xl font-bold">
              No routine yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Set one up and this is where your next workout waits for you.
            </p>
            <Button className="h-14 text-lg font-semibold" nativeButton={false} render={<Link href="/routines" />}>
              Create a routine
            </Button>
          </>
        )}
        <Link
          href="/log"
          className="flex h-11 items-center justify-center rounded-lg text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Log something else instead
        </Link>
      </section>

      {/* Streak + this week. A coach message (the push, later the AI) belongs right here. */}
      <Bodyweight bodyweights={bodyweights} />

      <section aria-labelledby="streak" className="flex flex-col gap-3">
        <h2 id="streak" className="sr-only">
          Your week
        </h2>
        <div className="flex items-center gap-4">
          <p className="flex items-baseline gap-2">
            <Flame aria-hidden className={cn("size-7", streak > 0 ? "text-plate-red" : "text-muted-foreground")} />
            <span className="font-display text-4xl font-bold">{streak}</span>
            <span className="text-sm text-muted-foreground">
              {streak === 1 ? "week streak" : "week streak"}
            </span>
          </p>
          <p className="ml-auto text-right text-sm text-muted-foreground">
            <span className="font-display text-2xl font-bold text-foreground tabular-nums">
              {thisWeek}/{profile.weeklyTarget}
            </span>
            <br />
            this week
          </p>
        </div>

        {unfinished && (
          <Link
            href="/log"
            className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex-1">
              You’ve logged sets today. Tap <span className="font-medium">Complete workout</span> to make the day
              count.
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        )}

        <ul className="flex justify-between gap-1">
          {currentWeek(days).map(({ date, trained, today, future }) => (
            <li key={date.toDateString()} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{weekday.format(date)}</span>
              <span
                aria-label={`${date.toDateString()}: ${future ? "still to come" : trained ? "trained" : "rest"}`}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg text-sm tabular-nums",
                  trained
                    ? "bg-plate-blue font-medium text-background"
                    : future
                      ? "text-muted-foreground/60" // not missed, just not here yet
                      : "bg-secondary text-muted-foreground",
                  today && !trained && "ring-2 ring-foreground/25",
                )}
              >
                {date.getDate()}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/progress"
          className="flex h-11 items-center justify-between rounded-lg px-1 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          See your progress
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        </Link>
      </section>
    </main>
  );
}
