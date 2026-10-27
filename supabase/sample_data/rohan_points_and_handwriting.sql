-- Sample data for demos. Not a migration: run it by hand (SQL editor) when you want it.
--   1. Points for the mentor Rohan Mehta. Mentor points are 10 per finished session (see mentor_leaderboard()),
--      so this gives him 12 finished sessions = 120 points.
--   2. A handwriting result for every student who doesn't have one yet.
-- Safe to run more than once. The undo statements are at the bottom.

insert into public.sessions (mentor_id, subject, title, description, learn, session_date, start_time, end_time, meet_link, attendees)
select rohan.id, sample.subject, sample.title, 'Sample session for the mentor leaderboard demo.', '{}', sample.session_date,
  sample.start_time, sample.end_time, 'https://meet.google.com/cb-sample-' || lower(regexp_replace(sample.title, '[^a-zA-Z0-9]+', '-', 'g')), sample.attendees
from (select id from public.profiles where role = 'mentor' and display_name = 'Rohan Mehta' limit 1) as rohan
cross join (values
  ('Intro to Block Coding',     'Computer Science', date '2026-09-15', '16:00', '17:00', 4),
  ('How Plants Make Food',      'Science',          date '2026-09-18', '15:00', '16:00', 5),
  ('Maps and Directions',       'SST',              date '2026-09-22', '16:00', '17:00', 3),
  ('Number Patterns',           'Maths',            date '2026-09-25', '16:00', '17:00', 6),
  ('Build a Simple Circuit',    'Science',          date '2026-09-29', '15:30', '16:30', 5),
  ('Debugging Detectives',      'Computer Science', date '2026-10-02', '16:00', '17:00', 4),
  ('Rivers of India',           'SST',              date '2026-10-06', '16:00', '17:00', 3),
  ('Weather and Seasons',       'Science',          date '2026-10-09', '15:00', '16:00', 5),
  ('Logic Puzzles',             'Maths',            date '2026-10-13', '16:00', '17:00', 6),
  ('Meet the Robots',           'Artificial Intelligence', date '2026-10-16', '16:00', '17:00', 4),
  ('Paper Rockets',             'Science',          date '2026-10-20', '15:30', '16:30', 5),
  ('Draw Your Own Game',        'Computer Science', date '2026-10-23', '16:00', '17:00', 4)
) as sample(title, subject, session_date, start_time, end_time, attendees)
where not exists (
  select 1 from public.sessions existing
  where existing.mentor_id = rohan.id and existing.title = sample.title and existing.session_date = sample.session_date
);

insert into public.student_handwriting (student_id, image_path, handwriting_type, analyzed_at, handwriting_signs)
select student.id, 'sample/' || student.id || '.jpg', sample.handwriting_type, now() - make_interval(days => sample.days_ago), sample.signs
from public.profiles student
join (values
  ('Aarav Sharma', 'Balanced spacing', 14, array[]::text[]),
  ('Ishita Verma', 'Open spacing',      6, array['spacing']),
  ('Meera Nair',   'Compact spacing',  13, array['crowded', 'size']),
  ('Saanvi Gupta', 'Balanced spacing', 5,  array['baseline']),
  ('Samar',        'Open spacing',     4,  array['drift', 'spacing']),
  ('Vibhor Gupta', 'Compact spacing',  12, array['joined', 'crowded'])
) as sample(display_name, handwriting_type, days_ago, signs) on sample.display_name = student.display_name
where student.role = 'student'
  and not exists (select 1 from public.student_handwriting existing where existing.student_id = student.id);

-- Undo:
--   delete from public.sessions where description = 'Sample session for the mentor leaderboard demo.';
--   delete from public.student_handwriting where image_path like 'sample/%';
