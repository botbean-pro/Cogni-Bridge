import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, Flame, Info, MinusCircle, PlusCircle, Trophy } from "lucide-react";
import { fetchLeaderboard } from "../../../sessionRegistrations";
import { supabaseConfigured } from "../../../supabaseClient";
import "./LeaderboardPage.css";

// Demo-mode sample data; with Supabase the leaderboard comes from public.leaderboard().
const leaderboardStudents = [
  { name: "Harsh", registered: 4, attended: 3, mentorGood: 2, streak: 1 },
  { name: "Samar", registered: 3, attended: 2, mentorGood: 1, streak: 7 },
  { name: "Vardaan", registered: 2, attended: 1, mentorGood: 0, streak: 10 },
];

const scoreStudent = (student) => {
  const missed = Math.max(student.registered - student.attended, 0);
  return {
    ...student,
    missed,
    points: (student.registered * 5) + (student.attended * 10) - (missed * 10) + (student.mentorGood * 5),
  };
};

export function LeaderboardPage({ signedIn, t }) {
  const [rows, setRows] = useState(() => (supabaseConfigured ? null : leaderboardStudents.map(scoreStudent)));
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!supabaseConfigured || !signedIn) return undefined;
    let isCurrent = true;
    setError("");
    fetchLeaderboard()
      .then((leaderboard) => {
        if (isCurrent) setRows(leaderboard);
      })
      .catch(() => {
        if (isCurrent) setError(t("leaderboardError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [signedIn, retry, t]);

  const status = supabaseConfigured && !signedIn
    ? t("leaderboardSignIn")
    : error || (rows && !rows.length ? t("leaderboardEmpty") : "");

  return (
    <section className="content leaderboard-page">
      <div className="leaderboard-heading">
        <div>
          <p className="eyebrow">{t("cogniPoints")}</p>
          <h1>{t("leaderboard")}</h1>
          <p>{t("leaderboardDescription")}</p>
        </div>
        <div className="leaderboard-trophy" aria-hidden="true"><Trophy size={34} /></div>
      </div>

      <aside className="points-info-box" aria-label={t("howPointsWork")}>
        <div className="points-info-icon"><Info size={20} /></div>
        <div>
          <h2>{t("howPointsWork")}</h2>
          <p>{t("pointsUpdated")}</p>
          <div className="points-rules">
            <span><PlusCircle size={16} /> {t("registerPoints")} <strong>+5</strong></span>
            <span><CheckCircle2 size={16} /> {t("attendPoints")} <strong>+10</strong></span>
            <span><MinusCircle size={16} /> {t("missPoints")} <strong>-10</strong></span>
            <span><Award size={16} /> {t("mentorGoodPoints")} <strong>+5</strong></span>
          </div>
        </div>
      </aside>

      {status ? (
        <div className="stats-error" role={error ? "alert" : "status"}>
          <span>{status}</span>
          {error && <button type="button" onClick={() => setRetry((value) => value + 1)}>{t("tryAgain")}</button>}
        </div>
      ) : !rows ? (
        <p className="leaderboard-loading" role="status">{t("loading")}</p>
      ) : (
      <>
      <section className="leaderboard-podium" aria-label={t("lb_top3")}>
        <div className="podium-zone-label"><Trophy size={17} /> {t("topThreeZone")}</div>
        {rows.slice(0, 3).map((student, index) => (
          <article className={`podium-card podium-card-${index + 1}`} key={`${index}-${student.name}`}>
            <div className="podium-medal">{index + 1}</div>
            <span className="podium-avatar">{student.name[0]}</span>
            <strong>{student.name}</strong>
            <span className="podium-score">{student.points} pts</span>
            <span className="streak-badge"><Flame size={15} fill="currentColor" /> {student.streak} {t("streak")}</span>
          </article>
        ))}
      </section>

      <div className="leaderboard-card">
        <div className="leaderboard-table-header"><span>{t("rank")}</span><span>{t("student")}</span><span>{t("sessionsAttendedShort")}</span><span>{t("streak")}</span><span>{t("cogniPointsColumn")}</span></div>
        {rows.map((student, index) => (
          <div
            className={`leaderboard-row leaderboard-rank-${index + 1}${student.isMe ? " leaderboard-row-me" : ""}`}
            key={`${index}-${student.name}`}
          >
            <span className="leaderboard-rank">{index === 0 ? <Trophy size={19} /> : index + 1}</span>
            <span className="leaderboard-name"><span className="student-avatar">{student.name[0]}</span><strong>{student.name}</strong></span>
            <span className="leaderboard-attendance">{student.attended} <small>of {student.registered}</small></span>
            <span className="leaderboard-streak"><Flame size={15} fill="currentColor" /> {student.streak}</span>
            <span className="leaderboard-points">{student.points}<small> {t("lb_pts")}</small></span>
          </div>
        ))}
      </div>
      </>
      )}
    </section>
  );
}
