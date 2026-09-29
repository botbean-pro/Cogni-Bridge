import React from "react";
import { navigation, classNames } from "../../constants";
import { LogoImage } from "../Brand";

export const StudentSidebar = ({ activeTab, onNavigate }) => (
  <div className="student-sidebar">
    <div className="brand">
      <div className="brand-mark"><LogoImage size={30} /></div>
      <div className="brand-copy">
        <strong>CogniBridge</strong>
        <span>Learn together</span>
      </div>
    </div>
    <nav className="nav" aria-label="Main navigation">
      {navigation.map(([Icon, label, tab]) => (
        <button key={label} className={classNames("nav-item", activeTab === tab && "active")} onClick={() => onNavigate(tab)}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  </div>
);