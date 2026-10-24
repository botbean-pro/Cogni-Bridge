import React from "react";

const motorSigns = ["size", "baseline", "drift"];
const planningSigns = ["spacing", "crowded"];

// The sign-up handwriting check as a mentor sees it: what was found in the sample and which
// specialist screening it points to. `signs` is null when the student hasn't done the check;
// "joined" isn't a difficulty, only a note that joined-up writing can't be checked for size and spacing.
export function HandwritingFindings({ signs, compact = false, t }) {
  if (!signs) return <span className="hw-findings-none">{t("hw_notChecked")}</span>;
  const found = signs.filter((sign) => sign !== "joined");
  const joinedNote = signs.includes("joined") && <p className="hw-findings-note">{t("hw_joinedNote")}</p>;
  if (!found.length) return <div className="hw-findings"><span className="hw-findings-clear">{t("hw_noSigns")}</span>{joinedNote}</div>;
  const screenings = [
    found.some((sign) => motorSigns.includes(sign)) && "hw_screenDysgraphia",
    found.some((sign) => planningSigns.includes(sign)) && "hw_screenDyslexiaAdhd",
  ].filter(Boolean);
  return (
    <div className={`hw-findings${compact ? " is-compact" : ""}`}>
      <ul>{found.map((sign) => <li key={sign}>{t(`hw_sign_${sign}`)}</li>)}</ul>
      {screenings.map((key) => <p key={key} className="hw-findings-screen">{t(key)}</p>)}
      {joinedNote}
      {!compact && <p className="hw-findings-note">{t("hw_notDiagnosis")}</p>}
    </div>
  );
}
