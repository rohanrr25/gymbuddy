// Run: npm run check
import assert from "node:assert/strict";
import { calorieRange, sessionMinutes, MET_HIGH, MET_LOW } from "./calories.ts";

const at = (min: number) => new Date(Date.UTC(2026, 8, 22, 18, min)).toISOString();

assert.equal(sessionMinutes([at(0), at(45)]), 45);
assert.equal(sessionMinutes([at(45), at(10), at(0)]), 45, "order doesn't matter, only the span");
assert.equal(sessionMinutes([at(0)]), 0, "one set has no duration");
assert.equal(sessionMinutes([]), 0);
assert.equal(sessionMinutes(["not a date", at(0)]), 0, "a bad timestamp can't invent a duration");

// 180 lb (81.65 kg) for 45 min: 3.5 MET → 225 kcal, 6.0 MET → 386.
const r = calorieRange(180, 45);
assert.ok(r, "a normal session gets a range");
assert.equal(r.low, Math.round(((MET_LOW * 3.5 * (180 / 2.20462)) / 200) * 45));
assert.equal(r.high, Math.round(((MET_HIGH * 3.5 * (180 / 2.20462)) / 200) * 45));
assert.ok(r.low < r.high, "the low end is the low end");
assert.ok(r.low > 200 && r.high < 400, `sanity: 45 min at 180 lb is a few hundred kcal, got ${r.low}–${r.high}`);

// Heavier body, same session → more calories.
assert.ok(calorieRange(250, 45)!.low > r.low);

assert.equal(calorieRange(0, 45), null, "no bodyweight, no estimate");
assert.equal(calorieRange(180, 0), null, "no duration, no estimate");
assert.equal(calorieRange(180, 1), null, "too short to be worth a range");
assert.equal(calorieRange(Number.NaN, 45), null);

console.log("calories: all checks pass");
