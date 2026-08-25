import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Clock3, Globe2, Headphones, Home, LogOut, Menu, MessageCircle, Music2, Plus, Settings, ShieldCheck, Sparkles, UserRound, Users, X } from "lucide-react";
import "./styles.css";

const mainSubjects = [
  { name: "Maths", description: "Solve problems and build confidence with numbers.", icon: "➗", tone: "blue" },
  { name: "Science", description: "Explore experiments, nature, and how things work.", icon: "🔬", tone: "green" },
  { name: "SST", description: "Learn about society, history, and the world around us.", icon: "🌍", tone: "orange" },
  { name: "Languages", description: "Read, write, speak, and connect across languages.", icon: "🗣️", tone: "purple" }
];
const languages = ["German", "French", "Sanskrit", "English", "Hindi"];
const otherSubjects = [
  { name: "Dance", description: "Move, learn routines, and express yourself.", icon: "💃", tone: "purple" },
  { name: "Communication", description: "Practise speaking, listening, and sharing ideas.", icon: "💬", tone: "blue" },
  { name: "Singing", description: "Explore rhythm, voice, and songs together.", icon: "🎵", tone: "green" }
];
const sessions = [
  { subject: "Maths", title: "Algebra Basics", time: "Today, 4:00 PM – 5:00 PM", people: 12 },
  { subject: "Science", title: "The Human Body", time: "Tomorrow, 11:00 AM – 12:00 PM", people: 8 },
  { subject: "English", title: "Reading Together", time: "Wednesday, 4:30 PM – 5:15 PM", people: 6 }
];
const mentorInitialSessions = [
  { id: "algebra-basics", subject: "Maths", title: "Algebra Basics", time: "Today, 4:00 PM - 5:00 PM", attendees: ["Aarav Shah", "Maya Patel", "Noah Wilson"] },
  { id: "human-body", subject: "Science", title: "The Human Body", time: "Tomorrow, 11:00 AM - 12:00 PM", attendees: ["Zoya Khan", "Liam Chen"] },
  { id: "reading-together", subject: "English", title: "Reading Together", time: "Wednesday, 4:30 PM - 5:15 PM", attendees: ["Sofia Martin"] }
];
const subjectGroups = Object.freeze({ main: mainSubjects, other: otherSubjects });
const navigation = Object.freeze([
  [Home, "Home"], [CalendarDays, "My Sessions"], [BookOpen, "Subjects"], [MessageCircle, "Messages"]
]);
const classNames = (...names) => names.filter(Boolean).join(" ");

