import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { speechLanguages } from "./flowApi";

const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Long utterances get cut off in some browsers, so the script is read sentence by sentence.
const splitSentences = (script) => (script.match(/[^.!?।\n]+[.!?।]*/g) || [script])
  .map((sentence) => sentence.trim())
  .filter(Boolean);

// Inline audio player shown inside a chat message once the AI has turned notes into a script.
export function AudioPlayer({ script, language, t }) {
  const [status, setStatus] = useState("ready"); // ready | playing | paused
  const [error, setError] = useState("");
  const playToken = useRef(0);

  const stop = () => {
    playToken.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
  };

  useEffect(() => stop, []);

  const play = () => {
    if (!speechSupported || !script) return;
    stop();
    const lang = speechLanguages[language] || "en-IN";
    const voices = window.speechSynthesis.getVoices();
    if (voices.length && !voices.some((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2)))) {
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

  const active = status !== "ready";

  return (
    <div className="audio-player">
      <div className="audio-controls">
        {!active
          ? <button type="button" onClick={play} disabled={!speechSupported}><Play size={16} /> {t("audioPlay")}</button>
          : <button type="button" onClick={togglePause}>{status === "playing" ? <><Pause size={16} /> {t("audioPause")}</> : <><Play size={16} /> {t("audioPlay")}</>}</button>}
        <button type="button" onClick={stopPlayback} disabled={!active}><Square size={14} /> {t("audioStop")}</button>
      </div>
      {error && <p className="audio-notes-error" role="alert">{error}</p>}
      {!speechSupported && <p className="audio-notes-error" role="alert">{t("audioUnsupported")}</p>}
      <p className="audio-script">{script}</p>
    </div>
  );
}
