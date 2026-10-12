import React, { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  Heart,
  LogOut,
  Plus,
  TrendingUp,
  Upload,
  Accessibility,
  Users,
  MessageCircle,
  Send,
} from "lucide-react";
import { formatSession, getSessionSubjectLabel, readStudents, subjects } from "../../../constants";
import { calculateStudentStats, formatLearningTime, readStudentActivities } from "../../../studentActivity";
import { LogoImage } from "../../Brand";
import { SessionStudents } from "../SessionStudents";
import { loadMentorLearningActivity } from "../../../mentorContent";
import { loadMentorParentMessages, sendMentorParentReply } from "../../../parentPortal";
import {
  emotionOptions,
  loadMentorCheckins,
  markMentorNotificationViewed,
  mentorHelpOptions,
  moodLabels,
  respondToMentorRequest,
} from "../../../studentSensory";

function MentorNavigation({ tab, setTab, mentorId, unreadSupportCount, accessibilityOpen, onToggleAccessibility, onBack, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
    ["performance", TrendingUp, "Student Performance"],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")]] : []),
    ...(mentorId ? [["parentMessages", MessageCircle, "Parent consultations"]] : []),
  ];

  return (
    <aside className="mentor-nav">
      <div className="mentor-rail-brand">
        <span className="mentor-rail-logo"><LogoImage size={42} /></span>
        <span className="mentor-rail-brand-copy"><strong>CogniBridge</strong><small>Mentor space</small></span>
      </div>
      {items.map(([key, Icon, label]) => (
        <button
          key={key}
          className={tab === key ? "active" : ""}
          aria-current={tab === key ? "page" : undefined}
          title={label}
          onClick={() => setTab(key)}
        >
          <Icon size={19} /><span className="mentor-nav-label">{label}</span>{key === "sensory" && unreadSupportCount > 0 && <span className="mentor-notification-count">{unreadSupportCount}</span>}
        </button>
      ))}
      <div className="mentor-rail-footer">
        <button type="button" aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")} onClick={onToggleAccessibility}>
          <Accessibility size={19} /><span className="mentor-nav-label">{t("accessibility")}</span>
        </button>
        <button type="button" className="mentor-rail-logout" aria-label={t("mentorLogout")} title={t("mentorLogout")} onClick={onBack}>
          <span className="mentor-avatar-small">P</span><span className="mentor-nav-label">Priya Sharma</span><LogOut size={16} className="mentor-logout-icon" />
        </button>
      </div>
    </aside>
  );
}

const labelFor = (options, key) => options.find(([value]) => value === key)?.[1] || key;

// Loads shared check-ins for the mentor's assigned students; refreshes every 30s
// so the nav badge stays current. Postgres RLS decides what the mentor can see.
function useMentorSupport(mentorId) {
  const [checkins, setCheckins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mentorId) return undefined;
    let isCurrent = true;
    const refresh = () => loadMentorCheckins(mentorId)
      .then((result) => {
        if (!isCurrent) return;
        setCheckins(result.checkins);
        setNotifications(result.notifications);
        setStudents(result.students);
        setError("");
      })
      .catch(() => {
        if (isCurrent) setError("Shared check-ins couldn't be loaded.");
      });
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [mentorId]);

  const patchNotification = (id, changes) => setNotifications((current) => current.map((item) => (
    item.id === id ? { ...item, ...changes } : item
  )));

  const markAllViewed = async () => {
    const now = new Date().toISOString();
    const unreadNotifications = notifications.filter((item) => !item.viewed_at);
    const results = await Promise.allSettled(unreadNotifications.map((item) => (
      markMentorNotificationViewed(mentorId, item.id)
    )));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        patchNotification(unreadNotifications[index].id, { viewed_at: now });
      }
    });
    if (results.some((result) => result.status === "rejected")) {
      setError("Some support requests couldn't be marked as viewed. Please try again.");
    }
  };

  const respond = async (notificationId, message, addressed) => {
    try {
      await respondToMentorRequest(mentorId, notificationId, message, addressed);
      const now = new Date().toISOString();
      patchNotification(notificationId, {
        viewed_at: now,
        ...(addressed ? { addressed_at: now } : {}),
        mentor_message: message.trim(),
      });
      setError("");
    } catch {
      setError(addressed ? "This request couldn't be marked addressed." : "Your reply couldn't be sent.");
    }
  };

  return {
    checkins,
    notifications,
    students,
    error,
    unreadCount: notifications.filter((item) => !item.viewed_at && !item.addressed_at).length,
    markAllViewed,
    respond,
  };
}

