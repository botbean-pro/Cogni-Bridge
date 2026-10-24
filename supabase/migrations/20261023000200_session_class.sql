-- The class (1-12) a group session is meant for, chosen on the mentor's schedule form.
-- Null means the session is open to every class. Safe to run more than once.

alter table public.sessions
  add column if not exists student_class text
  check (student_class is null or student_class ~ '^([1-9]|1[0-2])$');
