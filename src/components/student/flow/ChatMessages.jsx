import React from "react";
import { Sparkles, UserRound } from "lucide-react";
import { PracticeQuestion } from "./PracticeQuestion";

function Message({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`ai-message ${message.role}`}>
      <div className="message-avatar">
        {isAssistant ? <Sparkles size={18} /> : <UserRound size={18} />}
      </div>
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        {message.quiz && <PracticeQuestion quiz={message.quiz} />}
        <time className="message-time">
          {message.timestamp.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </article>
  );
}

export function ChatMessages({ messages, isLoading, messagesEndRef }) {
  return (
    <div className="ai-chat-messages" aria-live="polite">
      {messages.map((message) => <Message key={message.id} message={message} />)}
      {isLoading && (
        <div className="ai-message assistant" aria-label="Cogni-Flow is thinking">
          <div className="message-avatar"><Sparkles size={18} /></div>
          <div className="message-content">
            <div className="typing-indicator"><span /><span /><span /></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
