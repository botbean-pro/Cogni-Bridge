import React from "react";
import { LogIn, LogOut } from "lucide-react";

export const StudentTopBar = ({ signedIn, studentName, onLogin, onLogout, t }) => (
  <div className="top-actions">
    {signedIn ? (
      <button className="profile-chip" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
        <span className="avatar-small">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>
        {studentName}
        <LogOut size={16} />
      </button>
    ) : (
      <button className="login-button" onClick={onLogin}>
        <LogIn size={18} />
        {t("signIn")}
      </button>
    )}
  </div>
);