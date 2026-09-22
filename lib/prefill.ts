// What the logger suggests for the set you're about to do.
// Dependency-free so `npm run check` can run it with plain Node.
//
// The rule: replay your last session of that exercise, set by set. Set 1 suggests what set 1
// was last time, set 2 what set 2 was, and an extra set past that gets no suggestion — it's
// new ground, so an inherited number would be a guess.

type SetLike = { exerciseId: string; performedAt: string };
const localDay = (iso: string) => new Date(iso).toDateString();

// Your most recent session of this exercise before today, oldest set first.
export function lastSessionSets<S extends SetLike>(sets: S[], exerciseId: string, todayKey: string): S[] {
  const previous = sets.filter((s) => s.exerciseId === exerciseId && localDay(s.performedAt) !== todayKey);
  if (previous.length === 0) return [];
  // `sets` arrives newest first, so the first match is the latest session.
  const day = localDay(previous[0].performedAt);
  return previous.filter((s) => localDay(s.performedAt) === day).reverse();
}

export function prefillSet<S extends SetLike>(
  sets: S[],
  exerciseId: string,
  todayKey: string,
  setIndex: number,
): S | undefined {
  return lastSessionSets(sets, exerciseId, todayKey)[setIndex];
}
