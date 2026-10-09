import React, { useEffect, useRef } from "react";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import logoWithoutText from "../../../assets/logo without text.svg";
import { Card } from "../../Brand";
import { CognibridgeButton } from "../../CognibridgeButton";
import { AboutPage } from "./AboutPage";
import { StudyPage } from "./SessionsPage";

function HomeHero({ onSignIn, onExploreSessions, onScrollToAbout, t }) {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="hero-eyebrow">{t("learnBeyondBorders")}</p>
        <h1>{t("bigIdeasGrow")}<br />{t("weLearn")} <span>{t("together")}</span></h1>
        <p className="hero-description">{t("homeHeroDescription")}</p>
        <div className="hero-actions">
          <CognibridgeButton className="hero-primary" onClick={onSignIn}>
            {t("joinCommunity")} <ArrowRight size={19} />
          </CognibridgeButton>
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
          <div className="hero-orb hero-orb-book hero-orb-card">
            <Card />
          </div>
          <span className="hero-float hero-float-coral"><Sparkles size={20} fill="currentColor" /></span>
          <span className="hero-float hero-float-yellow"><Sparkles size={20} fill="currentColor" /></span>
          <span className="hero-float hero-float-mint"><Sparkles size={20} fill="currentColor" /></span>
        </div>
        <span className="hero-art-label">{t("curiosityConnects")}</span>
      </div>
      <button
        className="home-about-scroll"
        type="button"
        onClick={onScrollToAbout}
        aria-label={t("aboutUs")}
      >
        <ArrowDown size={27} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </section>
  );
}

export function HomePage({
  signedIn,
  t,
  studentEmail,
  studentName,
  activityVersion,
  sessions,
  onSignIn,
  onExploreSessions,
  onScrollToAbout,
  onOpenSession,
}) {
  const homeContentRef = useRef(null);
  const scrollBrandRef = useRef(null);
  const scrollLogoRef = useRef(null);
  const scrollOrbitRef = useRef(null);

  useEffect(() => {
    if (signedIn || !homeContentRef.current) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = null;
    const updateLogo = () => {
      frame = null;
      if (!homeContentRef.current) return;

      const page = homeContentRef.current;
      const pageTop = page.getBoundingClientRect().top + window.scrollY;
      const hero = page.querySelector(".home-hero");
      const heroBottom = pageTop + (hero?.offsetHeight ?? 0);
      scrollBrandRef.current?.classList.toggle("over-hero", window.scrollY < heroBottom - 20);
      if (reduceMotion || !scrollLogoRef.current) return;

      const scrollDistance = Math.max(page.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, (window.scrollY - pageTop) / scrollDistance));
      scrollLogoRef.current.style.transform = `rotate(${progress * 360}deg) scale(${1 + progress * 0.08})`;
      if (scrollOrbitRef.current) {
        scrollOrbitRef.current.style.transform = `rotate(${-progress * 180}deg)`;
      }
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateLogo);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [signedIn]);

  if (signedIn) {
    return (
      <StudyPage
        sessions={sessions}
        studentEmail={studentEmail}
        studentName={studentName}
        activityVersion={activityVersion}
        onOpenSession={onOpenSession}
        eyebrow={t("welcomeBack")}
        heading={studentName}
        t={t}
      />
    );
  }

  return (
    <section className="content home-content" ref={homeContentRef}>
      <div className="home-story">
        <aside className="home-scroll-brand" ref={scrollBrandRef} aria-label="CogniBridge">
          <div className="home-scroll-brand-sticky">
            <span className="home-scroll-logo-wrap">
              <span className="home-scroll-logo-orbit" ref={scrollOrbitRef} aria-hidden="true" />
              <span className="home-scroll-logo-badge">
                <img className="home-scroll-logo-mark" ref={scrollLogoRef} src={logoWithoutText} alt="" />
              </span>
            </span>
            <span className="home-scroll-brand-name">CogniBridge</span>
            <span className="home-scroll-brand-caption">{t("learnTogether")}</span>
          </div>
        </aside>
        <HomeHero onSignIn={onSignIn} onExploreSessions={onExploreSessions} onScrollToAbout={onScrollToAbout} t={t} />
        <AboutPage t={t} onExploreSessions={onExploreSessions} />
      </div>
    </section>
  );
}
