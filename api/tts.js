import { createClient } from "@supabase/supabase-js";

const MAX_TEXT_LENGTH = 1200;
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// ElevenLabs language codes for the response languages it voices well; anything else uses the browser voice.
const languageCodes = { English: "en", French: "fr", German: "de", Hindi: "hi" };

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
  if (!apiKey) return response.status(503).json({ error: "Read aloud is not configured." });

  const { text, language = "English" } = request.body || {};
  const languageCode = languageCodes[language];
  if (typeof text !== "string" || !text.trim() || !languageCode) {
    return response.status(400).json({ error: "Text in a supported language is required." });
  }

  // Without Supabase (demo mode) there are no accounts to check, matching /api/chat.
  if (supabaseUrl && supabaseAnonKey && !(await isSignedIn(request))) {
    return response.status(401).json({ error: "Sign in to use read aloud." });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg", "xi-api-key": apiKey },
        body: JSON.stringify({
          text: text.trim().slice(0, MAX_TEXT_LENGTH),
          model_id: "eleven_flash_v2_5",
          language_code: languageCode,
        }),
      },
    );
    if (!upstream.ok) {
      return response.status(upstream.status === 401 ? 503 : 502).json({ error: "The voice provider rejected the request." });
    }
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    return response.status(502).json({ error: "Unable to reach the voice provider." });
  }
}
