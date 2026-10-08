create type public.cognibridge_role as enum ('student', 'mentor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 80),
  role public.cognibridge_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.mentor_student_assignments (
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mentor_id, student_id),
  check (mentor_id <> student_id)
);

create table public.sensory_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  checkin_type text not null check (checkin_type in ('quick', 'full')),
  mood smallint not null check (mood between 1 and 5),
  mood_note text not null default '' check (char_length(mood_note) <= 250),
  emotions text[] not null default '{}',
  emotion_note text not null default '' check (char_length(emotion_note) <= 250),
  energy smallint check (energy between 1 and 5),
  comfort smallint check (comfort between 1 and 5),
  day_note text not null default '' check (char_length(day_note) <= 4000),
  causes text[] not null default '{}',
  cause_note text not null default '' check (char_length(cause_note) <= 250),
  overwhelm_note text not null default '' check (char_length(overwhelm_note) <= 2000),
  helpful_actions text[] not null default '{}',
  helpful_note text not null default '' check (char_length(helpful_note) <= 250),
  mentor_help text not null default 'none' check (mentor_help in ('none', 'check_in', 'school', 'personal', 'feelings', 'specific_mentor')),
  selected_mentor_id uuid references public.profiles (id) on delete restrict,
  mentor_message text not null default '' check (char_length(mentor_message) <= 2000),
  shared_with_mentor boolean not null default false,
  created_at timestamptz not null default now(),
  check (checkin_type <> 'full' or (energy is not null and comfort is not null)),
  check (selected_mentor_id is null or (shared_with_mentor and mentor_help = 'specific_mentor')),
  check (not shared_with_mentor or mentor_help <> 'specific_mentor' or selected_mentor_id is not null),
  check (emotions <@ array['happy', 'sad', 'angry', 'anxious', 'stressed', 'tired', 'lonely', 'confused', 'excited', 'overwhelmed', 'calm', 'frustrated', 'other']::text[]),
  check (causes <@ array['school', 'homework', 'friends', 'family', 'social', 'sensory', 'sleep', 'discomfort', 'event', 'unknown', 'other']::text[]),
  check (helpful_actions <@ array['talking', 'break', 'music', 'alone', 'outside', 'movement', 'breathing', 'someone_helped', 'nothing_yet', 'other']::text[])
);

create table public.sensory_notifications (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.sensory_checkins (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  addressed_at timestamptz,
  mentor_message text not null default '' check (char_length(mentor_message) <= 2000),
  unique (checkin_id, recipient_id)
);

create index sensory_checkins_student_recent on public.sensory_checkins (student_id, created_at desc);
create index sensory_notifications_recipient_recent on public.sensory_notifications (recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.mentor_student_assignments enable row level security;
alter table public.sensory_checkins enable row level security;
alter table public.sensory_notifications enable row level security;

create policy "Users can read their own profile or assigned people"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.mentor_student_assignments assignment
    where (assignment.mentor_id = (select auth.uid()) and assignment.student_id = profiles.id)
       or (assignment.student_id = (select auth.uid()) and assignment.mentor_id = profiles.id)
  )
);

create policy "Users can update their own display name"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Assigned mentors and students can read their assignment"
on public.mentor_student_assignments for select to authenticated
using (mentor_id = (select auth.uid()) or student_id = (select auth.uid()));

create policy "Students can read their own check-ins and shared entries are visible to assigned mentors"
on public.sensory_checkins for select to authenticated
using (
  (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
  )
  or (
    shared_with_mentor
    and exists (
      select 1
      from public.mentor_student_assignments assignment
      join public.profiles mentor on mentor.id = assignment.mentor_id
      where assignment.student_id = sensory_checkins.student_id
        and assignment.mentor_id = (select auth.uid())
        and mentor.role = 'mentor'
        and (sensory_checkins.selected_mentor_id is null or sensory_checkins.selected_mentor_id = (select auth.uid()))
    )
  )
);

