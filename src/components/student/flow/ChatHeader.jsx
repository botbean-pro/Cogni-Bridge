import React from "react";
import { LogoImage } from "../../Brand";

export function ChatHeader({ t }) {
  return (
    <header className="ai-chat-header">
      <div className="ai-header-content">
        <div className="ai-header-icon"><LogoImage size={30} /></div>
        <div>
          <h2>Cogni-Flow AI</h2>
          <p>{t("chatAssistant")}</p>
        </div>
      </div>
      <span className="ai-status"><span className="status-dot" />{t("readyToHelp")}</span>
    </header>
  );
}
