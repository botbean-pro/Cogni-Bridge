import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, MessageCircle, Search, SendHorizontal } from "lucide-react";
import "./WhatsAppChat.css";

// WhatsApp-style two-pane chat shared by the mentor and parent portals.
// threads: [{ key, name, subtitle, messages }], where each message has
// { id, message, created_at, sender_role }; myRole is the sender_role shown on the right.

// When this browser last opened each thread. Only used for unread badges.
const readSeen = (storageKey) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
};

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
const avatarHue = (text = "") => [...text].reduce((total, char) => total + char.charCodeAt(0), 0) % 6;
const sameDay = (first, second) => first.toDateString() === second.toDateString();

function listTime(iso, t) {
  const date = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, new Date())) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay(date, yesterday)) return t("md_chatYesterday");
  return date.toLocaleDateString();
}

function dayLabel(date, t) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, new Date())) return t("md_chatToday");
  if (sameDay(date, yesterday)) return t("md_chatYesterday");
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function Avatar({ name }) {
  return <span className={`wa-avatar wa-hue-${avatarHue(name)}`} aria-hidden="true">{initials(name)}</span>;
}

function ChatList({ title, threads, activeKey, seen, myRole, labels, query, onQuery, onOpen, t }) {
  const visible = threads.filter((thread) => `${thread.name} ${thread.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <aside className="wa-sidebar" aria-label={title}>
      <header className="wa-sidebar-header">
        <h2>{title}</h2>
      </header>
      <label className="wa-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={labels.search} aria-label={labels.search} />
      </label>
      <div className="wa-chat-list">
        {visible.map((thread) => {
          const last = thread.messages.at(-1);
          const unread = thread.messages.filter((message) => message.sender_role !== myRole && message.created_at > (seen[thread.key] || "")).length;
          return (
            <button type="button" key={thread.key} className={`wa-chat-row${thread.key === activeKey ? " active" : ""}`} aria-current={thread.key === activeKey ? "true" : undefined} onClick={() => onOpen(thread.key)}>
              <Avatar name={thread.name} />
              <span className="wa-chat-row-body">
                <span className="wa-chat-row-top">
                  <strong>{thread.name}</strong>
                  {last && <time className={unread ? "unread" : ""}>{listTime(last.created_at, t)}</time>}
                </span>
                {thread.subtitle && <small className="wa-chat-row-child">{thread.subtitle}</small>}
                <span className="wa-chat-row-bottom">
                  <span className="wa-chat-preview">
                    {last?.sender_role === myRole && <CheckCheck size={15} aria-hidden="true" />}
                    {last ? last.message : t("md_chatNoMessages")}
                  </span>
                  {unread > 0 && <span className="wa-unread" aria-label={t("md_chatUnread", { count: unread })}>{unread}</span>}
                </span>
              </span>
            </button>
          );
        })}
        {!visible.length && <p className="wa-list-empty">{threads.length ? labels.noMatch : labels.empty}</p>}
      </div>
    </aside>
  );
}

function Thread({ thread, myRole, onBack, onSend, t }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.key, thread.messages.length]);

  useEffect(() => {
    setDraft("");
    setError("");
  }, [thread.key]);

  const send = async (event) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    try {
      await onSend(thread, message);
      setDraft("");
    } catch (sendError) {
      console.error("Chat message failed to send:", sendError);
      setError(t("md_chatSendFail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="wa-thread" aria-label={thread.name}>
      <header className="wa-thread-header">
        <button type="button" className="wa-back" onClick={onBack} aria-label={t("md_chatBack")}><ArrowLeft size={20} /></button>
        <Avatar name={thread.name} />
        <div>
          <strong>{thread.name}</strong>
          {thread.subtitle && <small>{thread.subtitle}</small>}
        </div>
      </header>
      <div className="wa-messages" aria-live="polite">
        {!thread.messages.length && <p className="wa-system-chip">{t("md_chatNoMessages")}</p>}
        {thread.messages.map((message, index) => {
          const date = new Date(message.created_at);
          const previous = thread.messages[index - 1];
          const newDay = !previous || !sameDay(new Date(previous.created_at), date);
          const mine = message.sender_role === myRole;
          return (
            <React.Fragment key={message.id}>
              {newDay && <p className="wa-system-chip">{dayLabel(date, t)}</p>}
              <div className={`wa-bubble-row ${mine ? "mine" : "theirs"}`}>
                <p className="wa-bubble">
                  <span className="wa-bubble-text">{message.message}</span>
                  <span className="wa-bubble-meta">
                    {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && <CheckCheck size={14} aria-hidden="true" />}
                  </span>
                </p>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="wa-error" role="alert">{error}</p>}
      <form className="wa-composer" onSubmit={send}>
        <textarea
          rows={1}
          value={draft}
          maxLength={4000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) send(event);
          }}
          placeholder={t("md_chatPlaceholder")}
          aria-label={t("md_chatPlaceholder")}
        />
        <button type="submit" disabled={!draft.trim() || sending} aria-label={t("sendMessage")}><SendHorizontal size={20} /></button>
      </form>
    </section>
  );
}

export function WhatsAppChat({ title, threads, myRole, seenStorageKey, labels, loading = false, error = false, onSend, t }) {
  const [activeKey, setActiveKey] = useState(null);
  const [query, setQuery] = useState("");
  const [seen, setSeen] = useState(() => readSeen(seenStorageKey));
  const activeThread = threads.find((thread) => thread.key === activeKey) || null;
  const latestInThread = activeThread?.messages.at(-1)?.created_at;

  useEffect(() => setSeen(readSeen(seenStorageKey)), [seenStorageKey]);

  useEffect(() => {
    if (loading || threads.length === 0 || Object.keys(seen).length > 0) {
      return;
    }
    const next = {};
    threads.forEach((thread) => {
      const lastMessage = thread.messages.at(-1);
      if (lastMessage) {
        next[thread.key] = lastMessage.created_at;
      } else {
        next[thread.key] = "";
      }
    });
    setSeen(next);
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
    } catch {
      return;
    }
  }, [loading, threads, seen, seenStorageKey]);

  // Opening a thread (or new messages arriving in the open one) marks it read.
  useEffect(() => {
    if (!activeKey || !latestInThread || seen[activeKey] >= latestInThread) return;
    const next = { ...seen, [activeKey]: latestInThread };
    setSeen(next);
    try {
      localStorage.setItem(seenStorageKey, JSON.stringify(next));
    } catch {
      // Unread badges just reset on reload when storage is unavailable.
    }
  }, [activeKey, latestInThread, seenStorageKey]);

  if (loading) return <section className="wa-shell wa-shell-status"><p>{t("md_chatLoading")}</p></section>;

  return (
    <section className={`wa-shell${activeThread ? " has-thread" : ""}`}>
      <ChatList title={title} threads={threads} activeKey={activeKey} seen={seen} myRole={myRole} labels={labels} query={query} onQuery={setQuery} onOpen={setActiveKey} t={t} />
      {activeThread ? (
        <Thread thread={activeThread} myRole={myRole} onBack={() => setActiveKey(null)} onSend={onSend} t={t} />
      ) : (
        <div className="wa-placeholder">
          <MessageCircle size={56} aria-hidden="true" />
          <h3>{title}</h3>
          <p>{error ? t("md_chatLoadFail") : threads.length ? labels.select : labels.empty}</p>
        </div>
      )}
    </section>
  );
}
