import React from "react";
import { CalendarDays, ChevronRight, Clock3, Users } from "lucide-react";
import { classNames, formatSession, getSessionSubjectLabel } from "../../../constants";

export function SessionCard({
  session,
  signedIn,
  registered,
  onSignIn,
  onRegister,
  onOpen,
  t,
}) {
  const sessionTitle = session.titleKey ? t(session.titleKey) : session.title;
  const sessionDescription = session.descriptionKey ? t(session.descriptionKey) : session.description;
  const learnItems = session.learnKeys ? session.learnKeys.map((key) => t(key)) : session.learn;

  return (
    <article
      className="session-card"
      onClick={onOpen}
      tabIndex="0"
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
    >
      <div className="session-card-top">
        <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
        <CalendarDays size={21} />
      </div>
      <h3>{sessionTitle}</h3>
      <p className="session-description">{sessionDescription}</p>
      <p className="session-time">
        <Clock3 size={15} /> {formatSession(session)}
      </p>
      <p className="session-learners">
        <Users size={15} /> {session.attendees + (registered ? 1 : 0)} {t("learnersSignedUp")}
      </p>

      <div className="session-card-footer" onClick={(event) => event.stopPropagation()}>
        {registered ? (
          <a className="meet-status meet-link" href={session.meetLink} target="_blank" rel="noopener noreferrer">
            {t("joinGoogleMeet")} <ChevronRight size={15} />
          </a>
        ) : (
          <span className="meet-status">
            {signedIn ? t("linkUnlocks") : t("signInToRegister")}
          </span>
        )}
        <button
          className={classNames("secondary-btn", registered && "registered-button")}
          onClick={signedIn ? onRegister : onSignIn}
        >
          {registered ? t("registered") : signedIn ? t("register") : t("signIn")}
        </button>
      </div>
      <span className="card-detail-hint">
        {t("viewLearningPlan")} <ChevronRight size={14} />
      </span>
    </article>
  );
}
