const reply = (response, status, body) => response.status(status).json(body);

const tutorInstructions =
  "You are Cogni-Flow, a supportive learning assistant for students. Explain ideas clearly, " +
  "use age-appropriate language, and guide students through their own reasoning.";

const quizInstructions =
  "Create one multiple-choice question about the topic in the conversation. Make the question " +
  "and answer depend on the student's actual question and the preceding conversation. Return " +
  "only valid JSON with this exact shape: {\"question\": string, \"options\": [string, string, string, string], " +
  "\"answerIndex\": number, \"explanation\": string}. answerIndex is zero-based. Do not use markdown.";

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

async function callOpenRouter(messages, task) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    throw new Error("Cogni-Flow is not configured. Add OPENROUTER_API_KEY and OPENROUTER_MODEL to the server environment.");
  }

  const systemPrompt = task === "mcq"
    ? `${tutorInstructions} ${quizInstructions}`
    : tutorInstructions;

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

  const { task = "chat", messages } = request.body || {};
  if (!["chat", "mcq"].includes(task) || !isValidMessages(messages)) {
    return reply(response, 400, { error: "A valid task and conversation are required." });
  }

  try {
    const upstreamResponse = await callOpenRouter(messages, task);
    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return reply(response, upstreamResponse.status, {
        error: data.error?.message || "The AI provider rejected the request.",
      });
    }

    const content = data.choices?.[0]?.message?.content;
    return reply(response, 200, {
      content: content || "The AI provider returned an empty response.",
    });
  } catch (error) {
    const configurationError = error.message.startsWith("Cogni-Flow is not configured.");
    return reply(response, configurationError ? 503 : 502, {
      error: configurationError
        ? error.message
        : "Unable to reach the AI provider. Please try again.",
    });
  }
}
