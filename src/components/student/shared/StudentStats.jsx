import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { calculateStudentStats, readStudentActivities } from "../../../studentActivity";

export function StudentStats({ studentEmail, studentName, activityVersion, t }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setStats(null);
    setError("");

    try {
      const activities = readStudentActivities(studentEmail);
      if (isCurrent) setStats(calculateStudentStats(activities));
    } catch {
      if (isCurrent) setError(t("statsError"));
    }

    const refreshFromStorage = (event) => {
      if (
        event.key === null
        || event.key === `cognibridge_learning_activity:${encodeURIComponent(studentEmail?.trim().toLowerCase() || "")}`
      ) {
        setRetry((value) => value + 1);
      }
    };
    window.addEventListener("storage", refreshFromStorage);

    return () => {
      isCurrent = false;
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, [studentEmail, activityVersion, retry, t]);

  const cards = stats && [
    [CheckCircle2, stats.sessionsAttended, "sessionsAttended", "completedSessions"],
    [Clock3, stats.learningTime, "learningTime", "attendedTime"],
    [BookOpen, stats.subjectsExplored, "subjectsExplored", "uniqueSubjects"],
    [Sparkles, `${stats.learningStreak} ${t("days")}`, "learningStreak", "consecutiveDays"],
  ];

  return (
    <section className="stats-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">{t("yourProgress")}</p>
          <h2>{t("studentStats")}</h2>
          <p>{t("greeting", { name: studentName })}</p>
        </div>
      </div>
      {error ? (
        <div className="stats-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>{t("tryAgain")}</button>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          {cards.map(([Icon, value, labelKey, descriptionKey]) => (
            <article key={labelKey}>
              <span className="stat-icon"><Icon size={21} aria-hidden="true" /></span>
              <strong>{value}</strong>
              <span>{t(labelKey)}</span>
              <small>{t(descriptionKey)}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="stats-grid stats-grid-loading" role="status" aria-label={t("loading")}>
          {Array.from({ length: 4 }, (_, index) => (
            <article key={index} aria-hidden="true">
              <span className="stat-skeleton stat-skeleton-icon" />
              <span className="stat-skeleton stat-skeleton-value" />
              <span className="stat-skeleton stat-skeleton-label" />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
