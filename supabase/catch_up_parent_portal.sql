-- Catch-up script for databases where the parent-portal migrations did not apply.
-- NOT a migration: paste the whole file into the Supabase SQL Editor and Run once.
-- Safe to re-run: every step checks for (or replaces) what already exists.
--
-- Applies, in order, the contents of:
--   20261012000100_student_learning_activity.sql
--   20261012000300_parent_portal.sql
--   20261012000350_lock_session_attendees.sql
--   20261012000400_student_note_access.sql
--   20261012000600_parent_portal.sql
--   20261013000100_claim_parent_role.sql
-- Afterwards, re-run supabase/demo_child_seed.sql to create and link the demo child.

-- The 'parent' role value must already be committed before the functions below are created.
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'cognibridge_role' and e.enumlabel = 'parent'
  ) then
    raise exception 'Run this line on its own first, then run this script again: alter type public.cognibridge_role add value if not exists ''parent'';';
  end if;
end $$;

-- ================================================================ student_learning_activity

create table if not exists public.student_learning_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null check (char_length(session_id) between 1 and 120),
  subject text not null check (char_length(subject) between 1 and 80),
  activity_date date not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

create index if not exists student_learning_activity_student_recent
  on public.student_learning_activity (student_id, activity_date desc);

alter table public.student_learning_activity enable row level security;

drop policy if exists "Students and assigned mentors can read learning activity" on public.student_learning_activity;
create policy "Students and assigned mentors can read learning activity"
on public.student_learning_activity for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid())
      and assignment.student_id = student_learning_activity.student_id
  )
);

drop policy if exists "Students can record their own learning activity" on public.student_learning_activity;
create policy "Students can record their own learning activity"
on public.student_learning_activity for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  )
);

revoke all on public.student_learning_activity from public, anon, authenticated;
grant select, insert on public.student_learning_activity to authenticated;

-- ================================================================ parent portal: tables

create or replace function public.create_cognibridge_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.cognibridge_role;
begin
  new_role := case when new.raw_user_meta_data ->> 'account_type' = 'parent'
    then 'parent'::public.cognibridge_role
    else 'student'::public.cognibridge_role end;
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'), 80),
    new_role
  );
  return new;
end;
$$;

create table if not exists public.parent_student_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);

create table if not exists public.parent_link_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique check (char_length(code) between 8 and 32),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists parent_link_codes_expiry on public.parent_link_codes (expires_at);

create table if not exists public.parent_teacher_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'mentor')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists parent_teacher_messages_thread on public.parent_teacher_messages (parent_id, student_id, mentor_id, created_at);

alter table public.parent_student_links enable row level security;
alter table public.parent_link_codes enable row level security;
alter table public.parent_teacher_messages enable row level security;

-- ================================================================ parent portal: policies

drop policy if exists "Parents and children can read their links" on public.parent_student_links;
create policy "Parents and children can read their links"
on public.parent_student_links for select to authenticated
using (parent_id = (select auth.uid()) or student_id = (select auth.uid()));

drop policy if exists "Students can create their own parent link codes" on public.parent_link_codes;
create policy "Students can create their own parent link codes"
on public.parent_link_codes for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
);

drop policy if exists "Students can read and replace their own parent link codes" on public.parent_link_codes;
create policy "Students can read and replace their own parent link codes"
on public.parent_link_codes for select to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "Students can remove their own parent link codes" on public.parent_link_codes;
create policy "Students can remove their own parent link codes"
on public.parent_link_codes for delete to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "Parents can read linked child profiles and assigned mentors" on public.profiles;
create policy "Parents can read linked child profiles and assigned mentors"
on public.profiles for select to authenticated
using (
  exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = profiles.id)
  or exists (
    select 1 from public.mentor_student_assignments assignment
    join public.parent_student_links link on link.student_id = assignment.student_id
    where link.parent_id = (select auth.uid()) and assignment.mentor_id = profiles.id
  )
);

drop policy if exists "Assigned mentors can read linked parent profiles" on public.profiles;
create policy "Assigned mentors can read linked parent profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.parent_student_links link
    join public.mentor_student_assignments assignment on assignment.student_id = link.student_id
    where link.parent_id = profiles.id and assignment.mentor_id = (select auth.uid())
  )
);

