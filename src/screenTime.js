import { supabase } from "./supabaseClient";

const localKey = (studentKey) => `cognibridge_screen_time_${String(studentKey || "student").toLowerCase()}`;

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function readLocalScreenTime(studentKey) {
  try {
    const value = JSON.parse(localStorage.getItem(localKey(studentKey)) || "{}");
    return Object.entries(value).map(([activity_date, active_seconds]) => ({ activity_date, active_seconds }));
  } catch {
    return [];
  }
}

export function addLocalScreenTime(studentKey, seconds, date = localDateKey()) {
  try {
    const key = localKey(studentKey);
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    value[date] = Math.min(86400, Math.max(0, Number(value[date]) || 0) + seconds);
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* Local demo storage can be unavailable in private browsing. */ }
}

export async function recordScreenTime(seconds, activityDate = localDateKey()) {
  const { error } = await supabase.rpc("add_student_screen_time", {
    p_seconds: Math.max(1, Math.min(30, Math.round(seconds))),
    p_activity_date: activityDate,
  });
  if (error) throw error;
}

export async function loadScreenTime(studentIds, days = 7) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));
  const { data, error } = await supabase.from("student_screen_time")
    .select("student_id, activity_date, active_seconds")
    .in("student_id", ids)
    .gte("activity_date", localDateKey(start))
    .order("activity_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export function formatScreenTime(seconds = 0) {
  const minutes = Math.floor(Math.max(0, Number(seconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours) return `${hours}h ${remainder}m`;
  return `${minutes}m`;
}

export function makeScreenTimeDays(rows = [], studentId) {
  const now = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = localDateKey(date);
    const seconds = rows
      .filter((row) => (!studentId || row.student_id === studentId) && row.activity_date === key)
      .reduce((sum, row) => sum + (Number(row.active_seconds) || 0), 0);
    days.push({ date, key, seconds });
  }
  return days;
}
