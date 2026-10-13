-- Lets a brand-new Google sign-in from the Parent tab become a parent.
-- Google OAuth cannot carry account_type metadata, so the profile trigger creates a
-- student; this function converts only a fresh, empty student profile to a parent.
-- Mentors, existing students with activity, and older accounts are never converted.
create or replace function public.claim_parent_role()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = caller and role = 'student' and created_at > now() - interval '30 minutes'
  ) then
    raise exception 'This account cannot be switched to a parent account';
  end if;
  if exists (select 1 from public.sensory_checkins where student_id = caller)
    or exists (select 1 from public.session_registrations where student_id = caller)
    or exists (select 1 from public.mentor_student_assignments where student_id = caller) then
    raise exception 'This account cannot be switched to a parent account';
  end if;
  update public.profiles set role = 'parent' where id = caller;
end;
$$;

revoke all on function public.claim_parent_role() from public, anon;
grant execute on function public.claim_parent_role() to authenticated;
