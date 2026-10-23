const PREFIX = 'cognibridge_mindful_board:';
const dateKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const storageKey = (studentId) => `${PREFIX}${encodeURIComponent(String(studentId || 'guest').trim().toLowerCase())}`;
const clueProgressKey = (studentId) => `${storageKey(studentId)}:curious-clues`;
// Entries store the English activity title; these keys show it in the student's language.
const activityTitleKeys = {
  'Gentle Bubble Pop': 'mcBubblesTitle', 'Breathing Buddy': 'mcBreathingTitle', 'Sensory Garden': 'mcGardenTitle',
  'Color and Create': 'mcColorTitle', 'Match the Pictures': 'mcMatchTitle', 'Curious Clues': 'mcCluesTitle',
  'Calm Puzzle': 'mcPuzzleTitle', 'Music and Sound Explorer': 'mcSoundsTitle', 'Draw Your Feelings': 'mcFeelingsTitle',
  'Slow Pattern Play': 'mcPatternsTitle', 'Mindful Corner': 'mcTitle',
};

// Rebuilds an entry's note from its fields, so saved notes follow the current language.
export const mindfulNote = (t, entry) => {
  const activity = t(activityTitleKeys[entry.activity] || entry.activity);
  if (!entry.points) return t('You already earned today’s points for {activity}. Play again just for fun!', { activity });
  return t(entry.completed ? 'Finished {activity}. Nice exploring! +{points} CogniPoints.' : 'Took a turn with {activity}. You can come back any time. +{points} CogniPoints.', { activity, points: entry.points });
};

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

// CogniPoints needed to finish each level; past the list each step grows by the two before it.
const LEVEL_THRESHOLDS = [5, 10, 20, 35, 60];
export const levelForPoints = (points) => {
  let level = 1;
  let [previousStep, step] = [15, 25];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (points < threshold) return level;
    level += 1;
  }
  let threshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  while (true) {
    [previousStep, step] = [step, previousStep + step];
    threshold += step;
    if (points < threshold) return level;
    level += 1;
  }
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
    const points = entries.reduce((sum, entry) => sum + entry.points, 0);
    return { points, entries, activitiesPlayed, level: levelForPoints(points) };
  } catch {
    return { points: 0, entries: [], activitiesPlayed: 0, level: 1 };
  }
};

export const recordMindfulActivity = (studentId, activity, completed) => {
  const board = readMindfulBoard(studentId);
  const activitiesPlayed = board.activitiesPlayed + 1;
  const today = dateKey();
  const earnedToday = board.entries.some((entry) => entry.activity === activity && entry.date === today);
  if (earnedToday) {
    const note = `You already earned today’s points for ${activity}. Play again just for fun!`;
    try { localStorage.setItem(storageKey(studentId), JSON.stringify({ entries: board.entries, activitiesPlayed })); } catch { /* Keep this activity usable when storage is unavailable. */ }
    return { points: board.points, entries: board.entries, activitiesPlayed, level: board.level, entry: { id: `repeat:${Date.now()}`, activity, completed, points: 0, note, date: today } };
  }
  const points = completed ? 5 : 2;
  const note = completed
    ? `Finished ${activity}. Nice exploring! +${points} CogniPoints.`
    : `Took a turn with ${activity}. You can come back any time. +${points} CogniPoints.`;
  const entry = { id: `${today}:${activity}:${Date.now()}:${Math.random().toString(36).slice(2)}`, activity, completed, points, note, date: today };
  const entries = [entry, ...board.entries].slice(0, 300);
  try { localStorage.setItem(storageKey(studentId), JSON.stringify({ entries, activitiesPlayed })); } catch { /* Keep this activity usable when storage is unavailable. */ }
  return { points: board.points + points, entries, activitiesPlayed, level: levelForPoints(board.points + points), entry };
};

// Merges progress saved elsewhere (e.g. the student's account) into this browser's copy.
// Nothing is ever lost: entries and finished levels are unioned, the higher play count wins.
export const mergeMindfulProgress = (studentId, remote, totalLevels) => {
  const board = readMindfulBoard(studentId);
  const clues = readCuriousCluesProgress(studentId, totalLevels);
  const byId = new Map([...(Array.isArray(remote?.entries) ? remote.entries : []), ...board.entries].map((entry) => [entry?.id, entry]));
  const entries = [...byId.values()]
    .filter((entry) => entry && typeof entry.id === 'string' && Number.isSafeInteger(entry.points) && typeof entry.date === 'string')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 300);
  const activitiesPlayed = Math.max(board.activitiesPlayed, Number.isSafeInteger(remote?.activitiesPlayed) ? remote.activitiesPlayed : 0, entries.length);
  const completedLevels = [...new Set([...clues.completedLevels, ...(Array.isArray(remote?.completedLevels) ? remote.completedLevels : [])])];
  try {
    localStorage.setItem(storageKey(studentId), JSON.stringify({ entries, activitiesPlayed }));
    localStorage.setItem(clueProgressKey(studentId), JSON.stringify({ completedLevels }));
  } catch { /* The merged result is still returned for this visit. */ }
  return { board: readMindfulBoard(studentId), clues: readCuriousCluesProgress(studentId, totalLevels) };
};
