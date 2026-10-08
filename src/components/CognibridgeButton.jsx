import React from "react";
import "./CognibridgeButton.css";

export function CognibridgeButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
}) {
  const classes = ["cognibridge-button", className].filter(Boolean).join(" ");

  return (
    <button className={classes} type={type} onClick={onClick} disabled={disabled}>
      <span className="cognibridge-button-text">{children}</span>
      <span className="cognibridge-button-glow" aria-hidden="true" />
    </button>
  );
}
