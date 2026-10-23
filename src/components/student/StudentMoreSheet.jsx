import React from "react";
import { Accessibility, Bell, LogOut, Settings, UserRound } from "lucide-react";
import { studentTabPaths } from "../../routes";
import { RailMoreSheet } from "../shared/RailMoreSheet";
import { railLabel } from "./StudentSidebar";

// The student phone bar's "More" sheet: the tabs that don't fit on the bar plus the account actions.
export function StudentMoreSheet({
  open, onClose, tabs, activeTab, isGrade12, onNavigate, studentName, hasNotifications, unread,
  onOpenNotifications, onOpenAccessibility, onOpenSettings, onOpenAccount, onLogout, t,
}) {
  return (
    <RailMoreSheet
      open={open}
      onClose={onClose}
      ariaLabel={t("more")}
      returnFocus=".student-rail-more"
      name={studentName}
      tabs={tabs.map(([Icon, tab]) => {
        const locked = tab === "careers" && !isGrade12;
        const label = railLabel(t, tab);
        return { key: tab, Icon, label, active: activeTab === tab, locked, title: locked ? t("career_locked") : label, to: locked ? undefined : studentTabPaths[tab], onSelect: () => onNavigate(tab) };
      })}
      actions={[
        ...(hasNotifications ? [{ key: "notifications", Icon: Bell, label: t("ps_bell"), onSelect: onOpenNotifications, badge: unread }] : []),
        { key: "accessibility", Icon: Accessibility, label: t("accessibility"), onSelect: onOpenAccessibility, accessibilityToggle: true },
        { key: "settings", Icon: Settings, label: t("settings"), onSelect: onOpenSettings },
        { key: "account", Icon: UserRound, label: t("myAccount"), onSelect: onOpenAccount },
        { key: "logout", Icon: LogOut, label: t("logOut"), onSelect: onLogout, danger: true },
      ]}
    />
  );
}
