import { fetchWithAuth, speechLanguages } from '../flow/flowApi';

const ttsLanguages = { English: 'English', Hindi: 'Hindi' };
let currentAudio = null;
let currentUrl = null;
let requestId = 0;

function clearCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

function speakWithSystemVoice(text, locale) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.76;
  utterance.pitch = 0.82;
  utterance.volume = 0.42;
  window.speechSynthesis.speak(utterance);
}

// Quiet Corner playback owns its audio element so changing app pages cannot stop it.
export async function speakQuietInstructions(text, locale) {
  const id = ++requestId;
  clearCurrentAudio();
  const normalizedLocale = String(locale || 'en-IN').toLowerCase();
  const languageName = normalizedLocale.startsWith('hi') ? ttsLanguages.Hindi
    : normalizedLocale.startsWith('en') ? ttsLanguages.English
      : null;

  if (!languageName) {
    speakWithSystemVoice(text, locale || speechLanguages.English);
    return;
  }

  try {
    const response = await fetchWithAuth('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: languageName }),
    });
    if (!response.ok) throw new Error('Quiet Corner voice service is unavailable.');
    const url = URL.createObjectURL(await response.blob());
    if (id !== requestId) {
      URL.revokeObjectURL(url);
      return;
    }

    const audio = new Audio(url);
    audio.volume = 0.48;
    audio.playbackRate = 0.9;
    audio.onended = audio.onerror = () => {
      if (currentAudio === audio) clearCurrentAudio();
    };
    currentUrl = url;
    currentAudio = audio;
    await audio.play();
  } catch {
    if (id === requestId) speakWithSystemVoice(text, locale || speechLanguages.English);
  }
}
