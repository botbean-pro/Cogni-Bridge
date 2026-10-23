import { createClient } from "@supabase/supabase-js";

// Base64 audio, kept under Vercel's 4.5 MB request limit (about a minute of browser-recorded speech).
const MAX_AUDIO_BASE64_LENGTH = 4_000_000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// ElevenLabs Scribe language codes for the chat's response languages.
const languageCodes = {
  English: "en", Hindi: "hi", Bengali: "bn", Telugu: "te", Marathi: "mr", Tamil: "ta",
  Gujarati: "gu", Kannada: "kn", Malayalam: "ml", Punjabi: "pa", French: "fr", German: "de",
};

async function isSignedIn(request) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Only POST requests are supported." });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Voice input is not configured." });

  const { audio, mimeType = "audio/webm", language = "English" } = request.body || {};
  if (typeof audio !== "string" || !audio || audio.length > MAX_AUDIO_BASE64_LENGTH || !/^audio\/[\w.+-]+(;.*)?$/.test(mimeType)) {
    return response.status(400).json({ error: "A short audio recording is required." });
  }

  // Without Supabase (demo mode) there are no accounts to check, matching /api/chat.
  if (supabaseUrl && supabaseAnonKey && !(await isSignedIn(request))) {
    return response.status(401).json({ error: "Sign in to use voice input." });
  }

  const form = new FormData();
  form.append("model_id", "scribe_v2");
  if (languageCodes[language]) form.append("language_code", languageCodes[language]);
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([Buffer.from(audio, "base64")], { type: mimeType.split(";")[0] }), "speech.webm");

  try {
    const upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
    if (!upstream.ok) {
      // ElevenLabs says why (bad key, missing permission, unreadable audio); log it so it isn't a mystery.
      const reason = (await upstream.json().catch(() => ({}))).detail?.message;
      console.error(`ElevenLabs STT ${upstream.status}: ${reason || "no reason given"}`);
      return response.status(upstream.status === 401 ? 503 : 502).json({ error: `The voice provider rejected the recording.${reason ? ` ${reason}` : ""}` });
    }
    const data = await upstream.json();
    return response.status(200).json({ text: String(data.text || "").trim() });
  } catch {
    return response.status(502).json({ error: "Unable to reach the voice provider." });
  }
}
