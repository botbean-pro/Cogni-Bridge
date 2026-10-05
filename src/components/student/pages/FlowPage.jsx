import React, { useEffect, useRef, useState } from "react";
import { ChatHeader } from "../flow/ChatHeader";
import { ChatMessages } from "../flow/ChatMessages";
import { ChatComposer } from "../flow/ChatComposer";
import { QuickPrompts } from "../flow/QuickPrompts";
import { askLearningAssistant, parseQuiz } from "../flow/flowApi";
import "../flow/flow.css";

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm Cogni-Flow AI, your learning buddy. Ask me about a topic, a homework question, or a study plan.",
  timestamp: new Date(),
};

export function FlowPage() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const hasAskedQuestion = messages.some((message) => message.role === "user");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const requestAssistant = async (conversation, task = "chat") => {
    setIsLoading(true);
    setError("");

    try {
      const answer = await askLearningAssistant(conversation, task);
      const quiz = task === "mcq" ? parseQuiz(answer) : null;
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${task}`,
          role: "assistant",
          content: quiz ? "Here's a multiple-choice question based on what you asked:" : answer,
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

  const sendMessage = async (event) => {
    event.preventDefault();
    const question = input.trim();
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

  const createQuestion = () => {
    if (isLoading) return;
    requestAssistant(messages, "mcq");
  };

  const selectPrompt = (prompt) => setInput(prompt);

  return (
    <section className="content ai-chat-page">
      <div className="ai-chat-container">
        <ChatHeader />
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
        {error && (
          <div className="ai-error" role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
        {!hasAskedQuestion && <QuickPrompts onSelect={selectPrompt} />}
        {hasAskedQuestion && (
          <div className="ai-learning-tools">
            <span>Keep learning from your question</span>
            <button type="button" onClick={createQuestion} disabled={isLoading}>
              Make an MCQ from this topic
            </button>
          </div>
        )}
        <ChatComposer
          input={input}
          isLoading={isLoading}
          onChange={setInput}
          onSubmit={sendMessage}
        />
      </div>
    </section>
  );
}
