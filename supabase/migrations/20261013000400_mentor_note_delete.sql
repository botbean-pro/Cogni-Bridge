-- Lets a mentor delete their own notes (the row and the uploaded file). Safe to run more than once.

drop policy if exists "Mentors can delete their own notes" on public.mentor_notes;
create policy "Mentors can delete their own notes"
on public.mentor_notes for delete
to authenticated
using (mentor_id = (select auth.uid()));

grant delete on public.mentor_notes to authenticated;

drop policy if exists "Mentors can delete files in their own folder" on storage.objects;
create policy "Mentors can delete files in their own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'mentor-notes'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
