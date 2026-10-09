import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  Heart,
  LogOut,
  Plus,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { formatSession, getSessionSubjectLabel, subjects } from "../../../constants";
import { LogoImage } from "../../Brand";
import {
  emotionOptions,
  loadMentorCheckins,
  markMentorNotificationViewed,
  mentorHelpOptions,
  moodLabels,
  respondToMentorRequest,
} from "../../../studentSensory";

function MentorHeader({ onBack, t }) {
  return (
    <header className="mentor-header">
      <button className="mentor-wordmark" onClick={onBack}>
        <span><LogoImage size={38} /></span>
        <strong>CogniBridge <small>{t("mentorSpace")}</small></strong>
      </button>
      <div>
        <span className="mentor-user"><UserRound size={17} /> Priya Sharma {t("subjectMaths")}</span>
        <button className="mentor-logout" onClick={onBack}>
          <LogOut size={17} /> {t("mentorLogout")}
        </button>
      </div>
    </header>
  );
}

function MentorNavigation({ tab, setTab, mentorId, unreadSupportCount, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")]] : []),
  ];

  return (
    <aside className="mentor-nav">
      <p>{t("mentorSpace").toUpperCase()}</p>
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

function OverviewPage({ sessions, notes, setTab, onEditSession, t }) {
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

function NotesPage({ notes, form, setForm, onSubmit, t }) {
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
              <a href={note.dataUrl} target="_blank" rel="noopener noreferrer">{t("downloadNote")}</a>
            </div>
          ))}
        </div>
      )}
    </>
  );
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
  onBack,
  t,
}) {
  const support = useMentorSupport(mentorId);
  return (
    <main className="mentor-page">
      <MentorHeader onBack={onBack} t={t} />
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} mentorId={mentorId} unreadSupportCount={support.unreadCount} t={t} />
        <section className="mentor-content">
          {actionError && <p className="error-popup">{actionError}</p>}
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} t={t} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} t={t} />}
          {tab === "sensory" && mentorId && <SensorySupportPage support={support} />}
        </section>
      </div>
    </main>
  );
}
