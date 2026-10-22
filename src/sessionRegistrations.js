import { supabase } from "./supabaseClient";

// Supabase-backed registrations, attendance, and leaderboard.
// Authorization is enforced by the functions in
// supabase/migrations/20261012000200_session_registrations.sql.

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const durationMinutes = (startTime, endTime) => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  let duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (duration <= 0) duration += 24 * 60;
  return duration;
};

// The signed-in student's registrations, plus attended sessions in the same shape
// studentActivity.js uses, so calculateStudentStats works for both modes.
export async function loadMyRegistrations() {
  const rows = throwIfError(await supabase
    .from("session_registrations")
    .select("session_id, attended_at, sessions (subject, session_date, start_time, end_time)"));

  return {
    registeredSessionIds: rows.map((row) => row.session_id),
    attendedSessionIds: new Set(rows.filter((row) => row.attended_at).map((row) => row.session_id)),
    activities: rows
      .filter((row) => row.attended_at && row.sessions)
      .map((row) => ({
        sessionId: row.session_id,
        subject: row.sessions.subject,
        activityDate: row.sessions.session_date,
        durationMinutes: durationMinutes(row.sessions.start_time, row.sessions.end_time),
      })),
  };
}

export async function registerForSession(sessionId) {
  return throwIfError(await supabase.rpc("register_for_session", { p_session_id: sessionId }));
}

// Needs unregister_from_session() from 20261022000300_unregister_from_session.sql.
export async function unregisterFromSession(sessionId) {
  return throwIfError(await supabase.rpc("unregister_from_session", { p_session_id: sessionId }));
}

export async function markSessionAttended(sessionId) {
  return throwIfError(await supabase.rpc("mark_session_attended", { p_session_id: sessionId }));
}

export async function fetchLeaderboard() {
  const rows = throwIfError(await supabase.rpc("leaderboard"));
  return rows.map((row) => ({
    name: row.display_name,
    registered: row.registered,
    attended: row.attended,
    missed: row.missed,
    mentorGood: row.mentor_good,
    streak: row.streak,
    points: row.points,
    isMe: row.is_me,
  }));
}

export async function fetchSessionStudents(sessionId) {
  const rows = throwIfError(await supabase.rpc("session_students", { p_session_id: sessionId }));
  return rows.map((row) => ({
    id: row.student_id,
    name: row.display_name,
    attended: Boolean(row.attended_at),
    good: row.mentor_good,
    attention: row.attention_level,
  }));
}

export async function setStudentGood(sessionId, studentId, good) {
  throwIfError(await supabase.rpc("set_student_good", {
    p_session_id: sessionId,
    p_student_id: studentId,
    p_good: good,
  }));
}

// level is 1-5, or null to clear the rating.
export async function setStudentAttention(sessionId, studentId, level) {
  throwIfError(await supabase.rpc("set_student_attention", {
    p_session_id: sessionId,
    p_student_id: studentId,
    p_level: level,
  }));
}
