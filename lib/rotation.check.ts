// Run: npm run check
import assert from "node:assert/strict";
import { rotationDay } from "./rotation.ts";

const days = [{ id: "push" }, { id: "pull" }, { id: "legs" }];
const now = new Date("2026-09-22T18:00:00"); // local time, like the phone
const yesterday = new Date("2026-09-21T18:00:00").toISOString();
const thisMorning = new Date("2026-09-22T07:00:00").toISOString();

assert.equal(rotationDay(days, null, now)?.id, "push", "no history starts at day 1");
assert.equal(rotationDay(days, { dayId: "push", performedAt: yesterday }, now)?.id, "pull", "advances after a past day");
assert.equal(rotationDay(days, { dayId: "legs", performedAt: yesterday }, now)?.id, "push", "wraps after the last day");
assert.equal(rotationDay(days, { dayId: "pull", performedAt: thisMorning }, now)?.id, "pull", "stays on today's day");
assert.equal(rotationDay(days, { dayId: "gone", performedAt: yesterday }, now)?.id, "push", "deleted day restarts");
assert.equal(rotationDay([], null, now), null, "no days, no plan");

console.log("rotation: all checks pass");