create policy "Students can create their own check-ins"
on public.sensory_checkins for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
  and (
    not shared_with_mentor
    or exists (
      select 1 from public.mentor_student_assignments assignment
      join public.profiles mentor on mentor.id = assignment.mentor_id
      where assignment.student_id = (select auth.uid())
        and mentor.role = 'mentor'
        and (selected_mentor_id is null or assignment.mentor_id = selected_mentor_id)
    )
  )
);

create policy "Students can delete their own check-ins"
on public.sensory_checkins for delete to authenticated
using (
  student_id = (select auth.uid())
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

create policy "Students and recipients can read sensory notifications"
on public.sensory_notifications for select to authenticated
using (
  (
    recipient_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles mentor
      join public.mentor_student_assignments assignment on assignment.mentor_id = mentor.id
      join public.sensory_checkins checkin on checkin.student_id = assignment.student_id
      where mentor.id = (select auth.uid())
        and mentor.role = 'mentor'
        and checkin.id = sensory_notifications.checkin_id
        and checkin.shared_with_mentor
        and (checkin.selected_mentor_id is null or checkin.selected_mentor_id = mentor.id)
    )
  )
  or exists (
    select 1 from public.sensory_checkins checkin
    where checkin.id = sensory_notifications.checkin_id
      and checkin.student_id = (select auth.uid())
  )
);

create policy "Assigned recipients can update their notification status and response"
on public.sensory_notifications for update to authenticated
using (
  recipient_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles mentor
    join public.mentor_student_assignments assignment on assignment.mentor_id = mentor.id
    join public.sensory_checkins checkin on checkin.student_id = assignment.student_id
    where mentor.id = (select auth.uid())
      and mentor.role = 'mentor'
      and checkin.id = sensory_notifications.checkin_id
      and checkin.shared_with_mentor
      and (checkin.selected_mentor_id is null or checkin.selected_mentor_id = mentor.id)
  )
)
with check (recipient_id = (select auth.uid()));

create function public.create_sensory_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.shared_with_mentor and new.mentor_help <> 'none' then
    insert into public.sensory_notifications (checkin_id, recipient_id)
    select new.id, assignment.mentor_id
    from public.mentor_student_assignments assignment
    join public.profiles mentor on mentor.id = assignment.mentor_id and mentor.role = 'mentor'
    where assignment.student_id = new.student_id
      and (new.selected_mentor_id is null or assignment.mentor_id = new.selected_mentor_id)
    on conflict (checkin_id, recipient_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger sensory_checkins_create_notifications
after insert on public.sensory_checkins
for each row execute function public.create_sensory_notifications();

create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Profile roles can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create function public.protect_sensory_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.checkin_id is distinct from old.checkin_id
    or new.recipient_id is distinct from old.recipient_id
    or new.created_at is distinct from old.created_at
    or (old.viewed_at is not null and new.viewed_at is distinct from old.viewed_at)
    or (old.addressed_at is not null and new.addressed_at is distinct from old.addressed_at) then
    raise exception 'Notification identity and status are protected';
  end if;
  return new;
end;
$$;

create trigger sensory_notifications_protect_identity
before update on public.sensory_notifications
for each row execute function public.protect_sensory_notification();

create function public.create_cognibridge_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'), 80),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_cognibridge_profile();

revoke all on public.profiles, public.mentor_student_assignments, public.sensory_checkins, public.sensory_notifications from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.mentor_student_assignments to authenticated;
grant select, insert, delete on public.sensory_checkins to authenticated;
grant select on public.sensory_notifications to authenticated;
grant update (viewed_at, addressed_at, mentor_message) on public.sensory_notifications to authenticated;
revoke all on function public.create_sensory_notifications() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
revoke all on function public.protect_sensory_notification() from public, anon, authenticated;
revoke all on function public.create_cognibridge_profile() from public, anon, authenticated;