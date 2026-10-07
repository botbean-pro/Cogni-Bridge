import React from "react";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";

const navigationLabels = {
  home: "home",
  about: "aboutUs",
  sessions: "sessions",
  flow: "flow",
  messages: "messages",
};

export const StudentSidebar = ({ activeTab, onNavigate, t }) => {
  return (
    <div className="student-sidebar">
      <div className="brand">
        <div className="brand-mark"><LogoImage size={30} /></div>
        <div className="brand-copy">
          <strong>CogniBridge</strong>
          <span>{t("learnTogether")}</span>
        </div>
      </div>
      <nav className="nav" aria-label={t("mainNavigation")}>
        {navigation.map(([Icon, , tab]) => (
          <button key={tab} className={classNames("nav-item", activeTab === tab && "active")} onClick={() => onNavigate(tab)}>
            <Icon size={20} />
            <span>{t(navigationLabels[tab])}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};