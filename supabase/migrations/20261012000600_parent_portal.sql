-- Builds on 20261012000300_parent_portal.sql (parent accounts, link codes, messages).
--
-- Linked parents can see their child's mood check-ins (ratings, emotions and causes
-- only, never written notes) and the sessions the child registered for, including the
-- attention level the session's mentor recorded. Attendance comes from
-- session_registrations; student_learning_activity is no longer written by the app.

-- ---------------------------------------------------------------- attention rating

-- 1 = very distracted ... 5 = very focused. Set by the session's mentor.
alter table public.session_registrations
  add column attention_level smallint check (attention_level between 1 and 5);

create function public.set_student_attention(p_session_id uuid, p_student_id uuid, p_level integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_session_mentor(p_session_id) then
    raise exception 'Only this session''s mentor can rate attention';
  end if;

  update public.session_registrations
  set attention_level = p_level
  where session_id = p_session_id and student_id = p_student_id;
  if not found then
    raise exception 'That student is not registered for this session';
  end if;
end;
$$;

-- Return type changes, so it has to be dropped and recreated.
drop function public.session_students(uuid);

create function public.session_students(p_session_id uuid)
returns table (
  student_id uuid,
  display_name text,
  registered_at timestamptz,
  attended_at timestamptz,
  mentor_good boolean,
  attention_level smallint
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
    registration.attended_at, registration.mentor_good, registration.attention_level
  from public.session_registrations registration
  join public.profiles profile on profile.id = registration.student_id
  where registration.session_id = p_session_id
  order by profile.display_name;
end;
$$;

-- ---------------------------------------------------------------- parents

-- Lets a student see who their linked parents are (shown in the Sensory Tracker).
create policy "Students can read their linked parents' profiles"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.parent_student_links link
    where link.student_id = (select auth.uid()) and link.parent_id = profiles.id
  )
);

create function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_student_links link
    join public.profiles parent on parent.id = link.parent_id and parent.role = 'parent'
    join public.profiles student on student.id = link.student_id and student.role = 'student'
    where link.parent_id = (select auth.uid()) and link.student_id = p_student_id
  );
$$;

-- Check-in ratings only. Written notes (mood_note, day_note, overwhelm_note, messages,
-- etc.) are deliberately left out and stay private to the student.
create function public.child_checkins(p_student_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  checkin_type text,
  mood smallint,
  emotions text[],
  energy smallint,
  comfort smallint,
  causes text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_parent_of(p_student_id) then
    raise exception 'Only a linked parent can see this student''s check-ins';
  end if;

  return query
  select checkin.id, checkin.created_at, checkin.checkin_type, checkin.mood, checkin.emotions,
    checkin.energy, checkin.comfort, checkin.causes
  from public.sensory_checkins checkin
  where checkin.student_id = p_student_id
  order by checkin.created_at desc
  limit 200;
end;
$$;

create function public.child_sessions(p_student_id uuid)
returns table (
  session_id uuid,
  title text,
  subject text,
  session_date date,
  start_time text,
  end_time text,
  registered_at timestamptz,
  attended_at timestamptz,
  ended boolean,
  mentor_good boolean,
  attention_level smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_parent_of(p_student_id) then
    raise exception 'Only a linked parent can see this student''s sessions';
  end if;

  return query
  select s.id, s.title, s.subject, s.session_date, s.start_time, s.end_time,
    registration.registered_at, registration.attended_at,
    ((s.session_date + s.end_time::time) at time zone 'Asia/Kolkata') <= now(),
    registration.mentor_good, registration.attention_level
  from public.session_registrations registration
  join public.sessions s on s.id = registration.session_id
  where registration.student_id = p_student_id
  order by s.session_date desc, s.start_time desc;
end;
$$;

-- ---------------------------------------------------------------- mentor performance page

-- Attended sessions of the calling mentor's assigned students, in the shape the
-- Student Performance page expects.
create function public.mentor_student_activity()
returns table (
  student_id uuid,
  session_id text,
  subject text,
  activity_date date,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select registration.student_id, s.id::text, s.subject, s.session_date,
    ((extract(epoch from (s.end_time::time - s.start_time::time)) / 60)::integer + 1440) % 1440
  from public.session_registrations registration
  join public.sessions s on s.id = registration.session_id
  join public.mentor_student_assignments assignment on assignment.student_id = registration.student_id
  join public.profiles mentor on mentor.id = assignment.mentor_id and mentor.role = 'mentor'
  where assignment.mentor_id = (select auth.uid())
    and registration.attended_at is not null
  order by s.session_date desc;
$$;

-- ---------------------------------------------------------------- grants

revoke all on function public.set_student_attention(uuid, uuid, integer) from public, anon;
revoke all on function public.session_students(uuid) from public, anon;
revoke all on function public.is_parent_of(uuid) from public, anon, authenticated;
revoke all on function public.child_checkins(uuid) from public, anon;
revoke all on function public.child_sessions(uuid) from public, anon;
revoke all on function public.mentor_student_activity() from public, anon;
grant execute on function public.set_student_attention(uuid, uuid, integer) to authenticated;
grant execute on function public.session_students(uuid) to authenticated;
grant execute on function public.child_checkins(uuid) to authenticated;
grant execute on function public.child_sessions(uuid) to authenticated;
grant execute on function public.mentor_student_activity() to authenticated;
