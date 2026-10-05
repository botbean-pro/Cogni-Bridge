import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { calculateStudentStats, readStudentActivities } from "../../../studentActivity";

export function StudentStats({ studentEmail, studentName, activityVersion }) {
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
      if (isCurrent) setError("We couldn't load your learning stats. Check browser storage and try again.");
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
  }, [studentEmail, activityVersion, retry]);

  const cards = stats && [
    [CheckCircle2, stats.sessionsAttended, "Sessions attended", "Completed learning sessions"],
    [Clock3, stats.learningTime, "Learning time", "Time in attended sessions"],
    [BookOpen, stats.subjectsExplored, "Subjects explored", "Unique session subjects"],
    [Sparkles, `${stats.learningStreak} days`, "Learning streak", "Consecutive active days"],
  ];

  return (
    <section className="stats-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h2>Student stats</h2>
          <p>Small steps add up. Keep going, {studentName}.</p>
        </div>
      </div>
      {error ? (
        <div className="stats-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          {cards.map(([Icon, value, label, description]) => (
            <article key={label}>
              <span className="stat-icon"><Icon size={21} aria-hidden="true" /></span>
              <strong>{value}</strong>
              <span>{label}</span>
              <small>{description}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="stats-grid stats-grid-loading" role="status" aria-label="Loading student stats">
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
