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
}) {
  return (
    <main className="mentor-login-page">
      <header className="sidebar mentor-login-topbar">
        <button className="mentor-wordmark" onClick={onBack}>
          <span><LogoImage size={23} /></span>
          <strong>CogniBridge <small>Mentor space</small></strong>
        </button>
        <button className="mentor-login-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to learner view
        </button>
      </header>

      <section className="mentor-login-card">
        <p className="mentor-kicker">COGNIBRIDGE</p>
        <h1>Mentor login</h1>
        <p>Only mentors can access the protected mentor space.</p>
        <form className="mentor-login-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={MENTOR_EMAIL}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={MENTOR_PASSWORD}
              required
            />
          </label>
          {error && <div className="error-popup" role="alert">{error}</div>}
          <button className="primary-btn" type="submit">
            Enter mentor space <ChevronRight size={18} />
          </button>
        </form>
        <small>Demo login: {MENTOR_EMAIL} / {MENTOR_PASSWORD}</small>
      </section>
    </main>
  );
}
