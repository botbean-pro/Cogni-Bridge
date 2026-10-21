const PREFIX = 'cognibridge_mindful_board:';
const dateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const storageKey = (studentId) => `${PREFIX}${encodeURIComponent(String(studentId || 'guest').trim().toLowerCase())}`;
const clueProgressKey = (studentId) => `${storageKey(studentId)}:curious-clues`;

export const readCuriousCluesProgress = (studentId, totalLevels) => {
  try {
    const saved = JSON.parse(localStorage.getItem(clueProgressKey(studentId)) || '{}');
    const completedLevels = [...new Set((Array.isArray(saved.completedLevels) ? saved.completedLevels : [])
      .filter((level) => Number.isSafeInteger(level) && level >= 1 && level <= totalLevels))].sort((a, b) => a - b);
    let unlockedLevel = 1;
    while (completedLevels.includes(unlockedLevel) && unlockedLevel < totalLevels) unlockedLevel += 1;
    return { completedLevels, unlockedLevel, totalLevels };
  } catch {
    return { completedLevels: [], unlockedLevel: 1, totalLevels };
  }
};

export const recordCuriousCluesLevel = (studentId, level, totalLevels) => {
  const progress = readCuriousCluesProgress(studentId, totalLevels);
  const completedLevels = [...new Set([...progress.completedLevels, level])].sort((a, b) => a - b);
  let unlockedLevel = 1;
  while (completedLevels.includes(unlockedLevel) && unlockedLevel < totalLevels) unlockedLevel += 1;
  const next = { completedLevels, unlockedLevel, totalLevels };
  try { localStorage.setItem(clueProgressKey(studentId), JSON.stringify(next)); } catch { /* The current game remains playable if storage is unavailable. */ }
  return next;
};

export const readMindfulBoard = (studentId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(studentId)) || '{}');
    const entries = Array.isArray(saved.entries) ? saved.entries.filter((entry) => (
      entry && typeof entry.id === 'string' && typeof entry.activity === 'string'
      && Number.isSafeInteger(entry.points) && entry.points >= 0
      && typeof entry.note === 'string' && typeof entry.date === 'string'
    )) : [];
    const activitiesPlayed = Number.isSafeInteger(saved.activitiesPlayed) && saved.activitiesPlayed >= 0
      ? saved.activitiesPlayed
      : entries.length;
    return { points: entries.reduce((sum, entry) => sum + entry.points, 0), entries, activitiesPlayed, level: activitiesPlayed + 1 };
  } catch {
    return { points: 0, entries: [], activitiesPlayed: 0, level: 1 };
  }
};

export const recordMindfulActivity = (studentId, activity, completed) => {
  const board = readMindfulBoard(studentId);
  const activitiesPlayed = board.activitiesPlayed + 1;
  const level = activitiesPlayed + 1;
  const today = dateKey();
  const earnedToday = board.entries.some((entry) => entry.activity === activity && entry.date === today);
  if (earnedToday) {
    const note = `You already earned today’s points for ${activity}. Play again just for fun!`;
    try { localStorage.setItem(storageKey(studentId), JSON.stringify({ entries: board.entries, activitiesPlayed })); } catch { /* Keep this activity usable when storage is unavailable. */ }
    return { points: board.points, entries: board.entries, activitiesPlayed, level, entry: { id: `repeat:${Date.now()}`, activity, completed, points: 0, note, date: today } };
  }
  const points = completed ? 5 : 2;
  const note = completed
    ? `Finished ${activity}. Nice exploring! +${points} CogniPoints.`
    : `Took a turn with ${activity}. You can come back any time. +${points} CogniPoints.`;
  const entry = { id: `${today}:${activity}:${Date.now()}:${Math.random().toString(36).slice(2)}`, activity, completed, points, note, date: today };
  const entries = [entry, ...board.entries].slice(0, 300);
  try { localStorage.setItem(storageKey(studentId), JSON.stringify({ entries, activitiesPlayed })); } catch { /* Keep this activity usable when storage is unavailable. */ }
  return { points: board.points + points, entries, activitiesPlayed, level, entry };
};
