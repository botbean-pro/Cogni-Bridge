-- Removes repeated names from public.profiles. Not a migration: run it by hand in the Supabase
-- SQL editor after checking the list from lookup_harsh_and_duplicates.sql.
--
-- Within each group of accounts sharing a role and name, the account with the most data
-- (oldest on a tie) keeps the name. Every other account in the group is:
--   * deleted (auth user + profile) if it owns no data at all, or
--   * renamed "Name (2)", "Name (3)", ... if it owns any data, so nothing real is lost.
-- harsh@gmail.com and any parent linked to it are never deleted.

do $$
declare
  dup record;
begin
  for dup in
    with activity as (
      select profile.id, profile.role, profile.display_name, profile.created_at, users.email,
        (select count(*) from public.sessions s where s.mentor_id = profile.id)
        + (select count(*) from public.private_sessions p where p.mentor_id = profile.id or p.student_id = profile.id)
        + (select count(*) from public.mentor_notes n where n.mentor_id = profile.id)
        + (select count(*) from public.sensory_checkins c where c.student_id = profile.id or c.selected_mentor_id = profile.id)
        + (select count(*) from public.session_registrations r where r.student_id = profile.id)
        + (select count(*) from public.parent_student_links l where l.parent_id = profile.id or l.student_id = profile.id)
        + (select count(*) from public.mentor_student_assignments a where a.mentor_id = profile.id or a.student_id = profile.id)
        + (select count(*) from public.parent_teacher_messages m where m.sender_id = profile.id) as data_rows
      from public.profiles profile
      join auth.users users on users.id = profile.id
    ),
    ranked as (
      select activity.*,
        row_number() over (partition by role, lower(btrim(display_name)) order by data_rows desc, created_at) as rank_in_group
      from activity
    )
    select * from ranked where rank_in_group > 1 order by role, lower(display_name), rank_in_group
  loop
    if dup.data_rows = 0
      and lower(dup.email) <> 'harsh@gmail.com'
      and not exists (
        select 1 from public.parent_student_links link
        join auth.users child on child.id = link.student_id
        where link.parent_id = dup.id and lower(child.email) = 'harsh@gmail.com'
      )
    then
      delete from auth.users where id = dup.id;
      raise notice 'Deleted empty duplicate % "%" (%)', dup.role, dup.display_name, dup.email;
    else
      update public.profiles
      set display_name = left(btrim(dup.display_name), 74) || ' (' || dup.rank_in_group || ')'
      where id = dup.id;
      raise notice 'Renamed duplicate % "%" (%) to "% (%)"', dup.role, dup.display_name, dup.email, btrim(dup.display_name), dup.rank_in_group;
    end if;
  end loop;
end;
$$;
