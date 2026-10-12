import React from "react";

/** Seamless looping text ticker. Two identical tracks meet without a visible jump. */
export function TextPath({ text, duration = 18, className = "" }) {
  const phrases = Array.isArray(text) ? text : [text];
  const accessibleText = phrases.filter(Boolean).join(" · ");

  return (
    <div
      className={`text-path ${className}`.trim()}
      role="heading"
      aria-level="1"
      aria-label={accessibleText}
      style={{ "--text-path-duration": `${duration}s` }}
    >
      <div className="text-path-track" aria-hidden="true">
        {[0, 1].map((copy) => (
          <span className="text-path-sequence" key={copy}>
            {phrases.map((phrase, index) => (
              <span className="text-path-group" key={`${copy}-${index}`}>
                <span>{phrase}</span>
                <span className="text-path-separator">✳</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
