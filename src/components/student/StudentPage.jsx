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
  sensoryTrackerEnabled,
  isGrade12,
  studentName,
  t,
  onLogin,
  onLogout,
  onOpenAccount,
  showIntro,
  introExiting,
  pageContent,
  accessibilityOpen,
  onToggleAccessibility,
  accessibilityPanel,
}) => {
  return <>
    <MouseTrail />
    {showIntro && (
      <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label={t("loadingCogniBridge")}>
        <AnimatedLogo />
        <p>CogniBridge</p>
      </div>
    )}
    <div className="student-app-shell">
      <aside className={`student-rail${accessibilityOpen ? " accessibility-open" : ""}`}>
        <StudentSidebar activeTab={activeTab} onNavigate={goToTab} signedIn={signedIn} sensoryTrackerEnabled={sensoryTrackerEnabled} isGrade12={isGrade12} t={t} />
        <div className="student-rail-footer">
          <button type="button" className="student-rail-link" onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
            <Accessibility size={19} /><span>{t("accessibility")}</span>
          </button>
          <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} onOpenAccount={onOpenAccount} t={t} />
        </div>
      </aside>
      <main className="main"><div className="route-transition" key={`${activeTab}-${signedIn ? "student" : "guest"}`}>{pageContent[activeTab === "about" ? "home" : activeTab]}</div></main>
    </div>
    {accessibilityOpen && accessibilityPanel}
  </>
};
