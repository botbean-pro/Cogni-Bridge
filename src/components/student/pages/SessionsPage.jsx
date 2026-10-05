import React from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3 } from "lucide-react";
import { formatSession } from "../../../constants";

function SessionDetail({ session, signedIn, registered, onBack, onSignIn, onRegister }) {
  return (
    <div className="session-detail">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Back to Sessions</button>
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
          <h3>What you’ll learn</h3>
          <ul>{session.learn.map((item) => <li key={item}><CheckCircle2 size={18} /> {item}</li>)}</ul>
        </div>
        <div className="detail-action">
          <strong>Ready to learn together?</strong>
          <span>{session.attendees} learners are signed up.</span>
          <button className="primary-btn" onClick={signedIn ? () => onRegister(session.id) : onSignIn}>
            {registered ? "Registered" : signedIn ? "Register for session" : "Sign in to register"}
          </button>
          {registered && <a href={session.meetLink} target="_blank" rel="noopener noreferrer">Open Google Meet <ChevronRight size={15} /></a>}
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

export function SessionsPage({ sessions, selectedSession, signedIn, registeredSessionIds, onSelect, onBack, onSignIn, onRegister }) {
  const registered = selectedSession && registeredSessionIds.includes(selectedSession.id);

  return (
    <section className="content sessions-page">
      <div className="section-title">
        <div><p className="eyebrow">LEARNING PLAN</p><h2>Sessions</h2><p>Open a session to see its learning plan and join when it is time.</p></div>
      </div>
      {selectedSession ? (
        <SessionDetail session={selectedSession} signedIn={signedIn} registered={registered} onBack={onBack} onSignIn={onSignIn} onRegister={onRegister} />
      ) : (
        <SessionList sessions={sessions} onSelect={onSelect} />
      )}
    </section>
  );
}
