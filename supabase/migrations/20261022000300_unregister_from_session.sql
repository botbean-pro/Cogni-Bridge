-- Lets a student undo a session registration (the Register button is a toggle).
-- Attended sessions stay registered so attendance, points and parent reports don't change.
-- Safe to run more than once.

-- Returns true when the registration was removed, false if there was nothing to remove.
create or replace function public.unregister_from_session(p_session_id uuid)
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
    raise exception 'Only students can change session registrations';
  end if;

  delete from public.session_registrations
  where student_id = (select auth.uid()) and session_id = p_session_id and attended_at is null;
  if not found then
    return false;
  end if;

  update public.sessions set attendees = greatest(attendees - 1, 0) where id = p_session_id;
  return true;
end;
$$;

revoke all on function public.unregister_from_session(uuid) from public, anon;
grant execute on function public.unregister_from_session(uuid) to authenticated;
