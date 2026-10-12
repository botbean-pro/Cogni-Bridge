-- CogniBridge database checks.
--
-- How to run: Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
-- The result grid lists every check, failures first. Every row should say PASS.
--
-- It creates throwaway users (emails ending in @cognibridge.test, names starting
-- with "DBTest"), acts as each of them to prove what RLS and the functions allow,
-- then deletes everything it created. Safe to run repeatedly.
--
-- Storage (mentor-notes bucket uploads) is not covered here; check that in the app.

reset role;

-- ---------------------------------------------------------------- helpers

drop table if exists pg_temp._ids;
create temp table _ids (key text primary key, id uuid not null);
insert into pg_temp._ids (key, id) values
  ('S1', 'd8000000-0000-4000-8000-000000000001'),  -- student, assigned to M1 and M2
  ('S2', 'd8000000-0000-4000-8000-000000000002'),  -- student, assigned to M1
  ('S3', 'd8000000-0000-4000-8000-000000000003'),  -- student, no mentor
  ('S4', 'd8000000-0000-4000-8000-000000000004'),  -- student, signed up without a name
  ('M1', 'd8000000-0000-4000-8000-000000000011'),  -- mentor of S1 and S2
  ('M2', 'd8000000-0000-4000-8000-000000000012'),  -- mentor of S1
  ('M3', 'd8000000-0000-4000-8000-000000000013'),  -- mentor, no students
  ('G1', 'd8000000-0000-4000-8000-000000000041'),  -- parent, links to S1 with a code
  ('G2', 'd8000000-0000-4000-8000-000000000042'),  -- parent, never linked
  ('P1', 'd8000000-0000-4000-8000-000000000021'),  -- M1 session, ended yesterday
  ('P2', 'd8000000-0000-4000-8000-000000000022'),  -- M1 session, ended two days ago
  ('F',  'd8000000-0000-4000-8000-000000000023'),  -- M1 session, in the future
  ('X',  'd8000000-0000-4000-8000-000000000024'),  -- M2 session, in the future
  ('N1', 'd8000000-0000-4000-8000-000000000025'),  -- created by M1 during the checks
  ('N2', 'd8000000-0000-4000-8000-000000000026'),  -- must never get created
  ('C1', 'd8000000-0000-4000-8000-000000000031'),  -- S1 private check-in
  ('C2', 'd8000000-0000-4000-8000-000000000032'),  -- S1 shared, asks all mentors to check in
  ('C3', 'd8000000-0000-4000-8000-000000000033'),  -- S1 shared, asks M2 specifically
  ('C4', 'd8000000-0000-4000-8000-000000000034');  -- S1 shared, but no help requested

drop table if exists pg_temp._r;
create temp table _r (n serial, passed boolean, name text, detail text);

-- Replaces {KEY} placeholders with the quoted uuid from _ids.
create or replace function pg_temp.fill(q text) returns text language plpgsql as $fn$
declare
  k record;
begin
  for k in select key, id from pg_temp._ids loop
    q := replace(q, '{' || k.key || '}', quote_literal(k.id::text));
  end loop;
  return q;
end
$fn$;

-- Runs q as 'admin' (no RLS), 'anon', or one of the _ids users. Returns the error
-- (sqlstate + message) or the first column of the first row.
create or replace function pg_temp.attempt(who text, q text, out err text, out val text)
language plpgsql as $fn$
declare
  stmt text := pg_temp.fill(q);
  uid text;
begin
  select id::text into uid from pg_temp._ids where key = who;
  begin
    if uid is not null then
      perform set_config('request.jwt.claim.sub', uid, true);
      perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
    elsif who = 'anon' then
      perform set_config('request.jwt.claim.sub', '', true);
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      execute 'set local role anon';
    end if;

    if stmt ~* '^\s*(select|with)' then
      execute stmt into val;
    else
      execute stmt;
    end if;
    execute 'reset role';
  exception when others then
    err := sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end
$fn$;

create or replace function pg_temp.ok(name text, who text, q text) returns void language plpgsql as $fn$
declare r record;
begin
  select * into r from pg_temp.attempt(who, q);
  insert into pg_temp._r (passed, name, detail) values (r.err is null, name, coalesce(r.err, 'ok'));
end
$fn$;

-- Passes only on a real refusal; syntax/undefined-object errors mean the check itself is broken.
create or replace function pg_temp.fails(name text, who text, q text) returns void language plpgsql as $fn$
declare r record;
begin
  select * into r from pg_temp.attempt(who, q);
  insert into pg_temp._r (passed, name, detail) values (
    r.err is not null and left(r.err, 5) not in ('42601', '42703', '42P01', '42883', '42804'),
    name,
    coalesce('refused: ' || r.err, 'NOT refused - it succeeded')
  );
end
$fn$;

