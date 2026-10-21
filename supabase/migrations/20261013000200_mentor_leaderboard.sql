create function public.mentor_leaderboard()
returns table (
  mentor_id uuid,
  display_name text,
  sessions_taught bigint,
  points bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select mentor.id,
    coalesce(nullif(mentor.display_name, ''), 'Mentor'),
    count(session.id)::bigint,
    (count(session.id) * 10)::bigint
  from public.profiles mentor
  left join public.sessions session
    on session.mentor_id = mentor.id
    and (session.session_date, session.end_time::time) < (current_date, localtime)
  where mentor.role = 'mentor'
  group by mentor.id, mentor.display_name
  order by count(session.id) desc, coalesce(nullif(mentor.display_name, ''), 'Mentor') asc;
$$;

revoke all on function public.mentor_leaderboard() from public, anon;
grant execute on function public.mentor_leaderboard() to authenticated;
