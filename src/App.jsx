import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, CheckCircle2, UserRound } from "lucide-react";
import { classNames, initialSessions, readStudents } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, SessionsPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { readStudentActivities, recordStudentAttendance } from "./studentActivity";
import { translate } from "./i18n";

const App = () => {
  const [sessions, setSessions] = useState(initialSessions);
  const [signedIn, setSignedIn] = useState(false);
  const [registeredSessionIds, setRegisteredSessionIds] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [scrollToAbout, setScrollToAbout] = useState(false);
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
  const t = useMemo(
    () => (key, values) => translate(studentLanguage, key, values),
    [studentLanguage],
  );
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
    if (activeTab !== "about" || !scrollToAbout) return;

    document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" });
    setScrollToAbout(false);
  }, [activeTab, scrollToAbout]);

  useEffect(() => {
    document.documentElement.lang = ({
      English: "en",
      Hindi: "hi",
      Bengali: "bn",
      Telugu: "te",
      Marathi: "mr",
      Tamil: "ta",
      Gujarati: "gu",
      Kannada: "kn",
      Malayalam: "ml",
      Punjabi: "pa",
    })[studentLanguage] || "en";
  }, [studentLanguage]);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIntroExiting(true), 1250);
    const removeTimer = setTimeout(() => setShowIntro(false), 1800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

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
    notify(t("registrationConfirmed", { title: session?.title || "Session" }));
  };

  const markSessionAttended = (session) => {
    if (!signedIn || !studentEmail) {
      notify(t("signInToSaveAttendance"));
      return;
    }
    try {
      const recorded = recordStudentAttendance(studentEmail, session);
      if (!recorded) {
        notify(t("attendanceAlreadyRecorded"));
        return;
      }
      setActivityVersion((version) => version + 1);
      notify(t("attendanceRecordedToast"));
    } catch {
      notify(t("attendanceSaveError"));
    }
  };

  const logOut = () => {
    setSignedIn(false);
    setStudentProfile(null);
    setStudentEmail("");
    setAttendedSessionIds(new Set());
    notify(t("loggedOut"));
  };

  const goToTab = (tab) => {
    if (tab === "about") {
      setActiveTab("about");
      setScrollToAbout(true);
      setSelectedSession(null);
      return;
    }

    if (tab === "home" && activeTab === "about") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setActiveTab(tab);
    if (tab !== "sessions") setSelectedSession(null);
  };

  if (mentorOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <MentorPortal
          sessions={sessions}
          initialLoggedIn
          t={t}
          onAddSession={(session) => setSessions((items) => [session, ...items])}
          onUpdateSession={(updatedSession) => setSessions((items) => items.map((session) => (
            session.id === updatedSession.id ? { ...session, ...updatedSession } : session
          )))}
          onBack={() => setMentorOpen(false)}
        />
        <button
          className="accessibility-tab"
          aria-label={t("openAccessibility")}
          aria-expanded={accessibilityOpen}
          onClick={() => setAccessibilityOpen((isOpen) => !isOpen)}
        >
          <Accessibility size={21} />
          <span>{t("accessibility")}</span>
        </button>
        {accessibilityOpen && (
          <AccessibilityPanel
            textScale={textScale}
            setTextScale={setTextScale}
            appearance={appearance}
            setAppearance={setAppearance}
            language={studentLanguage}
            setLanguage={setStudentLanguage}
            t={t}
            onClose={() => setAccessibilityOpen(false)}
          />
        )}
      </div>
    );
  }

  if (signupEmail) {
    return (
      <StudentProfileFlow
        email={signupEmail}
        t={t}
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
        t={t}
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
        t={t}
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
        t={t}
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
            t={t}
            onClose={() => setAccessibilityOpen(false)}
          />
        )}
        pageContent={{
          home: (
            <HomePage
              signedIn={signedIn}
              t={t}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              onSignIn={() => setLoginOpen(true)}
              onExploreSessions={() => goToTab("sessions")}
            />
          ),
          sessions: (
            <SessionsPage
              sessions={sessions}
              selectedSession={selectedSession}
              signedIn={signedIn}
              t={t}
              registeredSessionIds={registeredSessionIds}
              attendedSessionIds={attendedSessionIds}
              onSelect={setSelectedSession}
              onBack={() => setSelectedSession(null)}
              onSignIn={() => setLoginOpen(true)}
              onRegister={registerForSession}
              onMarkAttended={markSessionAttended}
            />
          ),
          flow: <FlowPage t={t} />,
          messages: <MessagesPage t={t} />,
        }}
      />
      {signedIn &&       <button className="student-account-button" onClick={() => setProfileOpen(true)}><UserRound size={17} /> {t("myAccount")}</button>}
      {loginOpen && (
        <AuthModal
          t={t}
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
