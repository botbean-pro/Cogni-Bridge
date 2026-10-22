-- Mentors could never reply to parents: the reply policy checks parent_student_links,
-- but RLS on that table only lets the parent and child read their link, so the check
-- always failed for the mentor. Do the link check in a security definer helper instead.
create or replace function public.is_parent_of(parent uuid, student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parent_student_links link
    where link.parent_id = parent and link.student_id = student
  );
$$;

revoke all on function public.is_parent_of(uuid, uuid) from public, anon;
grant execute on function public.is_parent_of(uuid, uuid) to authenticated;

drop policy if exists "Assigned mentors can reply to a linked parent" on public.parent_teacher_messages;
create policy "Assigned mentors can reply to a linked parent"
  on public.parent_teacher_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'mentor'
    and mentor_id = (select auth.uid())
    and exists (
      select 1 from public.mentor_student_assignments assignment
      where assignment.mentor_id = (select auth.uid())
        and assignment.student_id = parent_teacher_messages.student_id
    )
    and public.is_parent_of(parent_teacher_messages.parent_id, parent_teacher_messages.student_id)
  );
