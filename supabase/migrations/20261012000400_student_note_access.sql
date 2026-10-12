-- Students can read every mentor's notes and download their files. Mentors still
-- only see (and upload to) their own folder.
create policy "Students can read all notes"
on public.mentor_notes for select
to authenticated
using (
  exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);

create policy "Students can read note files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'mentor-notes'
  and exists (select 1 from public.profiles profile where profile.id = (select auth.uid()) and profile.role = 'student')
);
