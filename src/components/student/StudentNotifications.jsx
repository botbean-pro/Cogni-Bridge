import React, { useEffect, useState } from "react";
import { Bell, Video, X } from "lucide-react";
import { loadStudentPrivateSessions, markPrivateSessionsSeen } from "../../privateSessions";
import { formatLocalizedDate, getSessionTitle } from "../../constants";

// Session end as a Date, so finished sessions drop out of the list.
const endOf = (session) => new Date(`${session.date}T${session.endTime}:00`);

// Rail button with an unread badge, plus a popup listing one-to-one sessions from a mentor.
export function StudentNotifications({ studentId, t }) {
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!studentId) return undefined;
    let isCurrent = true;
    const refresh = () => loadStudentPrivateSessions(studentId)
      .then((rows) => { if (isCurrent) { setSessions(rows); setFailed(false); } })
      .catch((error) => {
        console.error("Private sessions failed to load:", error);
        if (isCurrent) setFailed(true);
      });
    refresh();
    const interval = window.setInterval(refresh, 60000);
    return () => { isCurrent = false; window.clearInterval(interval); };
  }, [studentId]);

  const upcoming = sessions.filter((session) => endOf(session) > new Date());
  const unread = upcoming.filter((session) => !session.seen).length;

  const openPanel = () => {
    setOpen(true);
    if (unread > 0) {
      markPrivateSessionsSeen()
        .then(() => setSessions((current) => current.map((session) => ({ ...session, seen: true }))))
        .catch((error) => console.error("Could not mark notifications as seen:", error));
    }
  };

  return (
    <>
      <button type="button" className="student-rail-link student-notify-button" onClick={openPanel} aria-label={t("ps_bell")} title={t("ps_bell")}>
        <Bell size={19} /><span>{t("ps_bell")}</span>
        {unread > 0 && <b className="student-notify-badge" aria-label={String(unread)}>{unread}</b>}
      </button>
      {open && (
        <div className="student-calm-overlay" role="dialog" aria-modal="true" aria-label={t("ps_bell")} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="student-calm-dialog student-notify-dialog">
            <button className="student-calm-dismiss" type="button" onClick={() => setOpen(false)} aria-label={t("close")}><X size={20} /></button>
            <h2>{t("ps_bell")}</h2>
            {failed && <p className="student-notify-error" role="alert">{t("ps_loadFail")}</p>}
            {!upcoming.length ? <p className="student-notify-empty">{t("ps_empty")}</p> : (
              <ul className="student-notify-list">
                {upcoming.map((session) => (
                  <li key={session.id}>
                    <div>
                      <strong>{t("ps_newSession", { mentor: session.mentorName || t("md_student") })}</strong>
                      <span>{getSessionTitle(session, t)}</span>
                      <small>{formatLocalizedDate(`${session.date}T00:00:00`)} · {session.time} – {session.endTime}</small>
                    </div>
                    <a className="student-notify-join" href={session.meetLink} target="_blank" rel="noopener noreferrer"><Video size={16} /> {t("ps_join")}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
