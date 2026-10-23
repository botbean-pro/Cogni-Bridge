import React, { useRef, useState } from "react";
import { ArrowDown, ArrowRight, BookOpen, Brain, CalendarDays, Check, HeartHandshake, Headphones, MessageCircle, Puzzle, Sparkles, Users } from "lucide-react";
import { Card } from "../../Brand";
import { CognibridgeButton } from "../../CognibridgeButton";
import { AboutPage } from "./AboutPage";
import { StudyPage } from "./SessionsPage";

const heroRingKeys = ["heroRingMindsDiffer", "heroRingOwnPace", "heroRingMentorsListen"];

// Translated words that orbit the hero art; short translations repeat so the ring stays filled.
function HeroTextRing({ t }) {
  const message = heroRingKeys.map((key) => t(key)).join(" • ");
  const ringText = `${message} • `.repeat(message.length <= 80 ? 3 : 2);
  return (
    <svg className="hero-orbit-words" viewBox="0 0 500 500" focusable="false">
      <defs>
        <path id="hero-orbit-copy-path" d="M250,250 m-232,0 a232,232 0 1,1 464,0 a232,232 0 1,1 -464,0" />
      </defs>
      <circle className="hero-orbit-track" cx="250" cy="250" r="232" />
      <text>
        <textPath href="#hero-orbit-copy-path">{ringText}</textPath>
      </text>
    </svg>
  );
}

const learningPaths = {
  student: {
    title: "pathStudentTitle",
    description: "pathStudentCopy",
    icon: Brain,
    chips: ["sessions", "mcTitle", "careerOptions"],
    nodes: [BookOpen, Headphones, Puzzle],
  },
  parent: {
    title: "pathParentTitle",
    description: "pathParentCopy",
    icon: HeartHandshake,
    chips: ["learningTime", "messages", "subjectsExplored"],
    nodes: [CalendarDays, MessageCircle, Check],
  },
  educator: {
    title: "pathEducatorTitle",
    description: "pathEducatorCopy",
    icon: Users,
    chips: ["sessions", "studentSupport", "sensoryRequests"],
    nodes: [BookOpen, Users, HeartHandshake],
  },
};

