import React, { useEffect, useState } from "react";
import { Accessibility, X } from "lucide-react";
import { classNames } from "../../constants";
import { AnimatedLogo, MouseTrail } from "../Brand";
import { StudentSidebar } from "./StudentSidebar";
import { StudentTopBar } from "./StudentTopBar";
import { StudentNotifications } from "./StudentNotifications";
import { CalmCorner } from "./pages/SensoryTrackerPage";

export const StudentPage = ({
  activeTab,
  goToTab,
  signedIn,
  sensoryTrackerEnabled,
  isGrade12,
  studentName,
  studentId,
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
  const [calmCornerOpen, setCalmCornerOpen] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSettingsOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

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
        <StudentSidebar activeTab={activeTab} onNavigate={goToTab} signedIn={signedIn} sensoryTrackerEnabled={sensoryTrackerEnabled} isGrade12={isGrade12} t={t} onOpenCalm={() => { setBreathingOpen(false); setCalmCornerOpen(true); }} />
        <div className="student-rail-footer">
          {studentId && <StudentNotifications studentId={studentId} t={t} />}
          <button type="button" className="student-rail-link" data-accessibility-toggle onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
            <Accessibility size={19} /><span>{t("accessibility")}</span>
          </button>
          <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} onOpenAccount={onOpenAccount} onOpenSettings={() => setSettingsOpen(true)} t={t} />
        </div>
      </aside>
      <main className="main">{pageContent[activeTab === "about" ? "home" : activeTab]}</main>
    </div>
    {calmCornerOpen && <div className="student-calm-overlay" role="dialog" aria-modal="true" aria-label={breathingOpen ? t("sn_breathingEx") : t("sn_calmTitle")}><div className="student-calm-dialog"><button className="student-calm-dismiss" type="button" onClick={() => setCalmCornerOpen(false)} aria-label={t("close")}><X size={20} /></button><CalmCorner startBreathing={breathingOpen} onClose={() => setCalmCornerOpen(false)} t={t} /></div></div>}
    {settingsOpen && (
      <div className="student-calm-overlay" role="dialog" aria-modal="true" aria-label={t("settings")} onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <div className="student-calm-dialog student-settings-dialog">
          <button className="student-calm-dismiss" type="button" onClick={() => setSettingsOpen(false)} aria-label={t("close")}><X size={20} /></button>
          {pageContent.settings}
        </div>
      </div>
    )}
    {accessibilityOpen && accessibilityPanel}
  </>
};
