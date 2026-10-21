import React, { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Award,
  CalendarDays,
  ChevronRight,
  Clock3,
  Settings,
  Video,
  Eye,
  Trash2,
  FileText,
  Home,
  Headphones,
  BookHeart,
  Heart,
  LogOut,
  Plus,
  TrendingUp,
  Upload,
  Accessibility,
  Users,
<<<<<<< HEAD
  MessageCircle,
  Send,
  UserRound,
=======
  Trophy,
>>>>>>> origin/main
} from "lucide-react";
import { formatSession, getSessionSubjectLabel, readStudents, subjects } from "../../../constants";
import { calculateStudentStats, formatLearningTime, readStudentActivities } from "../../../studentActivity";
import { LogoImage } from "../../Brand";
<<<<<<< HEAD
import { RelaxationRoom } from "../../RelaxationRoom";
import { createPrivateSession, deletePrivateSession, fetchMentorLeaderboard, loadMentorLearningActivity, loadMentorPrivateSessions, loadMentorSharedJournal, loadSessionStudents, setSessionStudentAttention, setSessionStudentGood } from "../../../mentorContent";
import { ReflectionChart } from "../../student/pages/ReflectionJournal";
import { loadMentorParentMessages, sendMentorParentReply } from "../../../parentPortal";
import { loadScreenTime, readLocalScreenTime } from "../../../screenTime";
import { ScreenTimeSummary } from "../../shared/ScreenTimeSummary";
=======
import { SessionStudents } from "../SessionStudents";
import { deletePrivateSession, loadMentorPrivateSessions } from "../../../privateSessions";
import { listStudentsForMentor, loadMentorLearningActivity, loadMentorLeaderboard, setMyStudent } from "../../../mentorContent";
>>>>>>> origin/main
import {
  loadMentorCheckins,
  markMentorNotificationViewed,
  respondToMentorRequest,
} from "../../../studentSensory";

function MentorNavigation({ tab, setTab, mentorId, unreadSupportCount, accessibilityOpen, onToggleAccessibility, onBack, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
<<<<<<< HEAD
    ["relax", Headphones, t("quietSpaceTitle")],
    ["performance", TrendingUp, t("studentPerformance")],
    ...(mentorId ? [["journal", BookHeart, t("sharedJournalHeading")]] : []),
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")]] : []),
    ...(mentorId ? [["parentMessages", MessageCircle, t("parentConsultations")]] : []),
    ...(mentorId ? [["privateSessions", UserRound, "Private sessions"]] : []),
=======
    ["performance", TrendingUp, t("md_perfNav")],
    ["leaderboard", Trophy, t("md_lbNav")],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")]] : []),
    ["settings", Settings, t("settings")],
>>>>>>> origin/main
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
        <button type="button" data-accessibility-toggle aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")} onClick={onToggleAccessibility}>
          <Accessibility size={19} /><span className="mentor-nav-label">{t("accessibility")}</span>
        </button>
        <button type="button" className="mentor-rail-logout" aria-label={t("mentorLogout")} title={t("mentorLogout")} onClick={onBack}>
          <span className="mentor-avatar-small">P</span><span className="mentor-nav-label">Priya Sharma</span><LogOut size={16} className="mentor-logout-icon" />
        </button>
      </div>
    </aside>
  );
}

<<<<<<< HEAD
function SharedJournalPage({ mentorId, t }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    loadMentorSharedJournal(mentorId).then((rows) => { if (live) setEntries(rows); }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [mentorId]);
  return <section className="mentor-page-content"><div className="mentor-page-heading"><div><p className="mentor-kicker">{t("sharedJournalHeading")}</p><h1>{t("sharedJournalHeading")}</h1></div></div>
    {loading ? <p>{t("loading")}</p> : entries.length ? <div className="mentor-shared-journal-list">{entries.map((item) => <article className="mentor-shared-journal-card" key={item.id}><p className="mentor-kicker">{item.student_name} · {new Date(item.created_at).toLocaleDateString(document.documentElement.lang || undefined, { dateStyle: "medium" })}</p><p className="mentor-shared-journal-text">{item.entry}</p><ReflectionChart chart={item.chart} t={t} /></article>)}</div> : <p className="parent-empty">{t("sharedJournalEmpty")}</p>}
  </section>;
}

