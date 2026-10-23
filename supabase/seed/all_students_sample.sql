-- Sample data for every student account, so the mentor's student profile page
-- (/mentor/students/:id) has something to show for each of them:
--   * class, section, age and a made-up school, only where the student left them blank
--   * two or three chosen subjects ("Wants to learn"), only where they chose none
--   * ten sample sessions (seven finished, three upcoming), with each student registered
--     for a random mix and given attendance, attention ratings and "good participation" marks
--
-- Not a migration: run it by hand in the Supabase SQL editor. Safe to re-run: the sample
-- sessions (and every registration for them) from an earlier run are removed first, then
-- recreated with a fresh random mix. Details a student filled in themselves are never
-- overwritten. The sample sessions belong to the oldest mentor account, if there is one.
--
-- Students still have to be added under a mentor (Settings > Add) before that mentor can
-- open their profile page; this script does not change who is under whom.

do $$
declare
  v_mentor uuid;
  session_row record;
  new_session_id uuid;
  sample_description constant text := 'Sample session for the mentor student profile demo.';
  schools constant text[] := array[
    'Greenfield Public School', 'Sunrise Vidya Mandir', 'Lotus Valley Academy',
    'Riverdale International School', 'Little Banyan School', 'Blue Hills Convent School'
  ];
  sections constant text[] := array['A', 'B', 'C', 'D'];
  subject_sets constant text[][] := array[
    array['Maths', 'Science', 'Computer Science'],
    array['English', 'Art', 'Hindi'],
    array['Science', 'Artificial Intelligence', 'Maths'],
    array['SST', 'English', 'Languages'],
    array['Computer Science', 'Artificial Intelligence', 'Art'],
    array['Maths', 'SST', 'English']
  ];
begin
  if not exists (select 1 from public.profiles where role = 'student') then
    raise exception 'There are no student accounts yet. Sign up a student in the app first.';
  end if;

  select id into v_mentor from public.profiles where role = 'mentor' order by created_at limit 1;

  -- Fill blank sign-up details. Existing non-empty values win over the sample ones.
  update auth.users account
  set raw_user_meta_data = jsonb_build_object(
      'student_class', (6 + student.n % 5)::text,
      'section', sections[1 + student.n % array_length(sections, 1)],
      'age', (11 + student.n % 5)::text,
      'school', schools[1 + student.n % array_length(schools, 1)]
    ) || coalesce((
      select jsonb_object_agg(field.key, field.value)
      from jsonb_each(account.raw_user_meta_data) field
      where field.value not in ('""'::jsonb, 'null'::jsonb)
    ), '{}'::jsonb),
    updated_at = now()
  from (
    select id, (row_number() over (order by created_at, id) - 1)::integer as n
    from public.profiles where role = 'student'
  ) student
  where account.id = student.id;

  -- Chosen subjects, only for students who skipped the subject picker.
  update public.profiles profile
  set preferred_subjects = (
    select array_agg(subject)
    from unnest(subject_sets[1 + student.n % array_length(subject_sets, 1):1 + student.n % array_length(subject_sets, 1)]) subject
  )
  from (
    select id, (row_number() over (order by created_at, id) - 1)::integer as n
    from public.profiles where role = 'student'
  ) student
  where profile.id = student.id and cardinality(profile.preferred_subjects) = 0;

  -- Clear an earlier run (registrations go with their sessions).
  delete from public.sessions where description = sample_description;

  -- Sessions relative to today: negative offsets are finished, positive are upcoming.
  for session_row in
    select * from (values
      (-20, 'Maths', 'Shapes and Angles', '16:00', '17:00'),
      (-17, 'English', 'Reading Comprehension', '15:00', '16:00'),
      (-14, 'Science', 'States of Matter', '15:00', '16:00'),
      (-11, 'Computer Science', 'Intro to Scratch', '17:00', '18:00'),
      (-8, 'SST', 'Rivers of India', '16:30', '17:30'),
      (-5, 'Maths', 'Decimals Made Simple', '16:00', '17:00'),
      (-2, 'Artificial Intelligence', 'How Chatbots Learn', '17:00', '18:00'),
      (2, 'Science', 'Electricity Basics', '15:00', '16:00'),
      (5, 'Art', 'Colour and Calm', '16:00', '17:00'),
      (9, 'English', 'Story Writing Circle', '17:00', '18:00')
    ) as v(day_offset, subject, title, start_time, end_time)
  loop
    insert into public.sessions (mentor_id, subject, title, description, session_date, start_time, end_time, meet_link)
    values (v_mentor, session_row.subject, session_row.title, sample_description,
      (now() at time zone 'Asia/Kolkata')::date + session_row.day_offset,
      session_row.start_time, session_row.end_time,
      'https://meet.google.com/cb-sample-' || lower(replace(session_row.title, ' ', '-')))
    returning id into new_session_id;

    -- Each student registers for about three in four finished sessions and half the upcoming
    -- ones, attends most of what they registered for, and gets a 2-5 attention rating (some
    -- left unrated) and an occasional "good participation" mark.
    insert into public.session_registrations (student_id, session_id, registered_at, attended_at, mentor_good, attention_level)
    select pick.student_id, new_session_id,
      least(now(), ((now() at time zone 'Asia/Kolkata')::date + session_row.day_offset - 3)::timestamp at time zone 'Asia/Kolkata'),
      case when pick.attended then
        ((now() at time zone 'Asia/Kolkata')::date + session_row.day_offset + session_row.end_time::time) at time zone 'Asia/Kolkata'
      end,
      pick.attended and random() < 0.3,
      case when pick.attended and random() < 0.9 then (2 + floor(random() * 4))::smallint end
    from (
      select profile.id as student_id, session_row.day_offset < 0 and random() < 0.8 as attended
      from public.profiles profile
      where profile.role = 'student'
        and random() < case when session_row.day_offset < 0 then 0.75 else 0.5 end
    ) pick;

    update public.sessions
    set attendees = (select count(*) from public.session_registrations where session_id = new_session_id)
    where id = new_session_id;
  end loop;
end;
$$;

-- What each student ended up with.
select profile.display_name,
  account.raw_user_meta_data ->> 'student_class' as class,
  account.raw_user_meta_data ->> 'section' as section,
  account.raw_user_meta_data ->> 'age' as age,
  account.raw_user_meta_data ->> 'school' as school,
  profile.preferred_subjects,
  count(registration.session_id) as sample_sessions,
  count(registration.attended_at) as attended
from public.profiles profile
join auth.users account on account.id = profile.id
left join public.session_registrations registration
  on registration.student_id = profile.id
  and registration.session_id in (select id from public.sessions where description = 'Sample session for the mentor student profile demo.')
where profile.role = 'student'
group by profile.id, profile.display_name, account.raw_user_meta_data, profile.preferred_subjects
order by profile.display_name;
