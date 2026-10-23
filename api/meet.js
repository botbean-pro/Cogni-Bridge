import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Only mentors schedule sessions, so only they may create meetings on the shared Google account.
async function isMentor(request) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: profile } = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile?.role === "mentor";
}

// The refresh token comes from signing in once (OAuth Playground) with the Google account that
// owns every meeting; it's swapped for a short-lived access token on each request.
async function googleAccessToken() {
  const upstream = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !data.access_token) {
    // invalid_grant means the refresh token was revoked or expired (e.g. the app was left in "Testing").
    throw new Error(`Google sign-in failed: ${data.error_description || data.error || upstream.status}`);
  }
  return data.access_token;
}

const createSpace = (accessToken, body) => fetch("https://meet.googleapis.com/v2/spaces", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify(body),
});

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Only POST requests are supported." });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return response.status(503).json({ error: "Google Meet is not configured." });
  }
  // Without Supabase (demo mode) there are no accounts to check, matching /api/chat.
  if (supabaseUrl && supabaseAnonKey && !(await isMentor(request))) {
    return response.status(401).json({ error: "Sign in as a mentor to create Meet links." });
  }

  try {
    const accessToken = await googleAccessToken();
    // Open access lets students join without the shared account having to admit them. Some
    // accounts can't change that setting, so fall back to Google's default meeting settings.
    let upstream = await createSpace(accessToken, { config: { accessType: "OPEN" } });
    if (upstream.status === 400 || upstream.status === 403) upstream = await createSpace(accessToken, {});
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.meetingUri) {
      console.error(`Google Meet ${upstream.status}: ${data.error?.message || "no reason given"}`);
      return response.status(502).json({ error: "Google Meet couldn't create a meeting." });
    }
    return response.status(200).json({ meetLink: data.meetingUri });
  } catch (error) {
    console.error(error.message);
    return response.status(502).json({ error: "Unable to reach Google Meet." });
  }
}
