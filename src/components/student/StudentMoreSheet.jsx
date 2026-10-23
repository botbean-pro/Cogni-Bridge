import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Accessibility, Bell, LockKeyhole, LogOut, Settings, UserRound } from "lucide-react";
import { classNames } from "../../constants";
import { studentTabPaths } from "../../routes";
import { railLabel } from "./StudentSidebar";

// Phone only: the bottom bar keeps four tabs, and this sheet (opened by its "More" button) holds the
// other tabs plus the account actions that sit in the side rail on larger screens.
export function StudentMoreSheet({
  open, onClose, tabs, activeTab, isGrade12, onNavigate, studentName, hasNotifications, unread,
  onOpenNotifications, onOpenAccessibility, onOpenSettings, onOpenAccount, onLogout, t,
}) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key !== "Escape") return;
      onClose();
      document.querySelector(".student-rail-more")?.focus();
    };
    document.addEventListener("keydown", close);
    sheetRef.current?.querySelector("a, button")?.focus();
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  if (!open) return null;

  // Every action closes the sheet first, so the dialog or page it opens isn't left over a stale sheet.
  const run = (action) => () => { onClose(); action(); };
  const actions = [
    ...(hasNotifications ? [[Bell, "ps_bell", onOpenNotifications, unread]] : []),
    [Accessibility, "accessibility", onOpenAccessibility],
    [Settings, "settings", onOpenSettings],
    [UserRound, "myAccount", onOpenAccount],
    [LogOut, "logOut", onLogout, 0, "is-logout"],
  ];

  return (
    <>
      <div className="student-more-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="student-more-sheet" role="dialog" aria-label={t("more")} ref={sheetRef}>
        <div className="student-more-grid">
          {tabs.map(([Icon, tab]) => {
            const careerLocked = tab === "careers" && !isGrade12;
            const label = railLabel(t, tab);
            const props = {
              className: classNames("student-more-tile", activeTab === tab && "active", careerLocked && "locked"),
              "aria-current": activeTab === tab ? "page" : undefined,
              "aria-disabled": careerLocked || undefined,
              title: careerLocked ? t("career_locked") : label,
            };
            const content = <><Icon size={22} />{careerLocked && <LockKeyhole className="rail-lock-icon" size={11} />}<span>{label}</span></>;
            return careerLocked
              ? <button key={tab} {...props} type="button" onClick={() => onNavigate(tab)}>{content}</button>
              : <Link key={tab} {...props} to={studentTabPaths[tab]} onClick={onClose}>{content}</Link>;
          })}
        </div>
        <p className="student-more-name"><span className="avatar-small" aria-hidden="true">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>{studentName}</p>
        <ul className="student-more-actions">
          {actions.map(([Icon, labelKey, action, badge, extra]) => (
            <li key={labelKey}>
              <button type="button" className={classNames("student-more-action", extra)} onClick={run(action)} data-accessibility-toggle={labelKey === "accessibility" ? "" : undefined}>
                <Icon size={19} /><span>{t(labelKey)}</span>
                {badge > 0 && <b className="student-more-badge" aria-label={String(badge)}>{badge}</b>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
