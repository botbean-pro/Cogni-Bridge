-- Demo data for the mentor's parent chat. NOT a migration: paste into the Supabase SQL Editor
-- (after running 20261022000100_mentor_parent_chat.sql). Safe to re-run.
--
-- Gives every student who has no parent yet a fake parent account and links them, skipping
-- harsh@cognibridge.com (which already has real parents). Where the student has a mentor,
-- it also adds a short parent-mentor conversation so the chat has something to show.
-- Fake parents can sign in with their email (parent.<n>@cognibridge.test) / Parent@1234.
-- To remove them later: delete from auth.users where raw_user_meta_data ->> 'demo_parent' = 'true';

do $$
declare
  parent_names constant text[] := array[
    'Anita Verma', 'Rajesh Gupta', 'Meera Iyer', 'Sanjay Patel', 'Kavita Reddy', 'Vikram Singh',
    'Pooja Nair', 'Arjun Mehta', 'Sunita Joshi', 'Rahul Kapoor', 'Deepa Menon', 'Amit Banerjee'
  ];
  student record;
  assignment record;
  parent_uuid uuid;
  parent_email text;
  parent_name text;
  counter integer := (select count(*) from auth.users where raw_user_meta_data ->> 'demo_parent' = 'true');
  thread integer := 0;
begin
  for student in
    select profile.id, profile.display_name
    from public.profiles profile
    left join auth.users account on account.id = profile.id
    where profile.role = 'student'
      and lower(coalesce(account.email, '')) <> 'harsh@cognibridge.com'
      and not exists (select 1 from public.parent_student_links link where link.student_id = profile.id)
    order by profile.created_at
  loop
    loop
      counter := counter + 1;
      parent_email := format('parent.%s@cognibridge.test', counter);
      exit when not exists (select 1 from auth.users where email = parent_email);
    end loop;
    parent_uuid := gen_random_uuid();
    parent_name := parent_names[1 + (counter - 1) % array_length(parent_names, 1)];

    -- account_type makes the signup trigger create a parent profile.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', parent_uuid, 'authenticated', 'authenticated',
      parent_email, extensions.crypt('Parent@1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', parent_name, 'account_type', 'parent', 'demo_parent', 'true'),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(), parent_uuid, parent_uuid::text,
      jsonb_build_object('sub', parent_uuid::text, 'email', parent_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    update public.profiles set role = 'parent', display_name = parent_name where id = parent_uuid;
    insert into public.parent_student_links (parent_id, student_id) values (parent_uuid, student.id);

    -- One short conversation with each of the student's mentors; wording rotates between threads.
    for assignment in
      select mentor_id from public.mentor_student_assignments where student_id = student.id
    loop
      thread := thread + 1;
      insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message, created_at)
      select student.id, parent_uuid, assignment.mentor_id,
        case when m.sender = 'parent' then parent_uuid else assignment.mentor_id end,
        m.sender, replace(m.body, '{child}', student.display_name),
        now() - make_interval(days => m.days_ago, mins => m.mins_ago)
      from (values
        (1, 'parent', 'Hello! I''m {child}''s parent. How is {child} doing in the sessions so far?', 3, 120),
        (1, 'mentor', 'Hi! {child} has been joining regularly and is really trying. Focus is improving each week.', 3, 90),
        (1, 'parent', 'That''s great to hear, thank you. Is there anything we can practise at home?', 2, 300),
        (1, 'mentor', 'Short 10-minute reading sessions with breaks would help a lot. I''ll share notes after Friday''s class.', 2, 240),
        (2, 'parent', 'Good evening. {child} felt a bit overwhelmed after yesterday''s class.', 1, 400),
        (2, 'mentor', 'Thanks for letting me know. I''ll keep the next session calmer and add a movement break.', 1, 360),
        (2, 'parent', 'Thank you so much, that really helps.', 0, 45),
        (3, 'parent', 'Hi, will there be a session this weekend? {child} is excited about the science topic.', 4, 60),
        (3, 'mentor', 'Yes! Saturday at 11. {child} can bring any questions about plants.', 4, 30),
        (3, 'parent', 'Perfect, we''ll be there.', 0, 15)
      ) as m(variant, sender, body, days_ago, mins_ago)
      where m.variant = 1 + (thread - 1) % 3;
    end loop;
  end loop;
end $$;

-- Shows what was created.
select account.email as parent_login, parent.display_name as parent_name, student.display_name as child,
  (select count(*) from public.parent_teacher_messages message where message.parent_id = parent.id) as messages
from public.profiles parent
join auth.users account on account.id = parent.id
join public.parent_student_links link on link.parent_id = parent.id
join public.profiles student on student.id = link.student_id
where account.raw_user_meta_data ->> 'demo_parent' = 'true'
order by account.email;
