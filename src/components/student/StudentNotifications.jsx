import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Coffee, Video, X } from "lucide-react";
import { STUDY_SECONDS, readBreakState } from "../../breakTimer";
import { loadStudentPrivateSessions, markPrivateSessionsSeen } from "../../privateSessions";
import { formatLocalizedDate, getSessionTitle } from "../../constants";

// Session end as a Date, so finished sessions drop out of the list.
const endOf = (session) => new Date(`${session.date}T${session.endTime}:00`);

// One-to-one sessions a mentor scheduled, the unread count and the popup state. StudentPage owns it so the
// rail's bell and the phone "More" sheet show the same badge and open the same popup.
export function useStudentNotifications(studentId) {
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

  return { upcoming, unread, failed, open, openPanel, closePanel: () => setOpen(false) };
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// Time left before the next screen break (or left in the current one), re-read every second from breakTimer.js.
function BreakTimerStatus({ breakKey, t }) {
  const [, setNow] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  if (!breakKey) return null;
  const state = readBreakState(breakKey);
  const breakLeft = Math.max(0, (state.lockUntil - Date.now()) / 1000);
  const studyLeft = Math.max(0, STUDY_SECONDS - state.usedSeconds);
  return (
    <div className="student-notify-break" role="timer">
      <Coffee size={20} aria-hidden="true" />
      <div>
        <strong>{breakLeft ? t("breakNowLeft", { time: clock(breakLeft) }) : t("breakNextIn", { time: clock(studyLeft) })}</strong>
        <small>{t("breakTimerHint")}</small>
      </div>
    </div>
  );
}

// Rail button with an unread badge, plus a popup listing one-to-one sessions from a mentor.
export function StudentNotifications({ notifications, breakKey, t }) {
  const { upcoming, unread, failed, open, openPanel, closePanel } = notifications;

  return (
    <>
      <button type="button" className="student-rail-link student-notify-button" onClick={openPanel} aria-label={t("ps_bell")} title={t("ps_bell")}>
        <Bell size={19} /><span>{t("ps_bell")}</span>
        {unread > 0 && <b className="student-notify-badge" aria-label={String(unread)}>{unread}</b>}
      </button>
      {/* Rendered on <body> so the rail's own positioning can't trap the overlay inside the sidebar. */}
      {open && createPortal(
        <div className="student-calm-overlay student-notify-overlay" role="dialog" aria-modal="true" aria-label={t("ps_bell")} onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <div className="student-calm-dialog student-notify-dialog">
            <button className="student-calm-dismiss" type="button" onClick={closePanel} aria-label={t("close")}><X size={20} /></button>
            <h2>{t("ps_bell")}</h2>
            <BreakTimerStatus breakKey={breakKey} t={t} />
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
        </div>,
        document.body,
      )}
    </>
  );
}
