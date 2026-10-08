create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  learn text[] not null default '{}',
  session_date date not null,
  start_time text not null check (start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  end_time text not null check (end_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  meet_link text not null,
  attendees integer not null default 0 check (attendees >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_date_idx on public.sessions (session_date, start_time);

alter table public.sessions enable row level security;

create policy "Anyone can read sessions"
on public.sessions for select
to anon, authenticated
using (true);

create policy "Mentors can create sessions"
on public.sessions for insert
to authenticated
with check (
  mentor_id = (select auth.uid())
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'mentor')
);

create policy "Mentors can update their own sessions"
on public.sessions for update
to authenticated
using (mentor_id = (select auth.uid()))
with check (mentor_id = (select auth.uid()));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

insert into public.sessions (subject, title, description, learn, session_date, start_time, end_time, meet_link, attendees)
values
  (
    'Maths', 'Algebra Basics', 'Build confidence with variables, expressions, and simple equations.',
    array['Identify variables and constants', 'Simplify basic algebraic expressions', 'Solve one-step equations together'],
    '2026-09-22', '16:00', '17:00', 'https://meet.google.com/algebra-basics', 12
  ),
  (
    'Maths', 'Fractions Workshop', 'Use visual models and practical examples to compare and work with fractions.',
    array['Compare fractions using visual models', 'Add and subtract like fractions', 'Apply fractions to everyday problems'],
    '2026-10-26', '10:00', '11:00', 'https://meet.google.com/fractions-workshop', 8
  );

create table public.mentor_notes (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  title text not null check (char_length(title) between 1 and 200),
  file_path text not null,
  file_name text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10 * 1024 * 1024),
  created_at timestamptz not null default now()
);

create index mentor_notes_mentor_recent on public.mentor_notes (mentor_id, created_at desc);

alter table public.mentor_notes enable row level security;

create policy "Mentors can read their own notes"
on public.mentor_notes for select
to authenticated
using (mentor_id = (select auth.uid()));

create policy "Mentors can upload their own notes"
on public.mentor_notes for insert
to authenticated
with check (
  mentor_id = (select auth.uid())
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'mentor')
);

revoke all on public.sessions, public.mentor_notes from public, anon, authenticated;
grant select on public.sessions to anon, authenticated;
grant insert, update on public.sessions to authenticated;
grant select, insert on public.mentor_notes to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mentor-notes', 'mentor-notes', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do nothing;

create policy "Mentors can upload files to their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mentor-notes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'mentor')
);

create policy "Mentors can read files in their own folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'mentor-notes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
