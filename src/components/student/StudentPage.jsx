import React, { useEffect, useState } from "react";
import { Accessibility, X } from "lucide-react";
import { classNames } from "../../constants";
import { AnimatedLogo } from "../Brand";
import { StudentSidebar, phoneBarTabs, studentRailItems } from "./StudentSidebar";
import { StudentTopBar } from "./StudentTopBar";
import { StudentNotifications, useStudentNotifications } from "./StudentNotifications";
import { StudentMoreSheet } from "./StudentMoreSheet";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const notifications = useStudentNotifications(studentId);
  const barTabs = phoneBarTabs(sensoryTrackerEnabled);
  // Tabs that sit behind the phone bar's "More" button (the whole rail on larger screens).
  const moreTabs = signedIn ? studentRailItems(true, sensoryTrackerEnabled).filter(([, tab]) => !barTabs.includes(tab)) : [];

  useEffect(() => { setMoreOpen(false); }, [activeTab, signedIn]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setSettingsOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  return <>
    {showIntro && (
      <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label={t("loadingCogniBridge")}>
        <AnimatedLogo />
        <p>CogniBridge</p>
      </div>
    )}
    <div className="student-app-shell">
      <aside className={`student-rail${accessibilityOpen ? " accessibility-open" : ""}${signedIn ? " is-student" : " is-guest"}`}>
        <StudentSidebar activeTab={activeTab} onNavigate={goToTab} signedIn={signedIn} sensoryTrackerEnabled={sensoryTrackerEnabled} isGrade12={isGrade12} moreOpen={moreOpen} moreBadge={notifications.unread} onToggleMore={() => setMoreOpen((open) => !open)} t={t} />
        <div className="student-rail-footer">
          {studentId && <StudentNotifications notifications={notifications} t={t} />}
          <button type="button" className="student-rail-link" data-accessibility-toggle onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
            <Accessibility size={19} /><span>{t("accessibility")}</span>
          </button>
          <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} onOpenAccount={onOpenAccount} onOpenSettings={() => setSettingsOpen(true)} t={t} />
        </div>
      </aside>
      <main className="main"><div className="route-transition" key={`${activeTab}-${signedIn ? "student" : "guest"}`}>{pageContent[activeTab === "about" ? "home" : activeTab]}</div></main>
    </div>
    {signedIn && (
      <StudentMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        tabs={moreTabs}
        activeTab={activeTab}
        isGrade12={isGrade12}
        onNavigate={goToTab}
        studentName={studentName}
        hasNotifications={Boolean(studentId)}
        unread={notifications.unread}
        onOpenNotifications={notifications.openPanel}
        onOpenAccessibility={onToggleAccessibility}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
        t={t}
      />
    )}
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
