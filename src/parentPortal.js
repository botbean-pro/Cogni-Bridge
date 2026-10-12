import { supabase } from "./supabaseClient";

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const createCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export async function createParentLinkCode(studentId) {
  const code = createCode();
  throwIfError(await supabase.from("parent_link_codes").delete().eq("student_id", studentId));
  throwIfError(await supabase.from("parent_link_codes").insert({
    student_id: studentId,
    code,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));
  return code;
}

export async function connectParentWithCode(code) {
  return throwIfError(await supabase.rpc("connect_parent_with_code", { link_code: code }));
}

export async function loadParentPortal(parentId) {
  const links = throwIfError(await supabase.from("parent_student_links")
    .select("student_id, created_at").eq("parent_id", parentId));
  const studentIds = links.map((link) => link.student_id);
  if (!studentIds.length) return { children: [], messages: [] };
  const [profiles, assignments, messages] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", studentIds).order("display_name"),
    supabase.from("mentor_student_assignments").select("student_id, mentor_id").in("student_id", studentIds),
    supabase.from("parent_teacher_messages").select("id, student_id, mentor_id, sender_id, sender_role, message, created_at").eq("parent_id", parentId).order("created_at", { ascending: true }),
  ]);
  const children = throwIfError(profiles).map((student) => ({ ...student, mentors: [] }));
  const teacherAssignments = throwIfError(assignments);
  const mentorIds = [...new Set(teacherAssignments.map((assignment) => assignment.mentor_id))];
  if (mentorIds.length) {
    const mentors = throwIfError(await supabase.from("profiles").select("id, display_name").in("id", mentorIds));
    children.forEach((child) => {
      child.mentors = teacherAssignments
        .filter((assignment) => assignment.student_id === child.id)
        .map((assignment) => mentors.find((mentor) => mentor.id === assignment.mentor_id))
        .filter(Boolean);
    });
  }
  return { children, messages: throwIfError(messages) };
}

// Ratings, emotions and causes only; the child's written notes are never returned.
// Access is enforced by child_checkins() in 20261012000600_parent_portal.sql.
export async function loadChildCheckins(studentId) {
  return throwIfError(await supabase.rpc("child_checkins", { p_student_id: studentId }));
}

export async function loadChildSessions(studentId) {
  const rows = throwIfError(await supabase.rpc("child_sessions", { p_student_id: studentId }));
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

export async function sendParentTeacherMessage({ parentId, studentId, mentorId, message }) {
  return throwIfError(await supabase.from("parent_teacher_messages").insert({
    parent_id: parentId,
    student_id: studentId,
    mentor_id: mentorId,
    sender_id: parentId,
    sender_role: "parent",
    message: message.trim(),
  }));
}

export async function loadMentorParentMessages(mentorId) {
  return throwIfError(await supabase.from("parent_teacher_messages")
    .select("id, student_id, parent_id, sender_id, sender_role, message, created_at")
    .eq("mentor_id", mentorId).order("created_at", { ascending: true }));
}

export async function sendMentorParentReply({ mentorId, studentId, parentId, message }) {
  return throwIfError(await supabase.from("parent_teacher_messages").insert({
    mentor_id: mentorId,
    student_id: studentId,
    parent_id: parentId,
    sender_id: mentorId,
    sender_role: "mentor",
    message: message.trim(),
  }));
}
