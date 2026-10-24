import React from "react";

const motorSigns = ["size", "baseline", "drift"];
const planningSigns = ["spacing", "crowded"];

// The sign-up handwriting check as a mentor sees it: what was found in the sample and which
// specialist screening it points to. `signs` is null when the student hasn't done the check.
export function HandwritingFindings({ signs, compact = false, t }) {
  if (!signs) return <span className="hw-findings-none">{t("hw_notChecked")}</span>;
  if (!signs.length) return <span className="hw-findings-clear">{t("hw_noSigns")}</span>;
  const screenings = [
    signs.some((sign) => motorSigns.includes(sign)) && "hw_screenDysgraphia",
    signs.some((sign) => planningSigns.includes(sign)) && "hw_screenDyslexiaAdhd",
  ].filter(Boolean);
  return (
    <div className={`hw-findings${compact ? " is-compact" : ""}`}>
      <ul>{signs.map((sign) => <li key={sign}>{t(`hw_sign_${sign}`)}</li>)}</ul>
      {screenings.map((key) => <p key={key} className="hw-findings-screen">{t(key)}</p>)}
      {!compact && <p className="hw-findings-note">{t("hw_notDiagnosis")}</p>}
    </div>
  );
}
