import React, { useRef } from "react";
import { ChevronRight, Paperclip } from "lucide-react";
import { acceptedDocumentTypes } from "./documentText";

export function ChatComposer({ input, isLoading, disabled = false, onChange, onSubmit, onAttach, t }) {
  const fileRef = useRef(null);
  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onAttach(file);
  };

  return (
    <form className="ai-chat-input-form" onSubmit={onSubmit}>
      <div className="ai-input-wrapper">
        {onAttach && (
          <>
            <input ref={fileRef} type="file" accept={acceptedDocumentTypes} onChange={chooseFile} hidden />
            <button
              type="button"
              className="ai-attach-btn"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading || disabled}
              aria-label={t("docAttach")}
              title={t("docAttach")}
            >
              <Paperclip size={18} />
            </button>
          </>
        )}
        <input
          type="text"
          className="ai-chat-input"
          placeholder={t("askAnything")}
          value={input}
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading || disabled}
          aria-label={t("yourQuestion")}
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={!input.trim() || isLoading || disabled}
          aria-label={t("sendMessage")}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="ai-disclaimer">{t("aiDisclaimer")}</p>
    </form>
  );
}
