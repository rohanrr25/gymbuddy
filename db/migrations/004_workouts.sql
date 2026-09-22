-- "Complete workout": one row per completed routine day. Rotation moves on to the
-- next day once the latest session is completed, even on the same calendar day.
-- Logging another set under that day afterwards reopens it (the set is newer).
create table workouts (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null, -- Clerk user ID
  routine_day_id uuid not null references routine_days (id) on delete cascade,
  completed_at   timestamptz not null default now()
);

create index workouts_user_time on workouts (user_id, completed_at desc);
