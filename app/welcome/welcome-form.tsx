"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MIN_AGE } from "@/lib/age";
import { completeSignUpAction } from "@/app/profile-actions";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function WelcomeForm({ suggestedName }: { suggestedName: string }) {
  const [displayName, setDisplayName] = useState(suggestedName);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const valid = displayName.trim().length > 0 && dateOfBirth !== "";

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await completeSignUpAction({ displayName, dateOfBirth, phone, weeklyTarget });
      } catch (e) {
        // redirect() throws on success, so only real failures land here.
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-12">
      <div>
        <h1 className="font-display text-4xl font-bold">Welcome to GymBuddy</h1>
        <p className="mt-1 text-muted-foreground">Two quick things, then you can start logging.</p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Your name
        <input
          name="name"
          autoComplete="name"
          value={displayName}
          maxLength={40}
          onChange={(e) => setDisplayName(e.target.value)}
          className={cn(field, "text-lg")}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Date of birth
        <input
          name="dob"
          type="date"
          autoComplete="bday"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className={cn(field, "text-lg")}
        />
        <span>You need to be {MIN_AGE} or older. Sharing with friends stays off until you’re 18.</span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Phone (optional)
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          maxLength={20}
          onChange={(e) => setPhone(e.target.value)}
          className={cn(field, "text-lg")}
        />
        <span>Only for finding friends later. Nothing uses it yet, and you can add it any time in settings.</span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted-foreground">Workouts a week you’re aiming for</legend>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <Button
              key={n}
              type="button"
              variant={n === weeklyTarget ? "default" : "outline"}
              aria-pressed={n === weeklyTarget}
              className="h-12 flex-1 font-display text-xl font-bold"
              onClick={() => setWeeklyTarget(n)}
            >
              {n}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Your streak counts weeks you hit this. Change it any time.</p>
      </fieldset>

      <Button className="h-14 text-lg font-semibold" disabled={!valid || pending} onClick={submit}>
        {pending ? "Setting up…" : "Start"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}
