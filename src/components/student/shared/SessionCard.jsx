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
        <Users size={15} /> {session.attendees + (registered ? 1 : 0)} learners signed up
      </p>

      <div className="session-card-footer" onClick={(event) => event.stopPropagation()}>
        {registered ? (
          <a className="meet-status meet-link" href={session.meetLink} target="_blank" rel="noopener noreferrer">
            Join Google Meet <ChevronRight size={15} />
          </a>
        ) : (
          <span className="meet-status">
            {signedIn ? "Meet link unlocks after registration" : "Sign in to register"}
          </span>
        )}
        <button
          className={classNames("secondary-btn", registered && "registered-button")}
          onClick={signedIn ? onRegister : onSignIn}
        >
          {registered ? "Registered" : signedIn ? "Register" : "Sign in"}
        </button>
      </div>
      <span className="card-detail-hint">
        View learning plan <ChevronRight size={14} />
      </span>
    </article>
  );
}
