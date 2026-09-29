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
      <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label="Loading CogniBridge">
        <AnimatedLogo />
        <p>CogniBridge</p>
      </div>
    )}
    <header className="sidebar">
      <StudentSidebar activeTab={activeTab} onNavigate={goToTab} />
      <StudentTopBar signedIn={signedIn} onLogin={onLogin} onLogout={onLogout} />
    </header>
    <main className="main">{pageContent[activeTab]}</main>
    <button className="accessibility-tab" aria-label="Open accessibility options" onClick={onToggleAccessibility}>
      <Accessibility size={21} />
      <span>Accessibility</span>
    </button>
    {accessibilityOpen && accessibilityPanel}
  </>
);