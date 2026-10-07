const reply = (response, status, body) => response.status(status).json(body);

const tutorInstructions =
  "You are Cogni-Flow, a supportive learning assistant for students. Explain ideas clearly, " +
  "use age-appropriate language, and guide students through their own reasoning.";

const quizInstructions =
  "Create one multiple-choice question about the topic in the conversation. Make the question " +
  "and answer depend on the student's actual question and the preceding conversation. Return " +
  "only valid JSON with this exact shape: {\"question\": string, \"options\": [string, string, string, string], " +
  "\"answerIndex\": number, \"explanation\": string}. answerIndex is zero-based. Do not use markdown.";

const chatInstructions =
  "Answer in a clear, student-friendly way using short sentences and familiar words. Start with the direct answer, " +
  "keep the answer focused (usually under 150 words), and explain unfamiliar terms simply. " +
  "Use short paragraphs and markdown headings, bullets, or numbered steps only when they make the answer easier to scan. " +
  "Return only valid JSON with this exact shape: {\"answer\": string, \"relatedQuestions\": [string, string, string, string]}. " +
  "The relatedQuestions must contain four short, useful follow-up questions directly related to the student's latest question. " +
  "Do not include the follow-up questions in the answer text.";

const supportedLanguages = new Set([
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Kannada", "Malayalam", "Punjabi",
]);

function isValidMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 30 &&
    messages.every(
      (message) =>
        ["user", "assistant"].includes(message?.role) &&
        typeof message.content === "string" &&
        message.content.length > 0 &&
        message.content.length <= 4000,
    )
  );
}

async function callOpenRouter(messages, task, language) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    throw new Error("Cogni-Flow is not configured. Add OPENROUTER_API_KEY and OPENROUTER_MODEL to the server environment.");
  }

  const languageInstruction = `Write the entire response, including all related questions, in ${language}. Keep names, formulas, and code unchanged when needed.`;
  const taskInstructions = task === "mcq" ? quizInstructions : chatInstructions;
  const systemPrompt = `${tutorInstructions} ${languageInstruction} ${taskInstructions}`;

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
      "X-Title": "CogniBridge",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return reply(response, 405, { error: "Only POST requests are supported." });
  }

  const { task = "chat", messages, language = "English" } = request.body || {};
  if (!["chat", "mcq"].includes(task) || !isValidMessages(messages)) {
    return reply(response, 400, { error: "A valid task and conversation are required." });
  }

  try {
    const responseLanguage = supportedLanguages.has(language) ? language : "English";
    const upstreamResponse = await callOpenRouter(messages, task, responseLanguage);
    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return reply(response, upstreamResponse.status, {
        error: data.error?.message || "The AI provider rejected the request.",
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return reply(response, 200, { content: "The AI provider returned an empty response." });

    if (task === "chat") {
      try {
        const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
        const answer = typeof parsed.answer === "string" ? parsed.answer : content;
        const relatedQuestions = Array.isArray(parsed.relatedQuestions)
          ? parsed.relatedQuestions.filter((question) => typeof question === "string").slice(0, 4)
          : [];
        return reply(response, 200, { content: answer, relatedQuestions });
      } catch {
        return reply(response, 200, { content, relatedQuestions: [] });
      }
    }

    return reply(response, 200, { content });
  } catch (error) {
    const configurationError = error.message.startsWith("Cogni-Flow is not configured.");
    return reply(response, configurationError ? 503 : 502, {
      error: configurationError
        ? error.message
        : "Unable to reach the AI provider. Please try again.",
    });
  }
}
