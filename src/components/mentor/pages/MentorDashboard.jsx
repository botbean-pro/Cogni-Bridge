import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Heart,
  LogOut,
  MessageCircle,
  Send,
  Plus,
  TrendingUp,
  Upload,
  Accessibility,
  Users,
  Trophy,
} from "lucide-react";
import { formatLocalizedDate, formatSession, getSessionSubjectLabel, readStudents, subjects } from "../../../constants";
import { loadMentorParentMessages, sendMentorParentReply } from "../../../parentPortal";
import { calculateStudentStats, formatLearningTime, readStudentActivities } from "../../../studentActivity";
import { LogoImage, MouseTrail } from "../../Brand";
import { RelaxationRoom } from "../../RelaxationRoom";
import { ScreenTimeSummary } from "../../shared/ScreenTimeSummary";
import { loadScreenTime, readLocalScreenTime } from "../../../screenTime";
import { SessionStudents } from "../SessionStudents";
import { deletePrivateSession, loadMentorPrivateSessions } from "../../../privateSessions";
import { listStudentsForMentor, loadMentorLearningActivity, loadMentorLeaderboard, loadMentorName, setMyStudent } from "../../../mentorContent";
import {
  loadMentorCheckins,
  markMentorNotificationViewed,
  respondToMentorRequest,
} from "../../../studentSensory";

function MentorNavigation({ tab, setTab, mentorId, mentorName, unreadSupportCount, unreadParentCount, accessibilityOpen, onToggleAccessibility, onBack, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
    ["relax", Headphones, t("quietSpaceTitle")],
    ["performance", TrendingUp, t("md_perfNav")],
    ["leaderboard", Trophy, t("md_lbNav")],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
    ...(mentorId ? [["sensory", Heart, t("sensoryRequests")], ["messages", MessageCircle, t("md_parentNav")]] : []),
    ["settings", Settings, t("settings")],
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
          <Icon size={19} /><span className="mentor-nav-label">{label}</span>{key === "sensory" && unreadSupportCount > 0 && <span className="mentor-notification-count">{unreadSupportCount}</span>}{key === "messages" && unreadParentCount > 0 && <span className="mentor-notification-count">{unreadParentCount}</span>}
        </button>
      ))}
      <div className="mentor-rail-footer">
        <button type="button" data-accessibility-toggle aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")} onClick={onToggleAccessibility}>
          <Accessibility size={19} /><span className="mentor-nav-label">{t("accessibility")}</span>
        </button>
        <button type="button" className="mentor-rail-logout" aria-label={t("mentorLogout")} title={t("mentorLogout")} onClick={onBack}>
          <span className="mentor-avatar-small">{(mentorName || "Priya Sharma").charAt(0).toUpperCase()}</span><span className="mentor-nav-label">{mentorName || "Priya Sharma"}</span><LogOut size={16} className="mentor-logout-icon" />
        </button>
      </div>
    </aside>
  );
}

// The signed-in mentor's name; empty in demo mode, where the rail keeps the demo mentor's name.
function useMentorName(mentorId) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (!mentorId) return undefined;
    let isCurrent = true;
    loadMentorName(mentorId)
      .then((value) => { if (isCurrent) setName(value); })
      .catch((loadError) => console.error("Loading the mentor's name failed:", loadError));
    return () => {
      isCurrent = false;
    };
  }, [mentorId]);
  return name;
}

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
  // Order is fixed when check-ins load, so a card stays in place (showing "Addressed")
  // after the mentor clicks it instead of jumping away under the cursor.
  const order = useMemo(() => [...checkins]
    .sort((a, b) => Number(needsSupport(b)) - Number(needsSupport(a)) || b.created_at.localeCompare(a.created_at))
    .map((entry) => entry.id), [checkins]);
  const sortedEntries = order.map((id) => checkins.find((entry) => entry.id === id)).filter(Boolean);

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

