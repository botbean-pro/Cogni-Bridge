import React from "react";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { BookOpen } from "lucide-react";

const navigationLabels = {
  home: "home",
  about: "aboutUs",
  sessions: "sessions",
  study: "study",
  flow: "flow",
};

export const StudentSidebar = ({ activeTab, onNavigate, signedIn, t }) => {
  const items = signedIn
    ? [...navigation.slice(0, 1), [BookOpen, "Study", "study"], ...navigation.slice(1)]
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