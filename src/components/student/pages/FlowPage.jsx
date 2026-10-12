import React, { useEffect, useRef, useState } from "react";
import { ChatHeader } from "../flow/ChatHeader";
import { ChatMessages, RelatedQuestionCards } from "../flow/ChatMessages";
import { ChatComposer } from "../flow/ChatComposer";
import { QuickPrompts } from "../flow/QuickPrompts";
import { askLearningAssistant } from "../flow/flowApi";
import "../flow/flow.css";

const welcomeMessage = (t) => ({
  id: "welcome",
  role: "assistant",
  content: t("chatWelcome"),
  timestamp: new Date(),
});

export function FlowPage({ t, language }) {
  const [messages, setMessages] = useState(() => [welcomeMessage(t)]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const hasAskedQuestion = messages.some((message) => message.role === "user");
  const latestMessage = messages[messages.length - 1];
  const relatedQuestions = latestMessage?.role === "assistant" ? latestMessage.relatedQuestions : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages((current) => current.map((message) => (
      message.id === "welcome"
        ? { ...message, content: t("chatWelcome") }
        : message
    )));
  }, [t]);

  const requestAssistant = async (conversation, userMessageId = null) => {
    setIsLoading(true);
    setError("");

    try {
      const answer = await askLearningAssistant(conversation, "chat", language);
      let quiz = null;
      try {
        quiz = await askLearningAssistant(conversation, "mcq", language);
      } catch {
        // Keep the tutor's answer available when practice generation is unavailable.
      }
      setMessages((current) => {
        const translatedMessages = answer.translatedQuestion
          ? current.map((message) => (
            message.id === userMessageId
              ? { ...message, content: answer.translatedQuestion }
              : message
          ))
          : current;

        return [
          ...translatedMessages,
          {
            id: `${Date.now()}-chat`,
            role: "assistant",
            content: answer.content,
            relatedQuestions: answer.relatedQuestions,
            quiz,
            timestamp: new Date(),
          },
        ];
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const askQuestion = async (question) => {
    if (!question || isLoading) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput("");
    await requestAssistant(conversation, userMessage.id);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    await askQuestion(input.trim());
  };

  const selectPrompt = (prompt) => setInput(prompt);

  return (
    <section className="content ai-chat-page">
      <div className="ai-chat-container">
        <ChatHeader t={t} />
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          t={t}
        />
        {error && (
          <div className="ai-error" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>{t("dismiss")}</button>
          </div>
        )}
        {!hasAskedQuestion && <QuickPrompts onSelect={selectPrompt} t={t} />}
        {!isLoading && (
          <RelatedQuestionCards
            questions={relatedQuestions}
            onAsk={askQuestion}
            disabled={isLoading}
            t={t}
          />
        )}
        <ChatComposer
          input={input}
          isLoading={isLoading}
          onChange={setInput}
          onSubmit={sendMessage}
          t={t}
        />
      </div>
    </section>
  );
}
