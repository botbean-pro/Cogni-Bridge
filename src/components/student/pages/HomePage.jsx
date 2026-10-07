import React from "react";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { AboutPage } from "./AboutPage";
import { StudentStats } from "../shared/StudentStats";

function HomeHero({ onSignIn, onExploreSessions, t }) {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="hero-eyebrow">{t("learnBeyondBorders")}</p>
        <h1>{t("bigIdeasGrow")}<br />{t("weLearn")} <span>{t("together")}</span></h1>
        <p className="hero-description">{t("homeHeroDescription")}</p>
        <div className="hero-actions">
          <button className="hero-primary" onClick={onSignIn}>
            {t("joinCommunity")} <ArrowRight size={19} />
          </button>
          <button className="hero-secondary" onClick={onExploreSessions}>
            {t("exploreSessions")}
          </button>
        </div>
        <p className="hero-footnote"><span aria-hidden="true" />{t("friendlyLearningPlace")}</p>
      </div>
      <div className="home-hero-art-wrap">
        <div className="home-hero-art" aria-hidden="true">
          <span className="hero-orbit hero-orbit-one" />
          <span className="hero-orbit hero-orbit-two" />
          <span className="hero-orbit hero-orbit-three" />
          <span className="hero-orb hero-orb-book"><BookOpen size={76} strokeWidth={1.5} /></span>
          <span className="hero-float hero-float-coral"><Sparkles size={20} fill="currentColor" /></span>
          <span className="hero-float hero-float-yellow"><Sparkles size={20} fill="currentColor" /></span>
          <span className="hero-float hero-float-mint"><Sparkles size={20} fill="currentColor" /></span>
        </div>
        <span className="hero-art-label">{t("curiosityConnects")}</span>
      </div>
    </section>
  );
}

export function HomePage({
  signedIn,
  t,
  studentEmail,
  studentName,
  activityVersion,
  onSignIn,
  onExploreSessions,
}) {
  return (
    <section className="content home-content">
      <HomeHero onSignIn={onSignIn} onExploreSessions={onExploreSessions} t={t} />
      <AboutPage t={t} onExploreSessions={onExploreSessions} />

      {signedIn && (
        <StudentStats
          key={studentEmail}
          studentEmail={studentEmail}
          studentName={studentName}
          activityVersion={activityVersion}
          t={t}
        />
      )}
    </section>
  );
}