function App() {
  const [introStage, setIntroStage] = useState("play");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState("main");
  const [activeSubject, setActiveSubject] = useState("");
  const [textScale, setTextScale] = useState(1);
  const [appearance, setAppearance] = useState("light");
  const [mentorPageOpen, setMentorPageOpen] = useState(false);
  const [mentorSessions, setMentorSessions] = useState(mentorInitialSessions);
  const [joinedSessionIds, setJoinedSessionIds] = useState([]);
  const subjectList = subjectGroups[activeGroup] ?? [];
  const selectGroup = (group) => { setActiveGroup(group); setActiveSubject(""); };
  const attendeesFor = (session) => joinedSessionIds.includes(session.id) ? [...session.attendees, "Alex Morgan"] : session.attendees;
  const toggleSessionSignUp = (sessionId) => setJoinedSessionIds((ids) => ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [...ids, sessionId]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setIntroStage("done"); return undefined; }
    const fadeTimer = window.setTimeout(() => setIntroStage("exit"), 1250);
    const finishTimer = window.setTimeout(() => setIntroStage("done"), 1750);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(finishTimer); };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const mentorButton = document.querySelector(".admin-button");
    if (!mentorButton) return undefined;
    mentorButton.textContent = "Mentor page";
    const openMentorPage = () => { setSettingsOpen(false); setMentorPageOpen(true); };
    mentorButton.addEventListener("click", openMentorPage);
    return () => mentorButton.removeEventListener("click", openMentorPage);
  }, [settingsOpen]);

  useEffect(() => {
    const signUpButtons = document.querySelectorAll(".session-row .secondary-btn");
    const controller = new AbortController();
    signUpButtons.forEach((button, index) => {
      const session = mentorSessions[index];
      if (!session) return;
      const isSignedUp = joinedSessionIds.includes(session.id);
      button.textContent = isSignedUp ? "Signed up" : "Sign up";
      const toggleSignUp = () => toggleSessionSignUp(session.id);
      button.addEventListener("click", toggleSignUp, { signal: controller.signal });
      button.dataset.sessionId = session.id;
    });
    return () => controller.abort();
  }, [joinedSessionIds, mentorSessions]);

  if (mentorPageOpen) return <MentorPortal sessions={mentorSessions} attendeesFor={attendeesFor} onAddSession={(session) => setMentorSessions((items) => [session, ...items])} onBack={() => setMentorPageOpen(false)} />;

  return <>{introStage !== "done" && <Intro stage={introStage} />}<div style={{ "--text-scale": textScale }} className={classNames("app", `theme-${appearance}`, introStage === "done" && "page-ready", sidebarOpen ? "" : "sidebar-closed")}>
    <aside className={`sidebar ${sidebarOpen ? "" : "minimized"}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={27} /></div><div className="brand-copy"><strong>CogniBridge</strong><span>Learn together</span></div><button className="sidebar-toggle" aria-label={sidebarOpen ? "Minimize sidebar" : "Expand sidebar"} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X size={19} /> : <Menu size={20} />}</button></div>
      <nav className="nav" aria-label="Main navigation">{navigation.map(([Icon, label], index) => <button key={label} className={classNames("nav-item", index === 0 && "active")}><Icon size={20} /><span>{label}</span></button>)}</nav>
      <div className="help-card"><Headphones size={25} /><h3>Need Help?</h3><p>We’re here to support you.</p><button>Contact Support</button></div>
    </aside>
    <main className="main"><header className="topbar"><div><h1>Welcome to CogniBridge <span aria-hidden="true">👋</span></h1><p>A place to learn, practise, and grow together.</p></div><div className="top-actions"><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={20} /> Settings</button></div></header>
      <section className="content home-content"><div className="section-title"><h2>What would you like to learn?</h2><p>Choose a category to see its subjects.</p></div>
        <div className="category-tabs" role="tablist"><button className={activeGroup === "main" ? "selected" : ""} onClick={() => selectGroup("main")}><BookOpen size={20} /> Main Subjects</button><button className={activeGroup === "other" ? "selected" : ""} onClick={() => selectGroup("other")}><Music2 size={20} /> Other Subjects</button></div>
        {activeGroup === "main" && activeSubject === "Languages" ? <section className="language-panel"><button className="back-button" onClick={() => setActiveSubject("")}>← All main subjects</button><h2>Choose a language</h2><div className="language-grid">{languages.map((language) => <button key={language} onClick={() => setActiveSubject(language)}><Globe2 size={22} /> {language}<ChevronRight size={18} /></button>)}</div></section> : <div className="subject-grid">{subjectList.map((subject) => <button key={subject.name} className={classNames("subject-card", subject.tone, activeSubject === subject.name && "selected")} onClick={() => setActiveSubject(subject.name)}><div className="subject-icon" aria-hidden="true">{subject.icon}</div><h3>{subject.name}</h3><p>{subject.description}</p><span className="outline-btn">Explore <ChevronRight size={16} /></span></button>)}</div>}
        {activeSubject && activeSubject !== "Languages" && <p className="selection-note">{activeSubject} selected — sessions for this subject will appear here.</p>}
        <section className="panel sessions-panel"><div className="panel-header"><h2>Upcoming Sessions</h2><button className="link-btn">View all <ChevronRight size={17} /></button></div>{sessions.map((session) => <div className="session-row" key={session.title}><div className="session-icon blue"><CalendarDays size={23} /></div><div className="session-info"><strong>{session.subject} — {session.title}</strong><span>{session.time}</span><small><Users size={15} /> {session.people} learners</small></div><button className="secondary-btn">View Details</button></div>)}</section>
      </section></main>
    {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><h2 id="settings-title">Settings</h2><p>Personalize your learning space.</p></div><button className="icon-btn" aria-label="Close settings" onClick={() => setSettingsOpen(false)}><X size={20} /></button></div><label className="setting-row text-size-control"><span><strong>Text size</strong><small>{Math.round(textScale * 100)}% — adjust from 85% to 135%.</small></span><input type="range" min="0.85" max="1.35" step="0.05" value={textScale} aria-label="Text size" onChange={(event) => setTextScale(Number(event.target.value))} /></label><fieldset className="appearance-options"><legend>Appearance</legend>{[["light", "Light mode"], ["dark", "Dark mode"], ["light-contrast", "Light contrast"], ["dark-contrast", "Dark contrast"]].map(([value, label]) => <label key={value}><input type="radio" name="appearance" value={value} checked={appearance === value} onChange={() => setAppearance(value)} /> {label}</label>)}</fieldset><button className="admin-button"><ShieldCheck size={19} /> Admin area <ChevronRight size={17} /></button></section></div>}
  </div></>;
}

function Intro({ stage }) {
  return <div className={`intro-screen ${stage === "exit" ? "is-exiting" : ""}`} aria-hidden="true"><div className="intro-mark"><span className="intro-half intro-left"><Sparkles size={76} strokeWidth={1.8} /></span><span className="intro-half intro-right"><Sparkles size={76} strokeWidth={1.8} /></span></div><p>CogniBridge</p></div>;
}

function MentorPortal({ sessions, attendeesFor, onAddSession, onBack }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", subject: "Maths", date: "", time: "" });
  const totalSignUps = sessions.reduce((total, session) => total + attendeesFor(session).length, 0);

  const login = (event) => {
    event.preventDefault();
    if (email === "mentor@cognibridge.test" && password === "mentor123") { setLoggedIn(true); setError(""); return; }
    setError("Use the demo credentials shown below.");
  };

  const publishSession = (event) => {
    event.preventDefault();
    if (!form.title || !form.date || !form.time) return;
    onAddSession({ id: String(Date.now()), title: form.title, subject: form.subject, time: `${form.date} - ${form.time}`, attendees: [], people: 0 });
    setForm({ title: "", subject: "Maths", date: "", time: "" });
    setTab("overview");
  };

  if (!loggedIn) return <main className="mentor-login-page"><button className="mentor-back" onClick={onBack}><ArrowLeft size={18} /> Back to learner view</button><section className="mentor-login-card"><div className="mentor-logo-mark"><span className="mentor-logo-half mentor-logo-left"><Sparkles size={70} /></span><span className="mentor-logo-half mentor-logo-right"><Sparkles size={70} /></span></div><p className="mentor-kicker">COGNIBRIDGE</p><h1>Mentor portal</h1><p>Plan sessions and keep every learner on track.</p><form className="mentor-login-form" onSubmit={login}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="mentor@cognibridge.test" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="mentor123" required /></label>{error && <p className="mentor-error">{error}</p>}<button className="mentor-primary" type="submit">Sign in <ChevronRight size={18} /></button></form><small>Demo login: mentor@cognibridge.test / mentor123</small></section></main>;

  return <main className="mentor-page"><header className="mentor-header"><button className="mentor-wordmark" onClick={onBack}><span><Sparkles size={21} /></span><strong>CogniBridge <small>Mentor portal</small></strong></button><div><span className="mentor-user"><UserRound size={17} /> Priya Sharma</span><button className="mentor-logout" onClick={() => setLoggedIn(false)}><LogOut size={17} /> Log out</button></div></header><div className="mentor-layout"><aside className="mentor-nav"><p>MENTOR SPACE</p><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><Home size={18} /> Overview</button><button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}><CalendarDays size={18} /> Schedule a session</button><button className={tab === "signups" ? "active" : ""} onClick={() => setTab("signups")}><Users size={18} /> Session sign-ups</button></aside><section className="mentor-content">{tab === "overview" && <><div className="mentor-hero"><div><p className="mentor-kicker">MENTOR DASHBOARD</p><h1>Good morning, Priya.</h1><span>{sessions.length} sessions are ready for your learners.</span></div><button className="mentor-primary" onClick={() => setTab("schedule")}><Plus size={18} /> Schedule session</button></div><div className="mentor-stats"><article><CalendarDays size={21} /><strong>{sessions.length}</strong><span>Upcoming sessions</span></article><article><Users size={21} /><strong>{totalSignUps}</strong><span>Total sign-ups</span></article><article><CheckCircle2 size={21} /><strong>{sessions.filter((session) => attendeesFor(session).length > 0).length}</strong><span>Sessions with learners</span></article></div><h2 className="mentor-title">Upcoming sessions</h2><div className="mentor-session-grid">{sessions.map((session) => <MentorSessionCard key={session.id} session={session} attendees={attendeesFor(session)} />)}</div></>}{tab === "schedule" && <><p className="mentor-kicker">NEW SESSION</p><h1 className="mentor-title">Schedule a session</h1><p className="mentor-subtitle">This will be visible on the learner home page right away.</p><form className="schedule-form" onSubmit={publishSession}><label>Session title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Fractions workshop" required /></label><label>Subject<select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>{["Maths", "Science", "English", "Languages", "SST"].map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>Time<input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required /></label><button className="mentor-primary" type="submit"><CalendarDays size={18} /> Publish session</button></form></>}{tab === "signups" && <><p className="mentor-kicker">LEARNERS</p><h1 className="mentor-title">Session sign-ups</h1><p className="mentor-subtitle">See every learner who signed up from the main page.</p><div className="mentor-session-grid">{sessions.map((session) => <MentorSessionCard key={session.id} session={session} attendees={attendeesFor(session)} showNames />)}</div></>}</section></div></main>;
}

function MentorSessionCard({ session, attendees, showNames }) {
  return <article className="mentor-session-card"><span className="mentor-subject">{session.subject}</span><p className="mentor-time"><Clock3 size={14} /> {session.time}</p><h3>{session.title}</h3><p className="mentor-attendee-count"><Users size={16} /> {attendees.length} learner{attendees.length === 1 ? "" : "s"} signed up</p>{showNames && <ul className="attendee-list">{attendees.length ? attendees.map((name) => <li key={name}><span>{name.slice(0, 1)}</span>{name}</li>) : <li className="empty-attendees">No learner sign-ups yet.</li>}</ul>}</article>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
