import { supabase } from './supabaseClient';

// Account copy of Mindful Corner progress (Supabase mode only). The browser keeps
// a local copy for instant reads; this makes it follow the student across devices.
export async function loadMindfulProgress(studentId) {
  const { data, error } = await supabase.from('student_mindful_progress')
    .select('activities_played, entries')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { activitiesPlayed: data.activities_played, entries: data.entries };
}

export async function saveMindfulProgress(studentId, board) {
  const { error } = await supabase.from('student_mindful_progress').upsert({
    student_id: studentId,
    activities_played: board.activitiesPlayed,
    entries: board.entries,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
