import React from "react";
import { subjects } from "../../../constants";
import { SessionCard } from "../shared/SessionCard";
import { StudentStats } from "../shared/StudentStats";

export function HomePage({
  sessions,
  subjectFilter,
  setSubjectFilter,
  signedIn,
  registeredSessionIds,
  onSignIn,
  onRegister,
  onOpenSession,
}) {
  return (
    <section className="content home-content">
      <section className="sessions-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">PLAN AHEAD</p>
            <h2>Upcoming sessions</h2>
            <p>Choose a session to see exactly what you will learn.</p>
          </div>
          <span className="session-count">{sessions.length} sessions</span>
        </div>

        <div className="filter-bar" aria-label="Filter sessions by subject">
          <span>Filter by subject</span>
          <button className={subjectFilter === "All subjects" ? "selected" : ""} onClick={() => setSubjectFilter("All subjects")}>
            All subjects
          </button>
          {subjects.map((subject) => (
            <button key={subject} className={subjectFilter === subject ? "selected" : ""} onClick={() => setSubjectFilter(subject)}>
              {subject}
            </button>
          ))}
        </div>

        {sessions.length ? (
          <div className="session-card-grid">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                signedIn={signedIn}
                registered={registeredSessionIds.includes(session.id)}
                onSignIn={onSignIn}
                onRegister={() => onRegister(session.id)}
                onOpen={() => onOpenSession(session)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">No sessions found for this subject.</div>
        )}
      </section>

      {signedIn && <StudentStats sessions={sessions} />}
    </section>
  );
}
