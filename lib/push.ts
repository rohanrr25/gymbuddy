// The push: when to add weight. Dependency-free so `npm run check` can run it with plain Node.
//
// Double progression, the rule the rep ranges were for. Judged on your *working* sets: the
// sets at the heaviest weight of your last session, which ignores warm-ups and back-off sets
// without needing a flag for either.
//
//  - every working set at the top of the range, and enough of them → add weight, restart at the bottom
//  - anything else                                                 → recap last time, no instruction
//
// Only the "add" case gives advice. Programs differ on when to add weight — some progress at
// 7 or 9 reps, not at the top of the range — so telling you to "stay until you hit 12" would be
// wrong for them. Hitting the top of the range on every set is the one signal that's safe to act
// on whatever the programme. (A per-exercise "add weight at N reps" setting is the proper fix.)
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
      reason: `${reps.join(", ")} reps — under your ${repMin}–${repMax} range.`,
    };
  }

  return {
    kind: "hold",
    weight,
    reps: Math.min(repMax, Math.max(...reps) + 1),
    reason: `${reps.join(", ")} reps across ${sets}.`,
  };
}
