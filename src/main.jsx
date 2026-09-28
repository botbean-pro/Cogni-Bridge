import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Accessibility, CheckCircle2, LogIn, LogOut } from "lucide-react";
import "./styles.css";
import { classNames, initialSessions, navigation } from "./constants";
import { AnimatedLogo, MouseTrail, LogoImage } from "./components/Brand";
import { HomePage, SessionsPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { AccessibilityPanel, AuthModal, CreateAccountPage, SignupPage } from "./components/AccessAndAuth";
import { MentorPortal } from "./components/MentorPortal";

function App() {
  const [sessions, setSessions] = useState(initialSessions), [signedIn, setSignedIn] = useState(false), [registeredSessionIds, setRegisteredSessionIds] = useState([]), [subjectFilter, setSubjectFilter] = useState("All subjects"), [activeTab, setActiveTab] = useState("home"), [selectedSession, setSelectedSession] = useState(null), [loginOpen, setLoginOpen] = useState(false), [mentorOpen, setMentorOpen] = useState(false), [accessibilityOpen, setAccessibilityOpen] = useState(false), [appearance, setAppearance] = useState("light"), [textScale, setTextScale] = useState(1), [studentLanguage, setStudentLanguage] = useState("English"), [introExiting, setIntroExiting] = useState(false), [showIntro, setShowIntro] = useState(true);
  const [signupEmail, setSignupEmail] = useState(""), [createAccountOpen, setCreateAccountOpen] = useState(false), [toast, setToast] = useState("");
  useEffect(() => { const exitTimer = setTimeout(() => setIntroExiting(true), 1250); const removeTimer = setTimeout(() => setShowIntro(false), 1800); return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); }; }, []);
  const filteredSessions = useMemo(() => subjectFilter === "All subjects" ? sessions : sessions.filter((s) => s.subject === subjectFilter), [sessions, subjectFilter]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const registerForSession = (sessionId) => { if (registeredSessionIds.includes(sessionId)) return; const session = sessions.find((item) => item.id === sessionId); setRegisteredSessionIds((ids) => ids.includes(sessionId) ? ids : [...ids, sessionId]); notify(`${session?.title || "Session"} registration confirmed`); };
  const logOut = () => { setSignedIn(false); notify("You have been logged out"); };
  const openSession = (session) => { setSelectedSession(session); setActiveTab("sessions"); };
  const goToTab = (tab) => { setActiveTab(tab); if (tab !== "sessions") setSelectedSession(null); };
  if (mentorOpen) return <MentorPortal sessions={sessions} initialLoggedIn onAddSession={(session) => setSessions((items) => [session, ...items])} onBack={() => setMentorOpen(false)} />;
  if (signupEmail) return <SignupPage email={signupEmail} onBack={() => setSignupEmail("")} onComplete={() => { setSignupEmail(""); setSignedIn(true); }} />;
  if (createAccountOpen) return <CreateAccountPage onBack={() => setCreateAccountOpen(false)} onComplete={(email) => { setCreateAccountOpen(false); setSignupEmail(email); }} />;
  return <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
    <MouseTrail />
    {showIntro && <div className={classNames("intro-screen", introExiting && "is-exiting")} aria-label="Loading CogniBridge"><AnimatedLogo /><p>CogniBridge</p></div>}
    <header className="sidebar"><div className="brand"><div className="brand-mark"><LogoImage size={30} /></div><div className="brand-copy"><strong>CogniBridge</strong><span>Learn together</span></div></div><nav className="nav" aria-label="Main navigation">{navigation.map(([Icon, label, tab]) => <button key={label} className={classNames("nav-item", activeTab === tab && "active")} onClick={() => goToTab(tab)}><Icon size={20} /><span>{label}</span></button>)}</nav><div className="top-actions">{signedIn ? <button className="profile-chip" onClick={logOut}><span className="avatar-small">A</span> Alex <LogOut size={16} /></button> : <button className="login-button" onClick={() => setLoginOpen(true)}><LogIn size={18} /> Sign in</button>}</div></header>
    <main className="main">{activeTab === "home" && <HomePage sessions={filteredSessions} subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter} signedIn={signedIn} registeredSessionIds={registeredSessionIds} onSignIn={() => setLoginOpen(true)} onRegister={registerForSession} onOpenSession={openSession} />}{activeTab === "sessions" && <SessionsPage sessions={sessions} selectedSession={selectedSession} signedIn={signedIn} registeredSessionIds={registeredSessionIds} onSelect={setSelectedSession} onBack={() => setSelectedSession(null)} onSignIn={() => setLoginOpen(true)} onRegister={registerForSession} />}{activeTab === "flow" && <FlowPage />}{activeTab === "messages" && <MessagesPage />}</main>
    <button className="accessibility-tab" aria-label="Open accessibility options" onClick={() => setAccessibilityOpen(!accessibilityOpen)}><Accessibility size={21} /><span>Accessibility</span></button>{accessibilityOpen && <AccessibilityPanel textScale={textScale} setTextScale={setTextScale} appearance={appearance} setAppearance={setAppearance} language={studentLanguage} setLanguage={setStudentLanguage} onClose={() => setAccessibilityOpen(false)} />}{loginOpen && <AuthModal onClose={() => setLoginOpen(false)} onStudentSuccess={() => { setLoginOpen(false); setSignedIn(true); }} onCreateAccount={() => { setLoginOpen(false); setCreateAccountOpen(true); }} onMentor={() => { setLoginOpen(false); setMentorOpen(true); }} />}{toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
  </div>;
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);

