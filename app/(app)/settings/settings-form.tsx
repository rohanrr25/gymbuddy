"use client";

import { useState, useTransition } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ADULT_AGE } from "@/lib/age";
import type { Profile } from "@/lib/profile";
import { saveProfileAction } from "@/app/profile-actions";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [weeklyTarget, setWeeklyTarget] = useState(profile.weeklyTarget);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "saved" | "error"; message?: string } | null>(null);

  const dirty =
    displayName !== profile.displayName ||
    dateOfBirth !== profile.dateOfBirth ||
    phone !== (profile.phone ?? "") ||
    weeklyTarget !== profile.weeklyTarget;

  function save() {
    setStatus(null);
    startTransition(async () => {
      try {
        await saveProfileAction({ displayName, dateOfBirth, phone, weeklyTarget });
        setStatus({ kind: "saved" });
      } catch (e) {
        setStatus({ kind: "error", message: e instanceof Error ? e.message : "Couldn’t save. Try again." });
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <h1 className="font-display text-3xl font-bold">Settings</h1>

      <section aria-labelledby="you" className="flex flex-col gap-4">
        <h2 id="you" className="font-display text-xl font-bold">
          You
        </h2>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Name
          <input name="name" autoComplete="name" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} className={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Date of birth
          <input name="dob" type="date" autoComplete="bday" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          Phone (optional)
          <input name="phone" type="tel" autoComplete="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} className={field} />
          <span>Only for finding friends later. Nothing uses it yet.</span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-muted-foreground">Workouts a week</legend>
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
          <p className="text-sm text-muted-foreground">Your streak counts weeks you hit this.</p>
        </fieldset>

        <Button className="h-12 font-semibold" disabled={!dirty || pending} onClick={save}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p aria-live="polite" className={cn("min-h-5 text-center text-sm", status?.kind === "error" ? "text-destructive" : "text-muted-foreground")}>
          {status?.kind === "saved" && "Saved."}
          {status?.kind === "error" && status.message}
        </p>
      </section>

      <section aria-labelledby="sharing" className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 id="sharing" className="font-display text-xl font-bold">
          Sharing
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile.adult
            ? "Nothing is shared with anyone yet. Friends and sharing are still being built."
            : `Sharing with friends unlocks at ${ADULT_AGE}. Everything you log stays private to you.`}
        </p>
      </section>

      <section aria-labelledby="account" className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 id="account" className="font-display text-xl font-bold">
          Account
        </h2>
        <SignOutButton>
          <Button variant="outline" className="h-12">
            Sign out
          </Button>
        </SignOutButton>
      </section>
    </main>
  );
}
