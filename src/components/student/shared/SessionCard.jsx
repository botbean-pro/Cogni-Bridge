import React from "react";
import { CalendarDays, ChevronRight, Clock3, Users } from "lucide-react";
import { classNames, formatSession } from "../../../constants";

export function SessionCard({
  session,
  signedIn,
  registered,
  onSignIn,
  onRegister,
  onOpen,
  t,
}) {
  return (
    <article
      className="session-card"
      onClick={onOpen}
      tabIndex="0"
      onKeyDown={(event) => event.key === "Enter" && onOpen()}
    >
      <div className="session-card-top">
        <span className="subject-pill">{session.subject}</span>
        <CalendarDays size={21} />
      </div>
      <h3>{session.title}</h3>
      <p className="session-description">{session.description}</p>
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
