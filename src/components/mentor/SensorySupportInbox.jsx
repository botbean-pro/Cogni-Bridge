import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ChevronDown, Clock3, HeartPulse, RefreshCw, Send } from "lucide-react";
import {
  loadMentorCheckins,
  markMentorNotificationViewed,
  mentorHelpOptions,
  moodLabels,
  respondToMentorRequest,
} from "../../studentSensory";
import "./sensorySupport.css";

const emotionLabels = {
  happy: "Happy", sad: "Sad", angry: "Angry", anxious: "Anxious", stressed: "Stressed",
  tired: "Tired", lonely: "Lonely", confused: "Confused", excited: "Excited",
  overwhelmed: "Overwhelmed", calm: "Calm", frustrated: "Frustrated", other: "Other",
};

const dateTime = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export function SensorySupportInbox({ mentorId }) {
  const [checkins, setCheckins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [students, setStudents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const refresh = async () => {
      try {
        const result = await loadMentorCheckins(mentorId);
        if (!isCurrent) return;
        setCheckins(result.checkins);
        setNotifications(result.notifications);
        setStudents(result.students);
        setError("");
      } catch {
        if (isCurrent) setError("Shared check-ins could not be loaded.");
      } finally {
        if (isCurrent) setRefreshing(false);
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [mentorId, refreshVersion]);

  const sortedEntries = useMemo(() => [...checkins].sort((first, second) => {
    const firstNotification = notifications.find((item) => item.checkin_id === first.id);
    const secondNotification = notifications.find((item) => item.checkin_id === second.id);
    const firstPriority = firstNotification && !firstNotification.addressed_at ? (firstNotification.viewed_at ? 1 : 0) : 2;
    const secondPriority = secondNotification && !secondNotification.addressed_at ? (secondNotification.viewed_at ? 1 : 0) : 2;
    return firstPriority - secondPriority || new Date(second.created_at) - new Date(first.created_at);
  }), [checkins, notifications]);

  const openEntry = async (entry) => {
    const nextId = expandedId === entry.id ? null : entry.id;
    setExpandedId(nextId);
    const notification = notifications.find((item) => item.checkin_id === entry.id);
    if (nextId && notification && !notification.viewed_at) {
      try {
        await markMentorNotificationViewed(mentorId, notification.id);
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, viewed_at: new Date().toISOString() } : item
        )));
      } catch {
        setError("This request could not be marked as read.");
      }
    }
  };

  const addressRequest = async (notificationId) => {
    setSavingId(notificationId);
    setError("");
    try {
      await respondToMentorRequest(mentorId, notificationId, messages[notificationId] || "");
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? {
          ...item,
          viewed_at: item.viewed_at || now,
          addressed_at: now,
          mentor_message: (messages[notificationId] || "").trim(),
        } : item
      )));
    } catch {
      setError("Your response could not be saved. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const unreadCount = notifications.filter((item) => !item.viewed_at && !item.addressed_at).length;

  return (
    <section className="sensory-support-page" aria-labelledby="sensory-support-heading">
      <header className="sensory-support-header">
        <div>
          <p className="mentor-kicker">STUDENT WELLBEING</p>
          <h1 id="sensory-support-heading">Sensory check-ins</h1>
          <p>Only check-ins shared by students assigned to you appear here.</p>
        </div>
        <div className="support-inbox-actions">
          <div className="support-inbox-count"><Bell size={17} /> {unreadCount} unread</div>
          <button type="button" className="support-refresh" disabled={refreshing} onClick={() => {
            setRefreshing(true);
            setRefreshVersion((value) => value + 1);
          }}>
            <RefreshCw size={16} className={refreshing ? "spinning" : ""} /> Refresh
          </button>
        </div>
      </header>

      {error && <p className="support-inbox-error" role="alert">{error}</p>}
      {sortedEntries.length === 0 ? (
        <div className="support-inbox-empty"><HeartPulse size={23} /><p>No shared check-ins right now.</p></div>
      ) : (
        <div className="support-entry-list">
          {sortedEntries.map((entry) => {
            const student = students.find((item) => item.id === entry.student_id);
            const notification = notifications.find((item) => item.checkin_id === entry.id);
            const requestedHelp = entry.mentor_help !== "none";
            const unread = notification && !notification.viewed_at && !notification.addressed_at;
            const addressed = Boolean(notification?.addressed_at);
            return (
              <article className={`support-entry${requestedHelp ? " requested" : ""}${unread ? " unread" : ""}`} key={entry.id}>
                <button type="button" className="support-entry-toggle" aria-expanded={expandedId === entry.id} onClick={() => openEntry(entry)}>
                  <span className="support-student-avatar">{student?.display_name?.charAt(0)?.toUpperCase() || "S"}</span>
                  <span className="support-entry-summary">
                    <span className="support-entry-name">{student?.display_name || "Student"} <small>{dateTime(entry.created_at)}</small></span>
                    <span className="support-entry-meta">
                      <strong className={`support-mood mood-text-${entry.mood}`}>{moodLabels[entry.mood - 1]}</strong>
                      <span>{(entry.emotions || []).slice(0, 3).map((emotion) => emotionLabels[emotion] || emotion).join(", ") || "No emotions selected"}</span>
                    </span>
                  </span>
                  <span className="support-entry-status">
                    {requestedHelp && <strong className="support-requested-label">Student requested support</strong>}
                    {unread && <span className="support-unread-label">Unread</span>}
                    {addressed && <span className="support-addressed-label"><CheckCircle2 size={14} /> Addressed</span>}
                  </span>
                  <ChevronDown size={18} className={expandedId === entry.id ? "expanded" : ""} aria-hidden="true" />
                </button>

                {expandedId === entry.id && (
                  <div className="support-entry-detail">
                    <div className="support-detail-grid">
                      <p><span>Mood</span><strong>{moodLabels[entry.mood - 1]}</strong></p>
                      {entry.energy !== null && <p><span>Energy</span><strong>{entry.energy}/5</strong></p>}
                      {entry.comfort !== null && <p><span>Comfort</span><strong>{entry.comfort}/5</strong></p>}
                      <p><span>Support requested</span><strong>{mentorHelpOptions.find(([key]) => key === entry.mentor_help)?.[1] || "No"}</strong></p>
                    </div>
                    {entry.day_note && <p className="support-student-message"><span>About their day</span>{entry.day_note}</p>}
                    {entry.overwhelm_note && <p className="support-student-message"><span>What felt overwhelming</span>{entry.overwhelm_note}</p>}
                    {entry.mentor_message && <p className="support-student-message"><span>Message for you</span>{entry.mentor_message}</p>}
                    {entry.causes?.length > 0 && <p className="support-student-message"><span>Possible causes</span>{entry.causes.join(", ")}</p>}
                    {entry.helpful_actions?.length > 0 && <p className="support-student-message"><span>What helped</span>{entry.helpful_actions.join(", ")}</p>}
                    {notification && !addressed && (
                      <div className="support-response">
                        <label htmlFor={`mentor-reply-${notification.id}`}>Optional message to the student</label>
                        <textarea
                          id={`mentor-reply-${notification.id}`}
                          maxLength={2000}
                          rows={3}
                          value={messages[notification.id] || ""}
                          onChange={(event) => setMessages((current) => ({ ...current, [notification.id]: event.target.value }))}
                          placeholder="Write a supportive reply"
                        />
                        <button type="button" className="mentor-primary" disabled={savingId === notification.id} onClick={() => addressRequest(notification.id)}>
                          {savingId === notification.id ? <Clock3 size={16} /> : <Send size={16} />}
                          {savingId === notification.id
                            ? "Saving…"
                            : (messages[notification.id] || "").trim()
                              ? "Send reply and mark addressed"
                              : "Mark addressed"}
                        </button>
                      </div>
                    )}
                    {addressed && notification?.mentor_message && <p className="support-sent-reply"><strong>Your reply:</strong> {notification.mentor_message}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}