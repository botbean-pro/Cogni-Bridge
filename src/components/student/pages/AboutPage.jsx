import React from "react";
import { ArrowRight, BookOpen, Globe2, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

const principles = [
  ["aboutWiderWorld", Globe2],
  ["aboutSafeSpace", ShieldCheck],
  ["aboutSupport", HeartHandshake],
  ["aboutOpenToEveryone", Sparkles],
];

export function AboutPage({ t, onExploreSessions, bookLanded = false }) {
  return (
    <div className="about-page" id="about-us">
      <section className="about-values-section">
        <p className="eyebrow">{t("aboutEyebrow")}</p>
        <h1>{t("aboutHeading")}</h1>
        <div className="about-values-grid">
          {principles.map(([key, Icon], index) => (
            <article className={`about-value about-value-${index + 1}`} key={key}>
              <span className={`about-value-icon${bookLanded && index === 0 ? " book-landed" : ""}`}>
                {bookLanded && index === 0 ? <BookOpen size={25} /> : <Icon size={23} />}
              </span>
              <h2>{t(`${key}Title`)}</h2>
              <p>{t(`${key}Description`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-approach-section">
        <div className="about-approach-copy">
          <p className="eyebrow">{t("aboutApproachEyebrow")}</p>
          <h2>{t("aboutApproachHeading")}</h2>
          <p>{t("aboutApproachDescription")}</p>
        </div>
        <button className="about-approach-cta" onClick={onExploreSessions}>
          {t("seeWhatLearning")} <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
