-- Parent portal diagnostic. Paste into Supabase SQL Editor and Run.
-- Acts as the parent account below and runs the same queries the parent page runs,
-- so any failure shows up here as an error message instead of "can't get the data".
-- Read-only: it changes nothing.

do $$
declare
  parent_email constant text := 'shriyankalra26@gmail.com';
  parent_uuid uuid;
  child_uuid uuid;
  step text;
  results jsonb := '[]'::jsonb;
  n integer;
begin
  select id into parent_uuid from auth.users where email = parent_email;
  if parent_uuid is null then raise exception 'No auth user with email %', parent_email; end if;

  results := results || jsonb_build_object('step', '1 parent role', 'result',
    coalesce((select role::text from public.profiles where id = parent_uuid), 'NO PROFILE ROW'));

  select student_id into child_uuid from public.parent_student_links where parent_id = parent_uuid limit 1;
  results := results || jsonb_build_object('step', '2 linked child', 'result', coalesce(child_uuid::text, 'NOT LINKED to any student'));

  -- Everything below runs as the parent, with row-level security on.
  perform set_config('request.jwt.claims', json_build_object('sub', parent_uuid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  foreach step in array array[
    'select count(*) from public.parent_student_links',
    'select count(*) from public.profiles',
    'select count(*) from public.mentor_student_assignments',
    'select count(*) from public.parent_teacher_messages',
    'select count(*) from public.child_checkins(''' || coalesce(child_uuid::text, '00000000-0000-0000-0000-000000000000') || ''')',
    'select count(*) from public.child_sessions(''' || coalesce(child_uuid::text, '00000000-0000-0000-0000-000000000000') || ''')'
  ] loop
    begin
      execute step into n;
      results := results || jsonb_build_object('step', step, 'result', 'ok, ' || n || ' rows');
    exception when others then
      results := results || jsonb_build_object('step', step, 'result', 'FAILED: ' || sqlerrm);
    end;
  end loop;

  reset role;
  raise exception 'DIAGNOSTIC RESULT (this error is intentional, it just carries the report): %', jsonb_pretty(results);
end $$;
