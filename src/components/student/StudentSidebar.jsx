import React, { useState } from "react";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { BookHeart, BookOpen, Compass, Crown, Headphones, Heart, LockKeyhole, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

const navigationLabels = {
  home: "home",
  sessions: "sessions",
  leaderboard: "leaderboard",
  study: "study",
  flow: "flow",
  sensory: "sensoryTracker",
  careers: "careerOptions",
  premium: "premiumFlow",
  relax: "quietSpaceTitle",
  journal: "journalTitle",
};

export const StudentSidebar = ({ activeTab, onNavigate, signedIn, sensoryTrackerEnabled, isGrade12, t }) => {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const items = signedIn
    ? [
      [BookOpen, "study"],
      ...navigation.filter(([, , tab]) => tab === "sessions" || tab === "flow").map(([Icon, , tab]) => [Icon, tab]),
      [Crown, "premium"],
      [Compass, "careers"],
      [Sparkles, "mindful"], [Headphones, "relax"],
      [BookHeart, "journal"],
      ...(sensoryTrackerEnabled ? [[Heart, "sensory"]] : []),
      ...navigation.filter(([, , tab]) => tab === "leaderboard").map(([Icon, , tab]) => [Icon, tab]),
    ]
    : [...navigation.map(([Icon, , tab]) => [Icon, tab]), [Sparkles, "mindful"], [Headphones, "relax"], [Crown, "premium"]];

  return (
    <div className={classNames("student-sidebar", pinnedOpen && "pinned-open")}>
      <div className="student-rail-brand">
        <span className="student-rail-logo"><LogoImage size={42} /></span>
        <span className="student-rail-brand-copy"><strong>CogniBridge</strong><small>{t("learnTogether")}</small></span>
        <button type="button" className="student-rail-toggle" onClick={() => setPinnedOpen((open) => !open)} aria-label={pinnedOpen ? t("collapseNavigation") : t("expandNavigation")} aria-expanded={pinnedOpen}>
          {pinnedOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
      <nav className="student-rail-nav" aria-label={t("mainNavigation")}>
        {items.map(([Icon, tab]) => {
          const careerLocked = tab === "careers" && !isGrade12;
          const label = tab === "mindful" ? "Mindful Corner" : t(navigationLabels[tab] || tab);
          return <button key={tab} type="button" className={classNames("student-rail-link", activeTab === tab && "active", careerLocked && "locked")} aria-current={activeTab === tab ? "page" : undefined} aria-disabled={careerLocked} onClick={() => !careerLocked && onNavigate(tab)} title={careerLocked ? t("career_locked") : label}>
            <Icon size={20} />{careerLocked && <LockKeyhole className="rail-lock-icon" size={11} />}<span>{label}</span>
          </button>
        })}
      </nav>
    </div>
  );
};
