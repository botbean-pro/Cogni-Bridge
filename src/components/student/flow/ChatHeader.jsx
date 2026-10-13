import React from "react";
import { History } from "lucide-react";
import { LogoImage } from "../../Brand";

export function ChatHeader({ t, onOpenHistory }) {
  return (
    <header className="ai-chat-header">
      <div className="ai-header-content">
        <div className="ai-header-icon"><LogoImage size={30} /></div>
        <div>
          <h2>{t("flow")}</h2>
          <p>{t("chatAssistant")}</p>
        </div>
      </div>
      <div className="ai-header-actions">
        <button type="button" className="ai-history-button" onClick={onOpenHistory}>
          <History size={16} />{t("chatHistory")}
        </button>
        <span className="ai-status"><span className="status-dot" />{t("readyToHelp")}</span>
      </div>
    </header>
  );
}
