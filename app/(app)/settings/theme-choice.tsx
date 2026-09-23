"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, readTheme, subscribeTheme, writeTheme, THEMES, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
const SYSTEM = () => "system" as Theme; // the server can't know the phone's choice

export function ThemeChoice() {
  // Read straight from localStorage; the inline script already applied it before paint.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, SYSTEM);

  // On "system", follow the phone if it switches while the app is open.
  useEffect(() => {
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => applyTheme("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Appearance</legend>
      <div className="flex gap-2">
        {THEMES.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === theme ? "default" : "outline"}
            aria-pressed={option === theme}
            className="h-12 flex-1 text-base"
            onClick={() => writeTheme(option)}
          >
            {LABELS[option]}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">System follows your phone’s own light or dark setting.</p>
    </fieldset>
  );
}