create or replace function pg_temp.equals(name text, who text, q text, expected text) returns void language plpgsql as $fn$
declare r record;
begin
  select * into r from pg_temp.attempt(who, q);
  insert into pg_temp._r (passed, name, detail) values (
    r.err is null and r.val is not distinct from expected,
    name,
    coalesce('error: ' || r.err, 'got ' || coalesce(r.val, 'NULL') || ', expected ' || expected)
  );
end
$fn$;

-- Students first: their check-ins hold "on delete restrict" references to mentors.
create or replace function pg_temp.cleanup() returns void language plpgsql as $fn$
begin
  delete from public.sessions where id in (select id from pg_temp._ids where key in ('P1', 'P2', 'F', 'X', 'N1', 'N2'));
  delete from auth.users where id in (select id from pg_temp._ids where key like 'S%');
  delete from auth.users where id in (select id from pg_temp._ids where key like 'M%' or key like 'G%');
end
$fn$;

select pg_temp.cleanup();

-- ---------------------------------------------------------------- setup

select pg_temp.ok('setup: create test users', 'admin', $$
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ({S1}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-s1@cognibridge.test', '{}', '{"full_name":"DBTest S1"}', now(), now()),
    ({S2}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-s2@cognibridge.test', '{}', '{"full_name":"DBTest S2"}', now(), now()),
    ({S3}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-s3@cognibridge.test', '{}', '{"full_name":"DBTest S3"}', now(), now()),
    ({S4}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-s4@cognibridge.test', '{}', '{}', now(), now()),
    ({M1}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-m1@cognibridge.test', '{}', '{"full_name":"DBTest M1"}', now(), now()),
    ({M2}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-m2@cognibridge.test', '{}', '{"full_name":"DBTest M2"}', now(), now()),
    ({M3}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-m3@cognibridge.test', '{}', '{"full_name":"DBTest M3"}', now(), now())
$$);
select pg_temp.ok('setup: create parent users (signed up as parents)', 'admin', $$
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    ({G1}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-g1@cognibridge.test', '{}', '{"full_name":"DBTest G1","account_type":"parent"}', now(), now()),
    ({G2}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dbtest-g2@cognibridge.test', '{}', '{"full_name":"DBTest G2","account_type":"parent"}', now(), now())
$$);
select pg_temp.ok('setup: promote mentors', 'admin', $$
  update public.profiles set role = 'mentor' where id in ({M1}, {M2}, {M3})
$$);
select pg_temp.ok('setup: assign mentors', 'admin', $$
  insert into public.mentor_student_assignments (mentor_id, student_id) values ({M1}, {S1}), ({M2}, {S1}), ({M1}, {S2})
$$);
select pg_temp.ok('setup: create sessions', 'admin', $$
  insert into public.sessions (id, mentor_id, subject, title, session_date, start_time, end_time, meet_link)
  values
    ({P1}, {M1}, 'Maths', 'DBTest past 1', (now() at time zone 'Asia/Kolkata')::date - 1, '00:00', '00:30', 'https://meet.google.com/dbtest'),
    ({P2}, {M1}, 'Maths', 'DBTest past 2', (now() at time zone 'Asia/Kolkata')::date - 2, '00:00', '00:30', 'https://meet.google.com/dbtest'),
    ({F},  {M1}, 'Maths', 'DBTest future', (now() at time zone 'Asia/Kolkata')::date + 2, '10:00', '11:00', 'https://meet.google.com/dbtest'),
    ({X},  {M2}, 'Maths', 'DBTest M2 future', (now() at time zone 'Asia/Kolkata')::date + 2, '10:00', '11:00', 'https://meet.google.com/dbtest')
$$);

-- ---------------------------------------------------------------- profiles

select pg_temp.equals('profiles: signup creates a student profile with the full name', 'admin',
  $$ select display_name || '/' || role from public.profiles where id = {S3} $$, 'DBTest S3/student');
select pg_temp.equals('profiles: signup without a name defaults to "Student"', 'admin',
  $$ select display_name from public.profiles where id = {S4} $$, 'Student');
select pg_temp.equals('profiles: student can rename themselves', 'S1',
  $$ with u as (update public.profiles set display_name = 'DBTest S1' where id = {S1} returning 1) select count(*) from u $$, '1');
select pg_temp.fails('profiles: student cannot make themselves a mentor', 'S1',
  $$ update public.profiles set role = 'mentor' where id = {S1} $$);
select pg_temp.equals('profiles: student cannot rename another student', 'S1',
  $$ with u as (update public.profiles set display_name = 'hacked' where id = {S2} returning 1) select count(*) from u $$, '0');
select pg_temp.fails('profiles: users cannot insert profiles', 'S3',
  $$ insert into public.profiles (id, display_name) values ({M1}, 'x') $$);
select pg_temp.equals('profiles: student sees self + assigned mentors only (3)', 'S1',
  $$ select count(*) from public.profiles where id in ({S1}, {S2}, {S3}, {M1}, {M2}, {M3}) $$, '3');
select pg_temp.equals('profiles: mentor sees self + assigned students only (3)', 'M1',
  $$ select count(*) from public.profiles where id in ({S1}, {S2}, {S3}, {M1}, {M2}, {M3}) $$, '3');
select pg_temp.equals('profiles: unassigned student sees only self', 'S3',
  $$ select count(*) from public.profiles where id in ({S1}, {S2}, {S3}, {M1}, {M2}, {M3}) $$, '1');
select pg_temp.fails('profiles: logged-out visitors cannot read profiles', 'anon',
  $$ select count(*) from public.profiles $$);

-- ---------------------------------------------------------------- assignments

select pg_temp.equals('assignments: student sees their own (2)', 'S1',
  $$ select count(*) from public.mentor_student_assignments where mentor_id in ({M1}, {M2}, {M3}) $$, '2');
select pg_temp.equals('assignments: mentor sees their own (2)', 'M1',
  $$ select count(*) from public.mentor_student_assignments where mentor_id in ({M1}, {M2}, {M3}) $$, '2');
select pg_temp.equals('assignments: unassigned mentor sees none', 'M3',
  $$ select count(*) from public.mentor_student_assignments where mentor_id in ({M1}, {M2}, {M3}) $$, '0');
select pg_temp.fails('assignments: student cannot assign themselves a mentor', 'S3',
  $$ insert into public.mentor_student_assignments (mentor_id, student_id) values ({M3}, {S3}) $$);
select pg_temp.fails('assignments: mentor cannot assign themselves a student', 'M3',
  $$ insert into public.mentor_student_assignments (mentor_id, student_id) values ({M3}, {S3}) $$);

-- ---------------------------------------------------------------- sensory check-ins

select pg_temp.ok('checkins: student saves a private check-in', 'S1',
  $$ insert into public.sensory_checkins (id, student_id, checkin_type, mood) values ({C1}, {S1}, 'quick', 3) $$);
select pg_temp.ok('checkins: student shares a check-in asking for a check-in', 'S1',
  $$ insert into public.sensory_checkins (id, student_id, checkin_type, mood, shared_with_mentor, mentor_help, day_note)
     values ({C2}, {S1}, 'quick', 2, true, 'check_in', 'DBTest secret note') $$);
select pg_temp.ok('checkins: student asks a specific assigned mentor', 'S1',
  $$ insert into public.sensory_checkins (id, student_id, checkin_type, mood, shared_with_mentor, mentor_help, selected_mentor_id)
     values ({C3}, {S1}, 'quick', 2, true, 'specific_mentor', {M2}) $$);
select pg_temp.ok('checkins: student shares without asking for help', 'S1',
  $$ insert into public.sensory_checkins (id, student_id, checkin_type, mood, energy, comfort, shared_with_mentor)
     values ({C4}, {S1}, 'full', 4, 3, 3, true) $$);
select pg_temp.fails('checkins: student cannot save a check-in as someone else', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood) values ({S2}, 'quick', 3) $$);
select pg_temp.fails('checkins: student with no mentor cannot share', 'S3',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood, shared_with_mentor, mentor_help)
     values ({S3}, 'quick', 3, true, 'check_in') $$);
select pg_temp.fails('checkins: student cannot pick a mentor they are not assigned to', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood, shared_with_mentor, mentor_help, selected_mentor_id)
     values ({S1}, 'quick', 3, true, 'specific_mentor', {M3}) $$);
select pg_temp.fails('checkins: mentors cannot save check-ins', 'M1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood) values ({M1}, 'quick', 3) $$);
select pg_temp.fails('checkins: mood must be 1-5', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood) values ({S1}, 'quick', 6) $$);
select pg_temp.fails('checkins: unknown emotions are rejected', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood, emotions) values ({S1}, 'quick', 3, array['bored']) $$);
select pg_temp.fails('checkins: full check-in needs energy and comfort', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood) values ({S1}, 'full', 3) $$);
select pg_temp.fails('checkins: specific_mentor needs a chosen mentor', 'S1',
  $$ insert into public.sensory_checkins (student_id, checkin_type, mood, shared_with_mentor, mentor_help)
     values ({S1}, 'quick', 3, true, 'specific_mentor') $$);
select pg_temp.equals('checkins: student sees all their own (4)', 'S1',
  $$ select count(*) from public.sensory_checkins where id in ({C1}, {C2}, {C3}, {C4}) $$, '4');
select pg_temp.equals('checkins: other student sees none', 'S2',
  $$ select count(*) from public.sensory_checkins where id in ({C1}, {C2}, {C3}, {C4}) $$, '0');
select pg_temp.equals('checkins: M1 sees shared ones not aimed at M2 (2)', 'M1',
  $$ select count(*) from public.sensory_checkins where id in ({C1}, {C2}, {C3}, {C4}) $$, '2');
select pg_temp.equals('checkins: M2 sees all shared ones incl. the one aimed at them (3)', 'M2',
  $$ select count(*) from public.sensory_checkins where id in ({C1}, {C2}, {C3}, {C4}) $$, '3');
select pg_temp.equals('checkins: unassigned mentor sees none', 'M3',
  $$ select count(*) from public.sensory_checkins where id in ({C1}, {C2}, {C3}, {C4}) $$, '0');
select pg_temp.fails('checkins: mentors cannot edit check-ins', 'M1',
  $$ update public.sensory_checkins set mood = 1 where id = {C2} $$);
select pg_temp.equals('checkins: other student cannot delete it', 'S2',
  $$ with d as (delete from public.sensory_checkins where id = {C2} returning 1) select count(*) from d $$, '0');
select pg_temp.equals('checkins: mentor cannot delete it', 'M1',
  $$ with d as (delete from public.sensory_checkins where id = {C2} returning 1) select count(*) from d $$, '0');
select pg_temp.equals('checkins: student can delete their own', 'S1',
  $$ with d as (delete from public.sensory_checkins where id = {C1} returning 1) select count(*) from d $$, '1');

-- ---------------------------------------------------------------- sensory notifications

select pg_temp.equals('notifications: "check in" request notifies every assigned mentor (2)', 'admin',
  $$ select count(*) from public.sensory_notifications where checkin_id = {C2} $$, '2');
select pg_temp.equals('notifications: specific request notifies only that mentor', 'admin',
  $$ select string_agg(recipient_id::text, ',') = {M2} from public.sensory_notifications where checkin_id = {C3} $$, 'true');
select pg_temp.equals('notifications: shared without asking for help notifies nobody', 'admin',
  $$ select count(*) from public.sensory_notifications where checkin_id = {C4} $$, '0');
select pg_temp.equals('notifications: M1 sees only theirs (1)', 'M1',
  $$ select count(*) from public.sensory_notifications where checkin_id in ({C2}, {C3}, {C4}) $$, '1');
select pg_temp.equals('notifications: M2 sees only theirs (2)', 'M2',
  $$ select count(*) from public.sensory_notifications where checkin_id in ({C2}, {C3}, {C4}) $$, '2');
select pg_temp.equals('notifications: student sees all for their own check-ins (3)', 'S1',
  $$ select count(*) from public.sensory_notifications where checkin_id in ({C2}, {C3}, {C4}) $$, '3');
select pg_temp.equals('notifications: other student sees none', 'S2',
  $$ select count(*) from public.sensory_notifications where checkin_id in ({C2}, {C3}, {C4}) $$, '0');
select pg_temp.equals('notifications: mentor marks theirs as viewed', 'M1',
  $$ with u as (update public.sensory_notifications set viewed_at = now() where checkin_id = {C2} and recipient_id = {M1} returning 1)
     select count(*) from u $$, '1');
select pg_temp.fails('notifications: viewed time cannot be changed afterwards', 'M1',
  $$ update public.sensory_notifications set viewed_at = now() + interval '1 hour' where checkin_id = {C2} and recipient_id = {M1} $$);
select pg_temp.equals('notifications: mentor replies', 'M1',
  $$ with u as (update public.sensory_notifications set addressed_at = now(), mentor_message = 'DBTest reply'
                where checkin_id = {C2} and recipient_id = {M1} returning 1)
     select count(*) from u $$, '1');
select pg_temp.fails('notifications: reply cannot be re-addressed', 'M1',
  $$ update public.sensory_notifications set addressed_at = now() + interval '1 hour' where checkin_id = {C2} and recipient_id = {M1} $$);
select pg_temp.equals('notifications: student sees the mentor''s reply', 'S1',
  $$ select mentor_message from public.sensory_notifications where checkin_id = {C2} and recipient_id = {M1} $$, 'DBTest reply');
select pg_temp.equals('notifications: mentor cannot touch another mentor''s notification', 'M1',
  $$ with u as (update public.sensory_notifications set mentor_message = 'hacked' where recipient_id = {M2} and checkin_id in ({C2}, {C3}) returning 1)
     select count(*) from u $$, '0');
select pg_temp.fails('notifications: mentor cannot redirect a notification', 'M1',
  $$ update public.sensory_notifications set recipient_id = {M2} where checkin_id = {C2} and recipient_id = {M1} $$);
select pg_temp.equals('notifications: student cannot edit notifications', 'S1',
  $$ with u as (update public.sensory_notifications set mentor_message = 'fake' where checkin_id = {C3} returning 1) select count(*) from u $$, '0');
select pg_temp.fails('notifications: nobody can create them by hand', 'M1',
  $$ insert into public.sensory_notifications (checkin_id, recipient_id) values ({C4}, {M1}) $$);

-- ---------------------------------------------------------------- sessions

select pg_temp.equals('sessions: logged-out visitors can read sessions', 'anon',
  $$ select count(*) from public.sessions where id in ({P1}, {P2}, {F}, {X}) $$, '4');
select pg_temp.ok('sessions: mentor creates a session', 'M1',
  $$ insert into public.sessions (id, mentor_id, subject, title, session_date, start_time, end_time, meet_link)
     values ({N1}, {M1}, 'Maths', 'DBTest new', current_date + 5, '10:00', '11:00', 'https://meet.google.com/dbtest') $$);
select pg_temp.fails('sessions: mentor cannot create one for another mentor', 'M1',
  $$ insert into public.sessions (id, mentor_id, subject, title, session_date, start_time, end_time, meet_link)
     values ({N2}, {M2}, 'Maths', 'DBTest bad', current_date + 5, '10:00', '11:00', 'https://meet.google.com/dbtest') $$);
select pg_temp.fails('sessions: students cannot create sessions', 'S1',
  $$ insert into public.sessions (id, mentor_id, subject, title, session_date, start_time, end_time, meet_link)
     values ({N2}, {S1}, 'Maths', 'DBTest bad', current_date + 5, '10:00', '11:00', 'https://meet.google.com/dbtest') $$);
select pg_temp.fails('sessions: logged-out visitors cannot create sessions', 'anon',
  $$ insert into public.sessions (id, subject, title, session_date, start_time, end_time, meet_link)
     values ({N2}, 'Maths', 'DBTest bad', current_date + 5, '10:00', '11:00', 'https://meet.google.com/dbtest') $$);
select pg_temp.fails('sessions: times must be HH:MM', 'M1',
  $$ insert into public.sessions (id, mentor_id, subject, title, session_date, start_time, end_time, meet_link)
     values ({N2}, {M1}, 'Maths', 'DBTest bad', current_date + 5, '25:00', '11:00', 'https://meet.google.com/dbtest') $$);
select pg_temp.equals('sessions: mentor edits their own session', 'M1',
  $$ with u as (update public.sessions set title = 'DBTest edited' where id = {N1} returning 1) select count(*) from u $$, '1');
select pg_temp.equals('sessions: mentor cannot edit another mentor''s session', 'M2',
  $$ with u as (update public.sessions set title = 'hacked' where id = {P1} returning 1) select count(*) from u $$, '0');
select pg_temp.fails('sessions: mentor cannot hand their session to someone else', 'M1',
  $$ update public.sessions set mentor_id = {M2} where id = {N1} $$);
select pg_temp.fails('sessions: mentor cannot change the attendee count', 'M1',
  $$ update public.sessions set attendees = 999 where id = {N1} $$);
select pg_temp.fails('sessions: nobody can delete sessions', 'M1',
  $$ delete from public.sessions where id = {N1} $$);

-- ---------------------------------------------------------------- mentor notes

select pg_temp.ok('notes: mentor saves a note', 'M1',
  $$ insert into public.mentor_notes (mentor_id, subject, title, file_path, file_name, file_size)
     values ({M1}, 'Maths', 'DBTest note', 'dbtest/note.pdf', 'note.pdf', 100) $$);
select pg_temp.fails('notes: mentor cannot save a note as another mentor', 'M2',
  $$ insert into public.mentor_notes (mentor_id, subject, title, file_path, file_name, file_size)
     values ({M1}, 'Maths', 'DBTest bad', 'dbtest/x.pdf', 'x.pdf', 100) $$);
select pg_temp.fails('notes: students cannot save notes', 'S1',
  $$ insert into public.mentor_notes (mentor_id, subject, title, file_path, file_name, file_size)
     values ({S1}, 'Maths', 'DBTest bad', 'dbtest/x.pdf', 'x.pdf', 100) $$);
select pg_temp.fails('notes: files over 10 MB are rejected', 'M1',
  $$ insert into public.mentor_notes (mentor_id, subject, title, file_path, file_name, file_size)
     values ({M1}, 'Maths', 'DBTest big', 'dbtest/x.pdf', 'x.pdf', 20000000) $$);
select pg_temp.equals('notes: mentor sees their own note', 'M1',
  $$ select count(*) from public.mentor_notes where mentor_id = {M1} $$, '1');
select pg_temp.equals('notes: other mentor cannot see it', 'M2',
  $$ select count(*) from public.mentor_notes where mentor_id = {M1} $$, '0');
select pg_temp.equals('notes: students can see every mentor''s notes', 'S1',
  $$ select count(*) from public.mentor_notes where mentor_id = {M1} $$, '1');
select pg_temp.equals('notes: parents cannot see notes', 'G1',
  $$ select count(*) from public.mentor_notes where mentor_id = {M1} $$, '0');
select pg_temp.fails('notes: notes cannot be deleted from the client', 'M1',
  $$ delete from public.mentor_notes where mentor_id = {M1} $$);

-- ---------------------------------------------------------------- AI usage limit

select pg_temp.equals('ai: usage starts at 0', 'S1', $$ select public.ai_tokens_used_today() $$, '0');
select pg_temp.equals('ai: recording 100 tokens', 'S1', $$ select public.record_ai_usage(100) $$, '100');
select pg_temp.equals('ai: recording adds up', 'S1', $$ select public.record_ai_usage(50) $$, '150');
select pg_temp.equals('ai: negative amounts cannot reduce usage', 'S1', $$ select public.record_ai_usage(-500) $$, '150');
select pg_temp.equals('ai: usage is read back', 'S1', $$ select public.ai_tokens_used_today() $$, '150');
select pg_temp.equals('ai: usage is per user', 'S2', $$ select public.ai_tokens_used_today() $$, '0');
select pg_temp.equals('ai: a single huge amount is capped at 1,000,000', 'S2', $$ select public.record_ai_usage(5000000) $$, '1000000');
select pg_temp.fails('ai: users cannot read the usage table directly', 'S1', $$ select count(*) from public.ai_usage $$);
select pg_temp.fails('ai: users cannot edit the usage table directly', 'S1', $$ delete from public.ai_usage $$);
select pg_temp.fails('ai: logged-out visitors cannot record usage', 'anon', $$ select public.record_ai_usage(10) $$);

-- ---------------------------------------------------------------- registrations & attendance

select pg_temp.equals('registrations: student registers', 'S1', $$ select public.register_for_session({F}) $$, 'true');
select pg_temp.equals('registrations: registering twice returns false', 'S1', $$ select public.register_for_session({F}) $$, 'false');
select pg_temp.equals('registrations: attendee count went up exactly once', 'anon',
  $$ select attendees from public.sessions where id = {F} $$, '1');
select pg_temp.fails('registrations: mentors cannot register', 'M1', $$ select public.register_for_session({F}) $$);
select pg_temp.fails('registrations: unknown session is rejected', 'S1',
  $$ select public.register_for_session('00000000-0000-4000-8000-000000000000') $$);
select pg_temp.fails('registrations: logged-out visitors cannot register', 'anon', $$ select public.register_for_session({F}) $$);
select pg_temp.fails('attendance: cannot mark a session that has not finished', 'S1', $$ select public.mark_session_attended({F}) $$);
select pg_temp.ok('registrations: S1 registers for past session 1', 'S1', $$ select public.register_for_session({P1}) $$);
select pg_temp.ok('registrations: S1 registers for past session 2', 'S1', $$ select public.register_for_session({P2}) $$);
select pg_temp.ok('registrations: S2 registers for past session 1', 'S2', $$ select public.register_for_session({P1}) $$);
select pg_temp.equals('attendance: student marks a finished session', 'S1', $$ select public.mark_session_attended({P1}) $$, 'true');
select pg_temp.equals('attendance: marking twice returns false', 'S1', $$ select public.mark_session_attended({P1}) $$, 'false');
select pg_temp.equals('attendance: student marks a second finished session', 'S1', $$ select public.mark_session_attended({P2}) $$, 'true');
select pg_temp.fails('attendance: mentors cannot mark attendance', 'M1', $$ select public.mark_session_attended({P1}) $$);
select pg_temp.fails('registrations: students cannot insert rows directly', 'S3',
  $$ insert into public.session_registrations (student_id, session_id) values ({S3}, {X}) $$);
select pg_temp.fails('registrations: students cannot give themselves a "good" mark', 'S1',
  $$ update public.session_registrations set mentor_good = true where student_id = {S1} $$);
select pg_temp.equals('registrations: student sees only their own (3)', 'S1',
  $$ select count(*) from public.session_registrations where session_id in ({P1}, {P2}, {F}, {X}) $$, '3');
select pg_temp.equals('registrations: other student sees only their own (1)', 'S2',
  $$ select count(*) from public.session_registrations where session_id in ({P1}, {P2}, {F}, {X}) $$, '1');

-- ---------------------------------------------------------------- mentor view of registrations

select pg_temp.equals('mentor: session owner lists registered students (2)', 'M1',
  $$ select count(*) from public.session_students({P1}) $$, '2');
select pg_temp.fails('mentor: other mentors cannot list them', 'M2', $$ select count(*) from public.session_students({P1}) $$);
select pg_temp.fails('mentor: students cannot list them', 'S1', $$ select count(*) from public.session_students({P1}) $$);
select pg_temp.ok('mentor: session owner marks good participation', 'M1', $$ select public.set_student_good({P1}, {S1}, true) $$);
select pg_temp.equals('mentor: the good mark is saved', 'M1',
  $$ select mentor_good from public.session_students({P1}) where student_id = {S1} $$, 'true');
select pg_temp.fails('mentor: other mentors cannot mark good participation', 'M2', $$ select public.set_student_good({P1}, {S1}, true) $$);
select pg_temp.fails('mentor: cannot mark a student who did not register', 'M1', $$ select public.set_student_good({P1}, {S3}, true) $$);
select pg_temp.fails('mentor: internal is_session_mentor() is not callable', 'S1', $$ select public.is_session_mentor({P1}) $$);

-- ---------------------------------------------------------------- attention rating

select pg_temp.ok('attention: session owner rates a student', 'M1', $$ select public.set_student_attention({P1}, {S1}, 4) $$);
select pg_temp.equals('attention: the rating is saved', 'M1',
  $$ select attention_level from public.session_students({P1}) where student_id = {S1} $$, '4');
select pg_temp.fails('attention: must be 1-5', 'M1', $$ select public.set_student_attention({P1}, {S1}, 6) $$);
select pg_temp.fails('attention: other mentors cannot rate', 'M2', $$ select public.set_student_attention({P1}, {S1}, 5) $$);
select pg_temp.fails('attention: students cannot rate themselves', 'S1', $$ select public.set_student_attention({P1}, {S1}, 5) $$);
select pg_temp.fails('attention: cannot rate an unregistered student', 'M1', $$ select public.set_student_attention({P1}, {S3}, 3) $$);

-- ---------------------------------------------------------------- mentor performance page

select pg_temp.equals('performance: mentor sees attended sessions of assigned students (2)', 'M1',
  $$ select count(*) from public.mentor_student_activity() where student_id in ({S1}, {S2}, {S3}) $$, '2');
select pg_temp.equals('performance: duration comes from session times', 'M1',
  $$ select duration_minutes from public.mentor_student_activity() where session_id = {P1}::text $$, '30');
select pg_temp.equals('performance: unassigned mentor sees none', 'M3',
  $$ select count(*) from public.mentor_student_activity() where student_id in ({S1}, {S2}, {S3}) $$, '0');

-- ---------------------------------------------------------------- parents: signup and linking

select pg_temp.equals('parents: signing up as a parent creates a parent profile', 'admin',
  $$ select role::text from public.profiles where id = {G1} $$, 'parent');
select pg_temp.ok('parents: student creates a connection code', 'S1',
  $$ insert into public.parent_link_codes (student_id, code, expires_at) values ({S1}, 'DBTESTCODE01', now() + interval '1 hour') $$);
select pg_temp.fails('parents: student cannot create a code for someone else', 'S1',
  $$ insert into public.parent_link_codes (student_id, code, expires_at) values ({S2}, 'DBTESTCODE02', now() + interval '1 hour') $$);
select pg_temp.ok('setup: expired code for S2', 'admin',
  $$ insert into public.parent_link_codes (student_id, code, expires_at) values ({S2}, 'DBTESTCODE03', now() - interval '1 minute') $$);
select pg_temp.equals('parents: other students cannot read the code', 'S2',
  $$ select count(*) from public.parent_link_codes where code = 'DBTESTCODE01' $$, '0');
select pg_temp.fails('parents: students cannot use a code', 'S3', $$ select * from public.connect_parent_with_code('DBTESTCODE01') $$);
select pg_temp.equals('parents: parent links with the code (case-insensitive)', 'G1',
  $$ select student_id::text = {S1} from public.connect_parent_with_code('  dbtestcode01 ') $$, 'true');
select pg_temp.fails('parents: a code works only once', 'G2', $$ select * from public.connect_parent_with_code('DBTESTCODE01') $$);
select pg_temp.fails('parents: expired codes are rejected', 'G1', $$ select * from public.connect_parent_with_code('DBTESTCODE03') $$);
select pg_temp.fails('parents: links cannot be created directly', 'G2',
  $$ insert into public.parent_student_links (parent_id, student_id) values ({G2}, {S2}) $$);
select pg_temp.equals('parents: parent sees their child''s profile', 'G1',
  $$ select count(*) from public.profiles where id = {S1} $$, '1');
select pg_temp.equals('parents: parent cannot see other students', 'G1',
  $$ select count(*) from public.profiles where id in ({S2}, {S3}) $$, '0');
select pg_temp.equals('parents: student sees their linked parent', 'S1',
  $$ select count(*) from public.profiles where id = {G1} $$, '1');
select pg_temp.equals('parents: other students cannot see that parent', 'S2',
  $$ select count(*) from public.profiles where id = {G1} $$, '0');
select pg_temp.fails('parents: parents cannot register for sessions', 'G1', $$ select public.register_for_session({F}) $$);

-- ---------------------------------------------------------------- parents: what they can see

select pg_temp.equals('parents: parent sees the child''s check-ins (3)', 'G1',
  $$ select count(*) from public.child_checkins({S1}) $$, '3');
select pg_temp.equals('parents: written notes are never included', 'G1',
  $$ select bool_or(row_to_json(c)::text like '%DBTest secret%') from public.child_checkins({S1}) c $$, 'false');
select pg_temp.equals('parents: the student still sees their own note', 'S1',
  $$ select day_note from public.sensory_checkins where id = {C2} $$, 'DBTest secret note');
select pg_temp.equals('parents: parent cannot read the check-in table directly', 'G1',
  $$ select count(*) from public.sensory_checkins where student_id = {S1} $$, '0');
select pg_temp.fails('parents: not for another student', 'G1', $$ select count(*) from public.child_checkins({S2}) $$);
select pg_temp.fails('parents: unlinked parent gets nothing', 'G2', $$ select count(*) from public.child_checkins({S1}) $$);
select pg_temp.fails('parents: students cannot use the parent view', 'S1', $$ select count(*) from public.child_checkins({S1}) $$);
select pg_temp.fails('parents: mentors cannot use the parent view', 'M1', $$ select count(*) from public.child_sessions({S1}) $$);
select pg_temp.equals('parents: parent sees the child''s sessions (3)', 'G1',
  $$ select count(*) from public.child_sessions({S1}) $$, '3');
select pg_temp.equals('parents: parent sees attendance and the attention rating', 'G1',
  $$ select (attended_at is not null)::text || '/' || attention_level || '/' || ended from public.child_sessions({S1}) where session_id = {P1} $$, 'true/4/true');
select pg_temp.equals('parents: upcoming sessions are not marked ended', 'G1',
  $$ select ended::text from public.child_sessions({S1}) where session_id = {F} $$, 'false');
select pg_temp.fails('parents: unlinked parent cannot see sessions', 'G2', $$ select count(*) from public.child_sessions({S1}) $$);

-- ---------------------------------------------------------------- parents: teacher messages

select pg_temp.ok('messages: parent writes to the child''s assigned mentor', 'G1',
  $$ insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message)
     values ({S1}, {G1}, {M1}, {G1}, 'parent', 'DBTest hello') $$);
select pg_temp.fails('messages: parent cannot write to an unassigned mentor', 'G1',
  $$ insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message)
     values ({S1}, {G1}, {M3}, {G1}, 'parent', 'DBTest hello') $$);
select pg_temp.fails('messages: unlinked parent cannot write about the child', 'G2',
  $$ insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message)
     values ({S1}, {G2}, {M1}, {G2}, 'parent', 'DBTest hello') $$);
select pg_temp.fails('messages: parent cannot pose as the mentor', 'G1',
  $$ insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message)
     values ({S1}, {G1}, {M1}, {M1}, 'mentor', 'DBTest fake') $$);
