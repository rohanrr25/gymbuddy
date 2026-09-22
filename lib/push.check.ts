// Run: npm run check
import assert from "node:assert/strict";
import { STEP_LB, suggest } from "./push.ts";

const set = (weight: number, reps: number) => ({ weight, reps });
const target = { repMin: 8, repMax: 12, targetSets: 3 };

// Every working set at the top of the range → add weight, restart at the bottom.
const added = suggest([set(135, 12), set(135, 12), set(135, 12)], target);
assert.equal(added?.kind, "add");
assert.equal(added?.weight, 135 + STEP_LB);
assert.equal(added?.reps, 8, "a heavier weight restarts at the bottom of the range");

// One set short of the top → stay put.
assert.equal(suggest([set(135, 12), set(135, 12), set(135, 11)], target)?.kind, "hold");

// Top reps but fewer sets than the target → not yet.
assert.equal(suggest([set(135, 12), set(135, 12)], target)?.kind, "hold");

// Warm-ups are ignored: only the sets at the heaviest weight count.
const warmed = suggest([set(95, 12), set(115, 12), set(135, 12), set(135, 12), set(135, 12)], target);
assert.equal(warmed?.kind, "add", "warm-ups don't block progression");
assert.equal(warmed?.weight, 140);

// A back-off set is ignored the same way.
assert.equal(suggest([set(135, 12), set(135, 12), set(135, 12), set(115, 15)], target)?.kind, "add");

// Everything under the range → the weight is too heavy.
const heavy = suggest([set(185, 6), set(185, 5)], target);
assert.equal(heavy?.kind, "heavy");
assert.equal(heavy?.weight, 185, "it suggests staying, not dropping: one bad day isn't a verdict");

// Inside the range → aim for one more rep, capped at the top.
assert.equal(suggest([set(135, 9), set(135, 8)], target)?.reps, 10);
assert.equal(suggest([set(135, 12), set(135, 8)], target)?.reps, 12, "never suggests more than the range");

assert.equal(suggest([], target), null, "no history, no suggestion");

console.log("push: all checks pass");