drop policy if exists "Parents can read linked students' assigned teachers" on public.mentor_student_assignments;
create policy "Parents can read linked students' assigned teachers"
on public.mentor_student_assignments for select to authenticated
using (
  exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = mentor_student_assignments.student_id)
);

drop policy if exists "Parents can read linked student learning activity" on public.student_learning_activity;
create policy "Parents can read linked student learning activity"
on public.student_learning_activity for select to authenticated
using (
  exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = student_learning_activity.student_id)
);

drop policy if exists "Parents and assigned mentors can read consultation messages" on public.parent_teacher_messages;
create policy "Parents and assigned mentors can read consultation messages"
on public.parent_teacher_messages for select to authenticated
using (
  parent_id = (select auth.uid())
  or (mentor_id = (select auth.uid()) and exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = parent_teacher_messages.student_id
  ))
);

drop policy if exists "Parents can message their child's assigned mentor" on public.parent_teacher_messages;
create policy "Parents can message their child's assigned mentor"
on public.parent_teacher_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and sender_role = 'parent' and parent_id = (select auth.uid())
  and exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = parent_teacher_messages.student_id)
  and exists (select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = parent_teacher_messages.mentor_id
      and assignment.student_id = parent_teacher_messages.student_id)
);

drop policy if exists "Assigned mentors can reply to a linked parent" on public.parent_teacher_messages;
create policy "Assigned mentors can reply to a linked parent"
on public.parent_teacher_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and sender_role = 'mentor' and mentor_id = (select auth.uid())
  and exists (select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = parent_teacher_messages.student_id)
  and exists (select 1 from public.parent_student_links link
    where link.parent_id = parent_teacher_messages.parent_id and link.student_id = parent_teacher_messages.student_id)
);

drop policy if exists "Students can read their linked parents' profiles" on public.profiles;
create policy "Students can read their linked parents' profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.parent_student_links link
    where link.student_id = (select auth.uid()) and link.parent_id = profiles.id
  )
);

-- ================================================================ parent portal: link codes

create or replace function public.connect_parent_with_code(link_code text)
returns table (student_id uuid, student_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  code_row public.parent_link_codes%rowtype;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'parent') then
    raise exception 'Only parent accounts can connect to a student';
  end if;
  select * into code_row from public.parent_link_codes
    where code = upper(btrim(link_code)) and expires_at > now()
    for update;
  if not found then raise exception 'This code is invalid or expired'; end if;
  insert into public.parent_student_links (parent_id, student_id)
    values (auth.uid(), code_row.student_id) on conflict do nothing;
  delete from public.parent_link_codes where id = code_row.id;
  return query select profile.id, profile.display_name from public.profiles profile where profile.id = code_row.student_id;
end;
$$;

revoke all on public.parent_student_links, public.parent_link_codes, public.parent_teacher_messages from public, anon, authenticated;
grant select on public.parent_student_links to authenticated;
grant select, insert, delete on public.parent_link_codes to authenticated;
grant select, insert on public.parent_teacher_messages to authenticated;
revoke all on function public.connect_parent_with_code(text) from public, anon;
grant execute on function public.connect_parent_with_code(text) to authenticated;

-- ================================================================ session attendees lock

revoke update on public.sessions from authenticated;
grant update (subject, title, description, learn, session_date, start_time, end_time, meet_link)
  on public.sessions to authenticated;

-- ================================================================ student note access

