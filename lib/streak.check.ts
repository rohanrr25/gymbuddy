// Run: npm run check
import assert from "node:assert/strict";
import { currentWeek, streakWeeks, trainingDays, weekStart, workoutsThisWeek } from "./streak.ts";

const iso = (local: string) => new Date(`${local}T18:00:00`).toISOString();
const now = new Date("2026-09-24T19:00:00"); // a Thursday

assert.equal(weekStart(now).getDate(), 21, "weeks start on Monday");
assert.equal(weekStart(new Date("2026-09-21T00:30:00")).getDate(), 21, "Monday starts its own week");
assert.equal(weekStart(new Date("2026-09-20T23:00:00")).getDate(), 14, "Sunday belongs to the week before");

// This week (Mon 21 –): Mon, Wed. Last week (14–20): Mon, Wed, Fri. Week before (7–13): Tue, Thu, Sat.
const days = trainingDays([
  iso("2026-09-21"), iso("2026-09-23"), iso("2026-09-23"), // two sets, one day
  iso("2026-09-14"), iso("2026-09-16"), iso("2026-09-18"),
  iso("2026-09-08"), iso("2026-09-10"), iso("2026-09-12"),
]);

assert.equal(days.size, 8, "two sets on one day count once");
assert.equal(workoutsThisWeek(days, now), 2, "this week so far");
assert.equal(streakWeeks(days, 3, now), 2, "an unfinished week doesn't break the streak");
assert.equal(streakWeeks(days, 2, now), 3, "a lower target includes this week");
assert.equal(streakWeeks(days, 4, now), 0, "a target nobody hit");
assert.equal(streakWeeks(new Set(), 3, now), 0, "no training, no streak");

// Mon 21 ✓, Tue 22, Wed 23 ✓, Thu 24 (today, not yet), then Fri–Sun still to come.
const week = currentWeek(days, now);
assert.equal(week.length, 7);
assert.equal(week[0].date.getDate(), 21, "the strip starts on Monday");
assert.equal(week[6].date.getDate(), 27, "…and runs to Sunday, the same week the count uses");
assert.deepEqual(week.map((d) => d.trained), [true, false, true, false, false, false, false], "Mon…Sun");
assert.deepEqual(
  week.map((d) => d.future),
  [false, false, false, false, true, true, true],
  "only the days after today are still to come",
);
assert.deepEqual(week.map((d) => d.today), [false, false, false, true, false, false, false]);
assert.equal(
  week.filter((d) => d.trained).length,
  workoutsThisWeek(days, now),
  "the strip and the number can't disagree — that's why they share a week",
);

console.log("streak: all checks pass");
