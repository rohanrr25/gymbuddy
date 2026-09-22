-- Feature 12: how a set felt. Optional, one tap, right after logging.
-- Can't be backfilled — nobody remembers in March how a set felt in September — which is
-- why it's worth collecting before it's used (the push and a "hard for me?" score later).
alter table sets
  add column effort text check (effort in ('easy', 'on_target', 'hard'));
