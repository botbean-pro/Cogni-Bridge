create table public.student_journal_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  entry text not null check (char_length(btrim(entry)) between 1 and 3000),
  chart jsonb not null check (jsonb_typeof(chart) = 'object'),
  show_to_support boolean not null default false,
  created_at timestamptz not null default now()
);

create index student_journal_entries_recent on public.student_journal_entries (student_id, created_at desc);
alter table public.student_journal_entries enable row level security;

create policy "Students and opted-in linked adults can read journal entries"
on public.student_journal_entries for select to authenticated
using (
  student_id = (select auth.uid())
  or (
    show_to_support
    and exists (
      select 1 from public.parent_student_links link
      where link.student_id = student_journal_entries.student_id
        and link.parent_id = (select auth.uid())
    )
  )
  or (
    show_to_support
    and exists (
      select 1 from public.mentor_student_assignments assignment
      where assignment.student_id = student_journal_entries.student_id
        and assignment.mentor_id = (select auth.uid())
    )
  )
);

create policy "Students can create their own journal entries"
on public.student_journal_entries for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  )
);

create policy "Students can update their own journal entries"
on public.student_journal_entries for update to authenticated
using (student_id = (select auth.uid()))
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.profiles profile
    where profile.id = (select auth.uid()) and profile.role = 'student'
  )
);

create policy "Students can delete their own journal entries"
on public.student_journal_entries for delete to authenticated
using (student_id = (select auth.uid()));

revoke all on public.student_journal_entries from public, anon, authenticated;
grant select, insert, update, delete on public.student_journal_entries to authenticated;
