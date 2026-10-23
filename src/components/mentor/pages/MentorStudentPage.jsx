import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Users } from "lucide-react";
import { getSessionSubjectLabel } from "../../../constants";
import { loadStudentHistory, loadStudentProfile } from "../../../mentorContent";
import { StudentHistory, sessionStatus } from "../StudentHistory";

// One student under this mentor, opened from Settings: sign-up details, the subjects they
// chose to learn, attendance at a glance and their full session history.
export function MentorStudentPage({ studentId, onBack, t }) {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isCurrent = true;
    setStatus("loading");
    Promise.all([loadStudentProfile(studentId), loadStudentHistory(studentId)])
      .then(([loadedProfile, loadedSessions]) => {
        if (!isCurrent) return;
        setProfile(loadedProfile);
        setSessions(loadedSessions);
        setStatus(loadedProfile ? "ready" : "missing");
      })
      .catch((loadError) => {
        console.error("Student profile failed:", loadError);
        // The database refuses students who aren't under this mentor; anything else is a setup problem.
        if (isCurrent) setStatus(/is under/.test(loadError?.message || "") ? "notMine" : "failed");
      });
    return () => {
      isCurrent = false;
    };
  }, [studentId]);

  const back = <button type="button" className="mentor-student-back" onClick={onBack}><ArrowLeft size={16} /> {t("md_stuBack")}</button>;

  if (status !== "ready") {
    const message = { loading: "md_stuLoading", missing: "md_setEmpty", notMine: "md_histNotMine", failed: "md_histLoadFail" }[status];
    return <>
      {back}
      <p className="mentor-history-note" role={status === "loading" ? "status" : "alert"}>{t(message)}</p>
    </>;
  }

  const counts = { attended: 0, missed: 0, upcoming: 0 };
  sessions.forEach((session) => { counts[sessionStatus(session)] += 1; });
  const ratings = sessions.map((session) => session.attention).filter(Boolean);
  const averageAttention = ratings.length ? (ratings.reduce((sum, level) => sum + level, 0) / ratings.length).toFixed(1) : null;
  const details = [
    [t("class"), profile.studentClass],
    [t("section"), profile.section],
    [t("age"), profile.age],
    [t("school"), profile.school],
    [t("md_setColJoined"), new Date(profile.joinedAt).toLocaleDateString()],
  ];

  return <>
    {back}
    <div className="mentor-student-hero">
      <span className="mentor-leaderboard-avatar" aria-hidden="true">{profile.name.charAt(0).toUpperCase()}</span>
      <div>
        <p className="mentor-kicker">{t("md_stuDetails")}</p>
        <h1 className="mentor-title">{profile.name}</h1>
        {profile.school && <p className="mentor-subtitle">{profile.school}</p>}
      </div>
    </div>

    <div className="mentor-student-grid">
      <section className="mentor-student-card">
        <h2><Users size={18} /> {t("md_stuDetails")}</h2>
        <dl className="mentor-student-details">
          {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "-"}</dd></div>)}
        </dl>
      </section>
      <section className="mentor-student-card">
        <h2><BookOpen size={18} /> {t("md_stuWantsToLearn")}</h2>
        {profile.preferredSubjects.length
          ? <ul className="mentor-student-subjects">{profile.preferredSubjects.map((subject) => <li key={subject} className="subject-pill">{getSessionSubjectLabel(subject, t)}</li>)}</ul>
          : <p className="mentor-history-note">{t("md_stuNoSubjects", { name: profile.name })}</p>}
      </section>
    </div>

    <dl className="mentor-student-stats">
      <div><dt>{t("statusAttended")}</dt><dd>{counts.attended}</dd></div>
      <div><dt>{t("statusMissed")}</dt><dd>{counts.missed}</dd></div>
      <div><dt>{t("statusUpcoming")}</dt><dd>{counts.upcoming}</dd></div>
      <div><dt>{t("avgAttention")}</dt><dd>{averageAttention ? `${averageAttention}/5` : "-"}</dd></div>
    </dl>

    <section className="mentor-student-card">
      <h2><CalendarDays size={18} /> {t("md_stuHistory")}</h2>
      <StudentHistory sessions={sessions} name={profile.name} t={t} />
    </section>
  </>;
}
