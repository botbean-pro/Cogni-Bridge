import React, { useState } from "react";
import { Link } from "react-router-dom";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { BookOpen, Compass, Crown, Headphones, Heart, LockKeyhole, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { studentTabPaths } from "../../routes";
import { usePageTitle } from "../../pageTitle";

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
};

export const StudentSidebar = ({ activeTab, onNavigate, signedIn, sensoryTrackerEnabled, isGrade12, t }) => {
  usePageTitle(t("pt_student"), activeTab === "mindful" ? t("mcTitle") : activeTab === "settings" ? t("settings") : t(navigationLabels[activeTab] || activeTab));
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const items = signedIn
    ? [
      [BookOpen, "study"],
      ...navigation.filter(([, , tab]) => tab === "sessions" || tab === "flow").map(([Icon, , tab]) => [Icon, tab]),
      [Crown, "premium"],
      [Compass, "careers"],
      [Sparkles, "mindful"], [Headphones, "relax"],
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
          const linkProps = {
            key: tab,
            className: classNames("student-rail-link", activeTab === tab && "active", careerLocked && "locked"),
            "aria-current": activeTab === tab ? "page" : undefined,
            "aria-disabled": careerLocked,
            title: careerLocked ? t("career_locked") : label,
          };
          const content = <><Icon size={20} />{careerLocked && <LockKeyhole className="rail-lock-icon" size={11} />}<span>{label}</span></>;
          return careerLocked
            ? <button {...linkProps} type="button" onClick={() => onNavigate(tab)}>{content}</button>
            : <Link {...linkProps} to={studentTabPaths[tab]}>{content}</Link>;
        })}
      </nav>
    </div>
  );
};
