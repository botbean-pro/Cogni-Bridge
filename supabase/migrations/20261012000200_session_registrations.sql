-- Session registrations, self-reported attendance, mentor "good participation" marks,
-- and the Cogni-Points leaderboard built from them.
-- All writes go through the functions below; students can only read their own rows directly.
-- Session times are stored as local text, interpreted as India time (Asia/Kolkata).

create table public.session_registrations (
  student_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  registered_at timestamptz not null default now(),
  attended_at timestamptz,
  mentor_good boolean not null default false,
  primary key (student_id, session_id)
);

create index session_registrations_session_idx on public.session_registrations (session_id);

alter table public.session_registrations enable row level security;

create policy "Students can read their own registrations"
on public.session_registrations for select
to authenticated
using (student_id = (select auth.uid()));

revoke all on public.session_registrations from public, anon, authenticated;
grant select on public.session_registrations to authenticated;

-- Returns true when a new registration was created, false if already registered.
create function public.register_for_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  ) then
    raise exception 'Only students can register for sessions';
  end if;
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'Session not found';
  end if;

  insert into public.session_registrations (student_id, session_id)
  values ((select auth.uid()), p_session_id)
  on conflict (student_id, session_id) do nothing;
  if not found then
    return false;
  end if;

  update public.sessions set attendees = attendees + 1 where id = p_session_id;
  return true;
end;
$$;

-- Returns true when attendance was newly recorded, false if it was already recorded.
create function public.mark_session_attended(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_ends_at timestamptz;
begin
  if not exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  ) then
    raise exception 'Only students can record attendance';
  end if;

  select (s.session_date + s.end_time::time) at time zone 'Asia/Kolkata'
  into session_ends_at
  from public.sessions s
  where s.id = p_session_id;
  if session_ends_at is null then
    raise exception 'Session not found';
  end if;
  if session_ends_at > now() then
    raise exception 'This session has not finished yet';
  end if;

  insert into public.session_registrations (student_id, session_id, attended_at)
  values ((select auth.uid()), p_session_id, now())
  on conflict (student_id, session_id)
  do update set attended_at = now()
  where public.session_registrations.attended_at is null;
  return found;
end;
$$;

create function public.is_session_mentor(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    join public.profiles mentor on mentor.id = s.mentor_id and mentor.role = 'mentor'
    where s.id = p_session_id and s.mentor_id = (select auth.uid())
  );
$$;

-- Students registered for one of the calling mentor's sessions.
create function public.session_students(p_session_id uuid)
returns table (
  student_id uuid,
  display_name text,
  registered_at timestamptz,
  attended_at timestamptz,
  mentor_good boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_session_mentor(p_session_id) then
    raise exception 'Only this session''s mentor can see its students';
  end if;

  return query
  select registration.student_id, profile.display_name, registration.registered_at,
    registration.attended_at, registration.mentor_good
  from public.session_registrations registration
  join public.profiles profile on profile.id = registration.student_id
  where registration.session_id = p_session_id
  order by profile.display_name;
end;
$$;

create function public.set_student_good(p_session_id uuid, p_student_id uuid, p_good boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_session_mentor(p_session_id) then
    raise exception 'Only this session''s mentor can mark participation';
  end if;

  update public.session_registrations
  set mentor_good = coalesce(p_good, false)
  where session_id = p_session_id and student_id = p_student_id;
  if not found then
    raise exception 'That student is not registered for this session';
  end if;
end;
$$;

-- Points: +5 per registration, +10 per attended session, -10 per finished session
-- missed, +5 per mentor "good participation" mark. Streak = consecutive days with an
-- attended session, ending today or yesterday. Only exposes display names, never emails.
create function public.leaderboard()
returns table (
  display_name text,
  registered integer,
  attended integer,
  missed integer,
  mentor_good integer,
  streak integer,
  points integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'Asia/Kolkata')::date as day
  ),
  registrations as (
    select registration.student_id, registration.attended_at, registration.mentor_good, s.session_date,
      ((s.session_date + s.end_time::time) at time zone 'Asia/Kolkata') <= now() as ended
    from public.session_registrations registration
    join public.sessions s on s.id = registration.session_id
  ),
  totals as (
    select profile.id as student_id, profile.display_name,
      count(*)::integer as registered,
      count(registration.attended_at)::integer as attended,
      (count(*) filter (where registration.ended and registration.attended_at is null))::integer as missed,
      (count(*) filter (where registration.mentor_good))::integer as mentor_good
    from public.profiles profile
    join registrations registration on registration.student_id = profile.id
    where profile.role = 'student'
    group by profile.id, profile.display_name
  ),
  attended_days as (
    select distinct student_id, session_date as day
    from registrations
    where attended_at is not null
  ),
  islands as (
    select student_id, day,
      day - (row_number() over (partition by student_id order by day))::integer as island
    from attended_days
  ),
  anchors as (
    select distinct on (islands.student_id) islands.student_id, islands.island
    from islands, today
    where islands.day between today.day - 1 and today.day
    order by islands.student_id, islands.day desc
  ),
  streaks as (
    select islands.student_id, count(*)::integer as streak
    from islands
    join anchors on anchors.student_id = islands.student_id and anchors.island = islands.island
    group by islands.student_id
  )
  select totals.display_name, totals.registered, totals.attended, totals.missed, totals.mentor_good,
    coalesce(streaks.streak, 0) as streak,
    (totals.registered * 5 + totals.attended * 10 - totals.missed * 10 + totals.mentor_good * 5) as points,
    totals.student_id = (select auth.uid()) as is_me
  from totals
  left join streaks on streaks.student_id = totals.student_id
  order by points desc, totals.attended desc, totals.display_name
  limit 50;
$$;

revoke all on function public.register_for_session(uuid) from public, anon;
revoke all on function public.mark_session_attended(uuid) from public, anon;
revoke all on function public.is_session_mentor(uuid) from public, anon, authenticated;
revoke all on function public.session_students(uuid) from public, anon;
revoke all on function public.set_student_good(uuid, uuid, boolean) from public, anon;
revoke all on function public.leaderboard() from public, anon;
grant execute on function public.register_for_session(uuid) to authenticated;
grant execute on function public.mark_session_attended(uuid) to authenticated;
grant execute on function public.session_students(uuid) to authenticated;
grant execute on function public.set_student_good(uuid, uuid, boolean) to authenticated;
grant execute on function public.leaderboard() to authenticated;
