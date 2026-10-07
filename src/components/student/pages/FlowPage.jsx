import React, { useEffect, useRef, useState } from "react";
import { ChatHeader } from "../flow/ChatHeader";
import { ChatMessages } from "../flow/ChatMessages";
import { ChatComposer } from "../flow/ChatComposer";
import { QuickPrompts } from "../flow/QuickPrompts";
import { askLearningAssistant, parseQuiz } from "../flow/flowApi";
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

  const requestAssistant = async (conversation, task = "chat") => {
    setIsLoading(true);
    setError("");

    try {
      const answer = await askLearningAssistant(conversation, task, language);
      const answerText = task === "mcq" ? answer : answer.content;
      const quiz = task === "mcq" ? parseQuiz(answer) : null;
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${task}`,
          role: "assistant",
          content: quiz ? t("quizIntro") : answerText,
          relatedQuestions: task === "chat" ? answer.relatedQuestions : [],
          quiz,
          timestamp: new Date(),
        },
      ]);
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
    await requestAssistant(conversation);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    await askQuestion(input.trim());
  };

  const createQuestion = () => {
    if (isLoading) return;
    requestAssistant(messages, "mcq");
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
          onAskRelated={askQuestion}
        />
        {error && (
          <div className="ai-error" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>{t("dismiss")}</button>
          </div>
        )}
        {!hasAskedQuestion && <QuickPrompts onSelect={selectPrompt} t={t} />}
        {hasAskedQuestion && (
          <div className="ai-learning-tools">
            <span>{t("keepLearning")}</span>
            <button type="button" onClick={createQuestion} disabled={isLoading}>
              {t("makeMcq")}
            </button>
          </div>
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
