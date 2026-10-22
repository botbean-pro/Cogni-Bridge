-- Moves the sample parent-teacher chat with mentor1@cognibridge.com from the other Harsh
-- (harsh@cognibridge.com / parent@cognibridge.com) to harsh@gmail.com and its parent parent@parent.com,
-- the pair mentor1 is actually connected to, so the history shows on both sides. Deletes nothing.
-- Not a migration: run it by hand in the Supabase SQL editor.

with ids as (
  select (select id from auth.users where email = 'mentor1@cognibridge.com') as mentor1,
    (select id from auth.users where email = 'harsh@cognibridge.com') as old_student,
    (select id from auth.users where email = 'parent@cognibridge.com') as old_parent,
    (select id from auth.users where lower(email) = 'harsh@gmail.com') as new_student,
    (select id from auth.users where email = 'parent@parent.com') as new_parent
)
update public.parent_teacher_messages message
set student_id = ids.new_student,
  parent_id = ids.new_parent,
  sender_id = case when message.sender_role = 'parent' then ids.new_parent else message.sender_id end
from ids
where message.mentor_id = ids.mentor1
  and message.student_id = ids.old_student
  and message.parent_id = ids.old_parent
returning message.created_at, message.sender_role, message.message;
