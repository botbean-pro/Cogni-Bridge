-- The mentor's student profile page (/mentor/students/:id): the student's sign-up details
-- and chosen subjects, plus every session they registered for with attendance, the
-- mentor's attention rating and the "good participation" mark. Only a mentor the student
-- is under can read either, matching mentor_student_activity(). Email and private notes
-- are never returned. Safe to run more than once.

create or replace function public.is_my_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mentor_student_assignments assignment
    join public.profiles mentor on mentor.id = assignment.mentor_id and mentor.role = 'mentor'
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = p_student_id
  );
$$;

-- Class, age, section and school are kept in the auth user's metadata by the profile setup flow.
create or replace function public.mentor_student_profile(p_student_id uuid)
returns table (
  display_name text,
  joined_at timestamptz,
  student_class text,
  age text,
  section text,
  school text,
  preferred_subjects text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_my_student(p_student_id) then
    raise exception 'Only a mentor this student is under can see their profile';
  end if;

  return query
  select profile.display_name, profile.created_at,
    account.raw_user_meta_data ->> 'student_class',
    account.raw_user_meta_data ->> 'age',
    account.raw_user_meta_data ->> 'section',
    account.raw_user_meta_data ->> 'school',
    profile.preferred_subjects
  from public.profiles profile
  join auth.users account on account.id = profile.id
  where profile.id = p_student_id and profile.role = 'student';
end;
$$;

create or replace function public.mentor_student_history(p_student_id uuid)
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
  if not public.is_my_student(p_student_id) then
    raise exception 'Only a mentor this student is under can see their history';
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

revoke all on function public.is_my_student(uuid) from public, anon, authenticated;
revoke all on function public.mentor_student_profile(uuid) from public, anon;
revoke all on function public.mentor_student_history(uuid) from public, anon;
grant execute on function public.mentor_student_profile(uuid) to authenticated;
grant execute on function public.mentor_student_history(uuid) to authenticated;
