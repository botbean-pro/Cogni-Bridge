create table public.student_learning_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(session_id) between 1 and 120),
  subject text not null check (char_length(subject) between 1 and 80),
  activity_date date not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

create index student_learning_activity_student_recent
  on public.student_learning_activity (student_id, activity_date desc);

alter table public.student_learning_activity enable row level security;

create policy "Students and assigned mentors can read learning activity"
on public.student_learning_activity for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid())
      and assignment.student_id = student_learning_activity.student_id
  )
);

create policy "Students can record their own learning activity"
on public.student_learning_activity for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  )
);

revoke all on public.student_learning_activity from public, anon, authenticated;
grant select, insert on public.student_learning_activity to authenticated;
