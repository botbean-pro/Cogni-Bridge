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
  "Understand student messages written in any language. Translate the latest user message into the selected response language, " +
  "and return that translation as translatedQuestion so the student can see their question in that language. " +
  "Return only valid JSON with this exact shape: {\"translatedQuestion\": string, \"answer\": string, \"relatedQuestions\": [string, string, string, string]}. " +
  "The relatedQuestions must contain four short, useful follow-up questions directly related to the student's latest question. " +
  "Do not include the follow-up questions in the answer text. Write translatedQuestion, answer, and relatedQuestions in the selected response language.";

const translationInstructions =
  "Translate every natural-language string in the user's JSON object into the requested language. " +
  "Keep JSON keys, formulas, code, names, and numbers unchanged. Preserve the meaning and return only valid JSON " +
  "with this exact shape: {\"translatedQuestion\": string, \"answer\": string, \"relatedQuestions\": [string, string, string, string]}.";

const supportedLanguages = new Set([
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Kannada", "Malayalam", "Punjabi", "French", "German",
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
  const taskInstructions = task === "mcq"
    ? quizInstructions
    : task === "translate"
      ? translationInstructions
      : chatInstructions;
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

async function translateChatResult(result, language) {
  const response = await callOpenRouter(
    [{ role: "user", content: JSON.stringify(result) }],
    "translate",
    language,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "The translation request failed.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The translation provider returned an empty response.");
  }

  const translated = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  if (
    typeof translated.translatedQuestion !== "string"
    || typeof translated.answer !== "string"
    || !Array.isArray(translated.relatedQuestions)
  ) {
    throw new Error("The translation provider returned an invalid response.");
  }

  return {
    translatedQuestion: translated.translatedQuestion,
    answer: translated.answer,
    relatedQuestions: translated.relatedQuestions.filter((question) => typeof question === "string").slice(0, 4),
  };
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
      const latestUserMessage = messages.filter((message) => message.role === "user").at(-1);
      let chatResult;
      try {
        const parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
        chatResult = {
          answer: typeof parsed.answer === "string" ? parsed.answer : content,
          translatedQuestion: typeof parsed.translatedQuestion === "string"
            ? parsed.translatedQuestion
            : latestUserMessage?.content || "",
          relatedQuestions: Array.isArray(parsed.relatedQuestions)
          ? parsed.relatedQuestions.filter((question) => typeof question === "string").slice(0, 4)
            : [],
        };
      } catch {
        chatResult = {
          answer: content,
          translatedQuestion: latestUserMessage?.content || "",
          relatedQuestions: [],
        };
      }

      const localizedResult = responseLanguage === "English"
        ? chatResult
        : await translateChatResult(chatResult, responseLanguage);
      return reply(response, 200, {
        content: localizedResult.answer,
        translatedQuestion: localizedResult.translatedQuestion,
        relatedQuestions: localizedResult.relatedQuestions,
      });
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
