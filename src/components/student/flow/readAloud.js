import { fetchWithAuth, speechLanguages } from "./flowApi";

// Languages ElevenLabs voices (must match api/tts.js); the rest use the browser's own voice.
const elevenLabsLanguages = new Set(["English", "French", "German", "Hindi"]);
const MAX_TEXT_LENGTH = 1200;
const MAX_CACHED_CLIPS = 20;

const audioCache = new Map();
let currentAudio = null;
let playToken = 0;

const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export const toSpeechText = (text) => String(text || "")
  .replace(/```[\s\S]*?```/g, " ")
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/^\s*[-*]\s+/gm, "")
  .replace(/[*_`#]/g, "")
  .trim()
  .slice(0, MAX_TEXT_LENGTH);

export function stopSpeaking() {
  playToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (speechSupported()) window.speechSynthesis.cancel();
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
  if (!response.ok) throw new Error("Read aloud is unavailable.");
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
    utterance.onerror = () => { if (token === playToken) onEnd?.(); };
    window.speechSynthesis.speak(utterance);
  });
}

export async function speak(text, { language = "English", volume = 1, onEnd } = {}) {
  stopSpeaking();
  const token = playToken;
  const spoken = toSpeechText(text);
  if (!spoken) {
    onEnd?.();
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
    } catch {
      if (token !== playToken) return;
      currentAudio = null;
    }
  }
  speakWithBrowser(spoken, language, volume, token, onEnd);
}
