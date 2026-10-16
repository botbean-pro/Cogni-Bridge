import React, { useEffect, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { getSessionSubjectLabel, subjects } from "../../../constants";
import "./StudentSubjectsPage.css";

export function StudentSubjectsPage({ selectedSubjects = [], onContinue, t }) {
  const [selection, setSelection] = useState(selectedSubjects);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelection(selectedSubjects), [selectedSubjects]);

  const toggleSubject = (subject) => setSelection((current) => (
    current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]
  ));

  const continueToLearning = async () => {
    if (!selection.length || saving) return;
    setSaving(true);
    await onContinue(selection);
    setSaving(false);
  };

  return (
    <main className="student-subject-setup">
      <section className="student-subject-setup-card" aria-labelledby="student-subject-setup-title">
        <span className="student-subject-setup-icon"><BookOpen size={24} /></span>
        <p className="eyebrow">Personalize your learning</p>
        <h1 id="student-subject-setup-title">What would you like to study?</h1>
        <p className="student-subject-setup-copy">Choose one or more subjects. Your Sessions page will show sessions for those subjects.</p>
        <div className="student-subject-options">
          {subjects.map((subject) => {
            const selected = selection.includes(subject);
            return <button
              type="button"
              key={subject}
              aria-pressed={selected}
              className={selected ? "selected" : ""}
              onClick={() => toggleSubject(subject)}
            >
              <span>{getSessionSubjectLabel(subject, t)}</span>
              <span className="student-subject-check">{selected && <Check size={17} />}</span>
            </button>;
          })}
        </div>
        <button type="button" className="student-subject-continue" disabled={!selection.length || saving} onClick={continueToLearning}>
          {saving ? "Saving…" : "Continue to sessions"}
        </button>
        {!selection.length && <p className="student-subject-validation" role="status">Choose at least one subject to continue.</p>}
      </section>
    </main>
  );
}
