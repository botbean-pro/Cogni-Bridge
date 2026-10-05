import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, CheckCircle2, UserRound } from "lucide-react";
import { classNames, initialSessions, readStudents } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, SessionsPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { readStudentActivities, recordStudentAttendance } from "./studentActivity";

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
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [activityVersion, setActivityVersion] = useState(0);
  const [attendedSessionIds, setAttendedSessionIds] = useState(new Set());
  const [profileOpen, setProfileOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [toast, setToast] = useState("");
  const studentName = studentProfile?.name?.trim()
    || studentEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    || "Student";

  useEffect(() => {
    if (!signedIn || !studentEmail) {
      setAttendedSessionIds(new Set());
      return;
    }
    try {
      setAttendedSessionIds(new Set(
        readStudentActivities(studentEmail).map((activity) => activity.sessionId),
      ));
    } catch {
      setAttendedSessionIds(new Set());
    }
  }, [signedIn, studentEmail, activityVersion]);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", textScale);
  }, [textScale]);

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

  const markSessionAttended = (session) => {
    if (!signedIn || !studentEmail) {
      notify("Sign in with your student account email to save attendance.");
      return;
    }
    try {
      const recorded = recordStudentAttendance(studentEmail, session);
      if (!recorded) {
        notify("Attendance for this session is already recorded.");
        return;
      }
      setActivityVersion((version) => version + 1);
      notify("Session attendance recorded.");
    } catch {
      notify("Attendance could not be saved. Check browser storage and try again.");
    }
  };

  const logOut = () => {
    setSignedIn(false);
    setStudentProfile(null);
    setStudentEmail("");
    setAttendedSessionIds(new Set());
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
      <StudentProfileFlow
        email={signupEmail}
        onBack={() => setSignupEmail("")}
        onComplete={(profile) => {
          setSignupEmail("");
          setStudentProfile(profile);
          setStudentEmail(profile.email);
          setSignedIn(true);
        }}
      />
    );
  }

  if (profileOpen) {
    return (
      <StudentProfileFlow
        email={studentProfile?.email || studentEmail}
        existingProfile={studentProfile}
        onBack={() => setProfileOpen(false)}
        onComplete={(profile) => {
          setStudentProfile(profile);
          setProfileOpen(false);
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
        studentName={studentName}
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
          home: (
            <HomePage
              sessions={filteredSessions}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
              signedIn={signedIn}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              registeredSessionIds={registeredSessionIds}
              onSignIn={() => setLoginOpen(true)}
              onRegister={registerForSession}
              onOpenSession={openSession}
            />
          ),
          sessions: (
            <SessionsPage
              sessions={sessions}
              selectedSession={selectedSession}
              signedIn={signedIn}
              registeredSessionIds={registeredSessionIds}
              attendedSessionIds={attendedSessionIds}
              onSelect={setSelectedSession}
              onBack={() => setSelectedSession(null)}
              onSignIn={() => setLoginOpen(true)}
              onRegister={registerForSession}
              onMarkAttended={markSessionAttended}
            />
          ),
          flow: <FlowPage />,
          messages: <MessagesPage />,
        }}
      />
      {signedIn && <button className="student-account-button" onClick={() => setProfileOpen(true)}><UserRound size={17} /> My account</button>}
      {loginOpen && (
        <AuthModal
          onClose={() => setLoginOpen(false)}
          onStudentSuccess={(email) => {
            setLoginOpen(false);
            const normalizedEmail = email?.toLowerCase() || "";
            const savedStudent = normalizedEmail
              ? readStudents().find((student) => student.email.toLowerCase() === normalizedEmail)
              : null;
            setStudentProfile(savedStudent || null);
            setStudentEmail(normalizedEmail);
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