select pg_temp.equals('messages: the mentor sees the thread', 'M1',
  $$ select count(*) from public.parent_teacher_messages where parent_id = {G1} $$, '1');
select pg_temp.ok('messages: the mentor replies', 'M1',
  $$ insert into public.parent_teacher_messages (student_id, parent_id, mentor_id, sender_id, sender_role, message)
     values ({S1}, {G1}, {M1}, {M1}, 'mentor', 'DBTest reply') $$);
select pg_temp.equals('messages: the parent sees both messages', 'G1',
  $$ select count(*) from public.parent_teacher_messages where parent_id = {G1} $$, '2');
select pg_temp.equals('messages: other mentors cannot read the thread', 'M2',
  $$ select count(*) from public.parent_teacher_messages where parent_id = {G1} $$, '0');
select pg_temp.equals('messages: other parents cannot read the thread', 'G2',
  $$ select count(*) from public.parent_teacher_messages where parent_id = {G1} $$, '0');

-- ---------------------------------------------------------------- leaderboard
-- S1: 3 registered (+15), 2 attended (+20), 0 missed, 1 good mark (+5) = 40, streak 2.
-- S2: 1 registered (+5), 1 missed (-10) = -5.

select pg_temp.equals('leaderboard: S1 points', 'S1', $$ select points from public.leaderboard() where display_name = 'DBTest S1' $$, '40');
select pg_temp.equals('leaderboard: S1 streak', 'S1', $$ select streak from public.leaderboard() where display_name = 'DBTest S1' $$, '2');
select pg_temp.equals('leaderboard: S1 attended', 'S1', $$ select attended from public.leaderboard() where display_name = 'DBTest S1' $$, '2');
select pg_temp.equals('leaderboard: S2 missed', 'S1', $$ select missed from public.leaderboard() where display_name = 'DBTest S2' $$, '1');
select pg_temp.equals('leaderboard: S2 points', 'S1', $$ select points from public.leaderboard() where display_name = 'DBTest S2' $$, '-5');
select pg_temp.equals('leaderboard: is_me true on own row', 'S1', $$ select is_me from public.leaderboard() where display_name = 'DBTest S1' $$, 'true');
select pg_temp.equals('leaderboard: is_me false on others', 'S1', $$ select is_me from public.leaderboard() where display_name = 'DBTest S2' $$, 'false');
select pg_temp.equals('leaderboard: students with no registrations are not listed', 'S1',
  $$ select count(*) from public.leaderboard() where display_name = 'DBTest S3' $$, '0');
select pg_temp.fails('leaderboard: logged-out visitors cannot see it', 'anon', $$ select count(*) from public.leaderboard() $$);

-- ---------------------------------------------------------------- results

select pg_temp.cleanup();

select
  n,
  case when passed then 'PASS' else 'FAIL' end as result,
  name,
  detail,
  (select count(*) filter (where passed) || ' / ' || count(*) from pg_temp._r) as total_passed
from pg_temp._r
order by passed, n;
