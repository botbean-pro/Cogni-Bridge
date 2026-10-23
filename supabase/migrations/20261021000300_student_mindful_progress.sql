-- Mindful Corner level, CogniPoints and Curious Clues progress, kept with the
-- student's account so it doesn't reset on another device or browser.
create table public.student_mindful_progress (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  activities_played integer not null default 0 check (activities_played >= 0),
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  completed_clue_levels integer[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.student_mindful_progress enable row level security;

create policy "Students read their own mindful progress"
on public.student_mindful_progress for select to authenticated
using (student_id = (select auth.uid()));

create policy "Students save their own mindful progress"
on public.student_mindful_progress for insert to authenticated
with check (student_id = (select auth.uid()));

create policy "Students update their own mindful progress"
on public.student_mindful_progress for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

revoke all on public.student_mindful_progress from public, anon, authenticated;
grant select, insert, update on public.student_mindful_progress to authenticated;