drop policy if exists "Students can read all notes" on public.mentor_notes;
create policy "Students can read all notes"
on public.mentor_notes for select to authenticated
using (
  exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

drop policy if exists "Students can read note files" on storage.objects;
create policy "Students can read note files"
on storage.objects for select to authenticated
using (
  bucket_id = 'mentor-notes'
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

-- ================================================================ attention rating + parent views

alter table public.session_registrations
  add column if not exists attention_level smallint check (attention_level between 1 and 5);

create or replace function public.set_student_attention(p_session_id uuid, p_student_id uuid, p_level integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_session_mentor(p_session_id) then
    raise exception 'Only this session''s mentor can rate attention';
  end if;

  update public.session_registrations
  set attention_level = p_level
  where session_id = p_session_id and student_id = p_student_id;
  if not found then
    raise exception 'That student is not registered for this session';
  end if;
end;
$$;

-- Return type changes, so it has to be dropped and recreated.
drop function if exists public.session_students(uuid);

create function public.session_students(p_session_id uuid)
returns table (
  student_id uuid,
  display_name text,
  registered_at timestamptz,
  attended_at timestamptz,
  mentor_good boolean,
  attention_level smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_session_mentor(p_session_id) then
    raise exception 'Only this session''s mentor can see its students';
  end if;

  return query
  select registration.student_id, profile.display_name, registration.registered_at,
    registration.attended_at, registration.mentor_good, registration.attention_level
  from public.session_registrations registration
  join public.profiles profile on profile.id = registration.student_id
  where registration.session_id = p_session_id
  order by profile.display_name;
end;
$$;

create or replace function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_student_links link
    join public.profiles parent on parent.id = link.parent_id and parent.role = 'parent'
    join public.profiles student on student.id = link.student_id and student.role = 'student'
    where link.parent_id = (select auth.uid()) and link.student_id = p_student_id
  );
$$;

create or replace function public.child_checkins(p_student_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  checkin_type text,
  mood smallint,
  emotions text[],
  energy smallint,
  comfort smallint,
  causes text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_parent_of(p_student_id) then
    raise exception 'Only a linked parent can see this student''s check-ins';
  end if;

  return query
  select checkin.id, checkin.created_at, checkin.checkin_type, checkin.mood, checkin.emotions,
    checkin.energy, checkin.comfort, checkin.causes
  from public.sensory_checkins checkin
  where checkin.student_id = p_student_id
  order by checkin.created_at desc
  limit 200;
end;
$$;

create or replace function public.child_sessions(p_student_id uuid)
returns table (
  session_id uuid,
  title text,
  subject text,
  session_date date,
  start_time text,
  end_time text,
  registered_at timestamptz,
  attended_at timestamptz,
  ended boolean,
  mentor_good boolean,
  attention_level smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_parent_of(p_student_id) then
    raise exception 'Only a linked parent can see this student''s sessions';
  end if;

  return query
  select s.id, s.title, s.subject, s.session_date, s.start_time, s.end_time,
    registration.registered_at, registration.attended_at,
    ((s.session_date + s.end_time::time) at time zone 'Asia/Kolkata') <= now(),
    registration.mentor_good, registration.attention_level
  from public.session_registrations registration
  join public.sessions s on s.id = registration.session_id
  where registration.student_id = p_student_id
  order by s.session_date desc, s.start_time desc;
end;
$$;

create or replace function public.mentor_student_activity()
returns table (
  student_id uuid,
  session_id text,
  subject text,
  activity_date date,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select registration.student_id, s.id::text, s.subject, s.session_date,
    ((extract(epoch from (s.end_time::time - s.start_time::time)) / 60)::integer + 1440) % 1440
  from public.session_registrations registration
  join public.sessions s on s.id = registration.session_id
  join public.mentor_student_assignments assignment on assignment.student_id = registration.student_id
  join public.profiles mentor on mentor.id = assignment.mentor_id and mentor.role = 'mentor'
  where assignment.mentor_id = (select auth.uid())
    and registration.attended_at is not null
  order by s.session_date desc;
$$;

revoke all on function public.set_student_attention(uuid, uuid, integer) from public, anon;
revoke all on function public.session_students(uuid) from public, anon;
revoke all on function public.is_parent_of(uuid) from public, anon, authenticated;
revoke all on function public.child_checkins(uuid) from public, anon;
revoke all on function public.child_sessions(uuid) from public, anon;
revoke all on function public.mentor_student_activity() from public, anon;
grant execute on function public.set_student_attention(uuid, uuid, integer) to authenticated;
grant execute on function public.session_students(uuid) to authenticated;
grant execute on function public.child_checkins(uuid) to authenticated;
grant execute on function public.child_sessions(uuid) to authenticated;
grant execute on function public.mentor_student_activity() to authenticated;

-- ================================================================ Google sign-up from the Parent tab

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
