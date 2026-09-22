-- Streaks now count completed workouts, not "any day with a set", so a freestyle
-- (off-plan) session has to be completable too: no routine day.
alter table workouts alter column routine_day_id drop not null;
