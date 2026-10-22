import { useEffect, useRef, useState } from "react";
import { transcribeSpeech } from "./flowApi";
import { muteLabels, stopSpeaking } from "./readAloud";

const MAX_RECORDING_MS = 60_000;

export const voiceInputSupported = typeof window !== "undefined"
  && Boolean(navigator.mediaDevices?.getUserMedia)
  && typeof window.MediaRecorder !== "undefined";

// Records the student's voice, then hands the transcribed text to onText.
// status: "idle" | "starting" | "recording" | "transcribing"; error is a catalog key.
export function useVoiceInput({ language, onText }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const release = () => {
    window.clearTimeout(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    muteLabels(false);
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.onstop = null;
    release();
  }, []);

  const start = async () => {
    setError("");
    setStatus("starting");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (micError) {
      console.error("Voice input: microphone unavailable", micError);
      setError("voiceInputNoMic");
      setStatus("idle");
      return;
    }
    // Stop any reading so the microphone only hears the student.
    stopSpeaking();
    muteLabels(true);
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      release();
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) {
        setStatus("idle");
        return;
      }
      setStatus("transcribing");
      try {
        const text = await transcribeSpeech(blob, language);
        if (text) onTextRef.current(text);
        else setError("voiceInputError");
      } catch (transcribeError) {
        console.error("Voice input: transcription failed", transcribeError);
        setError("voiceInputError");
      } finally {
        setStatus("idle");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    timerRef.current = window.setTimeout(() => recorder.state === "recording" && recorder.stop(), MAX_RECORDING_MS);
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const toggle = () => {
    if (status === "recording") stop();
    else if (status === "idle") start();
  };

  return { status, error, toggle };
}