const labelFor = (options, key) => options.find(([value]) => value === key)?.[1] || key;

=======
>>>>>>> origin/main
// Loads shared check-ins for the mentor's assigned students; refreshes every 30s
// so the nav badge stays current. Postgres RLS decides what the mentor can see.
function useMentorSupport(mentorId, t) {
  const [checkins, setCheckins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

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
  }, [mentorId, version]);

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
    reload: () => setVersion((current) => current + 1),
  };
}

function SensorySupportPage({ support, t }) {
  const { checkins, notifications, students, error, markAllViewed, respond } = support;
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
              <button type="button" onClick={() => respond(notification.id, "", true)}>{t("md_markAddressed")}</button>
            </div>)}
          </article>;
        })}
      </div>}
    </>
  );
}

<<<<<<< HEAD
function SessionRoster({ session }) {
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busyStudent, setBusyStudent] = useState("");
  const refresh = () => loadSessionStudents(session.id).then(setStudents).catch(() => setError("The session roster couldn't be loaded."));
  useEffect(() => { if (open) refresh(); }, [open, session.id]);
  const update = async (student, action) => {
    setBusyStudent(student.id); setError("");
    try {
      if (action === "good") await setSessionStudentGood(session.id, student.id, !student.good);
      else await setSessionStudentAttention(session.id, student.id, action);
      await refresh();
    } catch { setError("That feedback couldn't be saved. Please try again."); }
    finally { setBusyStudent(""); }
  };
  return <div className="mentor-session-roster">
    <button type="button" className="mentor-edit-session" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide learner check-in" : "Learner check-in"}</button>
    {open && <div className="mentor-roster-list">
      {error && <p role="alert">{error}</p>}
      {!students.length && !error && <small>No registrations yet.</small>}
      {students.map((student) => <div className="mentor-roster-row" key={student.id}>
        <strong>{student.name}</strong><span>{student.attended ? "Attended" : "Registered"}</span>
        <label>Attention <select aria-label={`Attention for ${student.name}`} disabled={busyStudent === student.id} value={student.attention || "steady"} onChange={(event) => update(student, event.target.value)}><option value="steady">Steady</option><option value="some">Some support</option><option value="more">More support</option></select></label>
        <button type="button" disabled={busyStudent === student.id} aria-pressed={student.good} onClick={() => update(student, "good")}>{student.good ? "★ Good work" : "☆ Mark good work"}</button>
      </div>)}
    </div>}
  </div>;
}

function OverviewPage({ sessions, notes, setTab, onEditSession, mentorId, t }) {
=======
function OverviewPage({ sessions, notes, mentorId, setTab, onEditSession, t }) {
  const [openStudentsId, setOpenStudentsId] = useState(null);
>>>>>>> origin/main
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
<<<<<<< HEAD
            {mentorId && <SessionRoster session={session} />}
=======
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
>>>>>>> origin/main
          </article>
        ))}
      </div>
    </>
  );
}

