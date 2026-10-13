import React, { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, Settings, UserRound } from "lucide-react";

export const StudentTopBar = ({ signedIn, studentName, onLogin, onLogout, onOpenAccount, onOpenSettings, t }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  if (!signedIn) {
    return (
      <div className="student-rail-account">
        <button className="student-rail-link" onClick={onLogin} title={t("signIn")}>
          <LogIn size={18} /><span>{t("signIn")}</span>
        </button>
      </div>
    );
  }

  const choose = (action) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="student-rail-account student-rail-account-split" ref={menuRef}>
      <button className="student-rail-link student-rail-profile" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen} title={studentName}>
        <span className="avatar-small">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>
        <span>{studentName}</span>
      </button>
      <button className="student-rail-link student-rail-logout" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
        <LogOut size={18} /><span>{t("logOut")}</span>
      </button>
      {menuOpen && (
        <div className="student-profile-menu" role="menu">
          <button type="button" role="menuitem" onClick={choose(onOpenSettings)}><Settings size={16} /> {t("settings")}</button>
          <button type="button" role="menuitem" onClick={choose(onOpenAccount)}><UserRound size={16} /> {t("myAccount")}</button>
        </div>
      )}
    </div>
  );
};
