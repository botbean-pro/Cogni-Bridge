import { supabase } from "./supabaseClient";

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
});

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
