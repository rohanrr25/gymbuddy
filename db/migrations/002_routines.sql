-- Feature 4: routines. A routine is a split (Push/Pull/Legs, Upper/Lower...) with
-- ordered days; each day lists exercises with a target of sets x rep range.
-- Weight is deliberately not stored here: it comes from your last session.

create table routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null, -- Clerk user ID
  name       text not null check (length(name) between 1 and 60),
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

-- At most one active routine per user.
create unique index routines_one_active on routines (user_id) where is_active;
create index routines_user on routines (user_id);

-- Days and routine exercises use client-generated IDs, so the editor can save the
-- whole routine at once while keeping stable IDs (workouts will point at days).
create table routine_days (
  id         uuid primary key,
  routine_id uuid not null references routines (id) on delete cascade,
  position   integer not null,
  name       text not null check (length(name) between 1 and 40)
);
create index routine_days_routine on routine_days (routine_id, position);

create table routine_exercises (
  id          uuid primary key,
  day_id      uuid not null references routine_days (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  position    integer not null,
  target_sets integer not null check (target_sets between 1 and 20),
  rep_min     integer not null check (rep_min between 1 and 100),
  rep_max     integer not null check (rep_max between 1 and 100),
  check (rep_min <= rep_max)
);
create index routine_exercises_day on routine_exercises (day_id, position);
