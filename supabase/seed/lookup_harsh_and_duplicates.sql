-- Read-only lookups. Run in the Supabase SQL editor; nothing here changes data.

-- 1. Which account(s) are the parent of harsh@gmail.com?
select parent_user.email as parent_email, parent.display_name as parent_name, link.created_at as linked_at
from auth.users student_user
join public.parent_student_links link on link.student_id = student_user.id
join public.profiles parent on parent.id = link.parent_id
join auth.users parent_user on parent_user.id = parent.id
where lower(student_user.email) = 'harsh@gmail.com';

-- 2. Every name that appears more than once (same name and role), with the accounts behind it
--    and how much data each one owns. remove_duplicate_names.sql keeps the busiest of each group.
select profile.role, profile.display_name, users.email, profile.created_at,
  (select count(*) from public.sessions s where s.mentor_id = profile.id) as sessions_taught,
  (select count(*) from public.sensory_checkins c where c.student_id = profile.id) as checkins,
  (select count(*) from public.session_registrations r where r.student_id = profile.id) as registrations,
  (select count(*) from public.parent_student_links l where l.parent_id = profile.id or l.student_id = profile.id) as parent_links
from public.profiles profile
join auth.users users on users.id = profile.id
where (profile.role, lower(btrim(profile.display_name))) in (
  select role, lower(btrim(display_name)) from public.profiles group by 1, 2 having count(*) > 1
)
order by profile.role, lower(profile.display_name), profile.created_at;
