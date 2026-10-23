import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { classNames } from "../../constants";

// Phone only: the bottom bar keeps a few tabs and its "More" button opens this sheet with the rest plus the
// account actions that sit in the side rail on larger screens. Shared by the student and mentor portals.
//   tabs:    [{ key, Icon, label, active, locked, title, to | onSelect }]  (`to` renders a router link)
//   actions: [{ key, Icon, label, onSelect, badge, danger, accessibilityToggle }]
//   returnFocus: selector of the More button, focused again when Escape closes the sheet.
export function RailMoreSheet({ open, onClose, tabs, actions, name, ariaLabel, returnFocus }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key !== "Escape") return;
      onClose();
      document.querySelector(returnFocus)?.focus();
    };
    document.addEventListener("keydown", close);
    sheetRef.current?.querySelector("a, button")?.focus();
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="student-more-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="student-more-sheet" role="dialog" aria-label={ariaLabel} ref={sheetRef}>
        <div className="student-more-grid">
          {tabs.map(({ key, Icon, label, active, locked, title, to, onSelect }) => {
            const props = {
              className: classNames("student-more-tile", active && "active", locked && "locked"),
              "aria-current": active ? "page" : undefined,
              "aria-disabled": locked || undefined,
              title: title || label,
            };
            const content = <><Icon size={22} />{locked && <LockKeyhole className="rail-lock-icon" size={11} />}<span>{label}</span></>;
            return to
              ? <Link key={key} {...props} to={to} onClick={onClose}>{content}</Link>
              // A locked tab does nothing, so the sheet stays open.
              : <button key={key} {...props} type="button" onClick={locked ? onSelect : () => { onClose(); onSelect?.(); }}>{content}</button>;
          })}
        </div>
        {name && <p className="student-more-name"><span className="avatar-small" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>{name}</p>}
        <ul className="student-more-actions">
          {actions.map(({ key, Icon, label, onSelect, badge, danger, accessibilityToggle }) => (
            <li key={key}>
              {/* Every action closes the sheet first, so the dialog or page it opens isn't left over a stale sheet. */}
              <button type="button" className={classNames("student-more-action", danger && "is-logout")} onClick={() => { onClose(); onSelect(); }} data-accessibility-toggle={accessibilityToggle ? "" : undefined}>
                <Icon size={19} /><span>{label}</span>
                {badge > 0 && <b className="student-more-badge" aria-label={String(badge)}>{badge}</b>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
