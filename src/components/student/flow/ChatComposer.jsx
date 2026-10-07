import React from "react";
import { ChevronRight } from "lucide-react";

export function ChatComposer({ input, isLoading, onChange, onSubmit, t }) {
  return (
    <form className="ai-chat-input-form" onSubmit={onSubmit}>
      <div className="ai-input-wrapper">
        <input
          type="text"
          className="ai-chat-input"
          placeholder={t("askAnything")}
          value={input}
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading}
          aria-label={t("yourQuestion")}
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={!input.trim() || isLoading}
          aria-label={t("sendMessage")}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="ai-disclaimer">{t("aiDisclaimer")}</p>
    </form>
  );
}
