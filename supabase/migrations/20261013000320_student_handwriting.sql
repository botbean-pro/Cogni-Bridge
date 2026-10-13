-- Stores each student's handwriting photo and result in Supabase instead of the browser.
-- Photos live in a private bucket (one folder per student); only the student can read them.
-- Safe to run more than once.

create table if not exists public.student_handwriting (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  image_path text not null check (char_length(image_path) between 1 and 300),
  handwriting_type text not null check (handwriting_type in ('Type 1', 'Type 2', 'Type 3', 'Type 4')),
  analyzed_at timestamptz not null default now()
);

create index if not exists student_handwriting_student_idx
on public.student_handwriting (student_id, analyzed_at desc);

alter table public.student_handwriting enable row level security;

drop policy if exists "Students can read their own handwriting" on public.student_handwriting;
create policy "Students can read their own handwriting"
on public.student_handwriting for select to authenticated
using (student_id = (select auth.uid()));

drop policy if exists "Students can save their own handwriting" on public.student_handwriting;
create policy "Students can save their own handwriting"
on public.student_handwriting for insert to authenticated
with check (
  student_id = (select auth.uid())
  and image_path like (select auth.uid())::text || '/%'
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

drop policy if exists "Students can delete their own handwriting" on public.student_handwriting;
create policy "Students can delete their own handwriting"
on public.student_handwriting for delete to authenticated
using (student_id = (select auth.uid()));

revoke all on public.student_handwriting from anon, authenticated;
grant select, insert, delete on public.student_handwriting to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('handwriting', 'handwriting', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Students can upload handwriting to their own folder" on storage.objects;
create policy "Students can upload handwriting to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'handwriting'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

drop policy if exists "Students can read their own handwriting files" on storage.objects;
create policy "Students can read their own handwriting files"
on storage.objects for select to authenticated
using (bucket_id = 'handwriting' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Students can delete their own handwriting files" on storage.objects;
create policy "Students can delete their own handwriting files"
on storage.objects for delete to authenticated
using (bucket_id = 'handwriting' and (storage.foldername(name))[1] = (select auth.uid())::text);
