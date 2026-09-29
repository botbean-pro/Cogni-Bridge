import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, CheckCircle2 } from "lucide-react";
import { classNames, initialSessions } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage, SignupPage } from "./components/AccessAndAuth";
import { HomePage, SessionsPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";

const App = () => {
  const [sessions, setSessions] = useState(initialSessions);
  const [signedIn, setSignedIn] = useState(false);
  const [registeredSessionIds, setRegisteredSessionIds] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("All subjects");
  const [activeTab, setActiveTab] = useState("home");
  const [selectedSession, setSelectedSession] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [appearance, setAppearance] = useState("light");
  const [textScale, setTextScale] = useState(1);
  const [studentLanguage, setStudentLanguage] = useState("English");
  const [introExiting, setIntroExiting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const exitTimer = setTimeout(() => setIntroExiting(true), 1250);
    const removeTimer = setTimeout(() => setShowIntro(false), 1800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const filteredSessions = useMemo(() => (
    subjectFilter === "All subjects"
      ? sessions
      : sessions.filter((session) => session.subject === subjectFilter)
  ), [sessions, subjectFilter]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const registerForSession = (sessionId) => {
    if (registeredSessionIds.includes(sessionId)) return;

    const session = sessions.find((item) => item.id === sessionId);
    setRegisteredSessionIds((ids) => (
      ids.includes(sessionId) ? ids : [...ids, sessionId]
    ));
    notify(`${session?.title || "Session"} registration confirmed`);
  };

  const logOut = () => {
    setSignedIn(false);
    notify("You have been logged out");
  };

  const openSession = (session) => {
    setSelectedSession(session);
    setActiveTab("sessions");
  };

  const goToTab = (tab) => {
    setActiveTab(tab);
    if (tab !== "sessions") setSelectedSession(null);
  };

  if (mentorOpen) {
    return (
      <MentorPortal
        sessions={sessions}
        initialLoggedIn
        onAddSession={(session) => setSessions((items) => [session, ...items])}
        onBack={() => setMentorOpen(false)}
      />
    );
  }

  if (signupEmail) {
    return (
      <SignupPage
        email={signupEmail}
        onBack={() => setSignupEmail("")}
        onComplete={() => {
          setSignupEmail("");
          setSignedIn(true);
        }}
      />
    );
  }

  if (createAccountOpen) {
    return (
      <CreateAccountPage
        onBack={() => setCreateAccountOpen(false)}
        onComplete={(email) => {
          setCreateAccountOpen(false);
          setSignupEmail(email);
        }}
      />
    );
  }

  return (
    <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
      <StudentPage
        activeTab={activeTab}
        goToTab={goToTab}
        signedIn={signedIn}
        onLogin={() => setLoginOpen(true)}
        onLogout={logOut}
        showIntro={showIntro}
        introExiting={introExiting}
        accessibilityOpen={accessibilityOpen}
        onToggleAccessibility={() => setAccessibilityOpen((isOpen) => !isOpen)}
        accessibilityPanel={(
          <AccessibilityPanel
            textScale={textScale}
            setTextScale={setTextScale}
            appearance={appearance}
            setAppearance={setAppearance}
            language={studentLanguage}
            setLanguage={setStudentLanguage}
            onClose={() => setAccessibilityOpen(false)}
          />
        )}
        pageContent={{
          home: <HomePage sessions={filteredSessions} subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter} signedIn={signedIn} registeredSessionIds={registeredSessionIds} onSignIn={() => setLoginOpen(true)} onRegister={registerForSession} onOpenSession={openSession} />,
          sessions: <SessionsPage sessions={sessions} selectedSession={selectedSession} signedIn={signedIn} registeredSessionIds={registeredSessionIds} onSelect={setSelectedSession} onBack={() => setSelectedSession(null)} onSignIn={() => setLoginOpen(true)} onRegister={registerForSession} />,
          flow: <FlowPage />,
          messages: <MessagesPage />,
        }}
      />
      {loginOpen && (
        <AuthModal
          onClose={() => setLoginOpen(false)}
          onStudentSuccess={() => {
            setLoginOpen(false);
            setSignedIn(true);
          }}
          onCreateAccount={() => {
            setLoginOpen(false);
            setCreateAccountOpen(true);
          }}
          onMentor={() => {
            setLoginOpen(false);
            setMentorOpen(true);
          }}
        />
      )}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  );
};

export default App;