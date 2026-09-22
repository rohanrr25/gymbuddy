// Run: npm run check
import assert from "node:assert/strict";
import { ageOn, canSignUp, isAdult } from "./age.ts";

const on = (local: string) => new Date(`${local}T12:00:00`);

assert.equal(ageOn("2000-09-22", on("2026-09-22")), 26, "your birthday counts today");
assert.equal(ageOn("2000-09-23", on("2026-09-22")), 25, "one day before, still a year younger");
assert.equal(ageOn("2000-12-31", on("2026-01-01")), 25, "birthday later in the year");
assert.equal(ageOn("2004-02-29", on("2026-02-28")), 21, "leap-year birthday, day before");
assert.equal(ageOn("2004-02-29", on("2026-03-01")), 22, "leap-year birthday, day after");

assert.equal(canSignUp("2013-09-22", on("2026-09-22")), true, "13 today can sign up");
assert.equal(canSignUp("2013-09-23", on("2026-09-22")), false, "a day short of 13 cannot");
assert.equal(isAdult("2008-09-22", on("2026-09-22")), true, "18 today is an adult");
assert.equal(isAdult("2008-09-23", on("2026-09-22")), false, "a day short of 18 is not");

console.log("age: all checks pass");
