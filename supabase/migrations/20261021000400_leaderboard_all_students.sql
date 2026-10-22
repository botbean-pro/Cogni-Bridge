-- Show every student on the Cogni-board, including ones with no registrations yet (0 points).
create or replace function public.leaderboard()
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
    select registration.student_id, registration.session_id, registration.attended_at, registration.mentor_good, s.session_date,
      ((s.session_date + s.end_time::time) at time zone 'Asia/Kolkata') <= now() as ended
    from public.session_registrations registration
    join public.sessions s on s.id = registration.session_id
  ),
  totals as (
    select profile.id as student_id, profile.display_name,
      count(registration.session_id)::integer as registered,
      count(registration.attended_at)::integer as attended,
      (count(*) filter (where registration.ended and registration.attended_at is null))::integer as missed,
      (count(*) filter (where registration.mentor_good))::integer as mentor_good
    from public.profiles profile
    left join registrations registration on registration.student_id = profile.id
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
