import React from "react";
import { Accessibility } from "lucide-react";
import { classNames } from "../../constants";
import { AnimatedLogo, MouseTrail } from "../Brand";
import { StudentSidebar } from "./StudentSidebar";
import { StudentTopBar } from "./StudentTopBar";

export const StudentPage = ({
  activeTab,
  goToTab,
  signedIn,
  studentName,
  t,
  onLogin,
  onLogout,
  showIntro,
  introExiting,
  pageContent,
  accessibilityOpen,
  onToggleAccessibility,
  accessibilityPanel,
}) => (
  <>
    <MouseTrail />
    {showIntro && (
      <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label={t("loadingCogniBridge")}>
        <AnimatedLogo />
        <p>CogniBridge</p>
      </div>
    )}
    <header className="sidebar">
      <StudentSidebar activeTab={activeTab} onNavigate={goToTab} signedIn={signedIn} t={t} />
      <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} t={t} />
    </header>
    <main className="main">{pageContent[activeTab === "about" ? "home" : activeTab]}</main>
    <button
      className="accessibility-tab"
      aria-label={t("openAccessibility")}
      aria-expanded={accessibilityOpen}
      onClick={onToggleAccessibility}
    >
      <Accessibility size={21} />
      <span>{t("accessibility")}</span>
    </button>
    {accessibilityOpen && accessibilityPanel}
  </>
);
