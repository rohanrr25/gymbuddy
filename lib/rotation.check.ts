// Run: npm run check
import assert from "node:assert/strict";
import { rotationDay } from "./rotation.ts";

const days = [{ id: "push" }, { id: "pull" }, { id: "legs" }];
const now = new Date("2026-09-22T18:00:00"); // local time, like the phone
const iso = (local: string) => new Date(local).toISOString();
const yesterday = iso("2026-09-21T18:00:00");
const thisMorning = iso("2026-09-22T07:00:00");
const at = (dayId: string, performedAt: string) => ({ dayId, performedAt });
const done = (dayId: string, completedAt: string) => ({ dayId, completedAt });
const day = (last: ReturnType<typeof at> | null, completion: ReturnType<typeof done> | null = null) =>
  rotationDay(days, last, completion, now)?.id;

assert.equal(day(null), "push", "no history starts at day 1");
assert.equal(day(at("push", yesterday)), "pull", "advances after a past day");
assert.equal(day(at("legs", yesterday)), "push", "wraps after the last day");
assert.equal(day(at("pull", thisMorning)), "pull", "stays on today's day while mid-workout");
assert.equal(day(at("gone", yesterday)), "push", "deleted day restarts");
assert.equal(rotationDay([], null, null, now), null, "no days, no plan");

// Complete workout
assert.equal(day(at("pull", thisMorning), done("pull", iso("2026-09-22T08:00:00"))), "legs", "completed today moves on today");
assert.equal(day(at("legs", thisMorning), done("legs", iso("2026-09-22T08:00:00"))), "push", "completing the last day wraps");
assert.equal(
  day(at("pull", iso("2026-09-22T09:00:00")), done("pull", iso("2026-09-22T08:00:00"))),
  "pull",
  "a set logged after completing reopens the day",
);
assert.equal(day(at("pull", thisMorning), done("push", iso("2026-09-22T08:00:00"))), "pull", "completing another day doesn't count");

console.log("rotation: all checks pass");
