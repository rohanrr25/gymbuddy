// The push: when to add weight. Dependency-free so `npm run check` can run it with plain Node.
//
// Double progression, the rule the rep ranges were for. Judged on your *working* sets: the
// sets at the heaviest weight of your last session, which ignores warm-ups and back-off sets
// without needing a flag for either.
//
//  - every working set at the top of the range, and enough of them → add weight, restart at the bottom
//  - some sets inside the range                                    → stay, add reps
//  - every working set below the range                             → the weight is too heavy
//
// ponytail: the step is a flat 5 lb. Per-exercise increments (2.5 lb for small lifts,
// 10 for a deadlift) are the obvious upgrade once it's clear the rest is right.
export const STEP_LB = 5;

export type Suggestion =
  | { kind: "add"; weight: number; reps: number; reason: string }
  | { kind: "hold"; weight: number; reps: number; reason: string }
  | { kind: "heavy"; weight: number; reps: number; reason: string }
  | null;

type SetLike = { weight: number; reps: number };

export function suggest(
  lastSession: SetLike[],
  target: { repMin: number; repMax: number; targetSets: number },
): Suggestion {
  if (lastSession.length === 0) return null;

  const weight = Math.max(...lastSession.map((s) => s.weight));
  const working = lastSession.filter((s) => s.weight === weight);
  const reps = working.map((s) => s.reps);
  const { repMin, repMax, targetSets } = target;
  const sets = `${working.length} ${working.length === 1 ? "set" : "sets"}`;

  if (working.length >= targetSets && reps.every((r) => r >= repMax)) {
    return {
      kind: "add",
      weight: weight + STEP_LB,
      reps: repMin,
      reason: `You hit ${repMax} on ${sets} at ${weight} lb last time.`,
    };
  }

  if (reps.every((r) => r < repMin)) {
    return {
      kind: "heavy",
      weight,
      reps: repMin,
      reason: `Last time ${weight} lb kept you under ${repMin} reps. Stay here until it isn't.`,
    };
  }

  return {
    kind: "hold",
    weight,
    reps: Math.min(repMax, Math.max(...reps) + 1),
    reason: `Stay at ${weight} lb until every set reaches ${repMax}.`,
  };
}
