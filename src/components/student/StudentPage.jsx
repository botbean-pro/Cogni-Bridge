import React, { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";
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
  breakKey,
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
  const [moreOpen, setMoreOpen] = useState(false);
  const notifications = useStudentNotifications(studentId);
  const barTabs = phoneBarTabs(sensoryTrackerEnabled);
  // Tabs that sit behind the phone bar's "More" button (the whole rail on larger screens).
  const moreTabs = signedIn ? studentRailItems(true, sensoryTrackerEnabled).filter(([, tab]) => !barTabs.includes(tab)) : [];

  useEffect(() => { setMoreOpen(false); }, [activeTab, signedIn]);

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
          {signedIn && <StudentNotifications notifications={notifications} breakKey={breakKey} t={t} />}
          <button type="button" className="student-rail-link" data-accessibility-toggle onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
            <Accessibility size={19} /><span>{t("accessibility")}</span>
          </button>
          <StudentTopBar signedIn={signedIn} studentName={studentName} onLogin={onLogin} onLogout={onLogout} onOpenAccount={onOpenAccount} onOpenSettings={() => goToTab("settings")} t={t} />
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
        hasNotifications
        unread={notifications.unread}
        onOpenNotifications={notifications.openPanel}
        onOpenAccessibility={onToggleAccessibility}
        onOpenSettings={() => goToTab("settings")}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
        t={t}
      />
    )}
    {accessibilityOpen && accessibilityPanel}
  </>
};
