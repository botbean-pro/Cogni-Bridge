import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import logoWithoutText from "../assets/logo-mark.png";

export function Card() {
  return (
    <div className="brand-stat-card">
      <div className="brand-stat-outer">
        <div className="brand-stat-dot" />
        <div className="brand-stat-panel">
          <div className="brand-stat-ray" />
          <span className="brand-stat-logo-badge">
            <img className="brand-stat-logo" src={logoWithoutText} alt="CogniBridge" />
          </span>
          <div className="brand-stat-line brand-stat-topl" />
          <div className="brand-stat-line brand-stat-leftl" />
          <div className="brand-stat-line brand-stat-bottoml" />
          <div className="brand-stat-line brand-stat-rightl" />
        </div>
      </div>
    </div>
  );
}

export function LogoImage({ size = 28 }) {
  const [hasLogo, setHasLogo] = useState(true);
  return hasLogo
    ? <img src={logoWithoutText} alt="" width={size} height={size} onError={() => setHasLogo(false)} />
    : <Sparkles size={size} aria-hidden="true" />;
}
export function AnimatedLogo() {
  return (
    <div className="intro-mark" aria-hidden="true">
      <span className="intro-half intro-left">
        <img src={logoWithoutText} alt="" width={140} height={140} />
      </span>
      <span className="intro-half intro-right">
        <img src={logoWithoutText} alt="" width={140} height={140} />
      </span>
    </div>
  );
}
