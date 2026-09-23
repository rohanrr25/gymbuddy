-- Warm-up and drop sets. Marked after logging (like effort), so the common path stays one tap.
-- Only 'working' sets count toward a day's target, the push, and next session's pre-fill.
alter table sets
  add column kind text not null default 'working' check (kind in ('working', 'warmup', 'drop'));
