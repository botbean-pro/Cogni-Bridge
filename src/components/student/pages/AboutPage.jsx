import React from "react";
import { ArrowRight, Globe2, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { TextPath } from "../shared/TextPath";

const principles = [
  ["aboutWiderWorld", Globe2],
  ["aboutSafeSpace", ShieldCheck],
  ["aboutSupport", HeartHandshake],
  ["aboutOpenToEveryone", Sparkles],
];

export function AboutPage({ t, onExploreSessions }) {
  return (
    <div className="about-page" id="about-us">
      <section className="about-values-section">
        <TextPath
          text={[t("aboutHeading"), t("aboutEyebrow")]}
          duration={18}
          className="about-heading-text"
        />
        <div className="about-values-grid">
          {principles.map(([key, Icon], index) => (
            <article className={`about-value about-value-${index + 1}`} key={key}>
              <span className="about-value-icon"><Icon size={23} /></span>
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
