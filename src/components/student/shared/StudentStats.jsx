import React from "react";
import { BookOpen, CheckCircle2, Clock3, Sparkles } from "lucide-react";

export function StudentStats({ sessions }) {
  const subjectCount = new Set(sessions.map((session) => session.subject)).size;

  return (
    <section className="stats-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h2>Student stats</h2>
          <p>Small steps add up. Keep going, Alex.</p>
        </div>
      </div>
      <div className="stats-grid">
        <article><span className="stat-icon"><CheckCircle2 size={21} /></span><strong>8</strong><span>Sessions attended</span></article>
        <article><span className="stat-icon"><Clock3 size={21} /></span><strong>6.5h</strong><span>Learning time</span></article>
        <article><span className="stat-icon"><BookOpen size={21} /></span><strong>{subjectCount}</strong><span>Subjects explored</span></article>
        <article><span className="stat-icon"><Sparkles size={21} /></span><strong>4</strong><span>Day learning streak</span></article>
      </div>
    </section>
  );
}
