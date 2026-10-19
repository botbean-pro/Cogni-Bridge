-- Read-only test: tries, as each of harsh@gmail.com's parents, to send a message to each of Harsh's
-- mentors, exactly as the parent page does, then undoes it. Nothing is saved.
-- Run in the Supabase SQL editor and read the "Messages" / notices output.

do $$
declare
  v_harsh uuid;
  v_parent record;
  v_mentor record;
  v_found boolean := false;
begin
  select id into v_harsh from auth.users where lower(email) = 'harsh@gmail.com';
  if v_harsh is null then
    raise notice 'No harsh@gmail.com account.';
    return;
  end if;

  for v_parent in
    select link.parent_id, users.email from public.parent_student_links link
    join auth.users users on users.id = link.parent_id
    where link.student_id = v_harsh
  loop
    for v_mentor in
      select assignment.mentor_id, users.email, profile.display_name, profile.role::text as role
      from public.mentor_student_assignments assignment
      join auth.users users on users.id = assignment.mentor_id
      join public.profiles profile on profile.id = assignment.mentor_id
      where assignment.student_id = v_harsh
    loop
      v_found := true;
      begin
        -- Act as the signed-in parent, the way the browser does.
        perform set_config('request.jwt.claims', json_build_object('sub', v_parent.parent_id, 'role', 'authenticated')::text, true);
        perform set_config('role', 'authenticated', true);
        insert into public.parent_teacher_messages (parent_id, student_id, mentor_id, sender_id, sender_role, message)
        values (v_parent.parent_id, v_harsh, v_mentor.mentor_id, v_parent.parent_id, 'parent', 'test');
        raise exception 'SEND_OK';
      exception when others then
        -- The block is rolled back either way, so the test message is never kept.
        raise notice 'parent % -> mentor % (% "%"): %', v_parent.email, v_mentor.email, v_mentor.role, v_mentor.display_name,
          case when sqlerrm = 'SEND_OK' then 'would send fine' else 'FAILS: ' || sqlerrm end;
      end;
    end loop;
  end loop;

  if not v_found then
    raise notice 'Harsh has no parent or no mentor connected.';
  end if;
end;
$$;
