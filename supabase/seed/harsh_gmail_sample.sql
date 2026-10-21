-- Sample data for the existing harsh@gmail.com student: two weeks of mood check-ins (for the
-- mood graph), finished and upcoming sessions with attendance and attention ratings, and a
-- parent-teacher conversation.
--
-- Not a migration: run it by hand in the Supabase SQL editor. Safe to re-run: rows from an
-- earlier run (tagged "Sample:" / the sample session description) are removed first, and
-- Harsh's own check-ins and sessions are left alone.
--
-- Uses the parent already linked to harsh@gmail.com and the mentor already assigned to him.
-- If there is none, it creates and links:
--   Parent  harsh.parent@cognibridge.com / parent123
--   Mentor  mentor.rao@cognibridge.com   / cognibridge123

do $$
declare
  v_harsh uuid;
  v_parent uuid;
  v_mentor uuid;
  session_row record;
  new_session_id uuid;
  sample_description constant text := 'Sample session for the harsh@gmail.com demo.';

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
  select id into v_harsh from auth.users where lower(email) = 'harsh@gmail.com';
  if v_harsh is null then
    raise exception 'harsh@gmail.com does not exist yet. Sign up with it in the app first.';
  end if;

  -- Parent: the one already linked, otherwise reuse or create harsh.parent@cognibridge.com.
  select parent_id into v_parent from public.parent_student_links
  where student_id = v_harsh order by created_at limit 1;
  if v_parent is null then
    select id into v_parent from auth.users where email = 'harsh.parent@cognibridge.com';
    if v_parent is null then
      execute create_user into v_parent
        using 'harsh.parent@cognibridge.com', 'parent123', '{"full_name":"Harsh''s Parent","account_type":"parent"}'::jsonb;
    end if;
    update public.profiles set role = 'parent', display_name = 'Harsh''s Parent' where id = v_parent;
    insert into public.parent_student_links (parent_id, student_id) values (v_parent, v_harsh) on conflict do nothing;
  end if;

  -- Mentor: the one already assigned, otherwise reuse or create mentor.rao@cognibridge.com.
  select mentor_id into v_mentor from public.mentor_student_assignments
  where student_id = v_harsh order by created_at limit 1;
  if v_mentor is null then
    select id into v_mentor from auth.users where email = 'mentor.rao@cognibridge.com';
    if v_mentor is null then
      execute create_user into v_mentor
        using 'mentor.rao@cognibridge.com', 'cognibridge123', '{"full_name":"Ms. Rao"}'::jsonb;
      update public.profiles set display_name = 'Ms. Rao' where id = v_mentor;
    end if;
    update public.profiles set role = 'mentor' where id = v_mentor;
    insert into public.mentor_student_assignments (mentor_id, student_id) values (v_mentor, v_harsh) on conflict do nothing;
  end if;

  -- Clear an earlier run.
  delete from public.sessions where description = sample_description;
  delete from public.sensory_checkins where student_id = v_harsh and mood_note like 'Sample:%';
  delete from public.parent_teacher_messages
  where student_id = v_harsh and parent_id = v_parent and mentor_id = v_mentor and message like '%(sample)';

  -- Sessions relative to today: negative offsets are finished, positive are upcoming.
  for session_row in
    select * from (values
      (2, 'Maths', 'Fractions Practice', '16:00', '17:00', false, false, null::smallint),
      (6, 'Science', 'Electricity Basics', '15:00', '16:00', false, false, null),
      (-1, 'Science', 'Plants and Photosynthesis', '15:00', '16:00', true, true, 5),
      (-3, 'English', 'Story Writing Circle', '17:00', '18:00', true, false, 4),
      (-5, 'SST', 'Rivers of India', '16:30', '17:30', false, false, null),
      (-8, 'Maths', 'Decimals Made Simple', '16:00', '17:00', true, false, 3),
      (-10, 'Science', 'States of Matter', '15:00', '16:00', true, true, 4),
      (-13, 'Maths', 'Shapes and Angles', '16:00', '17:00', true, false, 2)
    ) as v(day_offset, subject, title, start_time, end_time, attended, good, attention)
  loop
    insert into public.sessions (mentor_id, subject, title, description, session_date, start_time, end_time, meet_link, attendees)
    values (v_mentor, session_row.subject, session_row.title, sample_description,
      (now() at time zone 'Asia/Kolkata')::date + session_row.day_offset,
      session_row.start_time, session_row.end_time,
      'https://meet.google.com/cb-sample-' || lower(replace(session_row.title, ' ', '-')), 1)
    returning id into new_session_id;

    insert into public.session_registrations (student_id, session_id, registered_at, attended_at, mentor_good, attention_level)
    values (v_harsh, new_session_id,
      now() - interval '15 days',
      case when session_row.attended then
        ((now() at time zone 'Asia/Kolkata')::date + session_row.day_offset + session_row.end_time::time) at time zone 'Asia/Kolkata'
      end,
      session_row.good, session_row.attention);
  end loop;

  -- Two weeks of private check-ins, a dip mid-week and a recovery, so every line of the graph moves.
  -- Parents only ever see the ratings, emotions and causes, never the notes.
  insert into public.sensory_checkins (student_id, checkin_type, mood, emotions, energy, comfort, causes, mood_note, created_at)
  select v_harsh, v.checkin_type, v.mood, v.emotions, v.energy, v.comfort, v.causes,
    'Sample: ' || v.note, now() - make_interval(days => v.days_ago, hours => v.hours_ago)
  from (values
    (0, 2, 'full', 4, '{calm,happy}'::text[], 4, 4, '{school}'::text[], 'Good day in class.'),
    (1, 3, 'full', 4, '{excited}', 5, 4, '{friends}', 'Played football after school.'),
    (1, 9, 'quick', 3, '{tired}', null, null, '{}', 'Bit sleepy this morning.'),
    (2, 4, 'full', 3, '{confused}', 3, 3, '{homework}', 'Science homework was hard.'),
    (3, 5, 'full', 2, '{stressed,anxious}', 2, 3, '{homework,sleep}', 'Too much homework, slept late.'),
    (4, 6, 'full', 2, '{overwhelmed,frustrated}', 2, 2, '{sensory,event}', 'Assembly was really loud.'),
    (5, 2, 'quick', 3, '{calm}', null, null, '{}', 'Feeling okay.'),
    (6, 4, 'full', 3, '{tired}', 2, 3, '{sleep}', 'Did not sleep well.'),
    (7, 3, 'full', 4, '{happy}', 4, 4, '{family}', 'Family dinner out.'),
    (8, 5, 'full', 4, '{calm}', 3, 4, '{school}', 'Liked the decimals class.'),
    (9, 4, 'quick', 5, '{happy,excited}', null, null, '{}', 'Got a good mark!'),
    (10, 3, 'full', 5, '{excited}', 5, 5, '{friends}', 'Science project with friends.'),
    (11, 6, 'full', 3, '{sad}', 3, 3, '{social}', 'Argument with a friend.'),
    (12, 5, 'full', 4, '{calm}', 4, 4, '{school}', 'Normal day.'),
    (13, 4, 'full', 3, '{tired,confused}', 3, 2, '{discomfort}', 'Headache in the afternoon.')
  ) as v(days_ago, hours_ago, checkin_type, mood, emotions, energy, comfort, causes, note);

  insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message, created_at)
  values
    (v_harsh, v_parent, v_mentor, v_parent, 'parent', 'Hello, Harsh found the decimals session a bit fast. Is there anything we can practise at home? (sample)', now() - interval '7 days'),
    (v_harsh, v_parent, v_mentor, v_mentor, 'mentor', 'Thanks for letting me know! Try 10 minutes of money problems (prices with paise). I''ll slow down the next Maths session too. (sample)', now() - interval '6 days'),
    (v_harsh, v_parent, v_mentor, v_parent, 'parent', 'He really enjoyed the plants session yesterday and kept talking about it at dinner. (sample)', now() - interval '20 hours'),
    (v_harsh, v_parent, v_mentor, v_mentor, 'mentor', 'Lovely to hear! He asked great questions and helped a classmate. (sample)', now() - interval '8 hours');

  raise notice 'Sample data added for harsh@gmail.com. Parent account: %',
    (select email from auth.users where id = v_parent);
end;
$$;
