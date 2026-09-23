// Run: npm run check
import assert from "node:assert/strict";
import { lastSessionSets, prefillSet } from "./prefill.ts";

const at = (local: string, exerciseId: string, weight: number, reps: number) => ({
  exerciseId,
  weight,
  reps,
  performedAt: new Date(local).toISOString(),
});

const today = new Date("2026-09-24T19:00:00").toDateString();

// Newest first, as the logger receives them. Bench last session (Sep 22): 135×10, 135×9, 125×8.
const sets = [
  { ...at("2026-09-22T17:45:00", "bench", 95, 10), kind: "warmup" }, // ignored
  at("2026-09-24T19:10:00", "bench", 140, 5), // today, already logged
  at("2026-09-22T18:20:00", "bench", 125, 8),
  at("2026-09-22T18:10:00", "bench", 135, 9),
  at("2026-09-22T18:00:00", "bench", 135, 10),
  at("2026-09-19T18:00:00", "bench", 130, 10), // an older session, ignored
  at("2026-09-22T18:30:00", "squat", 225, 5),
];

const bench = lastSessionSets(sets, "bench", today);
assert.deepEqual(bench.map((s) => `${s.weight}x${s.reps}`), ["135x10", "135x9", "125x8"], "last session, in order");

assert.equal(prefillSet(sets, "bench", today, 0)?.weight, 135, "set 1 replays set 1");
assert.equal(prefillSet(sets, "bench", today, 1)?.reps, 9, "set 2 replays set 2");
assert.equal(prefillSet(sets, "bench", today, 2)?.weight, 125, "set 3 replays set 3");
assert.equal(prefillSet(sets, "bench", today, 3), undefined, "a fourth set gets no suggestion");

assert.equal(prefillSet(sets, "squat", today, 0)?.weight, 225, "a different exercise has its own session");
assert.equal(prefillSet(sets, "deadlift", today, 0), undefined, "never trained: no suggestion");
assert.deepEqual(lastSessionSets([sets[1]], "bench", today), [], "only today's sets: no last session");
assert.equal(prefillSet(sets, "bench", today, 0)?.weight, 135, "a warm-up never becomes set 1");

console.log("prefill: all checks pass");
