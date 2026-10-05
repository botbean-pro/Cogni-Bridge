import React from "react";
import { subjects } from "../../../constants";
import { SessionCard } from "../shared/SessionCard";
import { StudentStats } from "../shared/StudentStats";

export function HomePage({
  sessions,
  subjectFilter,
  setSubjectFilter,
  signedIn,
  t,
  studentEmail,
  studentName,
  activityVersion,
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
            <p className="eyebrow">{t("planAhead")}</p>
            <h2>{t("upcomingSessions")}</h2>
            <p>{t("upcomingDescription")}</p>
          </div>
          <span className="session-count">{sessions.length} {t("sessionsCount")}</span>
        </div>

        <div className="filter-bar" aria-label={t("filterBySubject")}>
          <span>{t("filterBySubject")}</span>
          <button className={subjectFilter === "All subjects" ? "selected" : ""} onClick={() => setSubjectFilter("All subjects")}>
            {t("allSubjects")}
          </button>
          {subjects.map((subject) => (
            <button key={subject} className={subjectFilter === subject ? "selected" : ""} onClick={() => setSubjectFilter(subject)}>
              {t(`subject${subject === "SST" ? "SST" : subject}`)}
            </button>
          ))}
        </div>

        {sessions.length ? (
          <div className="session-card-grid">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                t={t}
                signedIn={signedIn}
                registered={registeredSessionIds.includes(session.id)}
                onSignIn={onSignIn}
                onRegister={() => onRegister(session.id)}
                onOpen={() => onOpenSession(session)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">{t("noSessions")}</div>
        )}
      </section>

      {signedIn && (
        <StudentStats
          key={studentEmail}
          studentEmail={studentEmail}
          studentName={studentName}
          activityVersion={activityVersion}
          t={t}
        />
      )}
    </section>
  );
}
