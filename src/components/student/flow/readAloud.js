import { fetchWithAuth, speechLanguages } from "./flowApi";

// Languages ElevenLabs voices (must match api/tts.js); the rest use the browser's own voice.
const elevenLabsLanguages = new Set(["English", "French", "German", "Hindi"]);
const MAX_TEXT_LENGTH = 5000;
// Room for hovered button labels as well as replies.
const MAX_CACHED_CLIPS = 60;

const audioCache = new Map();
let currentAudio = null;
let playToken = 0;
let activeKind = null;
let labelsMuted = false;

const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

const TIME = /\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*([AaPp])\.?\s*[Mm]\b\.?)?/g;

// Voices read "4:00" as "four hundred", so spell times out: 4:00 → "4 o'clock", 16:00 → "4 PM", 4:05 → "4 oh 5".
function speakTime(_, hours, minutes, meridiem) {
  let hour = Number(hours);
  let suffix = meridiem ? `${meridiem.toUpperCase()}M` : "";
  if (!suffix && (hour > 12 || hour === 0)) suffix = hour >= 12 ? "PM" : "AM";
  if (suffix) hour = hour % 12 || 12;
  const minute = Number(minutes);
  if (!minute) return suffix ? `${hour} ${suffix}` : `${hour} o'clock`;
  return `${hour} ${minute < 10 ? `oh ${minute}` : minute}${suffix ? ` ${suffix}` : ""}`;
}

// Only English gets spelled-out times; other languages keep the digits.
export const toSpeechText = (text, language = "English") => String(text || "")
  .replace(/```[\s\S]*?```/g, " ")
  .replace(/(\d{1,2}:\d{2}(?:\s*[AaPp]\.?\s*[Mm]\.?)?)\s*[-–]\s*(?=\d{1,2}:\d{2})/g, language === "English" ? "$1 to " : "$&")
  .replace(TIME, (...match) => (language === "English" ? speakTime(...match) : match[0]))
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/^\s*[-*]\s+/gm, "")
  .replace(/[*_`#]/g, "")
  .trim()
  .slice(0, MAX_TEXT_LENGTH);

export function stopSpeaking() {
  playToken += 1;
  activeKind = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Hover reading checks these so it never cuts off a reply, or a label mid-word.
export const isReadingReply = () => activeKind === "reply";
export const isSpeaking = () => activeKind !== null;

// Voice input mutes hover labels so the microphone doesn't record them.
export function muteLabels(muted) {
  labelsMuted = muted;
}

export function setSpeakingVolume(volume) {
  if (currentAudio) currentAudio.volume = volume;
}

// Cached so replaying a reply doesn't spend ElevenLabs credits again.
async function elevenLabsClip(text, language) {
  const key = `${language}:${text}`;
  if (audioCache.has(key)) return audioCache.get(key);
  const response = await fetchWithAuth("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Read aloud is unavailable (${response.status}): ${data.error || "unknown error"}`);
  }
  const url = URL.createObjectURL(await response.blob());
  audioCache.set(key, url);
  if (audioCache.size > MAX_CACHED_CLIPS) {
    const [oldestKey, oldestUrl] = audioCache.entries().next().value;
    URL.revokeObjectURL(oldestUrl);
    audioCache.delete(oldestKey);
  }
  return url;
}

function speakWithBrowser(text, language, volume, token, onEnd) {
  if (!speechSupported()) {
    console.error("Read aloud: this browser has no speech synthesis");
    onEnd?.();
    return;
  }
  // Long utterances get cut off in some browsers, so read sentence by sentence.
  const sentences = (text.match(/[^.!?।\n]+[.!?।]*/g) || [text]).map((part) => part.trim()).filter(Boolean);
  sentences.forEach((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = speechLanguages[language] || "en-IN";
    utterance.rate = 0.92;
    utterance.volume = volume;
    if (index === sentences.length - 1) utterance.onend = () => { if (token === playToken) onEnd?.(); };
    utterance.onerror = (event) => {
      console.error("Read aloud: browser voice failed", event.error);
      if (token === playToken) onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  });
}

export async function speak(text, { language = "English", volume = 1, kind = "reply", onEnd: onFinish } = {}) {
  if (labelsMuted && kind === "label") return;
  stopSpeaking();
  const token = playToken;
  activeKind = kind;
  const onEnd = () => {
    activeKind = null;
    onFinish?.();
  };
  const spoken = toSpeechText(text, language);
  if (!spoken) {
    onEnd();
    return;
  }

  if (elevenLabsLanguages.has(language)) {
    try {
      const url = await elevenLabsClip(spoken, language);
      if (token !== playToken) return;
      const audio = new Audio(url);
      audio.volume = volume;
      audio.onended = () => {
        if (token !== playToken) return;
        currentAudio = null;
        onEnd?.();
      };
      currentAudio = audio;
      await audio.play();
      return;
    } catch (error) {
      console.error("Read aloud: ElevenLabs playback failed, using the browser voice", error);
      if (token !== playToken) return;
      currentAudio = null;
    }
  }
  speakWithBrowser(spoken, language, volume, token, onEnd);
}
