import React, { useEffect, useMemo, useState } from "react";
import { Accessibility, CheckCircle2, Coffee, Heart, X } from "lucide-react";
import { classNames, demoStudents, initialSessions, readStudents, subjects } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, AboutPage, SessionsPage, StudyPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { LeaderboardPage } from "./components/student/pages/LeaderboardPage";
import { SettingsPage } from "./components/student/pages/SettingsPage";
import { SensoryTrackerPage } from "./components/student/pages/SensoryTrackerPage";
import { createStudentActivity, readStudentActivities, recordStudentAttendance } from "./studentActivity";
import { saveStudentLearningActivity } from "./studentSensory";
import { fetchSessions, loadStudentHandwriting, loadStudentPrivateSessions, loadStudentSessionRegistrations, markPrivateSessionsSeen, markRegisteredSessionAttended, registerStudentForSession } from "./mentorContent";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { translate } from "./i18n";
import { CareerOptionsPage } from "./components/student/pages/CareerOptionsPage";
import { PremiumFlowPage } from "./components/student/pages/PremiumFlowPage";
import { ParentPortal } from "./components/parent/ParentPortal";
import { StudentSubjectsPage } from "./components/student/pages/StudentSubjectsPage";
import { MindfulCorner } from "./components/student/pages/MindfulCorner";
import { RelaxationRoom } from "./components/RelaxationRoom";
import { ReflectionJournal } from "./components/student/pages/ReflectionJournal";
import { readMindfulBoard } from "./mindfulPoints";
import { useImmersiveEffects } from "./immersiveEffects";
import { addLocalScreenTime, localDateKey, recordScreenTime } from "./screenTime";

const readPreferredSubjects = (email) => {
  if (!email) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(`cognibridge_subjects_${email.toLowerCase()}`) || "[]");
    return Array.isArray(saved) ? saved.filter((subject) => subjects.includes(subject)) : [];
  } catch {
    return [];
  }
};

