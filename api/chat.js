const json = (response, status, body) => {
  response.status(status).json(body);
};

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Only POST requests are supported." });

  const { provider = "openrouter", model, messages = [] } = request.body || {};
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return json(response, 400, { error: "A model and at least one message are required." });
  }

  try {
    let upstreamResponse;

    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) return json(response, 500, { error: "GEMINI_API_KEY is not configured on the backend." });
      upstreamResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: messages[messages.length - 1].content }] }] })
      });
    } else {
      if (!process.env.OPENROUTER_API_KEY) return json(response, 500, { error: "OPENROUTER_API_KEY is not configured on the backend." });
      upstreamResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "CogniBridge"
        },
        body: JSON.stringify({ model, messages })
      });
    }

    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) return json(response, upstreamResponse.status, { error: data.error?.message || "The AI provider rejected the request." });

    const content = provider === "gemini"
      ? data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("")
      : data.choices?.[0]?.message?.content;

    return json(response, 200, { content: content || "The AI provider returned an empty response." });
  } catch (error) {
    return json(response, 500, { error: error.message || "Unable to reach the AI provider." });
  }
}
