import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { formatLocalizedDate } from "../../../constants";

// Keeps a thread scrolled to its newest message.
function ThreadMessages({ thread, t }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread.length]);
  return (
    <div className="parent-thread-messages" ref={listRef}>
      {thread.length ? thread.map((message) => (
        <p key={message.id} className={message.sender_role === "parent" ? "from-parent" : "from-teacher"}>
          <span>{message.sender_role === "parent" ? t("youLabel") : t("teacherLabel")}</span>
          {message.message}
          <small>{formatLocalizedDate(message.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small>
        </p>
      )) : <small>{t("startConversation")}</small>}
    </div>
  );
}

// Parent-teacher threads for one child, one per assigned mentor.
export function ParentTeachersPage({ child, messages, onSend, t }) {
  const [drafts, setDrafts] = useState({});
  const [sendingTo, setSendingTo] = useState(null);
  const [error, setError] = useState("");

  const send = async (event, mentor) => {
    event.preventDefault();
    const message = drafts[mentor.id]?.trim();
    if (!message) return;
    setSendingTo(mentor.id);
    setError("");
    try {
      await onSend(mentor.id, message);
      setDrafts((current) => ({ ...current, [mentor.id]: "" }));
    } catch (sendError) {
      console.error("Parent message failed to send:", sendError);
      setError(t("messageSendError"));
    } finally {
      setSendingTo(null);
    }
  };

  if (!child.mentors.length) {
    return <p className="parent-card parent-muted parent-rise">{t("noTeacherAssigned", { child: child.display_name })}</p>;
  }

  return (
    <div className="parent-threads">
      {error && <p className="parent-message parent-error" role="alert">{error}</p>}
      {child.mentors.map((mentor, index) => {
        const thread = messages.filter((message) => message.mentor_id === mentor.id);
        return (
          <section className="parent-card parent-teacher-thread parent-rise" key={mentor.id} style={{ "--rise-delay": `${index * 70}ms` }}>
            <div className="parent-card-title">
              <h2><span className="parent-card-icon"><MessageCircle size={18} /></span> {mentor.display_name}</h2>
            </div>
            <ThreadMessages thread={thread} t={t} />
            <form onSubmit={(event) => send(event, mentor)}>
              <input aria-label={`${t("writeMessage")} ${mentor.display_name}`} maxLength={4000} value={drafts[mentor.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [mentor.id]: event.target.value }))} placeholder={t("writeMessage")} required />
              <button type="submit" disabled={sendingTo === mentor.id}><Send size={16} /><span>{t("sendMessage")}</span></button>
            </form>
          </section>
        );
      })}
    </div>
  );
}
