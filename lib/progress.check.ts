// Run: npm run check
import assert from "node:assert/strict";
import { niceTicks, toSessions } from "./progress.ts";

const at = (local: string, weight: number, reps: number) => ({ performedAt: new Date(local).toISOString(), weight, reps });

const sessions = toSessions([
  at("2026-09-22T18:10:00", 135, 8),
  at("2026-09-20T18:00:00", 135, 8),
  at("2026-09-22T18:00:00", 155, 6),
  at("2026-09-22T18:20:00", 155, 7), // same weight, more reps: this is the top set
  at("2026-09-20T23:59:00", 145, 5), // still Sept 20, locally
]);
assert.equal(sessions.length, 2, "one session per local day");
assert.deepEqual(sessions.map((s) => s.sets.length), [2, 3], "oldest session first, sets grouped");
assert.equal(sessions[1].top.reps, 7, "ties on weight go to more reps");
assert.equal(sessions[1].top.weight, 155);
assert.equal(sessions[0].volume, 135 * 8 + 145 * 5, "volume is the sum of weight × reps");
assert.equal(sessions[1].sets[0].weight, 155, "sets inside a session are in time order");
assert.deepEqual(toSessions([]), [], "no sets, no sessions");

assert.deepEqual(niceTicks(135, 185), [120, 140, 160, 180, 200], "weight range, ~4 round steps");
assert.deepEqual(niceTicks(135, 135), [120, 130, 140, 150], "a flat line still gets a range around it");
assert.deepEqual(niceTicks(2100, 4800), [2000, 3000, 4000, 5000], "volume, steps of 1,000");
assert.ok(niceTicks(0, 12).every((t) => t >= 0), "never below zero");

console.log("progress: all checks pass");
