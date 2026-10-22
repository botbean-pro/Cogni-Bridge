import React from "react";
import { useState } from "react";
import { ArrowDownToLine, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, Eye, FileText } from "lucide-react";
import { classNames, formatSession, getSessionSubjectLabel, getSessionTitle, subjects } from "../../../constants";
import { downloadNote, getNotePreviewUrl } from "../../../mentorContent";
import { isSessionComplete } from "../../../studentActivity";
import { StudentStats } from "../shared/StudentStats";
import "./SessionsPage.css";

function SessionDetail({ session, signedIn, registered, attended, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const canMarkAttended = signedIn && isSessionComplete(session) && !attended;
  const title = getSessionTitle(session, t);
  const description = session.descriptionKey ? t(session.descriptionKey) : session.description;
  const learnItems = session.learnKeys ? session.learnKeys.map((key) => t(key)) : session.learn;

  return (
    <div className="session-detail">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> {t("backToSessions")}</button>
      <div className="detail-header">
        <div>
          <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <p className="session-time"><Clock3 size={15} /> {formatSession(session)}</p>
        </div>
        <CalendarDays size={42} />
      </div>
      <div className="detail-columns">
        <div>
          <h3>{t("whatLearn")}</h3>
          <ul>{learnItems.map((item) => <li key={item}><CheckCircle2 size={18} /> {item}</li>)}</ul>
        </div>
        <div className="detail-action">
          <strong>{t("readyToLearn")}</strong>
          <span>{session.attendees} {t("learnersSignedUp")}</span>
          <button
            className={classNames("primary-btn", registered && "registered-button")}
            onClick={signedIn ? () => onRegister(session.id) : onSignIn}
            aria-pressed={signedIn ? Boolean(registered) : undefined}
            disabled={Boolean(registered && attended)}
            title={registered && !attended ? t("tapToUnregister") : undefined}
          >
            {registered ? <><CheckCircle2 size={17} /> {t("registered")}</> : signedIn ? t("registerForSession") : t("signInToRegister")}
          </button>
          {registered && !attended && <small className="register-toggle-hint">{t("tapToUnregister")}</small>}
          {attended ? (
            <p className="attendance-recorded"><CheckCircle2 size={16} /> {t("attendanceRecorded")}</p>
          ) : canMarkAttended ? (
            <button className="attendance-button" onClick={() => onMarkAttended(session)}>
              <CheckCircle2 size={16} /> {t("markAttended")}
            </button>
          ) : null}
          {registered && <a href={session.meetLink} target="_blank" rel="noopener noreferrer">{t("joinGoogleMeet")} <ChevronRight size={15} /></a>}
        </div>
      </div>
    </div>
  );
}

function SessionList({ sessions, onSelect, t, activeSubject }) {
  const sessionSubjects = [...new Set(sessions.map((session) => session.subject).filter(Boolean))];
  const orderedSubjects = [...subjects.filter((subject) => sessionSubjects.includes(subject)), ...sessionSubjects.filter((subject) => !subjects.includes(subject))];
  const groups = activeSubject === "all"
    ? orderedSubjects.map((subject) => ({ subject, sessions: sessions.filter((session) => session.subject === subject) }))
    : [{ subject: activeSubject, sessions: sessions.filter((session) => session.subject === activeSubject) }];

  return (
    <div className="session-subject-groups">
      {!groups.length && <p className="study-empty">{t("noSessions")}</p>}
      {groups.map(({ subject, sessions: subjectSessions }) => <section className="session-subject-group" key={subject} aria-labelledby={`session-subject-${subject}`}>
        {activeSubject === "all" && <h3 id={`session-subject-${subject}`}>{getSessionSubjectLabel(subject, t)}</h3>}
        {subjectSessions.length ? <div className="my-session-list">
          {subjectSessions.map((session) => (
            <button key={session.id} className="my-session-row" onClick={() => onSelect(session)}>
              <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
              <span><strong>{getSessionTitle(session, t)}</strong><small>{formatSession(session)}</small></span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div> : <p className="study-empty">{t("noSessions")}</p>}
      </section>)}
    </div>
  );
}

export function SessionsPage({ sessions, notes = [], selectedSession, signedIn, preferredSubjects = [], registeredSessionIds, attendedSessionIds, privateSessions = [], onSelect, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const [section, setSection] = useState("sessions");
  const [activeSubject, setActiveSubject] = useState("all");
  const [downloadError, setDownloadError] = useState("");
  const [previewNoteId, setPreviewNoteId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loadingPreviewId, setLoadingPreviewId] = useState(null);
  const registered = selectedSession && registeredSessionIds.includes(selectedSession.id);
  const availableSessions = sessions.filter((session) => session.subject !== "Physical Education");
  const availablePreferredSubjects = preferredSubjects.filter((subject) => subjects.includes(subject));
  const subjectTabs = availablePreferredSubjects.length
    ? [...availablePreferredSubjects, ...new Set(availableSessions.map((session) => session.subject).filter((subject) => subject && !availablePreferredSubjects.includes(subject)))]
    : [...subjects, ...new Set(availableSessions.map((session) => session.subject).filter((subject) => subject && !subjects.includes(subject)))];

  const download = async (note) => {
    setDownloadError("");
    try {
      await downloadNote(note);
    } catch {
      setDownloadError(t("noteDownloadError"));
    }
  };

  const togglePreview = async (note) => {
    setDownloadError("");
    if (previewNoteId === note.id) {
      setPreviewNoteId(null);
      setPreviewUrl("");
      return;
    }
    setLoadingPreviewId(note.id);
    try {
      setPreviewUrl(await getNotePreviewUrl(note));
      setPreviewNoteId(note.id);
    } catch {
      setDownloadError(t("notePreviewError"));
    } finally {
      setLoadingPreviewId(null);
    }
  };

  return (
    <section className="content sessions-page">
      <div className="section-title">
        <div><p className="eyebrow">{t("learningPlan")}</p><h2>{t("sessions")}</h2><p>{t("sessionsDescription")}</p></div>
      </div>
      <div className="sessions-subnav" role="tablist" aria-label={t("sessionsAndNotes")}>
        <button type="button" role="tab" aria-selected={section === "sessions"} className={section === "sessions" ? "active" : ""} onClick={() => setSection("sessions")}>{t("sessions")}</button>
        <button type="button" role="tab" aria-selected={section === "notes"} className={section === "notes" ? "active" : ""} onClick={() => { setSection("notes"); onBack(); }}>{t("notesTab")}{notes.length > 0 && <span>{notes.length}</span>}</button>
      </div>
      {section === "sessions" && !selectedSession && <div className="sessions-subject-tabs" role="tablist" aria-label={t("filterBySubject")}>
        <button type="button" role="tab" aria-selected={activeSubject === "all"} className={activeSubject === "all" ? "active" : ""} onClick={() => setActiveSubject("all")}>{t("allSubjects")}</button>
        {subjectTabs.map((subject) => <button key={subject} type="button" role="tab" aria-selected={activeSubject === subject} className={activeSubject === subject ? "active" : ""} onClick={() => setActiveSubject(subject)}>{getSessionSubjectLabel(subject, t)}</button>)}
      </div>}
      {section === "notes" ? (
        <section className="student-notes" aria-label={t("notesTab")}>
          {downloadError && <p className="error-popup" role="alert">{downloadError}</p>}
          {notes.length ? notes.map((note) => (
            <article className="student-note-card" key={note.id}>
              <FileText size={21} />
              <div><span className="subject-pill">{getSessionSubjectLabel(note.subject, t)}</span><h3>{note.title}</h3><p>{note.fileName}</p></div>
              <button type="button" onClick={() => togglePreview(note)} aria-expanded={previewNoteId === note.id} aria-label={`${t(previewNoteId === note.id ? "closeNotePreview" : "viewNote")}: ${note.title}`}><Eye size={18} /> {t(loadingPreviewId === note.id ? "loadingNotePreview" : previewNoteId === note.id ? "closeNotePreview" : "viewNote")}</button>
              <button type="button" onClick={() => download(note)} aria-label={`${t("downloadNote")}: ${note.title}`}><ArrowDownToLine size={18} /> {t("downloadNote")}</button>
              {previewNoteId === note.id && previewUrl && <div className="student-note-preview">
                {/\.(png|jpe?g)$/i.test(note.fileName || "") ? <img src={previewUrl} alt={note.title} /> : <iframe src={previewUrl} title={note.title} />}
              </div>}
            </article>
          )) : <p className="student-notes-empty">{t("noNotesAvailable")}</p>}
        </section>
      ) : selectedSession ? (
        <SessionDetail
          session={selectedSession}
          signedIn={signedIn}
          registered={registered}
          attended={attendedSessionIds.has(String(selectedSession.id))}
          onBack={onBack}
          onSignIn={onSignIn}
          onRegister={onRegister}
          onMarkAttended={onMarkAttended}
          t={t}
        />
      ) : (
        <>
          {privateSessions.length > 0 && <section className="private-student-sessions"><h3>Your one-to-one sessions</h3>{privateSessions.map((session) => <article key={session.id}><div><span className="subject-pill">{session.subject}</span><strong>{session.title}</strong><small>{session.mentorName} · {session.date} · {session.time}–{session.endTime}</small></div><a href={session.meetLink} target="_blank" rel="noopener noreferrer">Join meeting <ChevronRight size={15} /></a></article>)}</section>}
          <SessionList sessions={availableSessions} onSelect={onSelect} t={t} activeSubject={activeSubject} />
        </>
      )}
    </section>
  );
}

export function StudyPage({ sessions, registeredSessionIds = [], studentEmail, studentName, activityVersion, onOpenSession, eyebrow, heading, t }) {
  const today = new Date().toISOString().slice(0, 10);
  const registeredIds = new Set(registeredSessionIds.map(String));
  const upcomingRegisteredSessions = sessions
    .filter((session) => registeredIds.has(String(session.id)) && session.date >= today)
    .sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));

  return (
    <section className="content study-page">
      <div className="section-title">
        <div><p className="eyebrow">{eyebrow || t("planAhead")}</p><h2>{heading || t("study")}</h2></div>
      </div>
      <section className="study-upcoming">
        <div className="study-section-heading"><h3>{t("upcomingSessions")}</h3></div>
        {upcomingRegisteredSessions.length ? (
          <div className="my-session-list">
            {upcomingRegisteredSessions.map((session) => (
              <button key={session.id} className="my-session-row" onClick={() => onOpenSession(session)}>
                <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
                <span><strong>{getSessionTitle(session, t)}</strong><small>{formatSession(session)}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : <p className="study-empty">{t("noRegisteredSessions")}</p>}
      </section>
      <StudentStats
        studentEmail={studentEmail}
        studentName={studentName}
        activityVersion={activityVersion}
        t={t}
      />
    </section>
  );
}
