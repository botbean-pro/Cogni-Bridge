  -- Demo data for presenting the parent portal. NOT a migration: paste into the Supabase
  -- SQL Editor once. Safe to re-run (it clears and re-creates only the demo child's data).
  --
  -- Creates a fake student "Aarav Sharma", links them to the parent account below, and
  -- fills in two weeks of check-ins plus attended sessions with attention ratings.
  -- Student login (optional): aarav.demo@cognibridge.test / Demo@1234

  do $$
  declare
    parent_email constant text := 'shriyankalra26@gmail.com';
    child_email  constant text := 'aarav.demo@cognibridge.test';
    child_id     constant uuid := '8f0c2d3e-5a41-4b7e-9c66-2f1d0a7b9e11';
    parent_uuid  uuid;
  begin
    select u.id into parent_uuid
    from auth.users u join public.profiles p on p.id = u.id
    where u.email = parent_email and p.role = 'parent';
    if parent_uuid is null then
      raise exception 'No parent account found for %. Sign in with it once and set its role to parent first.', parent_email;
    end if;

    -- Start clean so re-running does not duplicate rows.
    delete from public.sessions where id::text like 'd0000000-0000-4000-8000-%';
    delete from auth.users where id = child_id;

    -- The profile row is created by the signup trigger (role defaults to student).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', child_id, 'authenticated', 'authenticated',
      child_email, extensions.crypt('Demo@1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Sharma"}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(), child_id, child_id::text,
      jsonb_build_object('sub', child_id::text, 'email', child_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    update public.profiles set display_name = 'Aarav Sharma' where id = child_id;

    insert into public.parent_student_links (parent_id, student_id) values (parent_uuid, child_id);

    -- Check-ins: (days ago, type, mood, energy, comfort, emotions, causes). Ratings only;
    -- the parent never sees written notes, and none are included here.
    insert into public.sensory_checkins (student_id, checkin_type, mood, energy, comfort, emotions, causes, created_at)
    select child_id, c.checkin_type, c.mood, c.energy, c.comfort, c.emotions, c.causes,
      (current_date - c.days_ago) + c.at_time
    from (values
      (13, 'full',  3, 3, 3, array['calm'],                          array['school'],              time '09:10'),
      (12, 'quick', 4, null::int, null::int, array['happy'],         array[]::text[],              time '16:30'),
      (11, 'full',  2, 2, 2, array['overwhelmed','tired'],           array['sensory','school'],    time '11:45'),
      (10, 'full',  3, 3, 4, array['anxious'],                       array['homework'],            time '19:05'),
      (9,  'quick', 4, null, null, array['calm','happy'],            array[]::text[],              time '17:15'),
      (8,  'full',  5, 4, 5, array['excited','happy'],               array['friends'],             time '15:20'),
      (7,  'full',  4, 4, 4, array['calm'],                          array['school'],              time '09:40'),
      (6,  'full',  2, 1, 2, array['stressed','overwhelmed'],        array['sensory','sleep'],     time '12:10'),
      (5,  'quick', 3, null, null, array['tired'],                   array[]::text[],              time '18:00'),
      (4,  'full',  4, 3, 4, array['calm','happy'],                  array['friends'],             time '16:05'),
      (3,  'full',  5, 5, 5, array['excited'],                       array['event'],               time '10:30'),
      (2,  'quick', 4, null, null, array['happy'],                   array[]::text[],              time '17:45'),
      (1,  'full',  3, 3, 3, array['anxious','confused'],            array['homework'],            time '19:20'),
      (0,  'full',  4, 4, 4, array['calm'],                          array['school'],              time '08:50')
    ) as c(days_ago, checkin_type, mood, energy, comfort, emotions, causes, at_time);

    -- Sessions the child registered for (mentor_id is left empty so no mentor account is needed).
    insert into public.sessions (id, subject, title, description, session_date, start_time, end_time, meet_link, attendees)
    values
      ('d0000000-0000-4000-8000-000000000001', 'Mathematics', 'Fractions Made Visual',    'Demo session', current_date - 12, '16:00', '16:45', 'https://meet.google.com/demo-aaa', 1),
      ('d0000000-0000-4000-8000-000000000002', 'Communication', 'Speaking With Confidence','Demo session', current_date - 10, '17:00', '17:40', 'https://meet.google.com/demo-bbb', 1),
      ('d0000000-0000-4000-8000-000000000003', 'Science',     'Plants and Photosynthesis', 'Demo session', current_date - 8,  '16:00', '16:50', 'https://meet.google.com/demo-ccc', 1),
      ('d0000000-0000-4000-8000-000000000004', 'Technology',  'Intro to Scratch Coding',   'Demo session', current_date - 5,  '18:00', '18:45', 'https://meet.google.com/demo-ddd', 1),
      ('d0000000-0000-4000-8000-000000000005', 'Mathematics', 'Patterns and Puzzles',      'Demo session', current_date - 3,  '16:00', '16:45', 'https://meet.google.com/demo-eee', 1),
      ('d0000000-0000-4000-8000-000000000006', 'English',     'Story Writing Workshop',    'Demo session', current_date - 1,  '17:00', '17:45', 'https://meet.google.com/demo-fff', 1);

    -- Attended (all but one), with the mentor's 1-5 attention rating and good-participation marks.
    insert into public.session_registrations (student_id, session_id, registered_at, attended_at, mentor_good, attention_level)
    select child_id, r.session_id::uuid,
      (current_date - r.days_ago - 1) + time '10:00',
      case when r.attended then (current_date - r.days_ago) + r.start::time else null end,
      r.good, r.attention
    from (values
      ('d0000000-0000-4000-8000-000000000001', 12, '16:00', true,  false, 4),
      ('d0000000-0000-4000-8000-000000000002', 10, '17:00', true,  true,  5),
      ('d0000000-0000-4000-8000-000000000003', 8,  '16:00', true,  false, 3),
      ('d0000000-0000-4000-8000-000000000004', 5,  '18:00', false, false, null::int),
      ('d0000000-0000-4000-8000-000000000005', 3,  '16:00', true,  true,  5),
      ('d0000000-0000-4000-8000-000000000006', 1,  '17:00', true,  false, 4)
    ) as r(session_id, days_ago, start, attended, good, attention);
  end $$;
  
