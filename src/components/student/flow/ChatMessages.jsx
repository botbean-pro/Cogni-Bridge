import React from "react";
import { ArrowUpRight, UserRound } from "lucide-react";
import { LogoImage } from "../../Brand";
import { PracticeQuestion } from "./PracticeQuestion";

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function FormattedAnswer({ content }) {
  const lines = content.split(/\r?\n/);
  return (
    <div className="formatted-answer">
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,3}\s+(.+)$/);
        const bullet = line.match(/^\s*[-*]\s+(.+)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
        if (heading) return <h3 key={index}>{renderInline(heading[1])}</h3>;
        if (bullet) return <p className="answer-list-item" key={index}><span aria-hidden="true">•</span><span>{renderInline(bullet[1])}</span></p>;
        if (numbered) return <p className="answer-list-item" key={index}><span aria-hidden="true">{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></p>;
        if (!line.trim() || /^\s*[-*_]{3,}\s*$/.test(line)) return <div className="answer-spacer" key={index} />;
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function Message({ message, t }) {
  const isAssistant = message.role === "assistant";

  return (
    <article className={`ai-message ${message.role}`}>
      <div className="message-avatar">
        {isAssistant ? <LogoImage size={24} /> : <UserRound size={18} />}
      </div>
      <div className="message-content">
        <div className="message-text">
          {isAssistant ? <FormattedAnswer content={message.content} /> : message.content}
        </div>
        {message.quiz && <PracticeQuestion quiz={message.quiz} t={t} />}
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

export function RelatedQuestionCards({ questions, onAsk, disabled, t }) {
  if (!questions?.length) return null;
  return (
    <div className="related-questions">
      <p className="quick-prompts-title">{t("relatedTopics")}</p>
      <div className="related-question-cards" aria-label={t("relatedTopics")}>
        {questions.slice(0, 4).map((question) => (
          <button key={question} type="button" onClick={() => onAsk(question)} disabled={disabled}>
            <span>{question}</span><ArrowUpRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading, messagesEndRef, t }) {
  return (
    <div className="ai-chat-messages" aria-live="polite">
      {messages.map((message) => <Message key={message.id} message={message} t={t} />)}
      {isLoading && (
        <div className="ai-message assistant" aria-label={t("aiThinking")}>
          <div className="message-avatar"><LogoImage size={24} /></div>
          <div className="message-content">
            <div className="typing-indicator"><span /><span /><span /></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
