import React from "react";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { BookOpen, HeartPulse } from "lucide-react";

const navigationLabels = {
  home: "home",
  sessions: "sessions",
  leaderboard: "leaderboard",
  study: "study",
  flow: "flow",
  sensory: "sensoryTracker",
};

export const StudentSidebar = ({ activeTab, onNavigate, signedIn, sensoryTrackerEnabled, t }) => {
  const items = signedIn
    ? [
      [BookOpen, "Study", "study"],
      ...navigation.slice(1),
      ...(sensoryTrackerEnabled ? [[HeartPulse, "Sensory Tracker", "sensory"]] : []),
    ]
    : navigation;

  return (
    <div className="student-sidebar">
      <div className="brand">
        <div className="brand-mark"><LogoImage size={54} /></div>
        <div className="brand-copy">
          <strong>CogniBridge</strong>
          <span>{t("learnTogether")}</span>
        </div>
      </div>
      <nav className="nav" aria-label={t("mainNavigation")}>
        {items.map(([Icon, , tab]) => (
          <button
            key={tab}
            className={classNames("nav-item", activeTab === tab && "active")}
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => onNavigate(tab)}
          >
            <Icon size={20} />
            <span>{t(navigationLabels[tab])}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
