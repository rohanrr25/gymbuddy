// What a lifting session burned, as a range — the honest precision without a heart-rate strap.
//
// MET method: kcal/min = MET × 3.5 × kg / 200. The Compendium of Physical Activities puts
// resistance training at about 3.5 METs (steady, long rests) and 6.0 (heavy, short rests), and
// which one you were is exactly what we can't see, so both ends are shown. Age isn't in the
// formula: bodyweight and time carry it. Treat the whole thing as ±30–40%.
export const MET_LOW = 3.5;
export const MET_HIGH = 6.0;
const LB_PER_KG = 2.20462;

// Wall-clock length of a session: first set to last. It ignores the rest after your last set,
// which makes the estimate run low rather than flattering.
export function sessionMinutes(performedAt: string[]): number {
  if (performedAt.length < 2) return 0;
  const times = performedAt.map((t) => new Date(t).getTime()).filter((n) => Number.isFinite(n));
  if (times.length < 2) return 0;
  return (Math.max(...times) - Math.min(...times)) / 60_000;
}

// null when we can't say: no bodyweight recorded, or a session too short to measure.
export function calorieRange(bodyweightLb: number, minutes: number): { low: number; high: number } | null {
  if (!(bodyweightLb > 0) || !(minutes > 0)) return null;
  const kg = bodyweightLb / LB_PER_KG;
  const burn = (met: number) => Math.round(((met * 3.5 * kg) / 200) * minutes);
  const [low, high] = [burn(MET_LOW), burn(MET_HIGH)];
  // A range that rounds to the same number twice isn't a range worth printing.
  return high - low < 5 ? null : { low, high };
}
