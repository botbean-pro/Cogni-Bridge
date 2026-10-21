-- The handwriting check now returns spacing labels ("Open spacing", ...) instead of "Type 1".."Type 4".
-- The old check constraint rejected those, so every save failed and students were asked again at each sign-in.
-- Safe to run more than once.

alter table public.student_handwriting
drop constraint if exists student_handwriting_handwriting_type_check;

alter table public.student_handwriting
add constraint student_handwriting_handwriting_type_check
check (handwriting_type in ('Type 1', 'Type 2', 'Type 3', 'Type 4', 'Open spacing', 'Balanced spacing', 'Compact spacing'));
