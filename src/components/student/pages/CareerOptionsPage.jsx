import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, RotateCcw, Sparkles } from "lucide-react";
import "./CareerOptionsPage.css";

const questions = [
  {
    promptKey: "cr_q1",
    choices: [
      { id: "c1", labelKey: "cr_q1c1", tags: ["technology", "science", "engineering"] },
      { id: "c2", labelKey: "cr_q1c2", tags: ["creative", "communication"] },
      { id: "c3", labelKey: "cr_q1c3", tags: ["people", "care", "education"] },
      { id: "c4", labelKey: "cr_q1c4", tags: ["nature", "science"] },
      { id: "c5", labelKey: "cr_q1c5", tags: ["business", "leadership", "people"] },
    ],
  },
  {
    promptKey: "cr_q2",
    choices: [
      { id: "c1", labelKey: "cr_q2c1", tags: ["technology", "engineering"] },
      { id: "c2", labelKey: "cr_q2c2", tags: ["science", "care", "nature"] },
      { id: "c3", labelKey: "cr_q2c3", tags: ["creative", "communication"] },
      { id: "c4", labelKey: "cr_q2c4", tags: ["people", "communication", "leadership"] },
      { id: "c5", labelKey: "cr_q2c5", tags: ["business", "leadership"] },
    ],
  },
  {
    promptKey: "cr_q3",
    choices: [
      { id: "c1", labelKey: "cr_q3c1", tags: ["engineering", "technology", "handsOn"] },
      { id: "c2", labelKey: "cr_q3c2", tags: ["science", "technology"] },
      { id: "c3", labelKey: "cr_q3c3", tags: ["people", "communication", "education"] },
      { id: "c4", labelKey: "cr_q3c4", tags: ["creative", "handsOn"] },
      { id: "c5", labelKey: "cr_q3c5", tags: ["business", "leadership"] },
    ],
  },
  {
    promptKey: "cr_q4",
    choices: [
      { id: "c1", labelKey: "cr_q4c1", tags: ["care", "science", "people"] },
      { id: "c2", labelKey: "cr_q4c2", tags: ["technology", "engineering", "handsOn"] },
      { id: "c3", labelKey: "cr_q4c3", tags: ["creative", "communication"] },
      { id: "c4", labelKey: "cr_q4c4", tags: ["nature", "science"] },
      { id: "c5", labelKey: "cr_q4c5", tags: ["leadership", "business", "people"] },
    ],
  },
  {
    promptKey: "cr_q5",
    choices: [
      { id: "c1", labelKey: "cr_q5c1", tags: ["science", "technology"] },
      { id: "c2", labelKey: "cr_q5c2", tags: ["communication", "education", "people"] },
      { id: "c3", labelKey: "cr_q5c3", tags: ["creative", "business"] },
      { id: "c4", labelKey: "cr_q5c4", tags: ["handsOn", "engineering"] },
      { id: "c5", labelKey: "cr_q5c5", tags: ["leadership", "business", "people"] },
    ],
  },
];

const careers = [
  { id: 1, titleKey: "cr_c1t", tags: ["technology", "engineering"], summaryKey: "cr_c1s", exploreKey: "cr_c1e" },
  { id: 2, titleKey: "cr_c2t", tags: ["engineering", "handsOn", "technology"], summaryKey: "cr_c2s", exploreKey: "cr_c2e" },
  { id: 3, titleKey: "cr_c3t", tags: ["science", "technology"], summaryKey: "cr_c3s", exploreKey: "cr_c3e" },
  { id: 4, titleKey: "cr_c4t", tags: ["care", "science", "people"], summaryKey: "cr_c4s", exploreKey: "cr_c4e" },
  { id: 5, titleKey: "cr_c5t", tags: ["education", "communication", "people"], summaryKey: "cr_c5s", exploreKey: "cr_c5e" },
  { id: 6, titleKey: "cr_c6t", tags: ["creative", "communication"], summaryKey: "cr_c6s", exploreKey: "cr_c6e" },
  { id: 7, titleKey: "cr_c7t", tags: ["communication", "creative"], summaryKey: "cr_c7s", exploreKey: "cr_c7e" },
  { id: 8, titleKey: "cr_c8t", tags: ["nature", "science", "handsOn"], summaryKey: "cr_c8s", exploreKey: "cr_c8e" },
  { id: 9, titleKey: "cr_c9t", tags: ["business", "leadership", "creative"], summaryKey: "cr_c9s", exploreKey: "cr_c9e" },
  { id: 10, titleKey: "cr_c10t", tags: ["leadership", "people", "communication"], summaryKey: "cr_c10s", exploreKey: "cr_c10e" },
];

export function CareerOptionsPage({ t }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const results = useMemo(() => {
    const scores = Object.values(answers).flatMap((answer) => answer.tags)
      .reduce((totals, tag) => ({ ...totals, [tag]: (totals[tag] || 0) + 1 }), {});
    return careers.map((career) => ({
      ...career,
      score: career.tags.reduce((total, tag) => total + (scores[tag] || 0), 0),
    })).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, 3);
  }, [answers]);

  const choose = (choice) => setAnswers((current) => ({ ...current, [step]: choice }));
  const restart = () => { setAnswers({}); setStep(0); setShowResults(false); };

  return (
    <section className="content career-page">
      <header className="career-heading"><span className="career-icon"><Compass size={25} /></span><div><p className="eyebrow">{t("cr_eyebrow")}</p><h1>{t("careerOptions")}</h1><p>{t("cr_subtitle")}</p></div></header>
      {!showResults ? (
        <section className="career-card">
          <div className="career-progress-label"><span>{t("cr_questionOf", { n: step + 1, total: questions.length })}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div>
          <div className="career-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
          <h2>{t(questions[step].promptKey)}</h2>
          <div className="career-choices">{questions[step].choices.map((choice) => <button key={choice.id} type="button" className={answers[step]?.id === choice.id ? "selected" : ""} aria-pressed={answers[step]?.id === choice.id} onClick={() => choose(choice)}>{t(choice.labelKey)}</button>)}</div>
          <div className="career-actions">{step > 0 ? <button type="button" className="career-back" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> {t("cr_back")}</button> : <span />}{step < questions.length - 1 ? <button type="button" className="career-next" disabled={!answers[step]} onClick={() => setStep((value) => value + 1)}>{t("cr_next")} <ArrowRight size={17} /></button> : <button type="button" className="career-next" disabled={!answers[step]} onClick={() => setShowResults(true)}>{t("cr_see")} <Sparkles size={17} /></button>}</div>
        </section>
      ) : (
        <section className="career-card career-results">
          <div className="career-results-heading"><div><p className="eyebrow">{t("cr_pathsEyebrow")}</p><h2>{t("cr_yourAnswers")}</h2></div><button type="button" className="career-retake" onClick={restart}><RotateCcw size={16} /> {t("cr_startOver")}</button></div>
          <div className="career-result-list">{results.map((career, index) => <article className="career-result" key={career.id}><span className="career-result-number">{index + 1}</span><div><h3>{t(career.titleKey)}</h3><p>{t(career.summaryKey)}</p><small><strong>{t("cr_tryThis")}</strong> {t(career.exploreKey)}</small></div></article>)}</div>
          <p className="career-disclaimer">{t("cr_disclaimer")}</p>
        </section>
      )}
    </section>
  );
}
