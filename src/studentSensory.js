import { supabase } from "./supabaseClient";

export const moodLabels = ["Very bad", "Bad", "Okay", "Good", "Great"];

export const emotionOptions = [
  ["happy", "Happy"], ["sad", "Sad"], ["angry", "Angry"], ["anxious", "Anxious"],
  ["stressed", "Stressed"], ["tired", "Tired"], ["lonely", "Lonely"],
  ["confused", "Confused"], ["excited", "Excited"], ["overwhelmed", "Overwhelmed"],
  ["calm", "Calm"], ["frustrated", "Frustrated"], ["other", "Other"],
];

export const causeOptions = [
  ["school", "School/classes"], ["homework", "Homework/studying"], ["friends", "Friends"],
  ["family", "Family"], ["social", "Social situations"], ["sensory", "Sensory environment"],
  ["sleep", "Sleep"], ["discomfort", "Physical discomfort"], ["event", "Something that happened today"],
  ["unknown", "I don't know"], ["other", "Other"],
];

export const helpfulOptions = [
  ["talking", "Talking to someone"], ["break", "Taking a break"], ["music", "Music"],
  ["alone", "Being alone"], ["outside", "Going outside"], ["movement", "Exercise/movement"],
  ["breathing", "Breathing/relaxation"], ["someone_helped", "Someone helped me"],
  ["nothing_yet", "Nothing yet"], ["other", "Other"],
];

export const mentorHelpOptions = [
  ["none", "No, I'm okay"], ["check_in", "I'd like someone to check in with me"],
  ["school", "I need help with school"], ["personal", "I need help with something personal"],
  ["feelings", "I need help understanding how I'm feeling"],
  ["specific_mentor", "I'd like to talk to a specific mentor"],
];

const throwIfError = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function loadStudentCheckins(studentId) {
  return throwIfError(await supabase
    .from("sensory_checkins")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false }));
}

export async function loadAssignedMentors(studentId) {
  const assignments = throwIfError(await supabase
    .from("mentor_student_assignments")
    .select("mentor_id")
    .eq("student_id", studentId));
  if (!assignments.length) return [];
  return throwIfError(await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", assignments.map(({ mentor_id: mentorId }) => mentorId)));
}

export async function saveStudentCheckin(studentId, checkin) {
  return throwIfError(await supabase
    .from("sensory_checkins")
    .insert({ ...checkin, student_id: studentId })
    .select("id, created_at")
    .single());
}

export async function deleteStudentCheckin(studentId, checkinId) {
  return throwIfError(await supabase
    .from("sensory_checkins")
    .delete()
    .eq("student_id", studentId)
    .eq("id", checkinId));
}

export async function loadStudentResponses() {
  return throwIfError(await supabase
    .from("sensory_notifications")
    .select("checkin_id, addressed_at, mentor_message")
    .not("mentor_message", "eq", ""));
}

export async function loadMentorCheckins(mentorId) {
  const assignments = throwIfError(await supabase
    .from("mentor_student_assignments")
    .select("student_id")
    .eq("mentor_id", mentorId));
  const studentIds = assignments.map(({ student_id: studentId }) => studentId);
  if (!studentIds.length) return { checkins: [], notifications: [], students: [] };

  const [checkins, notifications, students] = await Promise.all([
    supabase.from("sensory_checkins")
      .select("*")
      .in("student_id", studentIds)
      .eq("shared_with_mentor", true)
      .order("created_at", { ascending: false }),
    supabase.from("sensory_notifications")
      .select("*")
      .eq("recipient_id", mentorId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles")
      .select("id, display_name")
      .in("id", studentIds),
  ]);
  return {
    checkins: throwIfError(checkins),
    notifications: throwIfError(notifications),
    students: throwIfError(students),
  };
}

export async function markMentorNotificationViewed(mentorId, notificationId) {
  return throwIfError(await supabase
    .from("sensory_notifications")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", mentorId)
    .is("viewed_at", null));
}

export async function respondToMentorRequest(mentorId, notificationId, message) {
  return throwIfError(await supabase
    .from("sensory_notifications")
    .update({
      addressed_at: new Date().toISOString(),
      mentor_message: message.trim().slice(0, 2000),
    })
    .eq("id", notificationId)
    .eq("recipient_id", mentorId)
    .is("addressed_at", null));
}