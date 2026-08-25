import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, CalendarDays, ChevronRight, Globe2, Headphones, Home, Menu, MessageCircle, Music2, Settings, ShieldCheck, Sparkles, Users, X } from "lucide-react";
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
  const subjectList = subjectGroups[activeGroup] ?? [];
  const selectGroup = (group) => { setActiveGroup(group); setActiveSubject(""); };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) { setIntroStage("done"); return undefined; }
    const fadeTimer = window.setTimeout(() => setIntroStage("exit"), 1250);
    const finishTimer = window.setTimeout(() => setIntroStage("done"), 1750);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(finishTimer); };
  }, []);

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

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
