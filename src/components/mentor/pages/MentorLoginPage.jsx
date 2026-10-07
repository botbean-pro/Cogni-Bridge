import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MENTOR_EMAIL, MENTOR_PASSWORD } from "../../../constants";
import { LogoImage } from "../../Brand";

export function MentorLoginPage({
  email,
  password,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onBack,
  t,
}) {
  return (
    <main className="mentor-login-page">
      <header className="sidebar mentor-login-topbar">
        <button className="mentor-wordmark" onClick={onBack}>
          <span><LogoImage size={38} /></span>
          <strong>CogniBridge <small>{t("mentorSpace")}</small></strong>
        </button>
        <button className="mentor-login-back" onClick={onBack}>
          <ArrowLeft size={18} /> {t("backToLearnerView")}
        </button>
      </header>

      <section className="mentor-login-card">
        <p className="mentor-kicker">COGNIBRIDGE</p>
        <h1>{t("mentorLogin")}</h1>
        <p>{t("mentorLoginProtection")}</p>
        <form className="mentor-login-form" onSubmit={onSubmit}>
          <label>
            {t("email")}
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={MENTOR_EMAIL}
              required
            />
          </label>
          <label>
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={MENTOR_PASSWORD}
              required
            />
          </label>
          {error && <div className="error-popup" role="alert">{t(error)}</div>}
          <button className="primary-btn" type="submit">
            {t("enterMentorSpace")} <ChevronRight size={18} />
          </button>
        </form>
        <small>{t("demoLogin")}: {MENTOR_EMAIL} / {MENTOR_PASSWORD}</small>
      </section>
    </main>
  );
}
