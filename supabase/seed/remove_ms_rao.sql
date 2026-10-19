-- Removes the sample mentor "Ms. Rao" (mentor.rao@cognibridge.com) created by harsh_gmail_sample.sql.
-- Her sample sessions and her sample messages with Harsh's parent move to the other mentor
-- assigned to harsh@gmail.com, so Harsh keeps his attendance and attention stats.
-- Not a migration: run it by hand in the Supabase SQL editor.

do $$
declare
  v_harsh uuid;
  v_rao uuid;
  v_mentor uuid;
  v_mentor_email text;
  moved_sessions integer;
  moved_messages integer;
begin
  select id into v_rao from auth.users where email = 'mentor.rao@cognibridge.com';
  if v_rao is null then
    raise notice 'Ms. Rao (mentor.rao@cognibridge.com) does not exist; nothing to do.';
    return;
  end if;

  select id into v_harsh from auth.users where lower(email) = 'harsh@gmail.com';

  -- The mentor you connected: any mentor assigned to Harsh other than Ms. Rao (earliest first).
  select assignment.mentor_id, users.email into v_mentor, v_mentor_email
  from public.mentor_student_assignments assignment
  join auth.users users on users.id = assignment.mentor_id
  where assignment.student_id = v_harsh and assignment.mentor_id <> v_rao
  order by assignment.created_at
  limit 1;
  if v_mentor is null then
    raise exception 'Harsh has no mentor besides Ms. Rao. Add Harsh under your mentor (mentor Settings > My students) first, then run this again.';
  end if;

  update public.sessions set mentor_id = v_mentor where mentor_id = v_rao;
  get diagnostics moved_sessions = row_count;

  -- Messages need the new mentor in both mentor_id and, for her replies, sender_id.
  update public.parent_teacher_messages
  set mentor_id = v_mentor,
    sender_id = case when sender_role = 'mentor' then v_mentor else sender_id end
  where mentor_id = v_rao;
  get diagnostics moved_messages = row_count;

  delete from auth.users where id = v_rao;

  raise notice 'Moved % sessions and % messages to %, and deleted Ms. Rao.', moved_sessions, moved_messages, v_mentor_email;
end;
$$;
