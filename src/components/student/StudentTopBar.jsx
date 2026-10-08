import React from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";

export const StudentTopBar = ({ signedIn, studentName, onLogin, onLogout, onOpenAccount, t }) => (
  <div className="student-rail-account">
    {signedIn ? (
      <>
        <button className="student-rail-link" onClick={onOpenAccount} aria-label={t("myAccount")} title={t("myAccount")}>
          <UserRound size={19} /><span>{t("myAccount")}</span>
        </button>
        <button className="student-rail-link student-rail-logout" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
          <span className="avatar-small">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>
          <span>{studentName}</span>
          <LogOut size={16} className="student-rail-logout-icon" />
        </button>
      </>
    ) : (
      <button className="student-rail-link" onClick={onLogin} title={t("signIn")}>
        <LogIn size={18} /><span>{t("signIn")}</span>
      </button>
    )}
  </div>
);
