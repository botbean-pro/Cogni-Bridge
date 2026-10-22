-- Mentor side of parent-mentor chat. Mentors cannot read parent_student_links directly, so this
-- returns only the parents linked to students the calling mentor has chosen (names only).
-- Messages themselves still go through the parent_teacher_messages policies. Safe to run more than once.

create or replace function public.mentor_parent_contacts()
returns table (parent_id uuid, parent_name text, student_id uuid, student_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'mentor') then
    raise exception 'Only mentors can list parent contacts';
  end if;

  return query
  select parent.id, parent.display_name, student.id, student.display_name
  from public.mentor_student_assignments assignment
  join public.parent_student_links link on link.student_id = assignment.student_id
  join public.profiles parent on parent.id = link.parent_id and parent.role = 'parent'
  join public.profiles student on student.id = assignment.student_id
  where assignment.mentor_id = (select auth.uid())
  order by parent.display_name, student.display_name;
end;
$$;

revoke all on function public.mentor_parent_contacts() from public, anon;
grant execute on function public.mentor_parent_contacts() to authenticated;
