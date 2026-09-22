// Rest between sets. Dependency-free so `npm run check` can run it with plain Node.

// Common strength-training guidance, keyed on reps (a routine's rep range uses its midpoint):
// heavy (≤5) 3 min · muscle-building (6–12) 2 min · high reps (13+) 1 min.
export function recommendedRest(reps: number): number {
  if (reps <= 5) return 180;
  if (reps <= 12) return 120;
  return 60;
}

export const restForRange = (repMin: number, repMax: number) => recommendedRest((repMin + repMax) / 2);

// Choices offered in the routine editor, in seconds.
export const REST_CHOICES = [30, 45, 60, 90, 120, 150, 180, 240, 300];

export function formatRest(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
