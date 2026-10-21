import { supabase } from "./supabaseClient";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const toClient = (row) => ({
  id: row.id,
  mentorId: row.mentor_id,
  studentId: row.student_id,
  title: row.title,
  subject: row.subject,
  date: row.session_date,
  time: row.start_time,
  endTime: row.end_time,
  meetLink: row.meet_link,
  seen: Boolean(row.seen_at),
});

// Mentor side: schedule a session that only one assigned student can see.
export async function createPrivateSession(mentorId, { studentId, title, subject, date, time, endTime, meetLink }) {
  const row = throwIfError(await supabase.from("private_sessions").insert({
    mentor_id: mentorId,
    student_id: studentId,
    title,
    subject,
    session_date: date,
    start_time: time,
    end_time: endTime,
    meet_link: meetLink,
  }).select().single());
  return toClient(row);
}

export async function loadMentorPrivateSessions(mentorId) {
  const rows = throwIfError(await supabase.from("private_sessions")
    .select("*").eq("mentor_id", mentorId)
    .order("session_date", { ascending: false }).order("start_time", { ascending: false }));
  return rows.map(toClient);
}

export async function deletePrivateSession(id) {
  throwIfError(await supabase.from("private_sessions").delete().eq("id", id).select("id").single());
}

// Student side: sessions scheduled for me, with the mentor's name.
export async function loadStudentPrivateSessions(studentId) {
  const rows = throwIfError(await supabase.from("private_sessions")
    .select("*").eq("student_id", studentId)
    .order("session_date", { ascending: true }).order("start_time", { ascending: true }));
  const mentorIds = [...new Set(rows.map((row) => row.mentor_id))];
  const mentors = mentorIds.length
    ? throwIfError(await supabase.from("profiles").select("id, display_name").in("id", mentorIds))
    : [];
  const names = new Map(mentors.map((mentor) => [mentor.id, mentor.display_name]));
  return rows.map((row) => ({ ...toClient(row), mentorName: names.get(row.mentor_id) || "" }));
}

export async function markPrivateSessionsSeen() {
  throwIfError(await supabase.rpc("mark_private_sessions_seen"));
}
