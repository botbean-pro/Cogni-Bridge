-- Mentors could previously edit any column of their own sessions, including the
-- attendees counter. Limit updates to the editable session details; attendees is
-- only changed by register_for_session().
revoke update on public.sessions from authenticated;
grant update (subject, title, description, learn, session_date, start_time, end_time, meet_link)
  on public.sessions to authenticated;
