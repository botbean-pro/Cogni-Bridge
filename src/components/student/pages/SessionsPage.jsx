import React from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3 } from "lucide-react";
import { formatSession } from "../../../constants";
import { isSessionComplete } from "../../../studentActivity";

function SessionDetail({ session, signedIn, registered, attended, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const canMarkAttended = signedIn && isSessionComplete(session) && !attended;

  return (
    <div className="session-detail">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> {t("backToSessions")}</button>
      <div className="detail-header">
        <div>
          <span className="subject-pill">{session.subject}</span>
          <h1>{session.title}</h1>
          <p>{session.description}</p>
          <p className="session-time"><Clock3 size={15} /> {formatSession(session)}</p>
        </div>
        <CalendarDays size={42} />
      </div>
      <div className="detail-columns">
        <div>
          <h3>{t("whatLearn")}</h3>
          <ul>{session.learn.map((item) => <li key={item}><CheckCircle2 size={18} /> {item}</li>)}</ul>
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

function SessionList({ sessions, onSelect }) {
  return (
    <div className="my-session-list">
      {sessions.map((session) => (
        <button key={session.id} className="my-session-row" onClick={() => onSelect(session)}>
          <span className="subject-pill">{session.subject}</span>
          <span><strong>{session.title}</strong><small>{formatSession(session)}</small></span>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  );
}

export function SessionsPage({ sessions, selectedSession, signedIn, registeredSessionIds, attendedSessionIds, onSelect, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const registered = selectedSession && registeredSessionIds.includes(selectedSession.id);

  return (
    <section className="content sessions-page">
      <div className="section-title">
        <div><p className="eyebrow">{t("learningPlan")}</p><h2>{t("sessions")}</h2><p>{t("sessionsDescription")}</p></div>
      </div>
      {selectedSession ? (
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
        <SessionList sessions={sessions} onSelect={onSelect} />
      )}
    </section>
  );
}
