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
  loadMentorCheckins,
  markMentorNotificationViewed,
  respondToMentorRequest,
} from "../../../studentSensory";

function MentorNavigation({ tab, setTab, mentorId, unreadSupportCount, accessibilityOpen, onToggleAccessibility, onBack, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
    ["performance", TrendingUp, t("md_perfNav")],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")]] : []),
    ...(mentorId ? [["parentMessages", MessageCircle, t("md_parentNav")]] : []),
  ];

  return (
    <aside className="mentor-nav">
      <div className="mentor-rail-brand">
        <span className="mentor-rail-logo"><LogoImage size={42} /></span>
        <span className="mentor-rail-brand-copy"><strong>CogniBridge</strong><small>{t("md_space")}</small></span>
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

// Loads shared check-ins for the mentor's assigned students; refreshes every 30s
// so the nav badge stays current. Postgres RLS decides what the mentor can see.
function useMentorSupport(mentorId, t) {
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
        if (isCurrent) setError(t("md_loadFail"));
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
      setError(t("md_viewedFail"));
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
      setError(t(addressed ? "md_addressFail" : "md_replyFail"));
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

function SensorySupportPage({ support, t }) {
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
      <p className="mentor-kicker">{t("md_wellbeing")}</p>
      <h1 className="mentor-title">{t("md_sharedTitle")}</h1>
      <p className="mentor-subtitle">{t("md_sharedSub")}</p>
      {error && <p className="error-popup">{error}</p>}
      {sortedEntries.length === 0 ? <p className="mentor-subtitle">{t("md_noShared")}</p> : <div className="mentor-sensory-list">
        {sortedEntries.map((entry) => {
          const requestsHelp = entry.mentor_help !== "none";
          const notification = notificationFor(entry);
          const addressed = Boolean(notification?.addressed_at);
          const studentName = students.find((student) => student.id === entry.student_id)?.display_name || t("md_student");
          return <article className="mentor-sensory-card" key={entry.id}>
            <div className="mentor-sensory-top"><div><strong>{studentName}</strong><small>{new Date(entry.created_at).toLocaleString()}</small></div>{requestsHelp && <span className={addressed ? "addressed" : "support-requested"}>{t(addressed ? "md_addressed" : "md_supportRequested")}</span>}</div>
            <p><strong>{t("md_mood")}</strong> {t(`mood_${entry.mood}`)} · <strong>{t("sn_dEmotions")}</strong> {entry.emotions?.length ? entry.emotions.map((key) => t(`emotion_${key}`)).join(", ") : t("md_notListed")}</p>
            {entry.energy != null && <p><strong>{t("sn_dEnergy")}</strong> {entry.energy}/5 · <strong>{t("sn_dComfort")}</strong> {entry.comfort}/5</p>}
            {requestsHelp && <p><strong>{t("md_helpRequested")}</strong> {t(`mentorHelp_${entry.mentor_help}`)}</p>}
            {entry.mentor_message && <blockquote>{entry.mentor_message}</blockquote>}
            {entry.day_note && <p>{entry.day_note}</p>}
            {notification && (addressed ? (
              notification.mentor_message && <p><strong>{t("md_yourReply")}</strong> {notification.mentor_message}</p>
            ) : <div className="mentor-sensory-actions">
              <form onSubmit={(event) => { event.preventDefault(); if (replies[entry.id]?.trim()) respond(notification.id, replies[entry.id], false); }}>
                <input value={replies[entry.id] ?? ""} maxLength={2000} onChange={(event) => setReplies((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder={t("md_replyPlaceholder")} aria-label={t("md_replyTo", { name: studentName })} />
                <button type="submit">{t("md_sendReply")}</button>
              </form>
              <button type="button" onClick={() => respond(notification.id, replies[entry.id] || "", true)}>{t("md_markAddressed")}</button>
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

function StudentPerformancePage({ mentorId, assignedStudents, t }) {
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
        if (isCurrent) setError(t("md_perfLoadFail"));
      }).finally(() => { if (isCurrent) setLoading(false); });
    } else {
      try {
        const students = readStudents().filter((student) => (student.role || "Student").toLowerCase() === "student");
        const localActivity = students.flatMap((student) => readStudentActivities(student.email).map((activity) => ({ ...activity, studentEmail: student.email.toLowerCase() })));
        if (isCurrent) { setLocalStudents(students); setActivities(localActivity); setError(""); }
      } catch {
        if (isCurrent) setError(t("md_localLoadFail"));
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
    <p className="mentor-kicker">{t("md_progressEyebrow")}</p>
    <h1 className="mentor-title">{t("md_perfNav")}</h1>
    <p className="mentor-subtitle">{t("md_perfSub")}</p>
    <div className="performance-summary">
      <article><Users size={20} /><strong>{rows.length}</strong><span>{t("md_students")}</span></article>
      <article><CalendarDays size={20} /><strong>{totalSessions}</strong><span>{t("sessionsAttendedShort")}</span></article>
      <article><Clock3 size={20} /><strong>{formatLearningTime(totalMinutes)}</strong><span>{t("md_learningTime")}</span></article>
      <article><TrendingUp size={20} /><strong>{activeStudents}</strong><span>{t("md_activeStudents")}</span></article>
    </div>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle">{t("md_loadingProgress")}</p>
      : rows.length === 0 ? <div className="performance-empty"><Users size={24} /><h2>{t("md_noStudentsTitle")}</h2><p>{t("md_noStudentsCopy")}</p></div>
        : <div className="performance-grid">{rows.map((student) => {
          const subjects = [...new Set(student.activities.map((item) => item.subject))];
          return <article className="performance-card" key={student.id}>
            <div className="performance-card-heading"><span className="performance-avatar">{student.name?.charAt(0)?.toUpperCase() || "S"}</span><div><h2>{student.name}</h2><small>{student.latest ? t("md_lastActivity", { date: new Date(`${student.latest.activityDate}T00:00:00`).toLocaleDateString() }) : t("md_noSessionsYet")}</small></div></div>
            <div className="performance-metrics"><div><strong>{student.stats.sessionsAttended}</strong><span>{t("sessions")}</span></div><div><strong>{student.stats.learningTime}</strong><span>{t("md_learningTime")}</span></div><div><strong>{student.stats.learningStreak}</strong><span>{t("md_dayStreak")}</span></div></div>
            <div className="performance-subjects"><strong>{t("md_subjectsLabel")}</strong>{subjects.length ? <div>{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <small>{t("md_noSubjects")}</small>}</div>
          </article>;
        })}</div>}
  </>;
}

function ParentConsultationsPage({ mentorId, students, t }) {
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
      if (current) setError(t("md_convoLoadFail"));
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
      setError(t("md_convoReplyFail"));
    } finally { setSending(false); }
  };

  return <>
    <p className="mentor-kicker">{t("md_familyEyebrow")}</p>
    <h1 className="mentor-title">{t("md_parentNav")}</h1>
    <p className="mentor-subtitle">{t("md_parentSub")}</p>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle">{t("md_loadingConvo")}</p>
      : !threads.size ? <div className="performance-empty"><MessageCircle size={24} /><h2>{t("md_noParentMsgs")}</h2><p>{t("md_noParentMsgsCopy")}</p></div>
        : <div className="mentor-parent-threads">{[...threads.entries()].map(([key, thread]) => {
          const student = students.find((item) => item.id === thread[0].student_id);
          return <article className="mentor-parent-thread" key={key}>
            <header><div><strong>{student?.display_name || t("md_student")}</strong><small>{t("md_parentThread", { n: thread.length })}</small></div></header>
            <div className="mentor-parent-thread-messages">{thread.map((message) => <p className={message.sender_role === "mentor" ? "from-mentor" : "from-parent"} key={message.id}><strong>{message.sender_role === "mentor" ? t("youLabel") : t("md_parentWord")}</strong>{message.message}<small>{new Date(message.created_at).toLocaleString()}</small></p>)}</div>
            <form onSubmit={(event) => sendReply(event, key, thread)}><input aria-label={t("md_replyToParent", { name: student?.display_name || t("md_student") })} maxLength={4000} value={drafts[key] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder={t("md_writeReply")} required /><button type="submit" disabled={sending}><Send size={16} /> {t("md_reply")}</button></form>
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
  const support = useMentorSupport(mentorId, t);
  return (
    <main className="mentor-page">
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} mentorId={mentorId} unreadSupportCount={support.unreadCount} accessibilityOpen={accessibilityOpen} onToggleAccessibility={onToggleAccessibility} onBack={onBack} t={t} />
        <section className="mentor-content">
          {actionError && <p className="error-popup">{actionError}</p>}
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} mentorId={mentorId} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "performance" && <StudentPerformancePage mentorId={mentorId} assignedStudents={support.students} t={t} />}
          {tab === "parentMessages" && mentorId && <ParentConsultationsPage mentorId={mentorId} students={support.students} t={t} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} t={t} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} onDownload={onDownloadNote} t={t} />}
          {tab === "sensory" && mentorId && <SensorySupportPage support={support} t={t} />}
        </section>
      </div>
    </main>
  );
}
