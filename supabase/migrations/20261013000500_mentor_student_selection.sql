-- Lets a mentor see every registered student (name and join date only) and choose which
-- students are under them. Being "under" a mentor only lets that mentor read check-ins the
-- student explicitly shares; it does not expose anything else. Safe to run more than once.

create or replace function public.list_students_for_mentor()
returns table (student_id uuid, display_name text, joined_at timestamptz, is_mine boolean)
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
    )
  from public.profiles profile
  where profile.role = 'student'
  order by profile.display_name, profile.created_at;
end;
$$;

create or replace function public.set_my_student(p_student_id uuid, p_assigned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'mentor') then
    raise exception 'Only mentors can choose students';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'That student does not exist';
  end if;

  if p_assigned then
    insert into public.mentor_student_assignments (mentor_id, student_id)
    values ((select auth.uid()), p_student_id)
    on conflict do nothing;
  else
    delete from public.mentor_student_assignments
    where mentor_id = (select auth.uid()) and student_id = p_student_id;
  end if;
end;
$$;

revoke all on function public.list_students_for_mentor() from public, anon;
revoke all on function public.set_my_student(uuid, boolean) from public, anon;
grant execute on function public.list_students_for_mentor() to authenticated;
grant execute on function public.set_my_student(uuid, boolean) to authenticated;