function PrivateSessionsList({ mentorId, version, students, t }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mentorId) return undefined;
    let isCurrent = true;
    loadMentorPrivateSessions(mentorId).then((result) => {
      if (isCurrent) setRows(result);
    }).catch((loadError) => {
      console.error("Private sessions failed to load:", loadError);
    });
    return () => { isCurrent = false; };
  }, [mentorId, version]);

  const cancel = async (row) => {
    if (!window.confirm(t("ps_cancelConfirm", { title: row.title }))) return;
    try {
      await deletePrivateSession(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      setError("");
    } catch (deleteError) {
      console.error("Private session cancel failed:", deleteError);
      setError(t("ps_deleteFail"));
    }
  };

  if (!rows.length) return null;
  return (
    <div className="uploaded-notes private-sessions-list">
      <h2>{t("ps_listTitle")}</h2>
      {error && <p className="error-popup" role="alert">{error}</p>}
      {rows.map((row) => (
        <div key={row.id}>
          <Video size={18} />
          <span><strong>{row.title}</strong><small>{students.find((student) => student.id === row.studentId)?.display_name || t("md_student")} · {row.date} · {row.time} – {row.endTime}</small></span>
          <div className="uploaded-note-actions">
            <a className="uploaded-note-download" href={row.meetLink} target="_blank" rel="noopener noreferrer"><Video size={16} /> {t("ps_join")}</a>
            <button type="button" className="uploaded-note-download uploaded-note-delete" onClick={() => cancel(row)}><Trash2 size={16} /> {t("ps_cancel")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SchedulePage({ form, setForm, onSubmit, editing, onCancelEdit, mentorId, students, privateVersion, canSchedulePrivate, t }) {
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
          <input type="text" inputMode="url" value={form.meetLink} onChange={(event) => updateField("meetLink", event.target.value)} placeholder="https://meet.google.com/..." required />
        </label>
        {canSchedulePrivate && <label>
          {t("ps_visibleTo")}
          <select value={form.privateStudentId || ""} disabled={editing} onChange={(event) => updateField("privateStudentId", event.target.value)}>
            <option value="">{t("ps_everyone")}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{t("ps_onlyStudent", { name: student.display_name })}</option>)}
          </select>
          <small className="form-hint">{students.length ? t("ps_hint") : t("ps_noStudents")}</small>
        </label>}
        <div className="mentor-form-actions">
          <button className="mentor-primary" type="submit"><CalendarDays size={18} /> {editing ? t("saveChanges") : t("publishSession")}</button>
          {editing && <button type="button" className="mentor-cancel-edit" onClick={onCancelEdit}>{t("cancel")}</button>}
        </div>
      </form>
    </>
  );
}

function NotesPage({ notes, form, setForm, onSubmit, onDownload, onView, onDelete, t }) {
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
              <div className="uploaded-note-actions">
                <button type="button" className="uploaded-note-download" onClick={() => onView(note)} aria-label={`${t("md_viewNote")}: ${note.title}`}>
                  <Eye size={16} /> {t("md_viewNote")}
                </button>
                <button type="button" className="uploaded-note-download" onClick={() => onDownload(note)} aria-label={`${t("downloadNote")}: ${note.title}`}>
                  <ArrowDownToLine size={16} /> {t("downloadNote")}
                </button>
                <button type="button" className="uploaded-note-download uploaded-note-delete" onClick={() => onDelete(note)} aria-label={`${t("md_deleteNote")}: ${note.title}`}>
                  <Trash2 size={16} /> {t("md_deleteNote")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MentorSettingsPage({ mentorId, onChanged, t }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(mentorId));
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!mentorId) return undefined;
    let isCurrent = true;
    listStudentsForMentor().then((result) => {
      if (isCurrent) setRows(result || []);
    }).catch((loadError) => {
      console.error("Student list failed:", loadError);
      if (isCurrent) setError(t("md_setLoadFail"));
    }).finally(() => { if (isCurrent) setLoading(false); });
    return () => { isCurrent = false; };
  }, [mentorId]);

  const toggle = async (row) => {
    const next = !row.is_mine;
    setSavingId(row.student_id);
    setError("");
    try {
      await setMyStudent(row.student_id, next);
      setRows((current) => current.map((item) => item.student_id === row.student_id ? { ...item, is_mine: next } : item));
      onChanged();
    } catch (saveError) {
      console.error("Student selection failed:", saveError);
      setError(t("md_setSaveFail"));
    } finally {
      setSavingId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const visible = rows.filter((row) => !query || row.display_name.toLowerCase().includes(query));
  const mine = rows.filter((row) => row.is_mine).length;

  return <>
    <p className="mentor-kicker">{t("settings")}</p>
    <h1 className="mentor-title">{t("md_setTitle")}</h1>
    <p className="mentor-subtitle">{t("md_setSubtitle")}</p>
    {!mentorId ? <div className="performance-empty"><Settings size={24} /><h2>{t("md_setNeedSignIn")}</h2></div> : <>
      {error && <p className="error-popup" role="alert">{error}</p>}
      <div className="mentor-students-toolbar">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("md_setSearch")} aria-label={t("md_setSearch")} />
        <span>{t("md_setSummary", { mine, total: rows.length })}</span>
      </div>
      {loading ? <p className="mentor-subtitle" role="status">{t("md_setLoading")}</p>
        : !visible.length ? <div className="performance-empty"><Users size={24} /><h2>{t("md_setEmpty")}</h2></div>
          : <div className="mentor-students-table-wrap"><table className="mentor-students-table">
            <thead><tr><th>{t("md_setColStudent")}</th><th>{t("md_setColJoined")}</th><th>{t("md_setColStatus")}</th></tr></thead>
            <tbody>{visible.map((row) => <tr key={row.student_id} className={row.is_mine ? "is-mine" : ""}>
              <td><span className="mentor-leaderboard-avatar" aria-hidden="true">{row.display_name.charAt(0).toUpperCase()}</span> {row.display_name}</td>
              <td>{new Date(row.joined_at).toLocaleDateString()}</td>
              <td><button type="button" className={`mentor-student-toggle${row.is_mine ? " active" : ""}`} aria-pressed={row.is_mine} disabled={savingId === row.student_id} onClick={() => toggle(row)}>
                {row.is_mine ? t("md_setRemove") : t("md_setAdd")}
              </button></td>
            </tr>)}</tbody>
          </table></div>}
    </>}
  </>;
}

function StudentPerformancePage({ mentorId, assignedStudents, t }) {
  const [activities, setActivities] = useState([]);
  const [localStudents, setLocalStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(mentorId));
  const [error, setError] = useState("");
  const [mentorRanks, setMentorRanks] = useState([]);
  const [screenTimeRows, setScreenTimeRows] = useState([]);

  useEffect(() => {
    let isCurrent = true;
    const refresh = async () => {
      if (mentorId) {
        try {
          const rows = await loadScreenTime(assignedStudents.map((student) => student.id));
          if (isCurrent) setScreenTimeRows(rows);
        } catch { if (isCurrent) setScreenTimeRows([]); }
      } else {
        const localRows = readStudents().filter((student) => (student.role || "Student").toLowerCase() === "student")
          .flatMap((student) => readLocalScreenTime(student.email).map((row) => ({ ...row, student_id: student.email.toLowerCase() })));
        if (isCurrent) setScreenTimeRows(localRows);
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => { isCurrent = false; window.clearInterval(interval); };
  }, [mentorId, assignedStudents]);

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

  useEffect(() => {
    if (!mentorId) return undefined;
    let current = true;
    fetchMentorLeaderboard().then((rows) => { if (current) setMentorRanks(rows || []); }).catch(() => {});
    return () => { current = false; };
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
    {mentorId && mentorRanks.length > 0 && <section className="mentor-rankings"><h2>Mentor community</h2><div>{mentorRanks.map((mentor, index) => <article key={mentor.id || mentor.mentor_id || mentor.display_name || index}><span>#{index + 1}</span><strong>{mentor.display_name || mentor.name || "Mentor"}</strong><small>{mentor.points ?? mentor.sessions ?? 0} {mentor.points != null ? "points" : "sessions"}</small></article>)}</div></section>}
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle">{t("md_loadingProgress")}</p>
      : rows.length === 0 ? <div className="performance-empty"><Users size={24} /><h2>{t("md_noStudentsTitle")}</h2><p>{t("md_noStudentsCopy")}</p></div>
        : <div className="performance-grid">{rows.map((student) => {
          const subjects = [...new Set(student.activities.map((item) => item.subject))];
          return <article className="performance-card" key={student.id}>
<<<<<<< HEAD
            <div className="performance-card-heading"><span className="performance-avatar">{student.name?.charAt(0)?.toUpperCase() || "S"}</span><div><h2>{student.name}</h2><small>{student.latest ? `${t("lastActivity")} ${new Date(`${student.latest.activityDate}T00:00:00`).toLocaleDateString(document.documentElement.lang || "en-IN")}` : t("noSessionsRecorded")}</small></div></div>
            <div className="performance-metrics"><div><strong>{student.stats.sessionsAttended}</strong><span>{t("sessions")}</span></div><div><strong>{student.stats.learningTime}</strong><span>{t("learningTime")}</span></div><div><strong>{student.stats.learningStreak}</strong><span>{t("dayStreak")}</span></div></div>
            <ScreenTimeSummary rows={screenTimeRows} studentId={student.id} t={t} />
            <div className="performance-subjects"><strong>{t("subjects")}</strong>{subjects.length ? <div>{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <small>{t("noSubjectsRecorded")}</small>}</div>
=======
            <div className="performance-card-heading"><span className="performance-avatar">{student.name?.charAt(0)?.toUpperCase() || "S"}</span><div><h2>{student.name}</h2><small>{student.latest ? t("md_lastActivity", { date: new Date(`${student.latest.activityDate}T00:00:00`).toLocaleDateString() }) : t("md_noSessionsYet")}</small></div></div>
            <div className="performance-metrics"><div><strong>{student.stats.sessionsAttended}</strong><span>{t("sessions")}</span></div><div><strong>{student.stats.learningTime}</strong><span>{t("md_learningTime")}</span></div><div><strong>{student.stats.learningStreak}</strong><span>{t("md_dayStreak")}</span></div></div>
            <div className="performance-subjects"><strong>{t("md_subjectsLabel")}</strong>{subjects.length ? <div>{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <small>{t("md_noSubjects")}</small>}</div>
>>>>>>> origin/main
          </article>;
        })}</div>}
  </>;
}

function MentorLeaderboardPage({ mentorId, t }) {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    loadMentorLeaderboard().then((rows) => {
      if (isCurrent) setMentors(rows || []);
    }).catch(() => {
      if (isCurrent) setError(t("md_lbError"));
    }).finally(() => { if (isCurrent) setLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  return <>
    <p className="mentor-kicker">{t("md_lbKicker")}</p>
    <h1 className="mentor-title">{t("md_lbNav")}</h1>
    <p className="mentor-subtitle">{t("md_lbSubtitle")}</p>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {loading ? <p className="mentor-subtitle" role="status">{t("md_lbLoading")}</p>
      : !mentors.length ? <div className="performance-empty"><Trophy size={24} /><h2>{t("md_lbEmptyTitle")}</h2><p>{t("md_lbEmptyCopy")}</p></div>
        : <div className="mentor-leaderboard">{mentors.map((mentor, index) => <article className={`mentor-leaderboard-row${mentor.mentor_id === mentorId ? " is-current" : ""}`} key={mentor.mentor_id}>
          <span className={`mentor-leaderboard-rank${index < 3 ? " top-rank" : ""}`}>{index < 3 && <Award size={17} aria-hidden="true" />}<span>#{index + 1}</span></span>
          <span className="mentor-leaderboard-avatar" aria-hidden="true">{mentor.display_name?.charAt(0)?.toUpperCase() || "M"}</span>
          <span className="mentor-leaderboard-name">{mentor.display_name}{mentor.mentor_id === mentorId && <small>{t("md_lbYou")}</small>}</span>
          <span className="mentor-leaderboard-sessions">{mentor.sessions_taught} {Number(mentor.sessions_taught) === 1 ? t("md_lbSession") : t("md_lbSessions")}</span>
          <strong className="mentor-leaderboard-points">{mentor.points} {t("md_lbPts")}</strong>
        </article>)}</div>}
  </>;
}

function PrivateSessionsPage({ mentorId, students }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ studentId: "", title: "", subject: "Maths", date: "", time: "", endTime: "", meetLink: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = () => loadMentorPrivateSessions(mentorId).then(setRows).catch(() => setError("Private sessions couldn't be loaded."));
  useEffect(() => { refresh(); }, [mentorId]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await createPrivateSession(mentorId, form); setForm({ studentId: "", title: "", subject: "Maths", date: "", time: "", endTime: "", meetLink: "" }); await refresh(); }
    catch { setError("Couldn't schedule this session. Check the details and try again."); }
    finally { setSaving(false); }
  };
  const remove = async (id) => {
    try { await deletePrivateSession(id); setRows((current) => current.filter((row) => row.id !== id)); }
    catch { setError("This session couldn't be cancelled."); }
  };
  return <>
    <p className="mentor-kicker">Individual learning</p><h1 className="mentor-title">Private sessions</h1>
    <p className="mentor-subtitle">Schedule a one-to-one session for a learner.</p>
    {error && <p className="error-popup" role="alert">{error}</p>}
    {!students.length && <p className="mentor-subtitle">Assigned learners will appear here after they're connected.</p>}
    <form className="schedule-form" onSubmit={submit}>
      <label>Learner<select required value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Choose a learner</option>{students.map((student) => <option key={student.id} value={student.id}>{student.display_name}</option>)}</select></label>
      <label>Session title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label>Subject<select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
      <div className="form-columns"><label>Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Start<input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label><label>End<input type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label></div>
      <label>Meeting link<input type="url" required value={form.meetLink} onChange={(event) => setForm({ ...form, meetLink: event.target.value })} /></label>
      <button className="mentor-primary" type="submit" disabled={saving || !students.length}><Plus size={18} /> Schedule one-to-one</button>
    </form>
    <div className="private-session-list">{rows.map((row) => <article key={row.id}><div><strong>{row.title}</strong><span>{students.find((student) => student.id === row.student_id)?.display_name || "Learner"} · {row.subject} · {row.session_date} · {row.start_time}</span></div><a href={row.meet_link} target="_blank" rel="noreferrer">Open meeting</a><button type="button" onClick={() => remove(row.id)}>Cancel</button></article>)}</div>
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
  onViewNote,
  onDeleteNote,
  onBack,
  accessibilityOpen,
  onToggleAccessibility,
  privateVersion,
  t,
}) {
  const support = useMentorSupport(mentorId, t);
  return (
    <main className="mentor-page">
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} mentorId={mentorId} unreadSupportCount={support.unreadCount} accessibilityOpen={accessibilityOpen} onToggleAccessibility={onToggleAccessibility} onBack={onBack} t={t} />
        <section className="mentor-content">
          {actionError && <p className="error-popup">{actionError}</p>}
<<<<<<< HEAD
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} setTab={setTab} onEditSession={onEditSession} mentorId={mentorId} t={t} />}
          {tab === "relax" && <RelaxationRoom onBack={() => setTab("overview")} t={t} />}
          {tab === "performance" && <StudentPerformancePage mentorId={mentorId} assignedStudents={support.students} t={t} />}
          {tab === "journal" && mentorId && <SharedJournalPage mentorId={mentorId} t={t} />}
          {tab === "parentMessages" && mentorId && <ParentConsultationsPage mentorId={mentorId} students={support.students} t={t} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} t={t} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} t={t} />}
=======
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} mentorId={mentorId} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "performance" && <StudentPerformancePage mentorId={mentorId} assignedStudents={support.students} t={t} />}
          {tab === "settings" && <MentorSettingsPage mentorId={mentorId} onChanged={support.reload} t={t} />}
          {tab === "leaderboard" && <MentorLeaderboardPage mentorId={mentorId} t={t} />}
          {tab === "schedule" && <><SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} mentorId={mentorId} students={support.students} privateVersion={privateVersion} canSchedulePrivate={Boolean(mentorId)} t={t} />{mentorId && <PrivateSessionsList mentorId={mentorId} version={privateVersion} students={support.students} t={t} />}</>}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} onDownload={onDownloadNote} onView={onViewNote} onDelete={onDeleteNote} t={t} />}
>>>>>>> origin/main
          {tab === "sensory" && mentorId && <SensorySupportPage support={support} t={t} />}
          {tab === "privateSessions" && mentorId && <PrivateSessionsPage mentorId={mentorId} students={support.students} />}
        </section>
      </div>
    </main>
  );
}
