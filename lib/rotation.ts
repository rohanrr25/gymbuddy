// Which routine day is today? Kept dependency-free so `npm run check` can run it with plain Node.
//
// If you've already trained a day of this routine today, today is that day.
// Otherwise it's the day after the last one you trained, wrapping around.
// No history (or the last day was deleted) starts from the first day.
export function rotationDay<D extends { id: string }>(
  days: D[],
  last: { dayId: string; performedAt: string } | null,
  now: Date = new Date(),
): D | null {
  const i = last ? days.findIndex((d) => d.id === last.dayId) : -1;
  if (!last || i === -1) return days[0] ?? null;
  const trainedToday = new Date(last.performedAt).toDateString() === now.toDateString();
  return trainedToday ? days[i] : days[(i + 1) % days.length];
}
