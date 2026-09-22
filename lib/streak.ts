// Streak maths. Dependency-free so `npm run check` can run it with plain Node.
// A "training day" is any local calendar day you logged a set. Weeks run Monday–Sunday,
// in the phone's timezone.

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function weekStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
  return start;
}

export function trainingDays(timestamps: string[]): Set<string> {
  return new Set(timestamps.map((t) => dayKey(new Date(t))));
}

/**
 * Weeks in a row that hit the target, counting back from this week.
 * The current week is still in progress: it extends the streak once it hits the target,
 * but a week you haven't finished never breaks it.
 */
export function streakWeeks(days: Set<string>, weeklyTarget: number, now = new Date()): number {
  const countIn = (start: Date) => {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (days.has(dayKey(d))) n++;
    }
    return n;
  };

  const current = weekStart(now);
  let streak = countIn(current) >= weeklyTarget ? 1 : 0;
  for (let back = 1; back < 260; back++) {
    const start = new Date(current);
    start.setDate(current.getDate() - 7 * back);
    if (countIn(start) < weeklyTarget) break;
    streak++;
  }
  return streak;
}

export function workoutsThisWeek(days: Set<string>, now = new Date()): number {
  const start = weekStart(now);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (days.has(dayKey(d))) n++;
  }
  return n;
}

// The last 7 days, oldest first, for the week strip on Home.
export function recentWeek(days: Set<string>, now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - (6 - i));
    return { date: d, trained: days.has(dayKey(d)) };
  });
}
