create table public.student_screen_time (
  student_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  active_seconds integer not null default 0 check (active_seconds between 0 and 86400),
  updated_at timestamptz not null default now(),
  primary key (student_id, activity_date)
);

create index student_screen_time_recent on public.student_screen_time (student_id, activity_date desc);
alter table public.student_screen_time enable row level security;

create policy "Students and linked adults can read screen time"
on public.student_screen_time for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = student_screen_time.student_id
  )
  or exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = student_screen_time.student_id
  )
);

revoke all on public.student_screen_time from public, anon, authenticated;
grant select on public.student_screen_time to authenticated;

create or replace function public.add_student_screen_time(p_seconds integer, p_activity_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_seconds is null or p_seconds < 1 or p_seconds > 30 then
    raise exception 'Screen-time increments must be between 1 and 30 seconds';
  end if;
  if p_activity_date is null or p_activity_date < current_date - 1 or p_activity_date > current_date + 1 then
    raise exception 'Screen-time date is outside the allowed range';
  end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  ) then
    raise exception 'Only student accounts can record screen time';
  end if;

  insert into public.student_screen_time (student_id, activity_date, active_seconds)
  values ((select auth.uid()), p_activity_date, p_seconds)
  on conflict (student_id, activity_date) do update
    set active_seconds = least(86400, student_screen_time.active_seconds + excluded.active_seconds),
        updated_at = now();
end;
$$;

revoke all on function public.add_student_screen_time(integer, date) from public, anon;
grant execute on function public.add_student_screen_time(integer, date) to authenticated;
