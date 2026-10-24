import React, { useState } from "react";
import { CalendarDays, Ellipsis, Heart, Home, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { classNames } from "../../constants";
import { LogoImage } from "../Brand";
import { usePageTitle } from "../../pageTitle";
import { useActiveTabInView } from "../../useRailScroll";

export const parentRailItems = [
  [Home, "overview", "parentOverview"],
  [Heart, "moods", "parentMoods"],
  [CalendarDays, "sessions", "sessions"],
  [MessageCircle, "teachers", "parentTeachers"],
  [Settings, "settings", "settings"],
];

// The phone bar keeps these tabs; the rest, accessibility and log out sit behind "More".
export const parentBarTabs = ["overview", "moods", "sessions", "teachers"];

// Same collapsible rail as the student sidebar (shares its student-rail-* styles).
export const ParentSidebar = ({ activeTab, onNavigate, moreOpen, onToggleMore, t }) => {
  usePageTitle(t("pt_parent"), t(parentRailItems.find(([, tab]) => tab === activeTab)?.[2] || "parentOverview"));
  const [pinnedOpen, setPinnedOpen] = useState(false);
  useActiveTabInView(activeTab);

  return (
    <div className={classNames("student-sidebar", pinnedOpen && "pinned-open")}>
      <div className="student-rail-brand">
        <span className="student-rail-logo"><LogoImage size={42} /></span>
        <span className="student-rail-brand-copy"><strong>CogniBridge</strong><small>{t("parentSpace")}</small></span>
        <button type="button" className="student-rail-toggle" onClick={() => setPinnedOpen((open) => !open)} aria-label={pinnedOpen ? "Collapse navigation" : "Expand navigation"} aria-expanded={pinnedOpen}>
          {pinnedOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
      <nav className="student-rail-nav" aria-label={t("mainNavigation")}>
        {parentRailItems.map(([Icon, tab, labelKey]) => (
          <button key={tab} type="button" className={classNames("student-rail-link", activeTab === tab && "active", !parentBarTabs.includes(tab) && "rail-secondary")} aria-current={activeTab === tab ? "page" : undefined} onClick={() => onNavigate(tab)} title={t(labelKey)}>
            <Icon size={20} /><span>{t(labelKey)}</span>
          </button>
        ))}
        <button type="button" className={classNames("student-rail-link", "student-rail-more", (moreOpen || !parentBarTabs.includes(activeTab)) && "active")} onClick={onToggleMore} aria-haspopup="dialog" aria-expanded={Boolean(moreOpen)} title={t("more")}>
          <Ellipsis size={20} /><span>{t("more")}</span>
        </button>
      </nav>
    </div>
  );
};