const App = () => {
  useImmersiveEffects();
  const [sessions, setSessions] = useState(initialSessions);
  const [learningNotes, setLearningNotes] = useState([]);
  const [signedIn, setSignedIn] = useState(false);
  const [registeredSessionIds, setRegisteredSessionIds] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [scrollToAboutOnHome, setScrollToAboutOnHome] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [appearance, setAppearance] = useState(() => {
    try {
      return localStorage.getItem("cognibridge_appearance") || "light";
    } catch {
      return "light";
    }
  });
  const [motionSetting, setMotionSetting] = useState(() => {
    try {
      const saved = localStorage.getItem("cognibridge_motion");
      return ["full", "reduced", "off"].includes(saved) ? saved : "full";
    } catch { return "full"; }
  });
  const [lowSensory, setLowSensory] = useState(() => {
    try { return localStorage.getItem("cognibridge_low_sensory") === "true"; }
    catch { return false; }
  });
  const [restReminderOpen, setRestReminderOpen] = useState(false);
  const [textScale, setTextScale] = useState(1);
  const [studentLanguage, setStudentLanguage] = useState(() => {
    try {
      return localStorage.getItem("cognibridge_language") || "English";
    } catch {
      return "English";
    }
  });
  const [introExiting, setIntroExiting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupStudentClass, setSignupStudentClass] = useState("");
  const [studentProfile, setStudentProfile] = useState(null);
  const [preferredSubjects, setPreferredSubjects] = useState([]);
  const [subjectSelectionPending, setSubjectSelectionPending] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [authUserId, setAuthUserId] = useState(null);
  const [authRole, setAuthRole] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [activityVersion, setActivityVersion] = useState(0);
  const [mindfulVersion, setMindfulVersion] = useState(0);
  const [screenTimeVersion, setScreenTimeVersion] = useState(0);
  const [attendedSessionIds, setAttendedSessionIds] = useState(new Set());
  const [privateSessions, setPrivateSessions] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [handwritingPromptOpen, setHandwritingPromptOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [premiumCartPlan, setPremiumCartPlan] = useState(null);
  const [premiumCheckoutOpen, setPremiumCheckoutOpen] = useState(false);
  const [pendingPremiumLogin, setPendingPremiumLogin] = useState(false);
  const t = useMemo(
    () => (key, values) => translate(studentLanguage, key, values),
    [studentLanguage],
  );

  useEffect(() => {
    if (!signedIn || !studentEmail || profileOpen || signupEmail || (authRole && authRole !== "student")) return undefined;
    const currentType = studentProfile?.handwritingType;
    if (currentType && !/^type\s*\d+$/i.test(currentType)) return undefined;
    let current = true;
    const checkSample = async () => {
      if (supabaseConfigured && authUserId) {
        try {
          const saved = await loadStudentHandwriting(authUserId);
          if (!current) return;
          if (saved?.handwritingType && !/^type\s*\d+$/i.test(saved.handwritingType)) {
            setStudentProfile((profile) => ({ ...profile, ...saved }));
            return;
          }
        } catch {
          // If the sample cannot be retrieved, let the student retry by uploading a new one.
        }
      }
      if (current) setHandwritingPromptOpen(true);
    };
    checkSample();
    return () => { current = false; };
  }, [signedIn, studentEmail, authRole, authUserId, studentProfile?.handwritingType, profileOpen, signupEmail]);
  useEffect(() => {
    if (!lowSensory || restReminderOpen) return undefined;
    const reminderId = window.setTimeout(() => setRestReminderOpen(true), 3 * 60 * 1000);
    return () => window.clearTimeout(reminderId);
  }, [lowSensory, restReminderOpen]);

  useEffect(() => {
    if (!lowSensory) setRestReminderOpen(false);
  }, [lowSensory]);
  const studentName = studentProfile?.name?.trim()
    || studentEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    || "Student";
  useEffect(() => {
    if (!signedIn || !studentEmail || (authRole && authRole !== "student")) return undefined;
    let lastInteraction = Date.now();
    let lastTick = Date.now();
    const interact = () => { lastInteraction = Date.now(); };
    const persist = async (elapsed) => {
      if (supabaseConfigured && authUserId) {
        try { await recordScreenTime(elapsed, localDateKey()); }
        catch { return; }
      } else {
        addLocalScreenTime(studentEmail, elapsed);
      }
      setScreenTimeVersion((version) => version + 1);
    };
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(30, Math.floor((now - lastTick) / 1000));
      lastTick = now;
      if (document.visibilityState === "visible" && now - lastInteraction <= 60_000 && elapsed > 0) void persist(elapsed);
    };
    const interval = window.setInterval(tick, 15_000);
    const visibility = () => { lastTick = Date.now(); if (document.visibilityState === "visible") interact(); };
    ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"].forEach((event) => window.addEventListener(event, interact, { passive: true }));
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(interval);
      ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"].forEach((event) => window.removeEventListener(event, interact));
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [signedIn, studentEmail, authRole, authUserId]);
  const sensoryTrackerDemoMode = Boolean(signedIn && !supabaseConfigured && studentEmail);
  const sensoryTrackerEnabled = Boolean(
    signedIn && (sensoryTrackerDemoMode || (supabaseConfigured && authUserId && authRole === "student")),
  );
  const studentSessions = preferredSubjects.length
    ? sessions.filter((session) => preferredSubjects.includes(session.subject))
    : sessions;
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
      setHandwritingPromptOpen(false);
      setStudentEmail("");
      setPreferredSubjects([]);
      setSubjectSelectionPending(false);
      setMentorOpen(false);
      setParentOpen(false);
      if (activeTab === "sensory") setActiveTab("home");
      return undefined;
    }

    let isCurrent = true;
    const user = authSession.user;
    supabase.from("profiles")
      .select("id, display_name, role, preferred_subjects")
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
          const savedSubjects = Array.isArray(profile.preferred_subjects) && profile.preferred_subjects.length
            ? profile.preferred_subjects
            : readPreferredSubjects(user.email || "");
          setPreferredSubjects(savedSubjects);
          setSubjectSelectionPending(savedSubjects.length === 0);
          setMentorOpen(false);
          setSignedIn(true);
          setStudentEmail(user.email || "");
          setStudentProfile({ id: user.id, email: user.email, name: profile.display_name, studentClass: user.user_metadata?.student_class || "", preferredSubjects: savedSubjects });
          setActiveTab((currentTab) => currentTab === "home" ? "study" : currentTab);
        } else if (profile.role === "mentor") {
          setSignedIn(false);
          setMentorOpen(true);
          setParentOpen(false);
        } else if (profile.role === "parent") {
          setSignedIn(false);
          setMentorOpen(false);
          setParentOpen(true);
          setStudentEmail(user.email || "");
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
    if (!supabaseConfigured || !signedIn || authRole !== "student" || !authUserId) return undefined;
    let current = true;
    loadStudentSessionRegistrations().then((result) => {
      if (!current) return;
      setRegisteredSessionIds(result.registeredSessionIds);
      setAttendedSessionIds((existing) => new Set([...existing, ...result.attendedSessionIds]));
      result.activities.forEach((activity) => {
        const session = sessions.find((item) => String(item.id) === activity.sessionId);
        if (session && !readStudentActivities(studentEmail).some((item) => item.sessionId === activity.sessionId)) {
          recordStudentAttendance(studentEmail, session);
        }
      });
      setActivityVersion((version) => version + 1);
    }).catch(() => {});
    return () => { current = false; };
  }, [signedIn, authRole, authUserId, studentEmail, sessions]);

  useEffect(() => {
    if (!supabaseConfigured || !signedIn || authRole !== "student" || !authUserId) { setPrivateSessions([]); return undefined; }
    let current = true;
    loadStudentPrivateSessions(authUserId).then((rows) => {
      if (!current) return;
      setPrivateSessions(rows);
      if (rows.length) markPrivateSessionsSeen().catch(() => {});
    }).catch(() => {});
    return () => { current = false; };
  }, [signedIn, authRole, authUserId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", textScale);
  }, [textScale]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionSetting;
    try { localStorage.setItem("cognibridge_motion", motionSetting); } catch { /* Session choice remains active. */ }
  }, [motionSetting]);

  useEffect(() => {
    document.documentElement.dataset.lowSensory = String(lowSensory);
    try { localStorage.setItem("cognibridge_low_sensory", String(lowSensory)); } catch { /* Session choice remains active. */ }
  }, [lowSensory]);

  useEffect(() => {
    try {
      localStorage.setItem("cognibridge_appearance", appearance);
    } catch {
      // Keep the selected theme for this session if browser storage is unavailable.
    }
    document.documentElement.style.colorScheme = appearance;
  }, [appearance]);

  useEffect(() => {
    try {
      localStorage.setItem("cognibridge_language", studentLanguage);
    } catch {
      // Keep language selection available when browser storage is disabled.
    }
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
      Spanish: "es",
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

  const savePreferredSubjects = async (selection) => {
    const selected = subjects.filter((subject) => selection.includes(subject));
    if (!selected.length) return false;
    try {
      localStorage.setItem(`cognibridge_subjects_${studentEmail.toLowerCase()}`, JSON.stringify(selected));
      if (!supabaseConfigured) {
        const updatedStudents = readStudents().map((student) => (
          student.email?.toLowerCase() === studentEmail.toLowerCase()
            ? { ...student, preferredSubjects: selected }
            : student
        ));
        localStorage.setItem("cognibridge_students", JSON.stringify(updatedStudents));
      }
    } catch {
      notify(t("subjectSaveError"));
      return false;
    }
    if (supabaseConfigured && authUserId) {
      const { error } = await supabase.from("profiles").update({ preferred_subjects: selected }).eq("id", authUserId);
      if (error) {
        notify(t("subjectSaveError"));
        return false;
      }
    }
    setPreferredSubjects(selected);
    setStudentProfile((profile) => profile ? { ...profile, preferredSubjects: selected } : profile);
    setSubjectSelectionPending(false);
    return true;
  };

  const registerForSession = async (sessionId) => {
    if (registeredSessionIds.includes(sessionId)) return;

    const session = sessions.find((item) => item.id === sessionId);
    if (supabaseConfigured && authUserId && authRole === "student") {
      try {
        await registerStudentForSession(sessionId);
      } catch {
        notify("Couldn't register for this session. Please try again.");
        return;
      }
    }
    setRegisteredSessionIds((ids) => (
      ids.includes(sessionId) ? ids : [...ids, sessionId]
    ));
    notify(t("registrationConfirmed", { title: session?.title || "Session" }));
  };

  const markSessionAttended = async (session) => {
    if (!signedIn || !studentEmail) {
      notify(t("signInToSaveAttendance"));
      return;
    }
    try {
      const activity = createStudentActivity(session);
      if (readStudentActivities(studentEmail).some((item) => item.sessionId === activity.sessionId)) {
        notify(t("attendanceAlreadyRecorded"));
        return;
      }
      if (supabaseConfigured && authUserId && authRole === "student") await markRegisteredSessionAttended(session.id);
      if (supabaseConfigured && authUserId) await saveStudentLearningActivity(authUserId, activity);
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
    setHandwritingPromptOpen(false);
    setStudentEmail("");
    setPreferredSubjects([]);
    setSubjectSelectionPending(false);
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
          language={studentLanguage}
          setLanguage={setStudentLanguage}
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
          accessibilityOpen={accessibilityOpen}
          onToggleAccessibility={() => setAccessibilityOpen((isOpen) => !isOpen)}
        />
        {accessibilityOpen && (
          <AccessibilityPanel
            textScale={textScale}
            setTextScale={setTextScale}
            motionSetting={motionSetting}
            setMotionSetting={setMotionSetting}
            lowSensory={lowSensory}
            setLowSensory={setLowSensory}
            appearance={appearance}
            setAppearance={setAppearance}
            language={studentLanguage}
            setLanguage={setStudentLanguage}
            showLanguage
            t={t}
            onClose={() => setAccessibilityOpen(false)}
          />
        )}
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
      </div>
    );
  }

  if (parentOpen) {
    return <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
      <ParentPortal parentId={authUserId} parentName={authSession?.user?.user_metadata?.full_name || "Parent"} onLogout={() => { setParentOpen(false); if (supabaseConfigured) supabase.auth.signOut(); }} language={studentLanguage} setLanguage={setStudentLanguage} t={t} />
      <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
    </div>;
  }

  if (subjectSelectionPending && signedIn && authRole !== "mentor" && !parentOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentSubjectsPage selectedSubjects={preferredSubjects} onContinue={savePreferredSubjects} t={t} />
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
      </div>
    );
  }

  if (handwritingPromptOpen && signedIn) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentProfileFlow
          email={studentEmail}
          studentId={authUserId}
          existingProfile={studentProfile || { email: studentEmail, name: studentName }}
          handwritingPrompt
          t={t}
          onBack={() => setHandwritingPromptOpen(false)}
          onComplete={(profile) => { setStudentProfile(profile); setHandwritingPromptOpen(false); }}
        />
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
      </div>
    );
  }

  if (signupEmail) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentProfileFlow
          email={signupEmail}
          studentId={authUserId}
          initialClass={signupStudentClass}
          t={t}
          onBack={() => { setSignupEmail(""); setSignupStudentClass(""); }}
          onComplete={(profile) => {
            setSignupEmail("");
            setSignupStudentClass("");
            setStudentProfile(profile);
            setStudentEmail(profile.email);
            const savedSubjects = readPreferredSubjects(profile.email);
            setPreferredSubjects(savedSubjects);
            setSubjectSelectionPending(savedSubjects.length === 0);
            setSignedIn(true);
            setActiveTab(pendingPremiumLogin ? "premium" : "study");
            setPendingPremiumLogin(false);
          }}
        />
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
      </div>
    );
  }

  if (profileOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentProfileFlow
          email={studentProfile?.email || studentEmail}
          studentId={authUserId}
          existingProfile={studentProfile}
          t={t}
          onBack={() => setProfileOpen(false)}
          onComplete={(profile) => {
            setStudentProfile(profile);
            setProfileOpen(false);
          }}
        />
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
      </div>
    );
  }

  if (createAccountOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <CreateAccountPage
          t={t}
          onBack={() => setCreateAccountOpen(false)}
          onComplete={(account) => {
            setCreateAccountOpen(false);
            if (account.requiresProfileSetup) {
              setSignupEmail(account.email);
              setSignupStudentClass(account.studentClass);
            } else {
              setStudentEmail(account.email);
              setStudentProfile({ id: account.id, email: account.email, name: account.name, studentClass: account.studentClass });
              const savedSubjects = readPreferredSubjects(account.email);
              setPreferredSubjects(savedSubjects);
              setSubjectSelectionPending(savedSubjects.length === 0);
              setAuthUserId(account.id);
              setAuthRole("student");
              setSignedIn(true);
              setActiveTab("study");
            }
          }}
        />
        <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
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
            motionSetting={motionSetting}
            setMotionSetting={setMotionSetting}
            lowSensory={lowSensory}
            setLowSensory={setLowSensory}
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
              sessions={studentSessions}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              screenTimeVersion={screenTimeVersion}
              screenTimeStudentKey={supabaseConfigured ? authUserId : studentEmail}
              screenTimeDemoMode={!supabaseConfigured}
              onSignIn={() => setLoginOpen(true)}
              onExploreSessions={() => goToTab("sessions")}
              onScrollToAbout={scrollToAbout}
              onOpenSession={(session) => {
                setSelectedSession(session);
                setActiveTab("sessions");
              }}
            />
          ),
          leaderboard: <LeaderboardPage t={t} studentName={studentName} mindfulBoard={readMindfulBoard(studentEmail)} mindfulVersion={mindfulVersion} />,
          mindful: <MindfulCorner studentId={studentEmail} signedIn={signedIn} onSignIn={() => setLoginOpen(true)} t={t} onAward={() => setMindfulVersion((version) => version + 1)} onClose={() => goToTab("home")} />,
          relax: <RelaxationRoom onBack={() => goToTab("home")} t={t} />,
          journal: <ReflectionJournal studentId={authRole === "student" ? authUserId : null} studentKey={studentEmail} signedIn={signedIn} language={studentLanguage} t={t} />,
          sessions: (
            <SessionsPage
              sessions={studentSessions}
              notes={learningNotes}
              selectedSession={selectedSession}
              signedIn={signedIn}
              t={t}
              registeredSessionIds={registeredSessionIds}
              attendedSessionIds={attendedSessionIds}
              privateSessions={privateSessions}
              onSelect={setSelectedSession}
              onBack={() => setSelectedSession(null)}
              onSignIn={() => setLoginOpen(true)}
              onRegister={registerForSession}
              onMarkAttended={markSessionAttended}
            />
          ),
          study: (
            <StudyPage
              sessions={studentSessions}
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
          careers: signedIn && isGrade12 ? <CareerOptionsPage t={t} /> : null,
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
              studentId={authUserId}
              studentName={studentName}
              studentProfile={studentProfile}
              activityVersion={activityVersion}
              onEditProfile={() => setProfileOpen(true)}
              t={t}
            />
          ),
          sensory: sensoryTrackerEnabled ? (
            <SensoryTrackerPage studentId={supabaseConfigured ? authUserId : studentEmail} demoMode={sensoryTrackerDemoMode} t={t} lowSensory={lowSensory} onToggleLowSensory={() => setLowSensory((value) => !value)} />
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
            const savedSubjects = Array.isArray(profile?.preferred_subjects) && profile.preferred_subjects.length
              ? profile.preferred_subjects
              : savedStudent?.preferredSubjects || readPreferredSubjects(normalizedEmail);
            setPreferredSubjects(savedSubjects);
            setSubjectSelectionPending(savedSubjects.length === 0);
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
          onParent={(parentId) => {
            setLoginOpen(false);
            setAuthUserId(parentId);
            setParentOpen(true);
            setMentorOpen(false);
          }}
        />
      )}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
      <RestReminder open={restReminderOpen} onClose={() => setRestReminderOpen(false)} t={t} />
    </div>
  );
};

const RestReminder = ({ open, onClose, t }) => open ? (
  <div className="rest-reminder-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="rest-reminder" role="dialog" aria-modal="true" aria-labelledby="rest-reminder-title" aria-describedby="rest-reminder-copy">
      <button type="button" className="rest-reminder-close" onClick={onClose} aria-label={t("close")}><X size={20} /></button>
      <div className="rest-reminder-icon" aria-hidden="true"><Coffee size={25} /></div>
      <p className="rest-reminder-eyebrow">{t("restPauseEyebrow")}</p>
      <h2 id="rest-reminder-title">{t("restReminderTitle")}</h2>
      <p id="rest-reminder-copy" className="rest-reminder-motivation">{t("restReminderMotivation")}</p>
      <p className="rest-reminder-tip"><Heart size={16} aria-hidden="true" /> {t("restReminderTip")}</p>
      <button type="button" className="rest-reminder-action" onClick={onClose}>{t("takeRest")}</button>
      <button type="button" className="rest-reminder-later" onClick={onClose}>{t("remindInThree")}</button>
    </section>
  </div>
) : null;

export default App;
