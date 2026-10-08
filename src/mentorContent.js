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
