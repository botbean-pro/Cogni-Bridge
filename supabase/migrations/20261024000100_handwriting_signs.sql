-- Handwriting check results for mentors: the writing difficulties found in the sign-up sample
-- ('size', 'baseline', 'drift', 'spacing', 'crowded'), shown on the mentor's Settings list and
-- student page. Observations to support, not a diagnosis. Safe to run more than once.

alter table public.student_handwriting
add column if not exists handwriting_signs text[];

-- Mentors see each student's latest check, including students they haven't added yet.
drop function if exists public.list_students_for_mentor();
create function public.list_students_for_mentor()
returns table (student_id uuid, display_name text, joined_at timestamptz, is_mine boolean, handwriting_signs text[], handwriting_checked_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'mentor') then
    raise exception 'Only mentors can list students';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    profile.created_at,
    exists (
      select 1 from public.mentor_student_assignments assignment
      where assignment.mentor_id = (select auth.uid()) and assignment.student_id = profile.id
    ),
    latest.handwriting_signs,
    latest.analyzed_at
  from public.profiles profile
  left join lateral (
    select sample.handwriting_signs, sample.analyzed_at from public.student_handwriting sample
    where sample.student_id = profile.id order by sample.analyzed_at desc limit 1
  ) latest on true
  where profile.role = 'student'
  order by profile.display_name, profile.created_at;
end;
$$;

drop function if exists public.mentor_student_profile(uuid);
create function public.mentor_student_profile(p_student_id uuid)
returns table (
  display_name text,
  joined_at timestamptz,
  student_class text,
  age text,
  section text,
  school text,
  preferred_subjects text[],
  handwriting_signs text[],
  handwriting_checked_at timestamptz
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
    profile.preferred_subjects,
    latest.handwriting_signs,
    latest.analyzed_at
  from public.profiles profile
  join auth.users account on account.id = profile.id
  left join lateral (
    select sample.handwriting_signs, sample.analyzed_at from public.student_handwriting sample
    where sample.student_id = profile.id order by sample.analyzed_at desc limit 1
  ) latest on true
  where profile.id = p_student_id and profile.role = 'student';
end;
$$;

revoke all on function public.list_students_for_mentor() from public, anon;
revoke all on function public.mentor_student_profile(uuid) from public, anon;
grant execute on function public.list_students_for_mentor() to authenticated;
grant execute on function public.mentor_student_profile(uuid) to authenticated;
