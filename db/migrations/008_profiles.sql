-- Profiles: what we ask for at first run, plus the weekly target the streak counts against.
-- Name and email already live in Clerk; this is the rest.
create table profiles (
  user_id       text primary key, -- Clerk user ID
  display_name  text not null check (length(trim(display_name)) between 1 and 40),
  date_of_birth date not null,    -- for age rules: 13+ to sign up, social off under 18
  phone         text check (phone is null or length(phone) between 5 and 20), -- optional
  weekly_target integer not null default 3 check (weekly_target between 1 and 14),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