function OverviewPage({ sessions, notes, mentorId, mentorName, setTab, onEditSession, t }) {
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
          <h1>{mentorName ? t("md_greeting", { name: mentorName.split(" ")[0] }) : t("goodMorningPriya")}</h1>
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
            <ScreenTimeSummary rows={screenTimeRows} studentId={student.id} t={t} />
            <div className="performance-subjects"><strong>{t("md_subjectsLabel")}</strong>{subjects.length ? <div>{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div> : <small>{t("md_noSubjects")}</small>}</div>
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

const PARENT_POLL_MS = 5000;
const parentSeenKey = (mentorId) => `cognibridge_mentor_parent_seen:${mentorId}`;

// Parent-teacher messages for this mentor, re-read every 5 seconds while the tab is visible so a
// parent's message shows up within seconds. Parent messages newer than the last visit to the
// Parent messages tab count as unread.
function useParentMessages(mentorId, viewing) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(mentorId));
  const [error, setError] = useState(false);
  const [seenAt, setSeenAt] = useState(() => {
    try {
      return mentorId ? localStorage.getItem(parentSeenKey(mentorId)) || "" : "";
    } catch {
      return "";
    }
  });

  const reload = async () => {
    const rows = await loadMentorParentMessages(mentorId);
    setMessages(rows);
    setError(false);
  };

  useEffect(() => {
    if (!mentorId) return undefined;
    let current = true;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      loadMentorParentMessages(mentorId)
        .then((rows) => { if (current) { setMessages(rows); setError(false); } })
        .catch((loadError) => {
          console.error("Loading parent messages failed:", loadError);
          if (current) setError(true);
        })
        .finally(() => { if (current) setLoading(false); });
    };
    refresh();
    const interval = window.setInterval(refresh, PARENT_POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [mentorId]);

  const latest = messages.length ? messages[messages.length - 1].created_at : "";
  useEffect(() => {
    if (!viewing || !latest || latest <= seenAt) return;
    setSeenAt(latest);
    try {
      localStorage.setItem(parentSeenKey(mentorId), latest);
    } catch {
      // The badge just resets on reload if browser storage is unavailable.
    }
  }, [viewing, latest]);

  const unreadCount = viewing ? 0 : messages.filter((message) => message.sender_role === "parent" && message.created_at > seenAt).length;
  return { messages, loading, error, reload, unreadCount };
}

// Keeps a thread scrolled to its newest message.
function ThreadMessages({ thread, t }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread.length]);
  return (
    <div className="mentor-parent-thread-messages" ref={listRef}>
      {thread.map((message) => (
        <p className={message.sender_role === "mentor" ? "from-mentor" : "from-parent"} key={message.id}>
          <strong>{message.sender_role === "mentor" ? t("youLabel") : t("md_parentWord")}</strong>
          {message.message}
          <small>{formatLocalizedDate(message.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>
        </p>
      ))}
    </div>
  );
}

function ParentMessagesPage({ mentorId, students, parentMessages, t }) {
  const { messages, loading, error, reload } = parentMessages;
  const [drafts, setDrafts] = useState({});
  const [sendingKey, setSendingKey] = useState(null);
  const [sendError, setSendError] = useState("");

  // One thread per parent and child.
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
    setSendingKey(key);
    setSendError("");
    try {
      await sendMentorParentReply({ mentorId, studentId: thread[0].student_id, parentId: thread[0].parent_id, message });
      setDrafts((current) => ({ ...current, [key]: "" }));
      await reload();
    } catch {
      setSendError(t("md_convoReplyFail"));
    } finally {
      setSendingKey(null);
    }
  };

  return <>
    <p className="mentor-kicker">{t("md_familyEyebrow")}</p>
    <h1 className="mentor-title">{t("md_parentNav")}</h1>
    <p className="mentor-subtitle">{t("md_parentSub")}</p>
    {(error || sendError) && <p className="error-popup" role="alert">{sendError || t("md_convoLoadFail")}</p>}
    {loading ? <p className="mentor-subtitle">{t("md_loadingConvo")}</p>
      : !threads.size ? <div className="performance-empty"><MessageCircle size={24} /><h2>{t("md_noParentMsgs")}</h2><p>{t("md_noParentMsgsCopy")}</p></div>
        : <div className="mentor-parent-threads">{[...threads.entries()].map(([key, thread]) => {
          const student = students.find((item) => item.id === thread[0].student_id);
          const name = student?.display_name || t("md_student");
          return <article className="mentor-parent-thread" key={key}>
            <header><div><strong>{name}</strong><small>{t("md_parentThread", { n: thread.length })}</small></div></header>
            <ThreadMessages thread={thread} t={t} />
            <form onSubmit={(event) => sendReply(event, key, thread)}>
              <input aria-label={t("md_replyToParent", { name })} maxLength={4000} value={drafts[key] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder={t("md_writeReply")} required />
              <button type="submit" disabled={sendingKey === key}><Send size={16} /> {t("md_reply")}</button>
            </form>
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
  onViewNote,
  onDeleteNote,
  onBack,
  accessibilityOpen,
  onToggleAccessibility,
  privateVersion,
  t,
}) {
  const support = useMentorSupport(mentorId, t);
  const mentorName = useMentorName(mentorId);
  const parentMessages = useParentMessages(mentorId, tab === "messages");
  return (
    <main className="mentor-page">
      <MouseTrail />
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} mentorId={mentorId} mentorName={mentorName} unreadSupportCount={support.unreadCount} unreadParentCount={parentMessages.unreadCount} accessibilityOpen={accessibilityOpen} onToggleAccessibility={onToggleAccessibility} onBack={onBack} t={t} />
        <section className="mentor-content route-transition" key={tab}>
          {actionError && <p className="error-popup">{actionError}</p>}
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} mentorId={mentorId} mentorName={mentorName} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "relax" && <RelaxationRoom onBack={() => setTab("overview")} t={t} />}
          {tab === "performance" && <StudentPerformancePage mentorId={mentorId} assignedStudents={support.students} t={t} />}
          {tab === "settings" && <MentorSettingsPage mentorId={mentorId} onChanged={support.reload} t={t} />}
          {tab === "leaderboard" && <MentorLeaderboardPage mentorId={mentorId} t={t} />}
          {tab === "schedule" && <><SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} mentorId={mentorId} students={support.students} privateVersion={privateVersion} canSchedulePrivate={Boolean(mentorId)} t={t} />{mentorId && <PrivateSessionsList mentorId={mentorId} version={privateVersion} students={support.students} t={t} />}</>}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} onDownload={onDownloadNote} onView={onViewNote} onDelete={onDeleteNote} t={t} />}
          {tab === "sensory" && mentorId && <SensorySupportPage support={support} t={t} />}
          {tab === "messages" && mentorId && <ParentMessagesPage mentorId={mentorId} students={support.students} parentMessages={parentMessages} t={t} />}
        </section>
      </div>
    </main>
  );
}
