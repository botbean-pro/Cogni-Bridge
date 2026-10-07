import React from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  LogOut,
  Plus,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { formatSession, getSessionSubjectLabel, subjects } from "../../../constants";
import { LogoImage } from "../../Brand";

function MentorHeader({ onBack, t }) {
  return (
    <header className="mentor-header">
      <button className="mentor-wordmark" onClick={onBack}>
        <span><LogoImage size={23} /></span>
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

function MentorNavigation({ tab, setTab, t }) {
  const items = [
    ["overview", Home, t("onlyUpcomingSessions")],
    ["schedule", CalendarDays, t("mentorScheduleNav")],
    ["notes", FileText, t("mentorNotesNav")],
  ];

  return (
    <aside className="mentor-nav">
      <p>{t("mentorSpace").toUpperCase()}</p>
      {items.map(([key, Icon, label]) => (
        <button
          key={key}
          className={tab === key ? "active" : ""}
          onClick={() => setTab(key)}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </aside>
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

      <h2 className="mentor-title">Sessions</h2>
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
            <button type="button" className="mentor-edit-session" onClick={() => onEditSession(session)}>Edit session</button>
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
      <p className="mentor-kicker">{editing ? "EDIT SESSION" : t("newSession")}</p>
      <h1 className="mentor-title">{editing ? "Edit session" : t("scheduleSession")}</h1>
      <p className="mentor-subtitle">{t("publishedSessionsHome")}</p>
      <form className="schedule-form" onSubmit={onSubmit}>
        <label>
          {t("sessionTitle")}
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g. Geometry foundations" required />
        </label>
        <label>
          {t("subject")}
          <select value={form.subject} onChange={(event) => updateField("subject", event.target.value)}>
            <option>Maths</option>
          </select>
        </label>
        <div className="form-columns">
          <label>Date<input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} required /></label>
          <label>{t("startTime")}<input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} required /></label>
          <label>{t("endTime")}<input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required /></label>
        </div>
        <label>
          {t("googleMeetUrl")}
          <input type="url" value={form.meetLink} onChange={(event) => updateField("meetLink", event.target.value)} placeholder="https://meet.google.com/..." required />
        </label>
        <div className="mentor-form-actions">
          <button className="mentor-primary" type="submit"><CalendarDays size={18} /> {editing ? "Save changes" : t("publishSession")}</button>
          {editing && <button type="button" className="mentor-cancel-edit" onClick={onCancelEdit}>Cancel</button>}
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
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g. Algebra practice sheet" required />
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function MentorDashboard({
  sessions,
  notes,
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
  return (
    <main className="mentor-page">
      <MentorHeader onBack={onBack} t={t} />
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} t={t} />
        <section className="mentor-content">
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} setTab={setTab} onEditSession={onEditSession} t={t} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} editing={Boolean(editingSessionId)} onCancelEdit={onCancelEdit} t={t} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} t={t} />}
        </section>
      </div>
    </main>
  );
}
