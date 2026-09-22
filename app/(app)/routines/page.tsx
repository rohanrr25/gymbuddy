import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listRoutines, TEMPLATES, type Template } from "@/lib/routines";
import { createRoutineAction, setActiveRoutineAction } from "./actions";

export const metadata: Metadata = { title: "Routines · GymBuddy" };

export default async function RoutinesPage() {
  const routines = await listRoutines();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-4 pb-28">
      <h1 className="font-display text-3xl font-bold">Routines</h1>

      {routines.length === 0 ? (
        <p className="text-muted-foreground">
          No routines yet. Start from a split below, then add your exercises to each day.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {routines.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <Link
                href={`/routines/${r.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-medium">{r.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">{r.dayNames.join(" / ")}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
              {r.isActive ? (
                <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                  Active
                </span>
              ) : (
                <form action={setActiveRoutineAction.bind(null, r.id)}>
                  <Button type="submit" variant="outline" className="h-11 px-3">
                    Set active
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="new-routine" className="flex flex-col gap-3">
        <h2 id="new-routine" className="font-display text-2xl font-bold">
          New routine
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TEMPLATES) as Template[]).map((key) => (
            <form key={key} action={createRoutineAction.bind(null, key)}>
              <Button type="submit" variant="secondary" className="h-auto w-full flex-col gap-0.5 py-3 whitespace-normal">
                <span className="font-medium">{key === "blank" ? "Blank" : TEMPLATES[key].name}</span>
                <span className="text-xs font-normal text-muted-foreground">{TEMPLATES[key].days.join(" / ")}</span>
              </Button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