function SensorySupportPage({ support }) {
  const { checkins, notifications, students, error, markAllViewed, respond } = support;
  const [replies, setReplies] = React.useState({});
  const notificationFor = (entry) => notifications.find((item) => item.checkin_id === entry.id);
  const needsSupport = (entry) => entry.mentor_help !== "none" && !notificationFor(entry)?.addressed_at;
  const sortedEntries = [...checkins]
    .sort((a, b) => Number(needsSupport(b)) - Number(needsSupport(a)) || b.created_at.localeCompare(a.created_at));

  useEffect(() => {
    markAllViewed();
  }, [notifications.length]);

  return (
    <>
      <p className="mentor-kicker">STUDENT WELLBEING</p>
      <h1 className="mentor-title">Shared check-ins</h1>
      <p className="mentor-subtitle">Only check-ins your assigned students chose to share are shown here.</p>
      {error && <p className="error-popup">{error}</p>}
      {sortedEntries.length === 0 ? <p className="mentor-subtitle">No shared check-ins yet.</p> : <div className="mentor-sensory-list">
        {sortedEntries.map((entry) => {
          const requestsHelp = entry.mentor_help !== "none";
          const notification = notificationFor(entry);
          const addressed = Boolean(notification?.addressed_at);
          const studentName = students.find((student) => student.id === entry.student_id)?.display_name || "Student";
          return <article className="mentor-sensory-card" key={entry.id}>
            <div className="mentor-sensory-top"><div><strong>{studentName}</strong><small>{new Date(entry.created_at).toLocaleString()}</small></div>{requestsHelp && <span className={addressed ? "addressed" : "support-requested"}>{addressed ? "Addressed" : "Student requested support"}</span>}</div>
            <p><strong>Mood:</strong> {moodLabels[entry.mood - 1]} · <strong>Emotions:</strong> {entry.emotions?.length ? entry.emotions.map((key) => labelFor(emotionOptions, key)).join(", ") : "Not listed"}</p>
            {entry.energy != null && <p><strong>Energy:</strong> {entry.energy}/5 · <strong>Comfort:</strong> {entry.comfort}/5</p>}
            {requestsHelp && <p><strong>Help requested:</strong> {labelFor(mentorHelpOptions, entry.mentor_help)}</p>}
            {entry.mentor_message && <blockquote>{entry.mentor_message}</blockquote>}
            {entry.day_note && <p>{entry.day_note}</p>}
            {notification && (addressed ? (
              notification.mentor_message && <p><strong>Your reply:</strong> {notification.mentor_message}</p>
            ) : <div className="mentor-sensory-actions">
              <form onSubmit={(event) => { event.preventDefault(); if (replies[entry.id]?.trim()) respond(notification.id, replies[entry.id], false); }}>
                <input value={replies[entry.id] ?? ""} maxLength={2000} onChange={(event) => setReplies((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder="Write an optional reply" aria-label={`Reply to ${studentName}`} />
                <button type="submit">Send reply</button>
              </form>
              <button type="button" onClick={() => respond(notification.id, replies[entry.id] || "", true)}>Mark addressed</button>
            </div>)}
          </article>;
        })}
      </div>}
    </>
  );
}

function OverviewPage({ sessions, notes, mentorId, setTab, onEditSession, t }) {
  const [openStudentsId, setOpenStudentsId] = useState(null);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingSessions = sessions.filter((session) => session.date >= today);
  const attendeeCount = upcomingSessions.reduce(
    (total, session) => total + session.attendees,
    0,
  );

  return (
    <>
      <div className="mentor-hero">
        <div>
          <p className="mentor-kicker">{t("mentorDashboard")}</p>
          <h1>{t("goodMorningPriya")}</h1>
          <span>{t("onlyUpcomingMaths")}</span>
        </div>
        <button className="mentor-primary" onClick={() => setTab("schedule")}>
          <Plus size={18} /> {t("scheduleSession")}
        </button>
      </div>

      <div className="mentor-stats">
        <article><CalendarDays size={21} /><strong>{upcomingSessions.length}</strong><span>{t("onlyUpcomingSessions")}</span></article>
        <article><Users size={21} /><strong>{attendeeCount}</strong><span>{t("totalSignUps")}</span></article>
        <article><FileText size={21} /><strong>{notes.length}</strong><span>{t("notesUploaded")}</span></article>
      </div>

      <h2 className="mentor-title">{t("sessions")}</h2>
      <div className="mentor-session-grid">
        {sessions.map((session) => (
          <article className="mentor-session-card" key={session.id}>
            <span className="mentor-subject">{getSessionSubjectLabel(session.subject, t)}</span>
            <p className="mentor-time"><Clock3 size={14} /> {formatSession(session)}</p>
            <h3>{session.titleKey ? t(session.titleKey) : session.title}</h3>
            <p className="mentor-attendee-count">
              <Users size={16} /> {session.attendees} {t("learnersSignedUpCount")}
            </p>
            <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
              {t("openGoogleMeet")} <ChevronRight size={15} />
            </a>
            <button type="button" className="mentor-edit-session" onClick={() => onEditSession(session)}>{t("editSession")}</button>
            {mentorId && session.mentorId === mentorId && (
              <>
                <button
                  type="button"
                  className="mentor-edit-session"
                  aria-expanded={openStudentsId === session.id}
                  onClick={() => setOpenStudentsId((id) => (id === session.id ? null : session.id))}
                >
                  <Users size={15} /> {t("sessionStudents")}
                </button>
                {openStudentsId === session.id && <SessionStudents sessionId={session.id} t={t} />}
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function SchedulePage({ form, setForm, onSubmit, editing, onCancelEdit, t }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      <p className="mentor-kicker">{editing ? t("editSession").toUpperCase() : t("newSession")}</p>
      <h1 className="mentor-title">{editing ? t("editSession") : t("scheduleSession")}</h1>
      <p className="mentor-subtitle">{t("publishedSessionsHome")}</p>
      <form className="schedule-form" onSubmit={onSubmit}>
        <label>
          {t("sessionTitle")}
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder={t("geometryPlaceholder")} required />
        </label>
        <label>
          {t("subject")}
          <select value={form.subject} onChange={(event) => updateField("subject", event.target.value)}>
            {subjects.map((subject) => <option key={subject} value={subject}>{getSessionSubjectLabel(subject, t)}</option>)}
          </select>
        </label>
        <div className="form-columns">
          <label>{t("date")}<input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} required /></label>
          <label>{t("startTime")}<input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} required /></label>
          <label>{t("endTime")}<input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required /></label>
        </div>
        <label>
          {t("googleMeetUrl")}
          <input type="url" value={form.meetLink} onChange={(event) => updateField("meetLink", event.target.value)} placeholder="https://meet.google.com/..." required />
        </label>
        <div className="mentor-form-actions">
          <button className="mentor-primary" type="submit"><CalendarDays size={18} /> {editing ? t("saveChanges") : t("publishSession")}</button>
          {editing && <button type="button" className="mentor-cancel-edit" onClick={onCancelEdit}>{t("cancel")}</button>}
        </div>
      </form>
    </>
  );
}

function NotesPage({ notes, form, setForm, onSubmit, onDownload, t }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      <p className="mentor-kicker">{t("learningMaterials")}</p>
      <h1 className="mentor-title">{t("uploadNotes")}</h1>
      <p className="mentor-subtitle">{t("addSubjectForNotes")}</p>
      <form className="schedule-form notes-form" onSubmit={onSubmit}>
        <label>
          {t("notesTitle")}
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder={t("algebraPlaceholder")} required />
        </label>
        <label>
          {t("subject")}
          <select value={form.subject} onChange={(event) => updateField("subject", event.target.value)}>
            {subjects.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </label>
        <label className="file-upload">
          <span><Upload size={18} /> {t("chooseFile")}</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(event) => updateField("file", event.target.files?.[0] || null)}
            required
          />
          <small>{form.file?.name || t("allowedNoteFiles")}</small>
        </label>
        <button className="mentor-primary" type="submit"><Upload size={18} /> {t("uploadNotes")}</button>
      </form>

      {notes.length > 0 && (
        <div className="uploaded-notes">
          <h2>{t("uploadedNotes")}</h2>
          {notes.map((note) => (
            <div key={note.id}>
              <FileText size={18} />
              <span><strong>{note.title}</strong><small>{getSessionSubjectLabel(note.subject, t)} · {note.fileName}</small></span>
              <button type="button" className="uploaded-note-download" onClick={() => onDownload(note)} aria-label={`${t("downloadNote")}: ${note.title}`}>
                <ArrowDownToLine size={16} /> {t("downloadNote")}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StudentPerformancePage({ mentorId, assignedStudents }) {
  const [activities, setActivities] = useState([]);
  const [localStudents, setLocalStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(mentorId));
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    if (mentorId) {
      setLoading(true);
      loadMentorLearningActivity().then((rows) => {
        if (isCurrent) {
          setActivities(rows.map((row) => ({
            studentId: row.student_id,
            sessionId: row.session_id,
            subject: row.subject,
            activityDate: row.activity_date,
            durationMinutes: row.duration_minutes,
          })));
          setError("");
        }
      }).catch(() => {
        if (isCurrent) setError("Learning activity couldn't be loaded. Apply the student performance migration, then try again.");
      }).finally(() => { if (isCurrent) setLoading(false); });
    } else {
      try {
        const students = readStudents().filter((student) => (student.role || "Student").toLowerCase() === "student");
        const localActivity = students.flatMap((student) => readStudentActivities(student.email).map((activity) => ({ ...activity, studentEmail: student.email.toLowerCase() })));
        if (isCurrent) { setLocalStudents(students); setActivities(localActivity); setError(""); }
      } catch {
        if (isCurrent) setError("Student activity couldn't be loaded from this device.");
      } finally {
        if (isCurrent) setLoading(false);
      }
    }
    return () => { isCurrent = false; };
  }, [mentorId]);

  const students = mentorId
    ? assignedStudents.map((student) => ({ id: student.id, name: student.display_name, email: "" }))
    : localStudents.map((student) => ({ id: student.email.toLowerCase(), name: student.name || student.email, email: student.email.toLowerCase() }));
  const rows = students.map((student) => {
    const studentActivities = activities.filter((item) => mentorId ? item.studentId === student.id : item.studentEmail === student.email);
    const stats = calculateStudentStats(studentActivities);
    const latest = [...studentActivities].sort((a, b) => b.activityDate.localeCompare(a.activityDate))[0];
    return { ...student, activities: studentActivities, stats, latest };
  }).sort((a, b) => b.stats.sessionsAttended - a.stats.sessionsAttended || a.name.localeCompare(b.name));
  const totalSessions = rows.reduce((sum, row) => sum + row.stats.sessionsAttended, 0);
  const totalMinutes = activities.reduce((sum, item) => sum + item.durationMinutes, 0);
  const activeStudents = rows.filter((row) => row.stats.sessionsAttended > 0).length;

  return <>
    <p className="mentor-kicker">LEARNING PROGRESS</p>
    <h1 className="mentor-title">Student Performance</h1>
    <p className="mentor-subtitle">Track recorded session attendance, learning time, and subjects explored.</p>
    <div className="performance-summary">
      <article><Users size={20} /><strong>{rows.length}</strong><span>Students</span></article>
      <article><CalendarDays size={20} /><strong>{totalSessions}</strong><span>Sessions attended</span></article>
      <article><Clock3 size={20} /><strong>{formatLearningTime(totalMinutes)}</strong><span>Learning time</span></article>
      <article><TrendingUp size={20} /><strong>{activeStudents}</strong><span>Students with activity</span></article>
    </div>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle">Loading student progress…</p>
      : rows.length === 0 ? <div className="performance-empty"><Users size={24} /><h2>No students to show yet</h2><p>Students assigned to your mentor account will appear here.</p></div>
        : <div className="performance-grid">{rows.map((student) => {
          const subjects = [...new Set(student.activities.map((item) => item.subject))];
          return <article className="performance-card" key={student.id}>
            <div className="performance-card-heading"><span className="performance-avatar">{student.name?.charAt(0)?.toUpperCase() || "S"}</span><div><h2>{student.name}</h2><small>{student.latest ? `Last activity ${new Date(`${student.latest.activityDate}T00:00:00`).toLocaleDateString()}` : "No sessions recorded yet"}</small></div></div>
            <div className="performance-metrics"><div><strong>{student.stats.sessionsAttended}</strong><span>Sessions</span></div><div><strong>{student.stats.learningTime}</strong><span>Learning time</span></div><div><strong>{student.stats.learningStreak}</strong><span>Day streak</span></div></div>
            <div className="performance-subjects"><strong>Subjects</strong>{subjects.length ? <div>{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <small>No subjects recorded</small>}</div>
          </article>;
        })}</div>}
  </>;
}

function ParentConsultationsPage({ mentorId, students }) {
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const rows = await loadMentorParentMessages(mentorId);
    setMessages(rows);
  };

  useEffect(() => {
    let current = true;
    loadMentorParentMessages(mentorId).then((rows) => {
      if (current) { setMessages(rows); setError(""); }
    }).catch(() => {
      if (current) setError("Parent conversations couldn't be loaded.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [mentorId]);

  const threads = new Map();
  messages.forEach((message) => {
    const key = `${message.parent_id}:${message.student_id}`;
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key).push(message);
  });

  const sendReply = async (event, key, thread) => {
    event.preventDefault();
    const message = drafts[key]?.trim();
    if (!message) return;
    setSending(true); setError("");
    try {
      await sendMentorParentReply({ mentorId, studentId: thread[0].student_id, parentId: thread[0].parent_id, message });
      setDrafts((current) => ({ ...current, [key]: "" }));
      await refresh();
    } catch {
      setError("Your reply couldn't be sent. Please try again.");
    } finally { setSending(false); }
  };

  return <>
    <p className="mentor-kicker">FAMILY CONNECTION</p>
    <h1 className="mentor-title">Parent consultations</h1>
    <p className="mentor-subtitle">Private conversations with parents of your assigned students.</p>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle">Loading conversations…</p>
      : !threads.size ? <div className="performance-empty"><MessageCircle size={24} /><h2>No parent messages yet</h2><p>Messages from connected parents will appear here.</p></div>
        : <div className="mentor-parent-threads">{[...threads.entries()].map(([key, thread]) => {
          const student = students.find((item) => item.id === thread[0].student_id);
          return <article className="mentor-parent-thread" key={key}>
            <header><div><strong>{student?.display_name || "Student"}</strong><small>Parent consultation · {thread.length} messages</small></div></header>
            <div className="mentor-parent-thread-messages">{thread.map((message) => <p className={message.sender_role === "mentor" ? "from-mentor" : "from-parent"} key={message.id}><strong>{message.sender_role === "mentor" ? "You" : "Parent"}</strong>{message.message}<small>{new Date(message.created_at).toLocaleString()}</small></p>)}</div>
            <form onSubmit={(event) => sendReply(event, key, thread)}><input aria-label={`Reply to parent of ${student?.display_name || "student"}`} maxLength={4000} value={drafts[key] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder="Write a reply…" required /><button type="submit" disabled={sending}><Send size={16} /> Reply</button></form>
          </article>;
        })}</div>}
  </>;
}

export function MentorDashboard({
  sessions,
  mentorId,
  notes,
  actionError,
  tab,
  setTab,
  form,
  setForm,
  noteForm,
  setNoteForm,
  onPublishSession,
  onEditSession,
  editingSessionId,
  onCancelEdit,
  onUploadNote,
  onDownloadNote,
  onBack,
  accessibilityOpen,
  onToggleAccessibility,
  t,
}) {
  const support = useMentorSupport(mentorId);
  return (
    <main className="mentor-page">
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} mentorId={mentorId} unreadSupportCount={support.unreadCount} accessibilityOpen={accessibilityOpen} onToggleAccessibility={onToggleAccessibility} onBack={onBack} t={t} />
        <section className="mentor-content">
          {actionError && <p className="error-popup">{actionError}</p>}
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} mentorId={mentorId} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "performance" && <StudentPerformancePage mentorId={mentorId} assignedStudents={support.students} />}
          {tab === "parentMessages" && mentorId && <ParentConsultationsPage mentorId={mentorId} students={support.students} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} t={t} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} onDownload={onDownloadNote} t={t} />}
          {tab === "sensory" && mentorId && <SensorySupportPage support={support} />}
        </section>
      </div>
    </main>
  );
}
