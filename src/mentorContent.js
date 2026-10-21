import { supabase } from "./supabaseClient";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const toClientSession = (row) => ({
  id: row.id,
  subject: row.subject,
  title: row.title,
  description: row.description,
  learn: row.learn,
  date: row.session_date,
  time: row.start_time,
  endTime: row.end_time,
  meetLink: row.meet_link,
  attendees: row.attendees,
});

export async function fetchSessions() {
  const rows = throwIfError(await supabase
    .from("sessions")
    .select("*")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true }));
  return rows.map(toClientSession);
}

export async function loadMentorLearningActivity() {
  return throwIfError(await supabase.rpc("mentor_student_activity"));
}

export async function loadMentorSharedJournal(mentorId) {
  const entries = throwIfError(await supabase.from("student_journal_entries")
    .select("id, student_id, entry, chart, show_to_support, created_at")
    .eq("show_to_support", true).order("created_at", { ascending: false }).limit(100));
  if (!entries.length) return [];
  const profiles = throwIfError(await supabase.from("profiles").select("id, display_name")
    .in("id", [...new Set(entries.map((item) => item.student_id))]));
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  return entries.map((item) => ({ ...item, student_name: names.get(item.student_id) || "Student" }));
}

export async function loadStudentSessionRegistrations() {
  const rows = throwIfError(await supabase
    .from("session_registrations")
    .select("session_id, attended_at, sessions (subject, session_date, start_time, end_time)"));
  return {
    registeredSessionIds: rows.map((row) => String(row.session_id)),
    attendedSessionIds: new Set(rows.filter((row) => row.attended_at).map((row) => String(row.session_id))),
    activities: rows.filter((row) => row.attended_at && row.sessions).map((row) => {
      const [startHour, startMinute] = row.sessions.start_time.split(":").map(Number);
      const [endHour, endMinute] = row.sessions.end_time.split(":").map(Number);
      let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;
      return { sessionId: String(row.session_id), subject: row.sessions.subject, activityDate: row.sessions.session_date, durationMinutes };
    }),
  };
}

export async function registerStudentForSession(sessionId) {
  return throwIfError(await supabase.rpc("register_for_session", { p_session_id: sessionId }));
}

export async function markRegisteredSessionAttended(sessionId) {
  return throwIfError(await supabase.rpc("mark_session_attended", { p_session_id: sessionId }));
}

export async function fetchCogniBoard() {
  return throwIfError(await supabase.rpc("leaderboard")).map((row) => ({
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

export async function fetchMentorLeaderboard() {
  return throwIfError(await supabase.rpc("mentor_leaderboard"));
}

export async function loadSessionStudents(sessionId) {
  return throwIfError(await supabase.rpc("session_students", { p_session_id: sessionId })).map((row) => ({
    id: row.student_id,
    name: row.display_name,
    attended: Boolean(row.attended_at),
    good: Boolean(row.mentor_good),
    attention: row.attention_level,
  }));
}

export async function setSessionStudentGood(sessionId, studentId, good) {
  return throwIfError(await supabase.rpc("set_student_good", { p_session_id: sessionId, p_student_id: studentId, p_good: good }));
}

export async function setSessionStudentAttention(sessionId, studentId, level) {
  return throwIfError(await supabase.rpc("set_student_attention", { p_session_id: sessionId, p_student_id: studentId, p_level: level }));
}

export async function loadMentorLeaderboardStudents() {
  return throwIfError(await supabase.rpc("list_students_for_mentor"));
}

export async function createPrivateSession(mentorId, session) {
  return throwIfError(await supabase.from("private_sessions").insert({
    mentor_id: mentorId, student_id: session.studentId, title: session.title,
    subject: session.subject, session_date: session.date, start_time: session.time,
    end_time: session.endTime, meet_link: session.meetLink,
  }).select().single());
}

export async function loadMentorPrivateSessions(mentorId) {
  return throwIfError(await supabase.from("private_sessions").select("*").eq("mentor_id", mentorId)
    .order("session_date", { ascending: false }).order("start_time", { ascending: false }));
}

export async function deletePrivateSession(sessionId) {
  return throwIfError(await supabase.from("private_sessions").delete().eq("id", sessionId).select("id").single());
}

export async function loadStudentPrivateSessions(studentId) {
  const rows = throwIfError(await supabase.from("private_sessions").select("*").eq("student_id", studentId)
    .order("session_date", { ascending: true }).order("start_time", { ascending: true }));
  const mentorIds = [...new Set(rows.map((row) => row.mentor_id))];
  const mentors = mentorIds.length ? throwIfError(await supabase.from("profiles").select("id, display_name").in("id", mentorIds)) : [];
  const names = new Map(mentors.map((mentor) => [mentor.id, mentor.display_name]));
  return rows.map((row) => ({ ...row, mentor_name: names.get(row.mentor_id) || "Your mentor" }));
}

export async function markPrivateSessionsSeen() {
  return throwIfError(await supabase.rpc("mark_private_sessions_seen"));
}

export async function saveStudentHandwriting(studentId, dataUrl, handwritingType) {
  const blob = await (await fetch(dataUrl)).blob();
  const imagePath = `${studentId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from("handwriting").upload(imagePath, blob, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;
  const row = throwIfError(await supabase.from("student_handwriting").insert({ student_id: studentId, image_path: imagePath, handwriting_type: handwritingType }).select().single());
  return row;
}

export async function loadStudentHandwriting(studentId) {
  const row = throwIfError(await supabase.from("student_handwriting").select("image_path, handwriting_type, analyzed_at").eq("student_id", studentId).order("analyzed_at", { ascending: false }).limit(1).maybeSingle());
  if (!row) return null;
  const { data, error } = await supabase.storage.from("handwriting").createSignedUrl(row.image_path, 3600);
  if (error) throw error;
  return { handwritingType: row.handwriting_type, analyzedAt: row.analyzed_at, handwritingImage: data.signedUrl };
}

export async function createSession(mentorId, session) {
  const row = throwIfError(await supabase
    .from("sessions")
    .insert({
      mentor_id: mentorId,
      subject: session.subject,
      title: session.title,
      description: session.description || "",
      learn: session.learn || [],
      session_date: session.date,
      start_time: session.time,
      end_time: session.endTime,
      meet_link: session.meetLink,
    })
    .select()
    .single());
  return toClientSession(row);
}

export async function updateSession(sessionId, session) {
  const row = throwIfError(await supabase
    .from("sessions")
    .update({
      subject: session.subject,
      title: session.title,
      session_date: session.date,
      start_time: session.time,
      end_time: session.endTime,
      meet_link: session.meetLink,
    })
    .eq("id", sessionId)
    .select()
    .single());
  return toClientSession(row);
}

const toClientNote = (row) => ({
  id: row.id,
  title: row.title,
  subject: row.subject,
  fileName: row.file_name,
});

export async function loadMentorNotes(mentorId) {
  const rows = throwIfError(await supabase
    .from("mentor_notes")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false }));
  return rows.map(toClientNote);
}

export async function uploadMentorNote(mentorId, { title, subject, file }) {
  const filePath = `${mentorId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("mentor-notes")
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const row = throwIfError(await supabase
    .from("mentor_notes")
    .insert({
      mentor_id: mentorId,
      title,
      subject,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single());
  return toClientNote(row);
}
