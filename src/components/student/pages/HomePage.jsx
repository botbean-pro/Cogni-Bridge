import React, { useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, Sparkles } from "lucide-react";
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
  const flightInProgress = useRef(false);
  const [bookLanded, setBookLanded] = useState(false);

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

  const flyBookToGlobe = () => {
    const book = document.querySelector(".hero-orb-book");
    const globe = document.querySelector(".about-value-1 .about-value-icon");
    const start = book?.getBoundingClientRect();

    if (
      !book
      || !globe
      || !start
      || flightInProgress.current
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onScrollToAbout();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setBookLanded(true);
      }
      return;
    }

    flightInProgress.current = true;
    const flight = book.cloneNode(true);
    Object.assign(flight.style, {
      position: "fixed",
      top: `${start.top}px`,
      left: `${start.left}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      zIndex: "50",
      margin: "0",
      animation: "none",
      pointerEvents: "none",
    });
    flight.classList.add("hero-book-flight");
    document.body.appendChild(flight);
    const globePageTop = globe.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, globePageTop - window.innerHeight * 0.72));

    window.setTimeout(() => {
      const end = globe.getBoundingClientRect();
      const offsetX = end.left + end.width / 2 - (start.left + start.width / 2);
      const offsetY = end.top + end.height / 2 - (start.top + start.height / 2);
      const scale = end.width / start.width;
      const animation = flight.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})` },
        ],
        { duration: 1050, easing: "cubic-bezier(.22,.75,.22,1)", fill: "forwards" },
      );
      animation.onfinish = () => {
        flight.remove();
        setBookLanded(true);
        flightInProgress.current = false;
      };
    }, 120);
  };

  return (
    <section className="content home-content">
      <HomeHero onSignIn={onSignIn} onExploreSessions={onExploreSessions} onScrollToAbout={flyBookToGlobe} t={t} />
      <AboutPage t={t} onExploreSessions={onExploreSessions} bookLanded={bookLanded} />

    </section>
  );
}
