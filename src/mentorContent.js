import { supabase } from "./supabaseClient";
import { fetchWithAuth } from "./components/student/flow/flowApi";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const toClientSession = (row) => ({
  id: row.id,
  mentorId: row.mentor_id,
  subject: row.subject,
  title: row.title,
  description: row.description,
  learn: row.learn,
  date: row.session_date,
  time: row.start_time,
  endTime: row.end_time,
  meetLink: row.meet_link,
  attendees: row.attendees,
  studentClass: row.student_class || "",
});

// Only send the class column when there's something to save, so publishing still works
// before the session class migration is applied. null clears a class on edit.
const classColumn = (session) => (session.studentClass ? { student_class: session.studentClass }
  : session.studentClass === null ? { student_class: null } : {});

// The signed-in mentor's own display name, shown in the rail and the overview greeting.
export async function loadMentorName(mentorId) {
  const profile = throwIfError(await supabase.from("profiles").select("display_name").eq("id", mentorId).maybeSingle());
  return profile?.display_name || "";
}

export async function fetchSessions() {
  const rows = throwIfError(await supabase
    .from("sessions")
    .select("*")
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true }));
  return rows.map(toClientSession);
}

// Attended sessions of this mentor's assigned students (from session_registrations).
export async function loadMentorLearningActivity() {
  return throwIfError(await supabase.rpc("mentor_student_activity"));
}

export async function loadMentorLeaderboard() {
  return throwIfError(await supabase.rpc("mentor_leaderboard"));
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
      ...classColumn(session),
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
      ...classColumn(session),
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
  filePath: row.file_path,
});

export async function loadMentorNotes(mentorId) {
  const rows = throwIfError(await supabase
    .from("mentor_notes")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false }));
  return rows.map(toClientNote);
}

// Every mentor's notes, for students (RLS lets students read all of them).
export async function fetchStudentNotes() {
  const rows = throwIfError(await supabase
    .from("mentor_notes")
    .select("*")
    .order("created_at", { ascending: false }));
  return rows.map(toClientNote);
}

// Demo-mode notes carry their file as a data URL. Supabase notes are private, so they
// are fetched through a short-lived signed URL that forces a download.
export async function downloadNote(note) {
  const url = note.dataUrl || throwIfError(await supabase.storage
    .from("mentor-notes")
    .createSignedUrl(note.filePath, 60, { download: note.fileName })).signedUrl;
  const link = document.createElement("a");
  link.href = url;
  link.download = note.fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Opens the note in a new tab so the mentor can read it on the website.
export async function viewNote(note) {
  const tab = window.open("", "_blank");
  try {
    let url = note.dataUrl;
    if (url) {
      url = URL.createObjectURL(await (await fetch(url)).blob());
    } else {
      url = throwIfError(await supabase.storage.from("mentor-notes").createSignedUrl(note.filePath, 300)).signedUrl;
    }
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

// Removes the row first, then the file; a leftover file is harmless, a row without a file is not.
export async function deleteMentorNote(note) {
  throwIfError(await supabase.from("mentor_notes").delete().eq("id", note.id).select("id").single());
  await supabase.storage.from("mentor-notes").remove([note.filePath]);
}

export async function getNotePreviewUrl(note) {
  if (note.dataUrl) return note.dataUrl;
  return throwIfError(await supabase.storage
    .from("mentor-notes")
    .createSignedUrl(note.filePath, 60 * 60)).signedUrl;
}

export async function uploadMentorNote(mentorId, { title, subject, file }) {
  // Storage keys reject some characters (e.g. brackets or non-Latin script), so store a
  // safe name and keep the original in file_name.
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const filePath = `${mentorId}/${Date.now()}-${safeName}`;
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

// A new Google Meet link from api/meet.js, owned by the shared Google account.
export async function createMeetLink() {
  const response = await fetchWithAuth("/api/meet", { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.meetLink) throw new Error(data.error || "Google Meet couldn't create a meeting.");
  return data.meetLink;
}

// Every registered student (name and join date only) with whether they are under this mentor.
export async function listStudentsForMentor() {
  return throwIfError(await supabase.rpc("list_students_for_mentor"));
}

// Sign-up details and chosen subjects of a student under this mentor, or null if there's no such student.
export async function loadStudentProfile(studentId) {
  const [row] = throwIfError(await supabase.rpc("mentor_student_profile", { p_student_id: studentId }));
  if (!row) return null;
  return {
    name: row.display_name,
    joinedAt: row.joined_at,
    studentClass: row.student_class,
    age: row.age,
    section: row.section,
    school: row.school,
    preferredSubjects: row.preferred_subjects || [],
    handwritingSigns: row.handwriting_signs || null,
    handwritingCheckedAt: row.handwriting_checked_at || null,
  };
}

// Sessions a student under this mentor registered for, newest first.
export async function loadStudentHistory(studentId) {
  const rows = throwIfError(await supabase.rpc("mentor_student_history", { p_student_id: studentId }));
  return rows.map((row) => ({
    id: row.session_id,
    title: row.title,
    subject: row.subject,
    date: row.session_date,
    time: row.start_time,
    endTime: row.end_time,
    attended: Boolean(row.attended_at),
    ended: row.ended,
    good: row.mentor_good,
    attention: row.attention_level,
  }));
}

export async function setMyStudent(studentId, assigned) {
  throwIfError(await supabase.rpc("set_my_student", { p_student_id: studentId, p_assigned: assigned }));
}
