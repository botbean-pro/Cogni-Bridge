import React, { useRef } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, Earth, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { formatSession, getSessionSubjectLabel } from "../../../constants";
import { isSessionComplete } from "../../../studentActivity";
import "./SessionsPage.css";

const values = [
  { icon: Earth, title: "A wider world", description: <>Meet ideas, people and perspectives<br className="sessions-desktop-break" /> from beyond your own classroom.</>, tone: "mint" },
  { icon: ShieldCheck, title: "A safe space", description: <>Learn and share in a welcoming<br className="sessions-desktop-break" /> community built around respect.</>, tone: "cream" },
  { icon: HeartHandshake, title: "Here to support", description: <>Teachers and mentors help every<br className="sessions-desktop-break" /> learner find their next step.</>, tone: "blue" },
  { icon: Sparkles, title: "Open to everyone", description: <>Curiosity is all you need. Learning<br className="sessions-desktop-break" /> together is free.</>, tone: "peach" },
];

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

export function SessionsPage({ sessions, selectedSession, signedIn, registeredSessionIds, attendedSessionIds, onSelect, onBack, onSignIn, onRegister, onMarkAttended, t }) {
  const registered = selectedSession && registeredSessionIds.includes(selectedSession.id);
  const sessionsRef = useRef(null);
  const scrollToSessions = () => sessionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sessions-page">
      <section className="sessions-values" aria-labelledby="sessions-values-title">
        <div className="sessions-values-inner">
          <p className="sessions-eyebrow">What makes us, us</p>
          <h1 id="sessions-values-title">Learning with people at heart</h1>
          <div className="sessions-values-grid">
            {values.map(({ icon: Icon, title, description, tone }) => (
              <article className="sessions-value" key={title}>
                <span className={`sessions-value-icon ${tone}`}><Icon size={25} strokeWidth={2} /></span>
                <h2>{title}</h2>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
        <button className="sessions-scroll-cue" onClick={scrollToSessions} aria-label="Scroll to upcoming sessions" />
      </section>

      <section className="sessions-approach" aria-labelledby="sessions-approach-title">
        <div className="sessions-approach-copy">
          <p className="sessions-eyebrow">A little about our approach</p>
          <h2 id="sessions-approach-title">Every voice adds something.</h2>
          <p>We believe learning is richer when people bring their experiences, questions and ideas to the same table.</p>
        </div>
        <button className="sessions-cta" onClick={scrollToSessions}>See what we’re learning <ArrowRight size={19} /></button>
      </section>

      <section className="content sessions-listing" ref={sessionsRef} aria-labelledby="upcoming-sessions-title">
        <div className="section-title">
          <div><p className="eyebrow">{t("learningPlan")}</p><h2 id="upcoming-sessions-title">{t("sessions")}</h2><p>{t("sessionsDescription")}</p></div>
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
          <SessionList sessions={sessions} onSelect={onSelect} t={t} />
        )}
      </section>
    </div>
  );
}
