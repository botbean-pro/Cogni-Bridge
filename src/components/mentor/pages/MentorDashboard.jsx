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
import { formatSession, subjects } from "../../../constants";
import { LogoImage } from "../../Brand";

function MentorHeader({ onBack }) {
  return (
    <header className="mentor-header">
      <button className="mentor-wordmark" onClick={onBack}>
        <span><LogoImage size={23} /></span>
        <strong>CogniBridge <small>Mentor space</small></strong>
      </button>
      <div>
        <span className="mentor-user"><UserRound size={17} /> Priya Sharma Maths</span>
        <button className="mentor-logout" onClick={onBack}>
          <LogOut size={17} /> Log out
        </button>
      </div>
    </header>
  );
}

function MentorNavigation({ tab, setTab }) {
  const items = [
    ["overview", Home, "Upcoming sessions"],
    ["schedule", CalendarDays, "Schedule a session"],
    ["notes", FileText, "Upload notes"],
  ];

  return (
    <aside className="mentor-nav">
      <p>MENTOR SPACE</p>
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

function OverviewPage({ sessions, notes, setTab }) {
  const upcomingSessions = sessions.filter((session) => session.date >= "2026-09-18");
  const attendeeCount = upcomingSessions.reduce(
    (total, session) => total + session.attendees,
    0,
  );

  return (
    <>
      <div className="mentor-hero">
        <div>
          <p className="mentor-kicker">MENTOR DASHBOARD</p>
          <h1>Good morning, Priya.</h1>
          <span>Only your upcoming Maths sessions are shown here.</span>
        </div>
        <button className="mentor-primary" onClick={() => setTab("schedule")}>
          <Plus size={18} /> Schedule session
        </button>
      </div>

      <div className="mentor-stats">
        <article><CalendarDays size={21} /><strong>{upcomingSessions.length}</strong><span>Upcoming sessions</span></article>
        <article><Users size={21} /><strong>{attendeeCount}</strong><span>Total sign-ups</span></article>
        <article><FileText size={21} /><strong>{notes.length}</strong><span>Notes uploaded</span></article>
      </div>

      <h2 className="mentor-title">Upcoming sessions</h2>
      <div className="mentor-session-grid">
        {upcomingSessions.map((session) => (
          <article className="mentor-session-card" key={session.id}>
            <span className="mentor-subject">{session.subject}</span>
            <p className="mentor-time"><Clock3 size={14} /> {formatSession(session)}</p>
            <h3>{session.title}</h3>
            <p className="mentor-attendee-count">
              <Users size={16} /> {session.attendees} learners signed up
            </p>
            <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
              Open Google Meet <ChevronRight size={15} />
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

function SchedulePage({ form, setForm, onSubmit }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      <p className="mentor-kicker">NEW SESSION</p>
      <h1 className="mentor-title">Schedule a session</h1>
      <p className="mentor-subtitle">Published sessions appear on the learner home page right away.</p>
      <form className="schedule-form" onSubmit={onSubmit}>
        <label>
          Session title
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g. Geometry foundations" required />
        </label>
        <label>
          Subject
          <select value={form.subject} onChange={(event) => updateField("subject", event.target.value)}>
            <option>Maths</option>
          </select>
        </label>
        <div className="form-columns">
          <label>Date<input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} required /></label>
          <label>Start time<input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} required /></label>
          <label>End time<input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required /></label>
        </div>
        <label>
          Google Meet URL
          <input type="url" value={form.meetLink} onChange={(event) => updateField("meetLink", event.target.value)} placeholder="https://meet.google.com/..." required />
        </label>
        <button className="mentor-primary" type="submit"><CalendarDays size={18} /> Publish session</button>
      </form>
    </>
  );
}

function NotesPage({ notes, form, setForm, onSubmit }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      <p className="mentor-kicker">LEARNING MATERIALS</p>
      <h1 className="mentor-title">Upload notes</h1>
      <p className="mentor-subtitle">Add a subject so learners can find the right notes after a session.</p>
      <form className="schedule-form notes-form" onSubmit={onSubmit}>
        <label>
          Notes title
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g. Algebra practice sheet" required />
        </label>
        <label>
          Subject
          <select value={form.subject} onChange={(event) => updateField("subject", event.target.value)}>
            {subjects.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </label>
        <label className="file-upload">
          <span><Upload size={18} /> Choose file</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(event) => updateField("file", event.target.files?.[0] || null)}
            required
          />
          <small>{form.file?.name || "PDF, DOC, or image (max 10 MB)"}</small>
        </label>
        <button className="mentor-primary" type="submit"><Upload size={18} /> Upload notes</button>
      </form>

      {notes.length > 0 && (
        <div className="uploaded-notes">
          <h2>Uploaded notes</h2>
          {notes.map((note) => (
            <div key={note.id}>
              <FileText size={18} />
              <span><strong>{note.title}</strong><small>{note.subject} · {note.fileName}</small></span>
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
  onUploadNote,
  onBack,
}) {
  return (
    <main className="mentor-page">
      <MentorHeader onBack={onBack} />
      <div className="mentor-layout">
        <MentorNavigation tab={tab} setTab={setTab} />
        <section className="mentor-content">
          {tab === "overview" && <OverviewPage sessions={sessions} notes={notes} setTab={setTab} />}
          {tab === "schedule" && <SchedulePage form={form} setForm={setForm} onSubmit={onPublishSession} />}
          {tab === "notes" && <NotesPage notes={notes} form={noteForm} setForm={setNoteForm} onSubmit={onUploadNote} />}
        </section>
      </div>
    </main>
  );
}
