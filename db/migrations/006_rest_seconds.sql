-- Rest timer: rest between sets for a routine exercise, in seconds.
-- NULL means "use the recommendation from the rep range" (lib/rest.ts).
alter table routine_exercises
  add column rest_seconds integer check (rest_seconds between 15 and 600);
