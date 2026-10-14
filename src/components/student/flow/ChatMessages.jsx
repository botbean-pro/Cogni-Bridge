import React from "react";
import { ArrowUpRight, UserRound, X } from "lucide-react";
import { LogoImage } from "../../Brand";
import { PracticeQuestion } from "./PracticeQuestion";
import { AudioPlayer } from "./AudioNotes";

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

const timeLocales = {
  Hindi: "hi-IN",
  Bengali: "bn-IN",
  Telugu: "te-IN",
  Marathi: "mr-IN",
  Tamil: "ta-IN",
  Gujarati: "gu-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
};

function Message({ message, language, t }) {
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
        {message.audioScript && <AudioPlayer script={message.audioScript} language={language} t={t} />}
        {message.quiz && <PracticeQuestion quiz={message.quiz} t={t} />}
        <time className="message-time">
          {message.timestamp.toLocaleTimeString(timeLocales[language] || "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </article>
  );
}

export function RelatedQuestionCards({ questions, onAsk, disabled, t }) {
  const [dismissed, setDismissed] = React.useState([]);
  React.useEffect(() => setDismissed([]), [questions]);

  const visible = questions?.filter((question) => !dismissed.includes(question));
  if (!visible?.length) return null;
  return (
    <div className="related-questions">
      <p className="quick-prompts-title">{t("relatedTopics")}</p>
      <div className="related-question-cards" aria-label={t("relatedTopics")}>
        {visible.slice(0, 4).map((question) => (
          <div key={question} className="related-question-card">
            <button type="button" onClick={() => onAsk(question)} disabled={disabled}>
              <span>{question}</span><ArrowUpRight size={16} />
            </button>
            <button
              type="button"
              className="related-question-dismiss"
              onClick={() => setDismissed((prev) => [...prev, question])}
              aria-label={t("dismiss")}
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading, messagesEndRef, language, t }) {
  return (
    <div className="ai-chat-messages" aria-live="polite">
      {messages.map((message) => <Message key={message.id} message={message} language={language} t={t} />)}
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
