import React from "react";
import { LogIn, LogOut, Settings } from "lucide-react";

export const StudentTopBar = ({ signedIn, activeTab, studentName, onLogin, onLogout, onSettings, t }) => (
  <div className="top-actions">
    {signedIn ? (
      <>
        <button
          className={`settings-button${activeTab === "settings" ? " active" : ""}`}
          onClick={onSettings}
          aria-label={t("settings")}
          aria-current={activeTab === "settings" ? "page" : undefined}
          title={t("settings")}
        >
          <Settings size={18} aria-hidden="true" />
        </button>
        <button className="profile-chip" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
          <span className="avatar-small">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>
          {studentName}
          <LogOut size={16} />
        </button>
      </>
    ) : (
      <button className="login-button" onClick={onLogin}>
        <LogIn size={18} />
        {t("signIn")}
      </button>
    )}
  </div>
);