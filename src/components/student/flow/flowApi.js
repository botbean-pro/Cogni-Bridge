export async function askLearningAssistant(conversation, task = "chat") {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task,
      messages: conversation
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map(({ role, content }) => ({ role, content })),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Cogni-Flow couldn't respond. Please try again.");
  }

  return data.content;
}

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
