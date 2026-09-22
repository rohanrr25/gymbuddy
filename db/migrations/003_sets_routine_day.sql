-- Feature 5: gym flow. Each set remembers which routine day it was logged under.
-- That's enough to work out rotation (the day after the last one trained) without
-- a separate workouts table: a session is one day's sets for one routine day.
alter table sets
  add column routine_day_id uuid references routine_days (id) on delete set null;

-- "What did I train last?" per user, newest first.
create index sets_user_routine_day_time on sets (user_id, performed_at desc)
  where routine_day_id is not null;
