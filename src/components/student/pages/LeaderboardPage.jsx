import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, Flame, Info, MinusCircle, PlusCircle, Trophy } from "lucide-react";
import { fetchLeaderboard } from "../../../sessionRegistrations";
import { supabaseConfigured } from "../../../supabaseClient";
import "./LeaderboardPage.css";
import { fetchCogniBoard } from "../../../mentorContent";
import { supabaseConfigured } from "../../../supabaseClient";

// Demo-mode sample data; with Supabase the leaderboard comes from public.leaderboard().
const leaderboardStudents = [
  { name: "Harsh", registered: 4, attended: 3, mentorGood: 2, streak: 1 },
  { name: "Samar", registered: 3, attended: 2, mentorGood: 1, streak: 7 },
  { name: "Vardaan", registered: 2, attended: 1, mentorGood: 0, streak: 10 },
  { name: "Aanya", registered: 3, attended: 1, mentorGood: 1, streak: 2 },
  { name: "Kabir", registered: 2, attended: 1, mentorGood: 0, streak: 3 },
  { name: "Meera", registered: 1, attended: 1, mentorGood: 0, streak: 1 },
];

const rankTitles = [
  "BRAINWAVE BOSS",
  "MOMENTUM MAKER",
  "CURIOSITY CATALYST",
  "IDEA IGNITER",
  "FOCUS FORCE",
  "SPARK STARTER",
];

const scoreStudent = (student) => {
  const missed = Math.max(student.registered - student.attended, 0);
  return {
    ...student,
    missed,
    points: Number.isFinite(Number(student.points)) ? Number(student.points) : (student.registered * 5) + (student.attended * 10) - (missed * 10) + (student.mentorGood * 5),
  };
};

<<<<<<< HEAD
export function LeaderboardPage({ t, mindfulBoard, studentName }) {
  const [liveRows, setLiveRows] = useState(null);
  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let current = true;
    fetchCogniBoard().then((rows) => { if (current && rows?.length) setLiveRows(rows); }).catch(() => {});
    return () => { current = false; };
  }, []);
  const rankCopy = [
    { line: "You're setting the pace. Keep that glow." },
    { line: "One great session could change everything." },
    { line: "Every session moves you closer to the top." },
  ];
  const rows = (liveRows || leaderboardStudents)
    .map(scoreStudent)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
=======
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
>>>>>>> origin/main

  return (
    <section className="content leaderboard-page">
      <div className="leaderboard-heading">
        <div>
          <p className="eyebrow">{t("cogniPoints")}</p>
          <h1>Cogni Board</h1>
          <p>{t("leaderboardDescription")}</p>
        </div>
        <div className="leaderboard-trophy" aria-hidden="true"><Trophy size={34} /></div>
      </div>

      <section className="mindful-points-card" aria-labelledby="mindful-points-title">
        <div className="mindful-points-medal" aria-hidden="true">✦</div>
        <div className="mindful-points-summary">
          <p className="eyebrow">MINDFUL CORNER</p>
          <h2 id="mindful-points-title">{studentName ? `${studentName}'s CogniPoints` : 'Your CogniPoints'}</h2>
          <p>Points from exploring activities. A wrong answer never takes points away.</p>
        </div>
        <strong className="mindful-points-total">{mindfulBoard?.points || 0}<small> pts</small></strong>
        {mindfulBoard?.entries?.length > 0 && <ul aria-label="Recent Mindful Corner notes">{mindfulBoard.entries.slice(0, 3).map((entry) => <li key={entry.id}>{entry.note}</li>)}</ul>}
      </section>

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
            <div className="podium-medal" aria-label={t("lb_rank", { n: index + 1 })}>{index + 1}</div>
            <span className="podium-avatar">{student.name[0]}</span>
            <strong>{student.name}</strong>
            <span className="podium-rank-title">{rankTitles[index]}</span>
            <span className="podium-score">{student.points} {t("lb_pts")}</span>
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
            <span className="leaderboard-rank" aria-label={t("lb_rank", { n: index + 1 })}>{index === 0 ? <Trophy size={19} /> : `#${index + 1}`}</span>
            <span className="leaderboard-name"><span className="student-avatar">{student.name[0]}</span><span className="leaderboard-student-details"><strong>{student.name}</strong><small className="leaderboard-rank-title">{rankTitles[index] || `LEVEL ${index + 1}`}</small></span></span>
            <span className="leaderboard-attendance">{student.attended} <small>{t("lb_of")} {student.registered}</small></span>
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
