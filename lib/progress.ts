// Progress maths, dependency-free so `npm run check` can run it with plain Node.

type SetLike = { weight: number; reps: number; performedAt: string };
export type Session<S extends SetLike> = {
  key: string; // local calendar day, e.g. "2026-9-22"
  date: Date; // time of the session's first set
  sets: S[]; // oldest first
  top: S; // heaviest set; ties go to more reps
  volume: number; // sum of weight × reps, in lb
};

// One session per local calendar day (the phone's timezone), oldest first.
export function toSessions<S extends SetLike>(sets: S[]): Session<S>[] {
  const byDay = new Map<string, S[]>();
  const sorted = [...sets].sort((a, b) => Date.parse(a.performedAt) - Date.parse(b.performedAt));
  for (const s of sorted) {
    const d = new Date(s.performedAt);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  return [...byDay].map(([key, daySets]) => ({
    key,
    date: new Date(daySets[0].performedAt),
    sets: daySets,
    top: daySets.reduce((best, s) =>
      s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
    ),
    volume: daySets.reduce((sum, s) => sum + s.weight * s.reps, 0),
  }));
}

// Round axis ticks (steps of 1, 2 or 5 × 10ⁿ) that cover min..max. Never below zero.
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(5, Math.abs(max) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  const lo = Math.max(0, Math.floor(min / step) * step);
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}
