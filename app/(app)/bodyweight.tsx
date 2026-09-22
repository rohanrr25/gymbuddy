"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Weighing } from "@/lib/bodyweight";
import { saveBodyweightAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// One number, one tap to save. Weighing twice in a day replaces the first.
export function Bodyweight({ bodyweights }: { bodyweights: Weighing[] }) {
  const [weight, setWeight] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const latest = bodyweights[0];
  const today = localToday();
  // Compare with the oldest entry we hold (up to 60 days back).
  const earliest = bodyweights.at(-1);
  const change = latest && earliest && earliest !== latest ? latest.weight - earliest.weight : null;
  const valid = weight !== "" && Number(weight) > 0 && Number(weight) <= 1000;

  function save() {
    setError(false);
    startTransition(async () => {
      try {
        await saveBodyweightAction(today, Number(weight));
        setWeight("");
      } catch {
        setError(true);
      }
    });
  }

  return (
    <section aria-labelledby="bodyweight" className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 id="bodyweight" className="text-sm text-muted-foreground">
          Bodyweight
        </h2>
        {latest ? (
          <p className="font-display text-2xl font-bold">
            {latest.weight}
            <span className="text-sm font-medium text-muted-foreground"> lb</span>
            {change !== null && (
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {change > 0 ? "+" : change < 0 ? "−" : "±"}
                {Math.abs(Math.round(change * 10) / 10)} lb since {new Date(`${earliest!.weighedOn}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Add it to track a bulk or a cut.</p>
        )}
      </div>

      <label className="flex shrink-0 items-center gap-2">
        <span className="sr-only">Today’s bodyweight in pounds</span>
        <input
          name="bodyweight"
          inputMode="decimal"
          autoComplete="off"
          placeholder="lb"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
          className={cn(
            "h-11 w-20 rounded-lg border border-border bg-card text-center font-display text-xl font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            "placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground",
          )}
        />
        <Button className="h-11 px-4" disabled={!valid || pending} onClick={save}>
          {pending ? "…" : "Save"}
        </Button>
      </label>
      {error && (
        <p role="alert" className="sr-only">
          Couldn’t save your bodyweight.
        </p>
      )}
    </section>
  );
}
