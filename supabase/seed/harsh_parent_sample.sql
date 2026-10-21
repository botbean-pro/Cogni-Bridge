-- Sample data for the parent portal: a student "Harsh", his parent "Parent", and a
-- mentor "Ms. Rao", with mood check-ins, session registrations (attended / missed /
-- upcoming, with attention ratings) and a parent-teacher conversation.
--
-- Not a migration: run it by hand in the Supabase SQL editor on a development
-- project. It is skipped if parent@cognibridge.com already exists.
--
-- Sign-ins it creates (an existing harsh@cognibridge.com account is reused as is):
--   Student  harsh@cognibridge.com       / cognibridge123
--   Parent   parent@cognibridge.com      / parent123
--   Mentor   mentor.rao@cognibridge.com  / cognibridge123

do $$
declare
  v_harsh uuid;
  v_parent uuid;
  v_mentor uuid;
  session_row record;
  new_session_id uuid;

  create_user constant text := $sql$
    with new_user as (
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', $3, now(), now(), '', '', '', '')
      returning id, email
    )
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
      'email', now(), now(), now()
    from new_user
    returning user_id
  $sql$;
begin
  if exists (select 1 from auth.users where email = 'parent@cognibridge.com') then
    raise notice 'parent@cognibridge.com already exists; sample data not added again.';
    return;
  end if;

  select id into v_harsh from auth.users where email = 'harsh@cognibridge.com';
  if v_harsh is null then
    execute create_user into v_harsh
      using 'harsh@cognibridge.com', 'cognibridge123', '{"full_name":"Harsh","student_class":"8"}'::jsonb;
  end if;
  update public.profiles set display_name = 'Harsh' where id = v_harsh;

  execute create_user into v_parent
    using 'parent@cognibridge.com', 'parent123', '{"full_name":"Parent","account_type":"parent"}'::jsonb;

  select id into v_mentor from auth.users where email = 'mentor.rao@cognibridge.com';
  if v_mentor is null then
    execute create_user into v_mentor
      using 'mentor.rao@cognibridge.com', 'cognibridge123', '{"full_name":"Ms. Rao"}'::jsonb;
  end if;
  update public.profiles set role = 'mentor', display_name = 'Ms. Rao' where id = v_mentor;

  insert into public.parent_student_links (parent_id, student_id) values (v_parent, v_harsh)
  on conflict do nothing;
  insert into public.mentor_student_assignments (mentor_id, student_id) values (v_mentor, v_harsh)
  on conflict do nothing;

  -- Sessions relative to today: negative offsets are finished, positive are upcoming.
  for session_row in
    select * from (values
      (3, 'Maths', 'Fractions Practice', '16:00', '17:00', false, false, null::smallint),
      (7, 'Maths', 'Algebra Revision', '16:00', '17:00', false, false, null),
      (-1, 'Science', 'Plants and Photosynthesis', '15:00', '16:00', true, true, 5),
      (-4, 'English', 'Story Writing Circle', '17:00', '18:00', true, false, 4),
      (-6, 'SST', 'Rivers of India', '16:30', '17:30', false, false, null),
      (-9, 'Maths', 'Decimals Made Simple', '16:00', '17:00', true, false, 3),
      (-12, 'Science', 'States of Matter', '15:00', '16:00', true, true, 4)
    ) as v(day_offset, subject, title, start_time, end_time, attended, good, attention)
  loop
    insert into public.sessions (mentor_id, subject, title, description, session_date, start_time, end_time, meet_link, attendees)
    values (v_mentor, session_row.subject, session_row.title, 'Sample session for the parent portal demo.',
      (now() at time zone 'Asia/Kolkata')::date + session_row.day_offset,
      session_row.start_time, session_row.end_time,
      'https://meet.google.com/cb-sample-' || lower(replace(session_row.title, ' ', '-')), 1)
    returning id into new_session_id;

    insert into public.session_registrations (student_id, session_id, registered_at, attended_at, mentor_good, attention_level)
    values (v_harsh, new_session_id,
      now() - interval '14 days',
      case when session_row.attended then
        ((now() at time zone 'Asia/Kolkata')::date + session_row.day_offset + session_row.end_time::time) at time zone 'Asia/Kolkata'
      end,
      session_row.good, session_row.attention);
  end loop;

  -- Private check-ins (not shared with the mentor). Parents only ever see the ratings.
  insert into public.sensory_checkins (student_id, checkin_type, mood, emotions, energy, comfort, causes, mood_note, created_at)
  values
    (v_harsh, 'full', 4, '{calm,happy}', 4, 4, '{school}', 'Good day in class.', now() - interval '2 hours'),
    (v_harsh, 'quick', 3, '{tired}', null, null, '{}', '', now() - interval '1 day'),
    (v_harsh, 'full', 2, '{stressed,anxious}', 2, 3, '{homework,sleep}', 'Too much homework, slept late.', now() - interval '2 days'),
    (v_harsh, 'full', 3, '{confused}', 3, 3, '{school}', '', now() - interval '3 days'),
    (v_harsh, 'full', 4, '{excited}', 4, 5, '{friends}', '', now() - interval '5 days'),
    (v_harsh, 'quick', 5, '{happy}', null, null, '{}', '', now() - interval '7 days'),
    (v_harsh, 'full', 2, '{overwhelmed,frustrated}', 2, 2, '{sensory,event}', 'Assembly was really loud.', now() - interval '9 days'),
    (v_harsh, 'full', 4, '{calm}', 4, 4, '{family}', '', now() - interval '11 days');

  insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message, created_at)
  values
    (v_harsh, v_parent, v_mentor, v_parent, 'parent', 'Hello Ms. Rao, Harsh found the decimals session a bit fast. Is there anything we can practise at home?', now() - interval '6 days'),
    (v_harsh, v_parent, v_mentor, v_mentor, 'mentor', 'Thanks for letting me know! Try 10 minutes of money-based problems (prices with paise). I''ll slow down the next Maths session too.', now() - interval '5 days'),
    (v_harsh, v_parent, v_mentor, v_parent, 'parent', 'He really enjoyed the plants session yesterday and kept talking about it at dinner.', now() - interval '20 hours'),
    (v_harsh, v_parent, v_mentor, v_mentor, 'mentor', 'Lovely to hear! He asked great questions and helped a classmate. Marked as good participation.', now() - interval '8 hours');

  raise notice 'Sample parent portal data added for Harsh (student) and Parent.';
end;
$$;
