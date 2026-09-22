-- Feature 7: PRs. A PR is your heaviest weight for an exercise (at equal weight, more reps).
-- It's computed from logged sets, plus PRs you enter yourself (e.g. lifts from before the
-- app); whichever is better wins. Only manual entries are stored; logged PRs are derived.
create table manual_prs (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null, -- Clerk user ID
  exercise_id uuid not null references exercises (id),
  weight      numeric(6, 2) not null check (weight >= 0 and weight <= 2000), -- pounds
  reps        integer not null check (reps between 1 and 100),
  achieved_on date not null,
  created_at  timestamptz not null default now()
);

create index manual_prs_user_exercise on manual_prs (user_id, exercise_id);
