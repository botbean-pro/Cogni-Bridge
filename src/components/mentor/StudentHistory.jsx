import React from "react";
import { Award, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { formatSession, getSessionSubjectLabel } from "../../constants";

const statuses = {
  attended: [CheckCircle2, "statusAttended"],
  missed: [XCircle, "statusMissed"],
  upcoming: [CalendarClock, "statusUpcoming"],
};

// Same rule as the parent portal and leaderboard: "missed" is a finished session
// without self-reported attendance.
export const sessionStatus = (session) => (session.attended ? "attended" : session.ended ? "missed" : "upcoming");

// Sessions one student registered for, newest first, on the mentor's student profile page.
export function StudentHistory({ sessions, name, t }) {
  if (!sessions.length) return <p className="mentor-history-note">{t("noChildSessions", { child: name })}</p>;

  return (
    <ul className="mentor-history">
      {sessions.map((session) => {
        const status = sessionStatus(session);
        const [StatusIcon, statusKey] = statuses[status];
        return (
          <li key={session.id}>
            <span className="mentor-history-main">
              <strong>{session.title}</strong>
              <small>{getSessionSubjectLabel(session.subject, t)} · {formatSession(session)}</small>
            </span>
            <span className="mentor-history-side">
              <span className={`mentor-history-status ${status}`}><StatusIcon size={14} /> {t(statusKey)}</span>
              {status !== "upcoming" && (
                <small>{t("attentionLevel")}: {session.attention ? `${session.attention}/5 · ${t(`attention${session.attention}`)}` : t("attentionNotRated")}</small>
              )}
              {session.good && <small className="mentor-history-good"><Award size={14} /> {t("goodParticipation")}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
