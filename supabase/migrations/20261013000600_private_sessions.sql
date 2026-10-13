-- One-to-one sessions a mentor schedules for a single student. Only that mentor and that student
-- can see them; the student gets a notification with a Join call link. Safe to run more than once.

create table if not exists public.private_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  subject text not null,
  session_date date not null,
  start_time text not null check (start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  end_time text not null check (end_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  meet_link text not null check (meet_link ~* '^https?://' and char_length(meet_link) <= 500),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  check (mentor_id <> student_id)
);

create index if not exists private_sessions_student_idx on public.private_sessions (student_id, session_date, start_time);
create index if not exists private_sessions_mentor_idx on public.private_sessions (mentor_id, session_date, start_time);

alter table public.private_sessions enable row level security;

drop policy if exists "Mentor and student can read their private sessions" on public.private_sessions;
create policy "Mentor and student can read their private sessions"
on public.private_sessions for select to authenticated
using (mentor_id = (select auth.uid()) or student_id = (select auth.uid()));

drop policy if exists "Mentors can schedule private sessions for their students" on public.private_sessions;
create policy "Mentors can schedule private sessions for their students"
on public.private_sessions for insert to authenticated
with check (
  mentor_id = (select auth.uid())
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'mentor')
  and exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = private_sessions.student_id
  )
);

drop policy if exists "Mentors can cancel their private sessions" on public.private_sessions;
create policy "Mentors can cancel their private sessions"
on public.private_sessions for delete to authenticated
using (mentor_id = (select auth.uid()));

revoke all on public.private_sessions from anon, authenticated;
grant select, insert, delete on public.private_sessions to authenticated;

-- Students may only mark their own notifications as seen; nothing else is editable.
create or replace function public.mark_private_sessions_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.private_sessions
  set seen_at = now()
  where student_id = (select auth.uid()) and seen_at is null;
$$;

revoke all on function public.mark_private_sessions_seen() from public, anon;
grant execute on function public.mark_private_sessions_seen() to authenticated;
