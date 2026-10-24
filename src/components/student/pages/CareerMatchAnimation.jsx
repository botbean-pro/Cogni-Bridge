import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, Check, ListChecks, PenLine } from "lucide-react";
import "./CareerMatchAnimation.css";

const steps = [
  { key: "cr_an1", Icon: ListChecks },
  { key: "cr_an2", Icon: PenLine },
  { key: "cr_an3", Icon: BriefcaseBusiness },
];
const fullDuration = 4200;

const prefersCalm = () => {
  const root = document.documentElement.dataset;
  return root.motion === "off" || root.lowSensory === "true"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
};

// Fullscreen "matching" moment shown before career results. It renders in a
// portal so page-entrance transforms can't clip the fixed overlay.
export function CareerMatchAnimation({ t, handwritingImage, onDone }) {
  const [calm] = useState(prefersCalm);
  const duration = calm ? 1600 : fullDuration;
  const [stepIndex, setStepIndex] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const stepTimers = steps.slice(1).map((_, index) => setTimeout(() => setStepIndex(index + 1), ((index + 1) * duration) / steps.length));
    const finish = setTimeout(() => doneRef.current(), duration);
    const onKey = (event) => { if (event.key === "Escape") doneRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { stepTimers.forEach(clearTimeout); clearTimeout(finish); window.removeEventListener("keydown", onKey); };
  }, [duration]);

  return createPortal(
    <div className={`career-match${calm ? " calm" : ""}`} role="dialog" aria-modal="true" aria-labelledby="career-match-title" style={{ "--match-duration": `${duration}ms` }}>
      <div className="career-match-glow" aria-hidden="true" />
      <div className="career-match-stage">
        <div className="career-match-sample" aria-hidden="true">
          {handwritingImage ? <img src={handwritingImage} alt="" /> : null}
          <svg viewBox="0 0 320 120" className="career-match-ink">
            <path d="M14 78 C 34 30, 52 30, 58 74 S 84 104, 96 60 C 104 34, 118 34, 122 70 C 126 98, 146 96, 154 66 C 160 42, 176 40, 180 70 C 184 96, 204 98, 212 64 C 218 40, 236 38, 240 72 C 244 100, 266 96, 274 62 C 280 40, 298 44, 306 70" />
          </svg>
          <span className="career-match-scan" />
          {[0, 1, 2, 3, 4, 5].map((dot) => <span key={dot} className="career-match-spark" style={{ "--i": dot }} />)}
        </div>
        <h2 id="career-match-title">{t("cr_anTitle")}</h2>
        <p className="career-match-pattern"><PenLine size={15} aria-hidden="true" /> {t("cr_hwUsingCheck")}</p>
        <ol className="career-match-steps" aria-live="polite">
          {steps.map(({ key, Icon }, index) => (
            <li key={key} className={index < stepIndex ? "done" : index === stepIndex ? "active" : ""}>
              <span className="career-match-step-icon">{index < stepIndex ? <Check size={16} /> : <Icon size={16} />}</span>
              {t(key)}
            </li>
          ))}
        </ol>
        <div className="career-match-bar" aria-hidden="true"><span /></div>
        <button type="button" className="career-match-skip" onClick={() => doneRef.current()}>{t("cr_anSkip")}</button>
      </div>
    </div>,
    document.body,
  );
}
