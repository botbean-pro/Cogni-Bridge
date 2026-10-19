import React, { useState } from "react";
import { CalendarDays, Heart, Home, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { classNames } from "../../constants";
import { LogoImage } from "../Brand";

const items = [
  [Home, "overview", "parentOverview"],
  [Heart, "moods", "parentMoods"],
  [CalendarDays, "sessions", "sessions"],
  [MessageCircle, "teachers", "parentTeachers"],
  [Settings, "settings", "settings"],
];

// Same collapsible rail as the student sidebar (shares its student-rail-* styles).
export const ParentSidebar = ({ activeTab, onNavigate, t }) => {
  const [pinnedOpen, setPinnedOpen] = useState(false);

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
        {items.map(([Icon, tab, labelKey]) => (
          <button key={tab} type="button" className={classNames("student-rail-link", activeTab === tab && "active")} aria-current={activeTab === tab ? "page" : undefined} onClick={() => onNavigate(tab)} title={t(labelKey)}>
            <Icon size={20} /><span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
