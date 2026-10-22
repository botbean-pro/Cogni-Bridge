import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, MessageCircle, Search, SendHorizontal } from "lucide-react";
import { loadMentorParentChats, sendMentorParentReply } from "../../parentPortal";
import "./MentorParentChat.css";

const REFRESH_MS = 15000;
const seenKey = (mentorId) => `cognibridge_mentor_chat_seen:${mentorId}`;

// When the mentor last opened each thread, per browser. Only used for unread badges.
const readSeen = (mentorId) => {
  try {
    return JSON.parse(localStorage.getItem(seenKey(mentorId)) || "{}");
  } catch {
    return {};
  }
};

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
const avatarHue = (text = "") => [...text].reduce((total, char) => total + char.charCodeAt(0), 0) % 6;
const sameDay = (first, second) => first.toDateString() === second.toDateString();

function listTime(iso, t) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay(date, yesterday)) return t("md_chatYesterday");
  return date.toLocaleDateString();
}

function dayLabel(date, t) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return t("md_chatToday");
  if (sameDay(date, yesterday)) return t("md_chatYesterday");
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function Avatar({ name }) {
  return <span className={`wa-avatar wa-hue-${avatarHue(name)}`} aria-hidden="true">{initials(name)}</span>;
}

function ChatList({ threads, activeKey, seen, query, onQuery, onOpen, t }) {
  const visible = threads.filter((thread) => `${thread.parentName} ${thread.studentName}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <aside className="wa-sidebar" aria-label={t("md_parentsNav")}>
      <header className="wa-sidebar-header">
        <h2>{t("md_parentsNav")}</h2>
      </header>
      <label className="wa-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t("md_chatSearch")} aria-label={t("md_chatSearch")} />
      </label>
      <div className="wa-chat-list">
        {visible.map((thread) => {
          const last = thread.messages.at(-1);
          const unread = thread.messages.filter((message) => message.sender_role === "parent" && message.created_at > (seen[thread.key] || "")).length;
          return (
            <button type="button" key={thread.key} className={`wa-chat-row${thread.key === activeKey ? " active" : ""}`} aria-current={thread.key === activeKey ? "true" : undefined} onClick={() => onOpen(thread.key)}>
              <Avatar name={thread.parentName} />
              <span className="wa-chat-row-body">
                <span className="wa-chat-row-top">
                  <strong>{thread.parentName}</strong>
                  {last && <time className={unread ? "unread" : ""}>{listTime(last.created_at, t)}</time>}
                </span>
                <small className="wa-chat-row-child">{t("md_parentOf", { name: thread.studentName })}</small>
                <span className="wa-chat-row-bottom">
                  <span className="wa-chat-preview">
                    {last?.sender_role === "mentor" && <CheckCheck size={15} aria-hidden="true" />}
                    {last ? last.message : t("md_chatNoMessages")}
                  </span>
                  {unread > 0 && <span className="wa-unread" aria-label={t("md_chatUnread", { count: unread })}>{unread}</span>}
                </span>
              </span>
            </button>
          );
        })}
        {!visible.length && <p className="wa-list-empty">{threads.length ? t("md_chatNoMatch") : t("md_noParents")}</p>}
      </div>
    </aside>
  );
}

function Thread({ thread, onBack, onSend, t }) {
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
    } catch {
      setError(t("md_chatSendFail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="wa-thread" aria-label={thread.parentName}>
      <header className="wa-thread-header">
        <button type="button" className="wa-back" onClick={onBack} aria-label={t("md_chatBack")}><ArrowLeft size={20} /></button>
        <Avatar name={thread.parentName} />
        <div>
          <strong>{thread.parentName}</strong>
          <small>{t("md_parentOf", { name: thread.studentName })}</small>
        </div>
      </header>
      <div className="wa-messages" aria-live="polite">
        {!thread.messages.length && <p className="wa-system-chip">{t("md_chatNoMessages")}</p>}
        {thread.messages.map((message, index) => {
          const date = new Date(message.created_at);
          const previous = thread.messages[index - 1];
          const newDay = !previous || !sameDay(new Date(previous.created_at), date);
          const mine = message.sender_role === "mentor";
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

export function MentorParentChat({ mentorId, t }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeKey, setActiveKey] = useState(null);
  const [query, setQuery] = useState("");
  const [seen, setSeen] = useState(() => readSeen(mentorId));

  const reload = async () => {
    try {
      const rows = await loadMentorParentChats(mentorId);
      // Most recent conversation first, like a messaging app.
      rows.sort((first, second) => (second.messages.at(-1)?.created_at || "").localeCompare(first.messages.at(-1)?.created_at || "") || first.parentName.localeCompare(second.parentName));
      setThreads(rows);
      setLoadError("");
    } catch {
      setLoadError(t("md_chatLoadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [mentorId]);

  const activeThread = useMemo(() => threads.find((thread) => thread.key === activeKey) || null, [threads, activeKey]);

  // Opening a thread (or new messages arriving in the open one) marks it read.
  useEffect(() => {
    const latest = activeThread?.messages.at(-1)?.created_at;
    if (!latest || seen[activeThread.key] >= latest) return;
    const next = { ...seen, [activeThread.key]: latest };
    setSeen(next);
    try {
      localStorage.setItem(seenKey(mentorId), JSON.stringify(next));
    } catch {
      // Unread badges just reset on reload when storage is unavailable.
    }
  }, [activeThread, mentorId]);

  const send = async (thread, message) => {
    await sendMentorParentReply({ mentorId, studentId: thread.studentId, parentId: thread.parentId, message });
    await reload();
  };

  if (loading) return <section className="wa-shell wa-shell-status"><p>{t("md_chatLoading")}</p></section>;

  return (
    <section className={`wa-shell${activeThread ? " has-thread" : ""}`}>
      <ChatList threads={threads} activeKey={activeKey} seen={seen} query={query} onQuery={setQuery} onOpen={setActiveKey} t={t} />
      {activeThread ? (
        <Thread thread={activeThread} onBack={() => setActiveKey(null)} onSend={send} t={t} />
      ) : (
        <div className="wa-placeholder">
          <MessageCircle size={56} aria-hidden="true" />
          <h3>{t("md_parentsNav")}</h3>
          <p>{loadError || (threads.length ? t("md_chatSelect") : t("md_noParents"))}</p>
        </div>
      )}
    </section>
  );
}
