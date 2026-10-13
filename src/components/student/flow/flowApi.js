import { supabase, supabaseConfigured } from "../../../supabaseClient";

async function authHeaders() {
  if (!supabaseConfigured) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function askLearningAssistant(conversation, task = "chat", language = "English") {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      task,
      language,
      messages: conversation
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map(({ role, content }) => ({ role, content })),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Cogni-Flow couldn't respond. Please try again.");
  }

  if (task === "audio") return data.script;
  return task === "chat"
    ? {
      content: data.content,
      translatedQuestion: data.translatedQuestion || "",
      relatedQuestions: data.relatedQuestions || [],
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
