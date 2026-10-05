const ACTIVITY_STORAGE_PREFIX = "cognibridge_learning_activity:";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeEmail = (email) => email?.trim().toLowerCase();

const activityStorageKey = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("The signed-in student account could not be identified.");
  }
  return `${ACTIVITY_STORAGE_PREFIX}${encodeURIComponent(normalizedEmail)}`;
};

const isValidDate = (date) => {
  if (!DATE_PATTERN.test(date || "")) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const durationBetween = (startTime, endTime) => {
  const start = startTime?.match(TIME_PATTERN);
  const end = endTime?.match(TIME_PATTERN);
  if (!start || !end) return 0;

  const startMinutes = Number(start[1]) * 60 + Number(start[2]);
  let endMinutes = Number(end[1]) * 60 + Number(end[2]);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return endMinutes - startMinutes;
};

const validateActivity = (activity) => (
  activity
  && typeof activity.sessionId === "string"
  && activity.sessionId.length > 0
  && typeof activity.subject === "string"
  && activity.subject.trim().length > 0
  && isValidDate(activity.activityDate)
  && Number.isSafeInteger(activity.durationMinutes)
  && activity.durationMinutes > 0
  && activity.durationMinutes <= 24 * 60
);

export const readStudentActivities = (email) => {
  const stored = localStorage.getItem(activityStorageKey(email));
  if (stored === null) return [];

  const activities = JSON.parse(stored);
  if (!Array.isArray(activities) || !activities.every(validateActivity)) {
    throw new Error("Saved learning activity is in an invalid format.");
  }
  return activities;
};

export const recordStudentAttendance = (email, session) => {
  if (!session || typeof session !== "object") {
    throw new Error("A valid session is required to record attendance.");
  }
  const durationMinutes = durationBetween(session.time, session.endTime);
  if (!session?.id || !session.subject || !isValidDate(session.date) || !durationMinutes) {
    throw new Error("This session does not have a valid date, subject, or duration.");
  }

  const activities = readStudentActivities(email);
  if (activities.some((activity) => activity.sessionId === String(session.id))) {
    return false;
  }

  activities.push({
    sessionId: String(session.id),
    subject: session.subject.trim(),
    activityDate: session.date,
    durationMinutes,
  });
  localStorage.setItem(activityStorageKey(email), JSON.stringify(activities));
  return true;
};

export const isSessionComplete = (session, now = new Date()) => {
  if (!isValidDate(session?.date) || !TIME_PATTERN.test(session?.endTime || "")) {
    return false;
  }
  const end = new Date(`${session.date}T${session.endTime}:00`);
  return Number.isFinite(end.getTime()) && end <= now;
};

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftDate = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const learningStreak = (activities, today = new Date()) => {
  const activityDates = new Set(activities.map((activity) => activity.activityDate));
  const todayKey = localDateKey(today);
  const startDate = activityDates.has(todayKey)
    ? todayKey
    : shiftDate(todayKey, -1);

  if (!activityDates.has(startDate)) return 0;

  let streak = 0;
  let date = startDate;
  while (activityDates.has(date)) {
    streak += 1;
    date = shiftDate(date, -1);
  }
  return streak;
};

export const formatLearningTime = (totalMinutes) => {
  if (totalMinutes === 0) return "0h";
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  if (minutes === 30) return `${(hours + 0.5).toFixed(1)}h`;
  return `${hours}h ${minutes}m`;
};

export const calculateStudentStats = (activities, today = new Date()) => {
  const uniqueSessions = new Set(activities.map((activity) => activity.sessionId));
  const uniqueSubjects = new Set(
    activities.map((activity) => activity.subject.trim().toLowerCase()),
  );
  const totalMinutes = activities.reduce(
    (total, activity) => total + activity.durationMinutes,
    0,
  );

  return {
    sessionsAttended: uniqueSessions.size,
    learningTime: formatLearningTime(totalMinutes),
    subjectsExplored: uniqueSubjects.size,
    learningStreak: learningStreak(activities, today),
  };
};
