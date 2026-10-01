import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText, MessageCircle, Sparkles, UserRound, Users } from "lucide-react";
import logoWithoutText from "../assets/logo without text.svg";
import { classNames, formatSession, subjects } from "../constants";

function HomePage({ sessions, subjectFilter, setSubjectFilter, signedIn, registeredSessionIds, onSignIn, onRegister, onOpenSession }) { return <section className="content home-content"><section className="sessions-section"><div className="section-title"><div><p className="eyebrow">PLAN AHEAD</p><h2>Upcoming sessions</h2><p>Choose a session to see exactly what you will learn.</p></div><span className="session-count">{sessions.length} sessions</span></div><div className="filter-bar" aria-label="Filter sessions by subject"><span>Filter by subject</span><button className={subjectFilter === "All subjects" ? "selected" : ""} onClick={() => setSubjectFilter("All subjects")}>All subjects</button>{subjects.map((subject) => <button key={subject} className={subjectFilter === subject ? "selected" : ""} onClick={() => setSubjectFilter(subject)}>{subject}</button>)}</div>{sessions.length ? <div className="session-card-grid">{sessions.map((session) => <SessionCard key={session.id} session={session} signedIn={signedIn} registered={registeredSessionIds.includes(session.id)} onSignIn={onSignIn} onRegister={() => onRegister(session.id)} onOpen={() => onOpenSession(session)} />)}</div> : <div className="empty-state">No sessions found for this subject.</div>}</section>{signedIn && <StudentStats sessions={sessions} />}</section>; }
function SessionCard({ session, signedIn, registered, onSignIn, onRegister, onOpen }) { return <article className="session-card" onClick={onOpen} tabIndex="0" onKeyDown={(event) => event.key === "Enter" && onOpen()}><div className="session-card-top"><span className="subject-pill">{session.subject}</span><CalendarDays size={21} /></div><h3>{session.title}</h3><p className="session-description">{session.description}</p><p className="session-time"><Clock3 size={15} /> {formatSession(session)}</p><p className="session-learners"><Users size={15} /> {session.attendees + (registered ? 1 : 0)} learners signed up</p><div className="session-card-footer" onClick={(event) => event.stopPropagation()}>{registered ? <a className="meet-status meet-link" href={session.meetLink} target="_blank" rel="noopener noreferrer">Join Google Meet <ChevronRight size={15} /></a> : <span className="meet-status">{signedIn ? "Meet link unlocks after registration" : "Sign in to register"}</span>}<button className={classNames("secondary-btn", registered && "registered-button")} onClick={signedIn ? onRegister : onSignIn}>{registered ? "Registered" : signedIn ? "Register" : "Sign in"}</button></div><span className="card-detail-hint">View learning plan <ChevronRight size={14} /></span></article>; }
function SessionsPage({ sessions, selectedSession, signedIn, registeredSessionIds, onSelect, onBack, onSignIn, onRegister }) { return <section className="content sessions-page"><div className="section-title"><div><p className="eyebrow">LEARNING PLAN</p><h2>Sessions</h2><p>Open a session to see its learning plan and join when it is time.</p></div></div>{selectedSession ? <div className="session-detail"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Back to Sessions</button><div className="detail-header"><div><span className="subject-pill">{selectedSession.subject}</span><h1>{selectedSession.title}</h1><p>{selectedSession.description}</p><p className="session-time"><Clock3 size={15} /> {formatSession(selectedSession)}</p></div><CalendarDays size={42} /></div><div className="detail-columns"><div><h3>What youâ€™ll learn</h3><ul>{selectedSession.learn.map((item) => <li key={item}><CheckCircle2 size={18} /> {item}</li>)}</ul></div><div className="detail-action"><strong>Ready to learn together?</strong><span>{selectedSession.attendees} learners are signed up.</span><button className="primary-btn" onClick={signedIn ? () => onRegister(selectedSession.id) : onSignIn}>{registeredSessionIds.includes(selectedSession.id) ? "Registered" : signedIn ? "Register for session" : "Sign in to register"}</button>{registeredSessionIds.includes(selectedSession.id) && <a href={selectedSession.meetLink} target="_blank" rel="noopener noreferrer">Open Google Meet <ChevronRight size={15} /></a>}</div></div></div> : <div className="my-session-list">{sessions.map((session) => <button key={session.id} className="my-session-row" onClick={() => onSelect(session)}><span className="subject-pill">{session.subject}</span><span><strong>{session.title}</strong><small>{formatSession(session)}</small></span><ChevronRight size={18} /></button>)}</div>}</section>; }
function FlowPage() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", content: "Hi! I'm Cogni-Flow AI, your learning buddy. I can help you understand tricky concepts, practice problems, or create study plans. What would you like to work on today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response with a delay
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me break it down for you step by step...",
        "I'd be happy to help you with that. Here's what you need to know...",
        "Let's work through this together. First, let's understand the basics...",
        "Good thinking! Here's a way to approach this problem...",
        "I can help you understand this concept better. Let me explain..."
      ];

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const quickPrompts = [
    { icon: BookOpen, text: "Explain algebra to me", prompt: "Can you explain basic algebra concepts?" },
    { icon: CheckCircle2, text: "Help with homework", prompt: "I need help with my homework" },
    { icon: Sparkles, text: "Create a study plan", prompt: "Can you help me create a study plan?" },
    { icon: FileText, text: "Practice questions", prompt: "Give me some practice questions" }
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <section className="content ai-chat-page">
      <div className="ai-chat-container">
        <div className="ai-chat-header">
          <div className="ai-header-content">
            <div className="ai-header-icon">
              <img src={logoWithoutText} alt="" aria-hidden="true" />
            </div>
            <div>
              <h2>Cogni-Flow AI</h2>
              <p>Your personal learning assistant</p>
            </div>
          </div>
          <span className="ai-status">
            <span className="status-dot"></span>
            Online
          </span>
        </div>

        <div className="ai-chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role}`}>
              <div className="message-avatar">
                {message.role === "assistant" ? (
                  <Sparkles size={18} />
                ) : (
                  <UserRound size={18} />
                )}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="ai-message assistant">
              <div className="message-avatar">
                <Sparkles size={18} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="quick-prompts">
            <p className="quick-prompts-title">Try asking:</p>
            <div className="quick-prompts-grid">
              {quickPrompts.map((item, index) => (
                <button
                  key={index}
                  className="quick-prompt-btn"
                  onClick={() => handleQuickPrompt(item.prompt)}
                >
                  <item.icon size={18} />
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="ai-chat-input-form" onSubmit={sendMessage}>
          <div className="ai-input-wrapper">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask me anything about your learning..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="ai-disclaimer">
            Cogni-Flow AI can make mistakes. Always verify important information.
          </p>
        </form>
      </div>
    </section>
  );
}
function MessagesPage() { return <section className="content feature-page"><div className="empty-feature"><MessageCircle size={32} /><p className="eyebrow">MESSAGES</p><h2>Stay connected with your mentor</h2><p>Mentor messages and session reminders will appear here.</p><button className="primary-btn">Messages coming soon</button></div></section>; }
function StudentStats({ sessions }) { return <section className="stats-section"><div className="section-title"><div><p className="eyebrow">YOUR PROGRESS</p><h2>Student stats</h2><p>Small steps add up. Keep going, Alex.</p></div></div><div className="stats-grid"><article><span className="stat-icon"><CheckCircle2 size={21} /></span><strong>8</strong><span>Sessions attended</span></article><article><span className="stat-icon"><Clock3 size={21} /></span><strong>6.5h</strong><span>Learning time</span></article><article><span className="stat-icon"><BookOpen size={21} /></span><strong>{new Set(sessions.map((s) => s.subject)).size}</strong><span>Subjects explored</span></article><article><span className="stat-icon"><Sparkles size={21} /></span><strong>4</strong><span>Day learning streak</span></article></div></section>; }
export { HomePage, SessionCard, SessionsPage, FlowPage, MessagesPage, StudentStats };

