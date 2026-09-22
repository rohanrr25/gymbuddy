// Run: npm run check
import assert from "node:assert/strict";
import { formatRest, recommendedRest, restForRange } from "./rest.ts";

assert.equal(recommendedRest(3), 180, "heavy sets rest 3 min");
assert.equal(recommendedRest(5), 180, "5 reps is still heavy");
assert.equal(recommendedRest(8), 120, "muscle-building range rests 2 min");
assert.equal(recommendedRest(12), 120);
assert.equal(recommendedRest(15), 60, "high reps rest 1 min");
assert.equal(restForRange(8, 12), 120, "a range uses its midpoint");
assert.equal(restForRange(3, 5), 180);
assert.equal(restForRange(12, 15), 60, "midpoint 13.5 is high reps");
assert.equal(formatRest(90), "1:30");
assert.equal(formatRest(5.4), "0:05");
assert.equal(formatRest(-3), "0:00", "never negative");

console.log("rest: all checks pass");
