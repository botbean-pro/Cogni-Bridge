import React, { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { ChatHeader } from "../flow/ChatHeader";
import { ChatMessages, RelatedQuestionCards } from "../flow/ChatMessages";
import { ChatComposer } from "../flow/ChatComposer";
import { QuickPrompts } from "../flow/QuickPrompts";
import { askLearningAssistant, getLearningAssistantUsage } from "../flow/flowApi";
import { speak, stopSpeaking } from "../flow/readAloud";
import "../flow/flow.css";

// "Turn these notes into audio", "read this aloud", "make this a podcast" and similar asks.
const audioAsk = /\b(audio|aloud|out loud|listen|narrat\w*|podcast|text[- ]to[- ]speech|voice)\b/i;
const audioAction = /\b(convert|turn|make|change|read|play|narrate|say|speak|listen|want|can you|could you|please)\b/i;
const wantsAudio = (text) => audioAsk.test(text) && audioAction.test(text);

// Notes come from the same message (after the request), else from the latest earlier message.
const findNotes = (question, history) => {
  const inline = question.split(/\r?\n|:/).slice(1).join("\n").trim();
  if (inline.length >= 20) return inline;
  const earlier = [...history].reverse().find((message) => message.id !== "welcome" && message.content?.trim().length >= 20 && !message.audioScript);
  return earlier?.content.trim() || "";
};

const welcomeMessage = (t) => ({
  id: "welcome",
  role: "assistant",
  content: t("chatWelcome"),
  timestamp: new Date(),
});

const historyStorageKey = (studentEmail) => `cognibridge_flow_history_${studentEmail?.toLowerCase() || "guest"}`;
const makeConversationId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function FlowPage({ t, language, studentEmail, readAloud, assistantContext, onAction }) {
  const [messages, setMessages] = useState(() => [welcomeMessage(t)]);
  const [speakingId, setSpeakingId] = useState(null);
  const [usage, setUsage] = useState({ used: 0, limit: 5000 });
  const [activeConversationId, setActiveConversationId] = useState(makeConversationId);
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(historyStorageKey(studentEmail)) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const hasAskedQuestion = messages.some((message) => message.role === "user");
  const latestMessage = messages[messages.length - 1];
  const relatedQuestions = latestMessage?.role === "assistant" ? latestMessage.relatedQuestions : null;
  const remainingTokens = Math.max(0, usage.limit - usage.used);
  const refreshUsage = async () => {
    try {
      setUsage(await getLearningAssistantUsage());
    } catch {
      // The assistant remains usable if the usage meter cannot refresh.
    }
  };

  useEffect(() => {
    refreshUsage();
  }, [studentEmail]);

  useEffect(() => {
    const firstQuestion = messages.find((message) => message.role === "user");
    if (!firstQuestion) return;

    const conversation = {
      id: activeConversationId,
      title: firstQuestion.content.slice(0, 64),
      updatedAt: new Date().toISOString(),
      messages: messages.map((message) => ({
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
      })),
    };
    setConversations((current) => {
      const updated = [conversation, ...current.filter((item) => item.id !== activeConversationId)].slice(0, 30);
      try {
        localStorage.setItem(historyStorageKey(studentEmail), JSON.stringify(updated));
      } catch {
        // Chat remains usable when browser storage is unavailable.
      }
      return updated;
    });
  }, [messages, activeConversationId, studentEmail]);

  const openConversation = (conversation) => {
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })));
    setHistoryOpen(false);
    setError("");
  };

  const startNewConversation = () => {
    setActiveConversationId(makeConversationId());
    setMessages([welcomeMessage(t)]);
    setInput("");
    setError("");
    setHistoryOpen(false);
  };

  useEffect(() => {
    const messagesPanel = messagesEndRef.current?.parentElement;
    messagesPanel?.scrollTo({
      top: messagesPanel.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages((current) => current.map((message) => (
      message.id === "welcome"
        ? { ...message, content: t("chatWelcome") }
        : message
    )));
  }, [t]);

  useEffect(() => {
    if (!readAloud.enabled) setSpeakingId(null);
  }, [readAloud.enabled]);

  const speakMessage = (id, content) => {
    setSpeakingId(id);
    speak(content, {
      language,
      volume: readAloud.volume,
      onEnd: () => setSpeakingId((current) => (current === id ? null : current)),
    });
  };

  const toggleSpeaking = (message) => {
    if (speakingId === message.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      speakMessage(message.id, message.content);
    }
  };

  const requestAssistant = async (conversation, userMessageId = null) => {
    setIsLoading(true);
    setError("");

    try {
      const answer = await askLearningAssistant(conversation, "chat", language, assistantContext);
      let quiz = null;
      // Requests like "register me" or "open the check-in" don't need a practice question.
      if (!answer.actions.length) {
        try {
          quiz = await askLearningAssistant(conversation, "mcq", language);
        } catch {
          // Keep the tutor's answer available when practice generation is unavailable.
        }
      }
      const answerId = `${Date.now()}-chat`;
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
            id: answerId,
            role: "assistant",
            content: answer.content,
            relatedQuestions: answer.relatedQuestions,
            quiz,
            actions: answer.actions,
            timestamp: new Date(),
          },
        ];
      });
      const readAloudSetting = answer.actions.find((action) => action.type === "setting" && action.name === "readAloud");
      if (readAloudSetting ? readAloudSetting.value === "on" : readAloud.enabled) speakMessage(answerId, answer.content);
      // Registration waits for the student to tap the confirm button in the reply.
      answer.actions.filter((action) => action.type !== "register").forEach(onAction);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      await refreshUsage();
      setIsLoading(false);
    }
  };

  const requestAudio = async (conversation, question) => {
    const notes = findNotes(question, conversation.slice(0, -1));
    const reply = (fields) => setMessages((current) => [...current, {
      id: `${Date.now()}-audio`,
      role: "assistant",
      timestamp: new Date(),
      ...fields,
    }]);
    if (!notes) {
      reply({ content: t("audioNeedNotes") });
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const script = await askLearningAssistant([{ role: "user", content: notes.slice(0, 4000) }], "audio", language);
      reply({ content: t("audioReadyMsg"), audioScript: script });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      await refreshUsage();
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
    if (wantsAudio(question)) {
      await requestAudio(conversation, question);
      return;
    }
    await requestAssistant(conversation, userMessage.id);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    await askQuestion(input.trim());
  };

  const selectPrompt = (prompt) => setInput(prompt);

  return (
    <section className="ai-chat-page">
      <div className="ai-chat-container">
        <ChatHeader t={t} onOpenHistory={() => setHistoryOpen((open) => !open)} />
        <div className="ai-usage-meter" role="status" aria-label={t("flowUsage", { remaining: remainingTokens.toLocaleString(), limit: usage.limit.toLocaleString() })}>
          <span>{t("flowUsage", { remaining: remainingTokens.toLocaleString(), limit: usage.limit.toLocaleString() })}</span>
          <div className="ai-usage-track" aria-hidden="true"><span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} /></div>
        </div>
        {historyOpen && <section className="ai-chat-history" aria-label={t("chatHistory")}>
          <div className="ai-chat-history-heading">
            <h3>{t("chatHistory")}</h3>
            <div className="ai-chat-history-actions">
              <button type="button" onClick={startNewConversation}><MessageSquarePlus size={16} />{t("newChat")}</button>
              <button type="button" className="ai-chat-history-close" onClick={() => setHistoryOpen(false)} aria-label={t("close")} title={t("close")}><X size={16} /></button>
            </div>
          </div>
          {conversations.length ? <div className="ai-chat-history-list">
            {conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => openConversation(conversation)}>
              <strong>{conversation.title}</strong>
              <time>{new Date(conversation.updatedAt).toLocaleDateString()}</time>
            </button>)}
          </div> : <p>{t("noChatHistory")}</p>}
        </section>}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          language={language}
          readAloudEnabled={readAloud.enabled}
          speakingId={speakingId}
          onToggleSpeaking={toggleSpeaking}
          sessions={assistantContext.sessions}
          onAction={onAction}
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
          disabled={remainingTokens <= 0}
          onChange={setInput}
          onSubmit={sendMessage}
          t={t}
        />
      </div>
    </section>
  );
}
