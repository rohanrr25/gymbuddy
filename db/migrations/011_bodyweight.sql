-- Feature 12b: bodyweight over time. One number a day at most, in pounds.
-- Needed for bulking/cutting goals, and for bodyweight-relative strength if friends arrive.
create table bodyweights (
  user_id    text not null, -- Clerk user ID
  weighed_on date not null,
  weight     numeric(5, 1) not null check (weight > 0 and weight <= 1000), -- pounds
  created_at timestamptz not null default now(),
  primary key (user_id, weighed_on)
);
