// Screen-break timer for signed-in students. After 30 minutes of on-screen time the site locks for a
// 5-minute break. State lives in localStorage so a reload doesn't skip the break and every open tab
// shares one timer. Like the rest of the demo storage it's a nudge, not a secure lock.

export const STUDY_SECONDS = 30 * 60;
export const WARNING_SECONDS = STUDY_SECONDS - 2 * 60;
export const BREAK_MS = 5 * 60 * 1000;
// Being away from the site this long already counts as a break, so the timer starts over.
const AWAY_RESET_MS = 5 * 60 * 1000;
// Longest gap a single tick may add, so a throttled background tab or a sleeping laptop isn't counted.
const MAX_TICK_SECONDS = 15;

const storageKey = (studentKey) => `cognibridge_break_timer:${encodeURIComponent(String(studentKey || "student").toLowerCase())}`;

const emptyState = (now) => ({ usedSeconds: 0, lastActiveAt: now, lockUntil: 0, warned: false });

export function readBreakState(studentKey, now = Date.now()) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(studentKey)) || "null");
    if (!saved || typeof saved !== "object") return emptyState(now);
    return {
      usedSeconds: Math.max(0, Number(saved.usedSeconds) || 0),
      lastActiveAt: Number(saved.lastActiveAt) || now,
      lockUntil: Number(saved.lockUntil) || 0,
      warned: saved.warned === true,
    };
  } catch {
    return emptyState(now);
  }
}

function saveBreakState(studentKey, state) {
  try { localStorage.setItem(storageKey(studentKey), JSON.stringify(state)); }
  catch { /* Storage can be unavailable in private browsing; the timer then lasts for this page only. */ }
}

export const breakStorageKey = storageKey;

// Advances the timer by one tick and returns what happened: "locked" while a break is running,
// "lockStarted" / "breakEnded" / "warning" on those transitions, otherwise "counting" or "idle".
export function tickBreakTimer(studentKey, { visible, now = Date.now() }) {
  const state = readBreakState(studentKey, now);
  if (state.lockUntil > now) return { event: "locked", lockUntil: state.lockUntil };
  if (state.lockUntil) {
    saveBreakState(studentKey, emptyState(now));
    return { event: "breakEnded", lockUntil: 0 };
  }
  if (!visible) return { event: "idle", lockUntil: 0 };

  const gap = now - state.lastActiveAt;
  const next = gap > AWAY_RESET_MS
    ? emptyState(now)
    : { ...state, usedSeconds: state.usedSeconds + Math.min(MAX_TICK_SECONDS, Math.max(0, gap / 1000)), lastActiveAt: now };

  if (next.usedSeconds >= STUDY_SECONDS) {
    const lockUntil = now + BREAK_MS;
    saveBreakState(studentKey, { usedSeconds: 0, lastActiveAt: now, lockUntil, warned: false });
    return { event: "lockStarted", lockUntil };
  }
  let event = "counting";
  if (next.usedSeconds >= WARNING_SECONDS && !next.warned) {
    next.warned = true;
    event = "warning";
  }
  saveBreakState(studentKey, next);
  return { event, lockUntil: 0 };
}
