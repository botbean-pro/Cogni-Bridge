import { supabase, supabaseConfigured } from "../../../supabaseClient";

async function authHeaders() {
  if (!supabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchWithAuth(url, options) {
  const makeRequest = async () => fetch(url, {
    ...options,
    headers: { ...options.headers, ...(await authHeaders()) },
  });
  let response = await makeRequest();
  if (response.status === 401 && supabaseConfigured) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) response = await makeRequest();
  }
  return response;
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

// Voice input: api/stt.js sends the recording to ElevenLabs and returns the spoken text.
export async function transcribeSpeech(blob, language = "English") {
  const response = await fetchWithAuth("/api/stt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: await blobToBase64(blob), mimeType: blob.type || "audio/webm", language }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Voice input is unavailable.");
  return data.text || "";
}

export async function getLearningAssistantUsage() {
  const response = await fetchWithAuth("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: "usage" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load Cogni-Flow usage.");
  return { used: Number(data.used) || 0, limit: Number(data.limit) || 5000 };
}

// A document reply shows its summary in the study pack, so follow-up questions need it in the history.
const withStudyPack = (content, studyPack) => (studyPack
  ? [content, studyPack.summary, ...studyPack.keyPoints.map((point) => `- ${point}`)].join("\n\n").slice(0, 4000)
  : content);

export async function askLearningAssistant(conversation, task = "chat", language = "English", context = null) {
  const response = await fetchWithAuth("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task,
      language,
      context: task === "chat" ? context : undefined,
      messages: conversation
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map(({ role, content, studyPack }) => ({ role, content: withStudyPack(content, studyPack) })),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Cogni-Flow couldn't respond. Please try again.");
    // A catalog key so the page can show the error in the student's language.
    error.messageKey = response.status === 429 ? "flowLimitReached" : response.status === 401 ? "flowSignInRequired" : "flowRequestError";
    throw error;
  }

  if (task === "audio") return data.script;
  if (task === "document") return data.studyPack;
  return task === "chat"
    ? {
      content: data.content,
      translatedQuestion: data.translatedQuestion || "",
      relatedQuestions: data.relatedQuestions || [],
      practice: data.practice === true,
      actions: Array.isArray(data.actions) ? data.actions : [],
    }
    : data.quiz;
}

// BCP 47 tags for the browser's speech synthesis, keyed by the response language names.
export const speechLanguages = {
  English: "en-IN", Hindi: "hi-IN", Bengali: "bn-IN", Telugu: "te-IN", Marathi: "mr-IN", Tamil: "ta-IN",
  Gujarati: "gu-IN", Kannada: "kn-IN", Malayalam: "ml-IN", Punjabi: "pa-IN", French: "fr-FR", German: "de-DE",
};

export function parseQuiz(responseText) {
  const jsonText = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const quiz = JSON.parse(jsonText);
    const validQuiz =
      typeof quiz.question === "string" &&
      Array.isArray(quiz.options) &&
      quiz.options.length === 4 &&
      Number.isInteger(quiz.answerIndex) &&
      quiz.answerIndex >= 0 &&
      quiz.answerIndex < 4 &&
      typeof quiz.explanation === "string";

    return validQuiz ? quiz : null;
  } catch {
    return null;
  }
}
