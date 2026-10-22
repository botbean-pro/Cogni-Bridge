-- Read-only: who is connected to harsh@gmail.com and where the latest parent-teacher messages went.
-- Run in the Supabase SQL editor; nothing here changes data.

with harsh as (select id from auth.users where lower(email) = 'harsh@gmail.com')
select 'mentor' as kind, users.email, profile.display_name, profile.role::text as role, null::text as message, assignment.created_at as at
from public.mentor_student_assignments assignment
join auth.users users on users.id = assignment.mentor_id
join public.profiles profile on profile.id = assignment.mentor_id
where assignment.student_id = (select id from harsh)
union all
select 'parent', users.email, profile.display_name, profile.role::text, null, link.created_at
from public.parent_student_links link
join auth.users users on users.id = link.parent_id
join public.profiles profile on profile.id = link.parent_id
where link.student_id = (select id from harsh)
union all
select * from (
  select 'message to ' || mentor_user.email, sender.email, message.sender_role, null, message.message, message.created_at
  from public.parent_teacher_messages message
  join auth.users mentor_user on mentor_user.id = message.mentor_id
  join auth.users sender on sender.id = message.sender_id
  where message.student_id = (select id from harsh)
  order by message.created_at desc
  limit 10
) latest
order by kind, at desc;
