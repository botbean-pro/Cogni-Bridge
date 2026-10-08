import React from "react";
import { useState } from "react";
import { ArrowDownToLine, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText } from "lucide-react";
import { formatSession, getSessionSubjectLabel } from "../../../constants";
import { isSessionComplete } from "../../../studentActivity";
import { StudentStats } from "../shared/StudentStats";
import "./SessionsPage.css";

function SessionDetail({ session, signedIn, registered, attended, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const canMarkAttended = signedIn && isSessionComplete(session) && !attended;
  const title = session.titleKey ? t(session.titleKey) : session.title;
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
          <button className="primary-btn" onClick={signedIn ? () => onRegister(session.id) : onSignIn}>
            {registered ? t("registered") : signedIn ? t("registerForSession") : t("signInToRegister")}
          </button>
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

function SessionList({ sessions, onSelect, t }) {
  return (
    <div className="my-session-list">
      {sessions.map((session) => (
        <button key={session.id} className="my-session-row" onClick={() => onSelect(session)}>
          <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
          <span><strong>{session.titleKey ? t(session.titleKey) : session.title}</strong><small>{formatSession(session)}</small></span>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  );
}

export function SessionsPage({ sessions, notes = [], selectedSession, signedIn, registeredSessionIds, attendedSessionIds, onSelect, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const [section, setSection] = useState("sessions");
  const registered = selectedSession && registeredSessionIds.includes(selectedSession.id);

  return (
    <section className="content sessions-page">
      <div className="section-title">
        <div><p className="eyebrow">{t("learningPlan")}</p><h2>{t("sessions")}</h2><p>{t("sessionsDescription")}</p></div>
      </div>
      <div className="sessions-subnav" role="tablist" aria-label={t("sessionsAndNotes")}>
        <button type="button" role="tab" aria-selected={section === "sessions"} className={section === "sessions" ? "active" : ""} onClick={() => setSection("sessions")}>{t("sessions")}</button>
        <button type="button" role="tab" aria-selected={section === "notes"} className={section === "notes" ? "active" : ""} onClick={() => { setSection("notes"); onBack(); }}>{t("notesTab")}{notes.length > 0 && <span>{notes.length}</span>}</button>
      </div>
      {section === "notes" ? (
        <section className="student-notes" aria-label={t("notesTab")}>
          {notes.length ? notes.map((note) => (
            <article className="student-note-card" key={note.id}>
              <FileText size={21} />
              <div><span className="subject-pill">{getSessionSubjectLabel(note.subject, t)}</span><h3>{note.title}</h3><p>{note.fileName}</p></div>
              <a href={note.dataUrl} download={note.fileName} aria-label={`${t("downloadNote")}: ${note.title}`}><ArrowDownToLine size={18} /> {t("downloadNote")}</a>
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
        <SessionList sessions={sessions} onSelect={onSelect} t={t} />
      )}
    </section>
  );
}

export function StudyPage({ sessions, studentEmail, studentName, activityVersion, onOpenSession, eyebrow, heading, t }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcomingFractions = sessions
    .filter((session) => session.id === "fractions-workshop" && session.date >= today)
    .sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));

  return (
    <section className="content study-page">
      <div className="section-title">
        <div><p className="eyebrow">{eyebrow || t("planAhead")}</p><h2>{heading || t("study")}</h2></div>
      </div>
      <section className="study-upcoming">
        <div className="study-section-heading"><h3>{t("upcomingSessions")}</h3></div>
        {upcomingFractions.length ? (
          <div className="my-session-list">
            {upcomingFractions.map((session) => (
              <button key={session.id} className="my-session-row" onClick={() => onOpenSession(session)}>
                <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
                <span><strong>{session.titleKey ? t(session.titleKey) : session.title}</strong><small>{formatSession(session)}</small></span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : <p className="study-empty">{t("noSessions")}</p>}
      </section>
      <section className="study-profile-card">
        <div className="study-profile-glow" aria-hidden="true" />
        <div>
          <p className="eyebrow">{t("yourLearningStyle")}</p>
          <h3>{t("handwritingType")}</h3>
          <p>{t("handwritingTypeStudyCopy")}</p>
        </div>
        <strong>{(() => {
          try {
            const profile = JSON.parse(localStorage.getItem("cognibridge_students") || "[]")
              .find((student) => student.email?.toLowerCase() === studentEmail?.toLowerCase());
            return profile?.handwritingType || t("notAnalyzed");
          } catch {
            return t("notAnalyzed");
          }
        })()}</strong>
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
