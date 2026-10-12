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

create table public.parent_student_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);

create table public.parent_link_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique check (char_length(code) between 8 and 32),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index parent_link_codes_expiry on public.parent_link_codes (expires_at);

create table public.parent_teacher_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'mentor')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index parent_teacher_messages_thread on public.parent_teacher_messages (parent_id, student_id, mentor_id, created_at);

alter table public.parent_student_links enable row level security;
alter table public.parent_link_codes enable row level security;
alter table public.parent_teacher_messages enable row level security;

create policy "Parents and children can read their links"
on public.parent_student_links for select to authenticated
using (parent_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy "Students can create their own parent link codes"
on public.parent_link_codes for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
);

create policy "Students can read and replace their own parent link codes"
on public.parent_link_codes for select to authenticated
using (student_id = (select auth.uid()));

create policy "Students can remove their own parent link codes"
on public.parent_link_codes for delete to authenticated
using (student_id = (select auth.uid()));

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

create policy "Assigned mentors can read linked parent profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.parent_student_links link
    join public.mentor_student_assignments assignment on assignment.student_id = link.student_id
    where link.parent_id = profiles.id and assignment.mentor_id = (select auth.uid())
  )
);

create policy "Parents can read linked students' assigned teachers"
on public.mentor_student_assignments for select to authenticated
using (
  exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = mentor_student_assignments.student_id)
);

create policy "Parents can read linked student learning activity"
on public.student_learning_activity for select to authenticated
using (
  exists (select 1 from public.parent_student_links link
    where link.parent_id = (select auth.uid()) and link.student_id = student_learning_activity.student_id)
);

create policy "Parents and assigned mentors can read consultation messages"
on public.parent_teacher_messages for select to authenticated
using (
  parent_id = (select auth.uid())
  or (mentor_id = (select auth.uid()) and exists (
    select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = parent_teacher_messages.student_id
  ))
);

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

create policy "Assigned mentors can reply to a linked parent"
on public.parent_teacher_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and sender_role = 'mentor' and mentor_id = (select auth.uid())
  and exists (select 1 from public.mentor_student_assignments assignment
    where assignment.mentor_id = (select auth.uid()) and assignment.student_id = parent_teacher_messages.student_id)
  and exists (select 1 from public.parent_student_links link
    where link.parent_id = parent_teacher_messages.parent_id and link.student_id = parent_teacher_messages.student_id)
);

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
