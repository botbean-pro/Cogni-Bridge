import React, { useState } from "react";
import { Link } from "react-router-dom";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { BookOpen, Compass, Crown, Ellipsis, Headphones, Heart, LockKeyhole, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { studentTabPaths } from "../../routes";
import { usePageTitle } from "../../pageTitle";
import { useActiveTabInView } from "../../useRailScroll";

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

export const railLabel = (t, tab) => t(tab === "mindful" ? "mcTitle" : navigationLabels[tab] || tab);

// Tabs in the order the rail shows them. Signed-out visitors only get pages that work without an account;
// Cogni Board, Cogni-Flow and Mindful Corner just ask them to sign in, so they appear after signing in.
export const studentRailItems = (signedIn, sensoryTrackerEnabled) => (signedIn
  ? [
    [BookOpen, "study"],
    ...navigation.filter(([, , tab]) => tab === "sessions" || tab === "flow").map(([Icon, , tab]) => [Icon, tab]),
    [Crown, "premium"],
    [Compass, "careers"],
    [Sparkles, "mindful"], [Headphones, "relax"],
    ...(sensoryTrackerEnabled ? [[Heart, "sensory"]] : []),
    ...navigation.filter(([, , tab]) => tab === "leaderboard").map(([Icon, , tab]) => [Icon, tab]),
  ]
  : [...navigation.filter(([, , tab]) => tab === "home" || tab === "sessions").map(([Icon, , tab]) => [Icon, tab]), [Headphones, "relax"], [Crown, "premium"]]);

// A signed-in student's phone bar shows only these; every other tab and the account actions sit behind "More".
export const phoneBarTabs = (sensoryTrackerEnabled) => ["study", "sessions", "flow", sensoryTrackerEnabled ? "sensory" : "mindful"];

export const StudentSidebar = ({ activeTab, onNavigate, signedIn, sensoryTrackerEnabled, isGrade12, moreOpen, moreBadge, onToggleMore, t }) => {
  usePageTitle(t("pt_student"), activeTab === "mindful" ? t("mcTitle") : activeTab === "settings" ? t("settings") : t(navigationLabels[activeTab] || activeTab));
  const [pinnedOpen, setPinnedOpen] = useState(false);
  useActiveTabInView(activeTab);
  const items = studentRailItems(signedIn, sensoryTrackerEnabled);
  const barTabs = phoneBarTabs(sensoryTrackerEnabled);
  const moreActive = signedIn && items.some(([, tab]) => tab === activeTab && !barTabs.includes(tab));

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
          const label = railLabel(t, tab);
          const linkProps = {
            key: tab,
            className: classNames("student-rail-link", activeTab === tab && "active", careerLocked && "locked", signedIn && !barTabs.includes(tab) && "rail-secondary"),
            "aria-current": activeTab === tab ? "page" : undefined,
            "aria-disabled": careerLocked,
            title: careerLocked ? t("career_locked") : label,
          };
          const content = <><Icon size={20} />{careerLocked && <LockKeyhole className="rail-lock-icon" size={11} />}<span>{label}</span></>;
          return careerLocked
            ? <button {...linkProps} type="button" onClick={() => onNavigate(tab)}>{content}</button>
            : <Link {...linkProps} to={studentTabPaths[tab]}>{content}</Link>;
        })}
        {signedIn && (
          <button type="button" className={classNames("student-rail-link", "student-rail-more", (moreActive || moreOpen) && "active")} onClick={onToggleMore} aria-haspopup="dialog" aria-expanded={Boolean(moreOpen)} title={t("more")}>
            <Ellipsis size={20} />{moreBadge > 0 && <b className="student-notify-badge" aria-hidden="true">{moreBadge}</b>}<span>{t("more")}</span>
          </button>
        )}
      </nav>
    </div>
  );
};
