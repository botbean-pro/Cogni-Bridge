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
}) => (
  <>
    <MouseTrail />
    {showIntro && (
      <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label={t("loadingCogniBridge")}>
        <AnimatedLogo />
        <p>CogniBridge</p>
      </div>
    )}
    <div className="student-app-shell">
      <aside className="student-rail">
        <StudentSidebar activeTab={activeTab} onNavigate={goToTab} signedIn={signedIn} isGrade12={isGrade12} t={t} />
        <div className="student-rail-footer">
          <button type="button" className="student-rail-link" onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
            <Accessibility size={19} /><span>{t("accessibility")}</span>
          </button>
          <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} onOpenAccount={onOpenAccount} t={t} />
        </div>
      </aside>
      <main className="main">{pageContent[activeTab === "about" ? "home" : activeTab]}</main>
    </div>
    {accessibilityOpen && accessibilityPanel}
  </>
);
