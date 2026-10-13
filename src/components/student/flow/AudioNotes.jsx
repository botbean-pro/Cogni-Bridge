import React, { useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, Square, X } from "lucide-react";
import { askLearningAssistant, speechLanguages } from "./flowApi";

const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Long utterances get cut off in some browsers, so the script is read sentence by sentence.
const splitSentences = (script) => (script.match(/[^.!?।\n]+[.!?।]*/g) || [script])
  .map((sentence) => sentence.trim())
  .filter(Boolean);

export function AudioNotes({ language, onClose, t }) {
  const [notes, setNotes] = useState("");
  const [script, setScript] = useState("");
  const [status, setStatus] = useState("idle"); // idle | converting | ready | playing | paused
  const [error, setError] = useState("");
  const playToken = useRef(0);

  const stop = () => {
    playToken.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
  };

  useEffect(() => stop, []);

  const convert = async (event) => {
    event.preventDefault();
    if (!notes.trim() || status === "converting") return;
    stop();
    setStatus("converting");
    setError("");
    setScript("");
    try {
      setScript(await askLearningAssistant([{ role: "user", content: notes.trim() }], "audio", language));
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("idle");
    }
  };

  const play = () => {
    if (!speechSupported || !script) return;
    stop();
    const lang = speechLanguages[language] || "en-IN";
    const hasVoice = window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    if (!hasVoice && window.speechSynthesis.getVoices().length) {
      setError(t("audioNoVoice"));
      return;
    }
    setError("");

    const token = playToken.current;
    const sentences = splitSentences(script);
    sentences.forEach((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = lang;
      utterance.rate = 0.92;
      if (index === sentences.length - 1) {
        utterance.onend = () => { if (playToken.current === token) setStatus("ready"); };
      }
      utterance.onerror = () => { if (playToken.current === token) setStatus("ready"); };
      window.speechSynthesis.speak(utterance);
    });
    setStatus("playing");
  };

  const togglePause = () => {
    if (status === "playing") {
      window.speechSynthesis.pause();
      setStatus("paused");
    } else {
      window.speechSynthesis.resume();
      setStatus("playing");
    }
  };

  const stopPlayback = () => {
    stop();
    setStatus("ready");
  };

  const active = status === "playing" || status === "paused";

  return (
    <section className="audio-notes" aria-label={t("notesToAudio")}>
      <div className="audio-notes-header">
        <strong><Headphones size={17} /> {t("notesToAudio")}</strong>
        <button type="button" className="audio-notes-close" onClick={() => { stop(); onClose(); }} aria-label={t("close")}><X size={17} /></button>
      </div>
      <p className="audio-notes-hint">{t("audioNotesHint")}</p>
      <form onSubmit={convert}>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("audioNotesPlaceholder")}
          maxLength={4000}
          rows={5}
          aria-label={t("notesToAudio")}
        />
        <button type="submit" className="audio-convert-btn" disabled={!notes.trim() || status === "converting"}>
          {status === "converting" ? <><Loader2 size={16} className="audio-spin" /> {t("audioConverting")}</> : t("convertToAudio")}
        </button>
      </form>
      {error && <p className="audio-notes-error" role="alert">{error}</p>}
      {!speechSupported && <p className="audio-notes-error" role="alert">{t("audioUnsupported")}</p>}
      {script && (
        <div className="audio-player">
          <div className="audio-controls">
            {!active
              ? <button type="button" onClick={play} disabled={!speechSupported}><Play size={16} /> {t("audioPlay")}</button>
              : <button type="button" onClick={togglePause}>{status === "playing" ? <><Pause size={16} /> {t("audioPause")}</> : <><Play size={16} /> {t("audioPlay")}</>}</button>}
            <button type="button" onClick={stopPlayback} disabled={!active}><Square size={14} /> {t("audioStop")}</button>
          </div>
          <p className="audio-script">{script}</p>
        </div>
      )}
    </section>
  );
}
