// Which routine day is today? Kept dependency-free so `npm run check` can run it with plain Node.
//
// Start from the last day you trained (the latest set logged under a routine day):
//  - completed since that set ("Complete workout")  -> the next day, even if it's still today
//  - trained today and not completed                -> that same day (you're mid-workout)
//  - trained on an earlier day                      -> the next day
// Days wrap around. No history, or the last day was deleted, starts from the first day.
export function rotationDay<D extends { id: string }>(
  days: D[],
  last: { dayId: string; performedAt: string } | null,
  completion: { dayId: string; completedAt: string } | null,
  now: Date = new Date(),
): D | null {
  const i = last ? days.findIndex((d) => d.id === last.dayId) : -1;
  if (!last || i === -1) return days[0] ?? null;
  const next = days[(i + 1) % days.length];

  const completed =
    completion?.dayId === last.dayId && new Date(completion.completedAt) >= new Date(last.performedAt);
  if (completed) return next;

  const trainedToday = new Date(last.performedAt).toDateString() === now.toDateString();
  return trainedToday ? days[i] : next;
}