function LearningPathPreview({ t, onExploreSessions }) {
  const [activePath, setActivePath] = useState("student");
  const path = learningPaths[activePath];
  const PathIcon = path.icon;

  return (
    <section className="learning-path-section" aria-labelledby="learning-path-heading">
      <div className="learning-path-copy">
        <p className="eyebrow"><Sparkles size={15} aria-hidden="true" />{t("homePathEyebrow")}</p>
        <h2 id="learning-path-heading">{t("homePathHeading")}</h2>
        <p className="learning-path-intro">{t("homePathDescription")}</p>
        <div className="learning-path-choices" role="group" aria-label={t("journeyRoleSelector")}>
          {[
            ["student", t("student"), Brain],
            ["parent", t("parent"), HeartHandshake],
            ["educator", t("teacher"), Users],
          ].map(([key, label, Icon]) => (
            <button key={key} type="button" className={`learning-path-choice${activePath === key ? " is-active" : ""}`} aria-pressed={activePath === key} onClick={() => setActivePath(key)}>
              <Icon size={17} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <div className="learning-path-story" key={activePath} aria-live="polite">
          <h3>{t(path.title)}</h3>
          <p>{t(path.description)}</p>
          <button type="button" className="learning-path-link" onClick={onExploreSessions}>{t("exploreSessions")}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </div>

      <div key={activePath} className={`learning-path-visual learning-path-visual-${activePath}`} aria-hidden="true">
        <div className="learning-path-orbit learning-path-orbit-one" />
        <div className="learning-path-orbit learning-path-orbit-two" />
        <div className="learning-path-preview-card">
          <div className="learning-path-card-top"><span className="learning-path-main-icon"><PathIcon size={23} /></span><span className="learning-path-status"><i />{t("pathPreviewLabel")}</span></div>
          <div className="learning-path-card-heading"><span /><span /><span /></div>
          <div className="learning-path-card-progress"><i /></div>
          <div className="learning-path-chip-list">
            {path.chips.map((key) => <span key={key}>{t(key)}</span>)}
          </div>
          <div className="learning-path-card-footer"><span className="learning-path-avatar"><PathIcon size={14} /></span><span /><span /><span /></div>
        </div>
        {path.nodes.map((Icon, index) => <span className={`learning-path-node learning-path-node-${index + 1}`} key={`${activePath}-${index}`}><Icon size={18} /></span>)}
        <span className="learning-path-spark learning-path-spark-one"><Sparkles size={18} /></span>
        <span className="learning-path-spark learning-path-spark-two"><Sparkles size={13} /></span>
      </div>
    </section>
  );
}

function HomeHero({ onSignIn, onExploreSessions, onScrollToAbout, t }) {
  const artRef = useRef(null);
  const tiltArt = (event) => {
    if (event.pointerType === "touch" || document.documentElement.dataset.motion !== "full"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    artRef.current?.style.setProperty("--hero-tilt-x", `${(-y * 11).toFixed(2)}deg`);
    artRef.current?.style.setProperty("--hero-tilt-y", `${(x * 14).toFixed(2)}deg`);
    artRef.current?.style.setProperty("--hero-light-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    artRef.current?.style.setProperty("--hero-light-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    artRef.current?.style.setProperty("--hero-shift-back-x", `${(x * -7).toFixed(1)}px`);
    artRef.current?.style.setProperty("--hero-shift-back-y", `${(y * -7).toFixed(1)}px`);
    event.currentTarget.style.setProperty("--hero-shift-back-x", `${(x * -7).toFixed(1)}px`);
    event.currentTarget.style.setProperty("--hero-shift-back-y", `${(y * -7).toFixed(1)}px`);
    artRef.current?.style.setProperty("--hero-shift-mid-x", `${(x * 7).toFixed(1)}px`);
    artRef.current?.style.setProperty("--hero-shift-mid-y", `${(y * 7).toFixed(1)}px`);
    artRef.current?.style.setProperty("--hero-shift-front-x", `${(x * 13).toFixed(1)}px`);
    artRef.current?.style.setProperty("--hero-shift-front-y", `${(y * 13).toFixed(1)}px`);
  };
  const resetArt = (event) => {
    [
      "--hero-tilt-x", "--hero-tilt-y", "--hero-light-x", "--hero-light-y",
      "--hero-shift-back-x", "--hero-shift-back-y", "--hero-shift-mid-x", "--hero-shift-mid-y",
      "--hero-shift-front-x", "--hero-shift-front-y",
    ].forEach((property) => artRef.current?.style.removeProperty(property));
    event.currentTarget.style.removeProperty("--hero-shift-back-x");
    event.currentTarget.style.removeProperty("--hero-shift-back-y");
  };
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="hero-eyebrow">{t("learnBeyondBorders")}</p>
        <p className="home-brand-mark" aria-label="CogniBridge"><span className="home-brand-wordmark" data-brand="CogniBridge">Cogni<span className="home-brand-bridge">Bridge</span></span></p>
        <h1 className="home-hero-tagline"><span className="tagline-hindi" lang="hi">सपनों की उड़ान</span><br /><span>for Every Learner</span></h1>
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
      <div className="home-hero-art-wrap" onPointerEnter={tiltArt} onPointerMove={tiltArt} onPointerLeave={resetArt}>
        <div className="home-hero-art" ref={artRef} aria-hidden="true">
          <span className="hero-orbit hero-orbit-one" />
          <span className="hero-orbit hero-orbit-two" />
          <span className="hero-glass-panel" />
          <span className="hero-gap-trail" />
          <span className="hero-gap-glint hero-gap-glint-one" />
          <span className="hero-gap-glint hero-gap-glint-two" />
          <span className="hero-gap-glint hero-gap-glint-three" />
          <HeroTextRing t={t} />
          <div className="hero-orb hero-orb-book hero-orb-card">
            <Card />
          </div>
          <span className="hero-float hero-float-coral"><Sparkles size={19} fill="currentColor" /></span>
          <span className="hero-float hero-float-yellow"><Sparkles size={19} fill="currentColor" /></span>
          <span className="hero-float hero-float-mint"><Sparkles size={19} fill="currentColor" /></span>
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
    <section className="content home-content">
      <div className="home-story">
        <HomeHero onSignIn={onSignIn} onExploreSessions={onExploreSessions} onScrollToAbout={onScrollToAbout} t={t} />
        <LearningPathPreview t={t} onExploreSessions={onExploreSessions} />
        <AboutPage t={t} onExploreSessions={onExploreSessions} />
      </div>
    </section>
  );
}
