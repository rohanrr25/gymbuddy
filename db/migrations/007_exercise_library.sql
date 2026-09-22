-- Feature 8: a real exercise library, plus your own exercises.
-- user_id NULL = built-in and shared; otherwise the exercise is private to that user.
alter table exercises add column user_id text;

-- Names are unique per owner, case-insensitively. NULLS NOT DISTINCT so two built-ins
-- can't share a name either.
alter table exercises drop constraint exercises_name_key;
create unique index exercises_owner_name on exercises (user_id, lower(name)) nulls not distinct;
create index exercises_owner on exercises (user_id);

-- ~70 more built-ins across barbell, dumbbell, machine, cable and bodyweight work.
-- Six muscle groups (each has a plate colour in components/exercise-select.tsx).
-- Compound lifts are filed under their primary mover.
insert into exercises (name, muscle_group) values
  -- Chest
  ('Incline Dumbbell Press',   'Chest'),
  ('Decline Bench Press',      'Chest'),
  ('Machine Chest Press',      'Chest'),
  ('Cable Fly',                'Chest'),
  ('Dumbbell Fly',             'Chest'),
  ('Push-Up',                  'Chest'),
  ('Dip',                      'Chest'),
  ('Pec Deck',                 'Chest'),
  -- Back
  ('Chin-Up',                  'Back'),
  ('Dumbbell Row',             'Back'),
  ('T-Bar Row',                'Back'),
  ('Chest-Supported Row',      'Back'),
  ('Machine Row',              'Back'),
  ('Face Pull',                'Back'),
  ('Straight-Arm Pulldown',    'Back'),
  ('Rack Pull',                'Back'),
  ('Trap Bar Deadlift',        'Back'),
  ('Sumo Deadlift',            'Back'),
  ('Shrug',                    'Back'),
  ('Power Clean',              'Back'),
  ('Hang Clean',               'Back'),
  ('Kettlebell Swing',         'Back'),
  ('Farmer''s Carry',          'Back'),
  -- Legs
  ('Front Squat',              'Legs'),
  ('Goblet Squat',             'Legs'),
  ('Hack Squat',               'Legs'),
  ('Bulgarian Split Squat',    'Legs'),
  ('Walking Lunge',            'Legs'),
  ('Step-Up',                  'Legs'),
  ('Hip Thrust',               'Legs'),
  ('Glute Bridge',             'Legs'),
  ('Good Morning',             'Legs'),
  ('Glute Ham Raise',          'Legs'),
  ('Nordic Curl',              'Legs'),
  ('Standing Calf Raise',      'Legs'),
  ('Seated Calf Raise',        'Legs'),
  ('Hip Abduction',            'Legs'),
  ('Hip Adduction',            'Legs'),
  ('Sled Push',                'Legs'),
  ('Thruster',                 'Legs'),
  -- Shoulders
  ('Dumbbell Shoulder Press',  'Shoulders'),
  ('Machine Shoulder Press',   'Shoulders'),
  ('Arnold Press',             'Shoulders'),
  ('Push Press',               'Shoulders'),
  ('Landmine Press',           'Shoulders'),
  ('Cable Lateral Raise',      'Shoulders'),
  ('Rear Delt Fly',            'Shoulders'),
  ('Reverse Pec Deck',         'Shoulders'),
  ('Front Raise',              'Shoulders'),
  ('Upright Row',              'Shoulders'),
  -- Arms
  ('Dumbbell Curl',            'Arms'),
  ('Hammer Curl',              'Arms'),
  ('Preacher Curl',            'Arms'),
  ('Incline Dumbbell Curl',    'Arms'),
  ('Cable Curl',               'Arms'),
  ('Concentration Curl',       'Arms'),
  ('Reverse Curl',             'Arms'),
  ('Close-Grip Bench Press',   'Arms'),
  ('Skull Crusher',            'Arms'),
  ('Overhead Tricep Extension','Arms'),
  ('Tricep Kickback',          'Arms'),
  ('Bench Dip',                'Arms'),
  ('Wrist Curl',               'Arms'),
  -- Core
  ('Plank',                    'Core'),
  ('Hanging Leg Raise',        'Core'),
  ('Cable Crunch',             'Core'),
  ('Ab Wheel Rollout',         'Core'),
  ('Russian Twist',            'Core'),
  ('Sit-Up',                   'Core'),
  ('Decline Sit-Up',           'Core'),
  ('Back Extension',           'Core'),
  ('Pallof Press',             'Core'),
  ('Side Plank',               'Core')
on conflict do nothing;
