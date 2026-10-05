import React from "react";
import { LogIn, LogOut } from "lucide-react";

export const StudentTopBar = ({ signedIn, studentName, onLogin, onLogout }) => (
  <div className="top-actions">
    {signedIn ? (
      <button className="profile-chip" onClick={onLogout}>
        <span className="avatar-small">{studentName?.charAt(0)?.toUpperCase() || "S"}</span>
        {studentName}
        <LogOut size={16} />
      </button>
    ) : (
      <button className="login-button" onClick={onLogin}>
        <LogIn size={18} />
        Sign in
      </button>
    )}
  </div>
);