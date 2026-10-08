import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, CheckCircle2 } from "lucide-react";
import { classNames, demoStudents, initialSessions, readStudents } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, AboutPage, SessionsPage, StudyPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { LeaderboardPage } from "./components/student/pages/LeaderboardPage";
import { SettingsPage } from "./components/student/pages/SettingsPage";
import { SensoryTrackerPage } from "./components/student/pages/SensoryTrackerPage";
import { readStudentActivities, recordStudentAttendance } from "./studentActivity";
import { fetchSessions } from "./mentorContent";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { translate } from "./i18n";
import { CareerOptionsPage } from "./components/student/pages/CareerOptionsPage";
import { PremiumFlowPage } from "./components/student/pages/PremiumFlowPage";

const App = () => {
  const [sessions, setSessions] = useState(initialSessions);
  const [learningNotes, setLearningNotes] = useState([]);
  const [signedIn, setSignedIn] = useState(false);
  const [registeredSessionIds, setRegisteredSessionIds] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [scrollToAboutOnHome, setScrollToAboutOnHome] = useState(false);
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
  const [authUserId, setAuthUserId] = useState(null);
  const [authRole, setAuthRole] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [activityVersion, setActivityVersion] = useState(0);
  const [attendedSessionIds, setAttendedSessionIds] = useState(new Set());
  const [profileOpen, setProfileOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [premiumCartPlan, setPremiumCartPlan] = useState(null);
  const [premiumCheckoutOpen, setPremiumCheckoutOpen] = useState(false);
  const [pendingPremiumLogin, setPendingPremiumLogin] = useState(false);
  const t = useMemo(
    () => (key, values) => translate(studentLanguage, key, values),
    [studentLanguage],
  );
  const studentName = studentProfile?.name?.trim()
    || studentEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    || "Student";
  const sensoryTrackerEnabled = Boolean(
    signedIn && supabaseConfigured && authUserId && authRole === "student",
  );
  const classLabel = String(studentProfile?.studentClass || "").trim().toLowerCase();
  const isGrade12 = /(^|[^a-z0-9])(12(?:th)?|xii|twelfth)(?=$|[^a-z0-9])/.test(classLabel);

  const scrollToAbout = () => {
    const aboutSection = document.getElementById("about-us");
    aboutSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (supabaseConfigured) return;
    const students = readStudents();
    const existingEmails = new Set(students.map((student) => student.email?.toLowerCase()));
    const missingDemoStudents = demoStudents
      .filter((student) => !existingEmails.has(student.email))
      .map((student) => ({ ...student, createdAt: new Date().toISOString() }));
    if (missingDemoStudents.length) {
      localStorage.setItem("cognibridge_students", JSON.stringify([...students, ...missingDemoStudents]));
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let isCurrent = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isCurrent) {
        setAuthSession(session);
        setAuthReady(true);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (isCurrent && !error) {
        setAuthSession(data.session);
        setAuthReady(true);
      }
    });
    return () => {
      isCurrent = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !authReady) return undefined;
    if (!authSession?.user) {
      setAuthUserId(null);
      setAuthRole(null);
      setSignedIn(false);
      setStudentProfile(null);
      setStudentEmail("");
      setMentorOpen(false);
      if (activeTab === "sensory") setActiveTab("home");
      return undefined;
    }

    let isCurrent = true;
    const user = authSession.user;
    supabase.from("profiles")
      .select("id, display_name, role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile, error }) => {
        if (!isCurrent) return;
        if (error || !profile) {
          supabase.auth.signOut();
          return;
        }
        setAuthUserId(user.id);
        setAuthRole(profile.role);
        if (profile.role === "student") {
          setMentorOpen(false);
          setSignedIn(true);
          setStudentEmail(user.email || "");
          setStudentProfile({ id: user.id, email: user.email, name: profile.display_name });
          setActiveTab((currentTab) => currentTab === "home" ? "study" : currentTab);
        } else if (profile.role === "mentor") {
          setSignedIn(false);
          setMentorOpen(true);
        } else {
          supabase.auth.signOut();
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [authSession, authReady]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let isCurrent = true;
    fetchSessions()
      .then((rows) => {
        if (isCurrent) setSessions(rows);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "home" || !scrollToAboutOnHome) return;

    scrollToAbout();
    setScrollToAboutOnHome(false);
  }, [activeTab, scrollToAboutOnHome]);

  useEffect(() => {
    if (!sensoryTrackerEnabled && activeTab === "sensory") setActiveTab("home");
  }, [sensoryTrackerEnabled, activeTab]);

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
      French: "fr",
      German: "de",
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
    if (supabaseConfigured) supabase.auth.signOut();
    setSignedIn(false);
    setAuthUserId(null);
    setAuthRole(null);
    setActiveTab("home");
    setStudentProfile(null);
    setStudentEmail("");
    setAttendedSessionIds(new Set());
    notify(t("loggedOut"));
  };

  const goToTab = (tab) => {
    if (tab === "sensory" && !sensoryTrackerEnabled) return;
    if (tab === "careers" && (!signedIn || !isGrade12)) return;
    if (tab === "about") {
      setActiveTab("about");
      setSelectedSession(null);
      scrollToAbout();
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
          notes={learningNotes}
          initialLoggedIn
          mentorId={authRole === "mentor" ? authUserId : null}
          t={t}
          onAddSession={(session) => setSessions((items) => [session, ...items])}
          onUpdateSession={(updatedSession) => setSessions((items) => items.map((session) => (
            session.id === updatedSession.id ? { ...session, ...updatedSession } : session
          )))}
          onAddNote={(note) => setLearningNotes((items) => [note, ...items])}
          onLoadNotes={setLearningNotes}
          onBack={() => {
            setMentorOpen(false);
            if (supabaseConfigured) supabase.auth.signOut();
          }}
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
            showLanguage
            t={t}
            onClose={() => setAccessibilityOpen(false)}
          />
        )}
      </div>
    );
  }

  if (signupEmail) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentProfileFlow
          email={signupEmail}
          t={t}
          onBack={() => setSignupEmail("")}
          onComplete={(profile) => {
            setSignupEmail("");
            setStudentProfile(profile);
            setStudentEmail(profile.email);
            setSignedIn(true);
            setActiveTab(pendingPremiumLogin ? "premium" : "study");
            setPendingPremiumLogin(false);
          }}
        />
      </div>
    );
  }

  if (profileOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
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
      </div>
    );
  }

  if (createAccountOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <CreateAccountPage
          t={t}
          onBack={() => setCreateAccountOpen(false)}
          onComplete={(email) => {
            setCreateAccountOpen(false);
            if (typeof email === "object") {
              setStudentEmail(email.email);
              setStudentProfile({ id: email.id, email: email.email, name: email.name });
              setAuthUserId(email.id);
              setAuthRole("student");
              setSignedIn(true);
              setActiveTab("study");
            } else {
              setSignupEmail(email);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
      <StudentPage
        activeTab={activeTab}
        goToTab={goToTab}
        signedIn={signedIn}
        sensoryTrackerEnabled={sensoryTrackerEnabled}
        isGrade12={isGrade12}
        studentName={studentName}
        t={t}
        onLogin={() => setLoginOpen(true)}
        onLogout={logOut}
        onOpenAccount={() => setProfileOpen(true)}
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
              sessions={sessions}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              onSignIn={() => setLoginOpen(true)}
              onExploreSessions={() => goToTab("sessions")}
              onScrollToAbout={scrollToAbout}
              onOpenSession={(session) => {
                setSelectedSession(session);
                setActiveTab("sessions");
              }}
            />
          ),
          leaderboard: <LeaderboardPage t={t} />,
          sessions: (
            <SessionsPage
              sessions={sessions}
              notes={learningNotes}
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
          study: (
            <StudyPage
              sessions={sessions}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              t={t}
              onOpenSession={(session) => {
                setSelectedSession(session);
                setActiveTab("sessions");
              }}
            />
          ),
          careers: signedIn && isGrade12 ? <CareerOptionsPage /> : null,
          flow: <FlowPage t={t} language={studentLanguage} />,
          premium: <PremiumFlowPage
            t={t}
            signedIn={signedIn}
            studentEmail={studentEmail}
            studentName={studentName}
            cartPlan={premiumCartPlan}
            checkoutOpen={premiumCheckoutOpen}
            onAddToCart={setPremiumCartPlan}
            onRemoveFromCart={() => setPremiumCartPlan(null)}
            onBeginCheckout={() => {
              setPremiumCheckoutOpen(true);
              if (!signedIn) {
                setPendingPremiumLogin(true);
                setLoginOpen(true);
              }
            }}
            onBackToPlans={() => setPremiumCheckoutOpen(false)}
          />,
          messages: <MessagesPage t={t} />,
          settings: (
            <SettingsPage
              studentEmail={studentEmail}
              studentName={studentName}
              studentProfile={studentProfile}
              activityVersion={activityVersion}
              onEditProfile={() => setProfileOpen(true)}
              t={t}
            />
          ),
          sensory: sensoryTrackerEnabled ? (
            <SensoryTrackerPage studentId={authUserId} />
          ) : null,
        }}
      />
      {loginOpen && (
        <AuthModal
          t={t}
          onClose={() => setLoginOpen(false)}
          onStudentSuccess={(email, userId, profile) => {
            setLoginOpen(false);
            const normalizedEmail = email?.toLowerCase() || "";
            const savedStudent = profile
              ? { id: userId, email: normalizedEmail, name: profile.display_name }
              : normalizedEmail
              ? readStudents().find((student) => student.email.toLowerCase() === normalizedEmail)
              : null;
            setStudentProfile(savedStudent || null);
            setStudentEmail(normalizedEmail);
            setAuthUserId(userId || null);
            setAuthRole(profile?.role || null);
            setSignedIn(true);
            setActiveTab(pendingPremiumLogin ? "premium" : "study");
            setPendingPremiumLogin(false);
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
