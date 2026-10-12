import React from "react";
import { Award, CalendarClock, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { formatSession, getSessionSubjectLabel } from "../../../constants";

const statuses = {
  attended: [CheckCircle2, "statusAttended"],
  missed: [XCircle, "statusMissed"],
  upcoming: [CalendarClock, "statusUpcoming"],
};

// "Missed" means the session ended without attendance being recorded; attendance is
// self-reported by the student, the same rule the leaderboard uses.
export const sessionStatus = (session) => (session.attended ? "attended" : session.ended ? "missed" : "upcoming");

export function AttentionMeter({ level, t }) {
  return (
    <div className="attention-meter">
      <span className="attention-meter-label">{t("attentionLevel")}</span>
      <span className="attention-dots" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((dot) => (
          <i key={dot} className={level && dot <= level ? "filled" : ""} style={{ "--dot-delay": `${dot * 70}ms` }} />
        ))}
      </span>
      <small>{level ? `${t(`attention${level}`)} · ${level}/5` : t("attentionNotRated")}</small>
    </div>
  );
}

export function ChildSessionRow({ session, delay = 0, t }) {
  const status = sessionStatus(session);
  const [StatusIcon, statusKey] = statuses[status];

  return (
    <article className="parent-session parent-rise" style={{ "--rise-delay": `${delay}ms` }}>
      <div className="parent-session-main">
        <span className="subject-pill">{getSessionSubjectLabel(session.subject, t)}</span>
        <h3>{session.title}</h3>
        <p><Clock3 size={14} /> {formatSession(session)}</p>
      </div>
      <div className="parent-session-side">
        <span className={`parent-status parent-status-${status}`}><StatusIcon size={14} /> {t(statusKey)}</span>
        {status !== "upcoming" && <AttentionMeter level={session.attention} t={t} />}
        {session.good && <span className="parent-good"><Award size={14} /> {t("goodParticipation")}</span>}
      </div>
    </article>
  );
}
