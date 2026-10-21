import React from "react";
import { ChevronRight, Loader2, Mic, Square } from "lucide-react";
import { useVoiceInput, voiceInputSupported } from "./useVoiceInput";

export function ChatComposer({ input, isLoading, disabled = false, language, onChange, onSubmit, onVoiceText, t }) {
  const voice = useVoiceInput({ language, onText: onVoiceText });
  const recording = voice.status === "recording";
  const voiceBusy = voice.status === "starting" || voice.status === "transcribing";
  const voiceStatus = recording ? t("voiceInputListening") : voice.status === "transcribing" ? t("voiceInputTranscribing") : "";

  return (
    <form className="ai-chat-input-form" onSubmit={onSubmit}>
      <div className="ai-input-wrapper">
        {voiceInputSupported && (
          <button
            type="button"
            className={`ai-mic-btn${recording ? " recording" : ""}`}
            onClick={voice.toggle}
            disabled={voiceBusy || ((isLoading || disabled) && !recording)}
            aria-pressed={recording}
            aria-label={recording ? t("voiceInputStop") : t("voiceInputStart")}
            title={recording ? t("voiceInputStop") : t("voiceInputStart")}
          >
            {voiceBusy ? <Loader2 size={20} className="spin" /> : recording ? <Square size={18} /> : <Mic size={20} />}
          </button>
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
      {(voiceStatus || voice.error) && (
        <p className={`ai-voice-status${voice.error ? " error" : ""}`} role={voice.error ? "alert" : "status"}>
          {voice.error ? t(voice.error) : voiceStatus}
        </p>
      )}
      <p className="ai-disclaimer">{t("aiDisclaimer")}</p>
    </form>
  );
}
