import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { classNames, demoStudents, initialSessions, readStudents, subjects } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, AboutPage, SessionsPage, StudyPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { LeaderboardPage } from "./components/student/pages/LeaderboardPage";
import { SettingsPage } from "./components/student/pages/SettingsPage";
import { SensoryTrackerPage } from "./components/student/pages/SensoryTrackerPage";
import { clearDemoStudentCheckins } from "./studentSensory";
import { readStudentActivities, recordStudentAttendance } from "./studentActivity";
import { fetchSessions, fetchStudentNotes } from "./mentorContent";
import { loadMyRegistrations, markSessionAttended as saveAttendance, registerForSession as saveRegistration } from "./sessionRegistrations";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { translate } from "./i18n";
import { CareerOptionsPage } from "./components/student/pages/CareerOptionsPage";
import { PremiumFlowPage } from "./components/student/pages/PremiumFlowPage";
import { ParentPortal } from "./components/parent/ParentPortal";
import { StudentSubjectsPage } from "./components/student/pages/StudentSubjectsPage";

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
  const [parentOpen, setParentOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [appearance, setAppearance] = useState("light");
  const [textScale, setTextScale] = useState(1);
  const [studentLanguage, setStudentLanguage] = useState("English");
  const [introExiting, setIntroExiting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupStudentClass, setSignupStudentClass] = useState("");
  const [studentProfile, setStudentProfile] = useState(null);
  const [preferredSubjects, setPreferredSubjects] = useState([]);
  const [subjectSelectionPending, setSubjectSelectionPending] = useState(false);
  const subjectSelectionUser = useRef(null);
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
  const [premiumSubscription, setPremiumSubscription] = useState(null);
  const [pendingPremiumLogin, setPendingPremiumLogin] = useState(false);
  const t = useMemo(
    () => (key, values) => translate(studentLanguage, key, values),
    [studentLanguage],
  );
  const studentName = studentProfile?.name?.trim()
    || studentEmail.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    || "Student";
  const sensoryTrackerDemoMode = Boolean(signedIn && !supabaseConfigured && studentEmail);
  const sensoryTrackerEnabled = Boolean(
    signedIn && (sensoryTrackerDemoMode || (supabaseConfigured && authUserId && authRole === "student")),
  );
  const classLabel = String(studentProfile?.studentClass || "").trim().toLowerCase();
  const isGrade12 = /(^|[^a-z0-9])(12(?:th)?|xii|twelfth)(?=$|[^a-z0-9])/.test(classLabel);
  const studentSessions = preferredSubjects.length
    ? sessions.filter((session) => preferredSubjects.includes(session.subject))
    : sessions;

  const savePreferredSubjects = async (selection) => {
    const selected = subjects.filter((subject) => selection.includes(subject));
    if (!selected.length) return false;
    if (supabaseConfigured) {
      if (!authUserId) {
        notify(t("subjectSaveError"));
        return false;
      }
      const { error } = await supabase.from("profiles").update({ preferred_subjects: selected }).eq("id", authUserId);
      if (error) {
        notify(t("subjectSaveError"));
        return false;
      }
    } else {
      try {
        const updatedStudents = readStudents().map((student) => (
          student.email?.toLowerCase() === (studentEmail || signupEmail).toLowerCase()
            ? { ...student, preferredSubjects: selected }
            : student
        ));
        localStorage.setItem("cognibridge_students", JSON.stringify(updatedStudents));
      } catch {
        notify(t("subjectSaveError"));
        return false;
      }
    }
    setPreferredSubjects(selected);
    setStudentProfile((profile) => profile ? { ...profile, preferredSubjects: selected } : profile);
    setSubjectSelectionPending(false);
    subjectSelectionUser.current = authUserId || (studentEmail || signupEmail).toLowerCase();
    return true;
  };

  useEffect(() => {
    if (!studentEmail) {
      setPremiumSubscription(null);
      return;
    }
    try {
      setPremiumSubscription(JSON.parse(localStorage.getItem(`cognibridge_premium_${studentEmail.toLowerCase()}`) || "null"));
    } catch {
      setPremiumSubscription(null);
    }
  }, [studentEmail]);

  const completeDemoPurchase = (planId) => {
    const months = { monthly: 1, quarterly: 3, yearly: 12 }[planId];
    if (!signedIn || !studentEmail || !months) return;
    const purchasedAt = new Date();
    const expiresAt = new Date(purchasedAt);
    const expiryDay = expiresAt.getDate();
    expiresAt.setDate(1);
    expiresAt.setMonth(expiresAt.getMonth() + months);
    expiresAt.setDate(Math.min(expiryDay, new Date(expiresAt.getFullYear(), expiresAt.getMonth() + 1, 0).getDate()));
    const purchase = { planId, purchasedAt: purchasedAt.toISOString(), expiresAt: expiresAt.toISOString(), paymentType: "demo" };
    try {
      localStorage.setItem(`cognibridge_premium_${studentEmail.toLowerCase()}`, JSON.stringify(purchase));
    } catch {
      // Keep the demo purchase visible for this session if browser storage is unavailable.
    }
    setPremiumSubscription(purchase);
    setPremiumCheckoutOpen(false);
    setPremiumCartPlan(null);
    setActiveTab("settings");
    setToast(t("pf_demoSuccessToast"));
  };

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
      setPreferredSubjects([]);
      setSubjectSelectionPending(false);
      subjectSelectionUser.current = null;
      setMentorOpen(false);
      setParentOpen(false);
      setLearningNotes([]);
      if (activeTab === "sensory") setActiveTab("home");
      return undefined;
    }

    let isCurrent = true;
    const user = authSession.user;
    let oauthRole = null;
    try {
      oauthRole = window.localStorage.getItem("cognibridge_oauth_role");
    } catch { /* storage unavailable */ }
    const loadProfile = () => supabase.from("profiles")
      .select("id, display_name, role, preferred_subjects")
      .eq("id", user.id)
      .maybeSingle();
    loadProfile()
      .then(async (result) => {
        let { data: profile } = result;
        // A fresh Google account starts as a student; the Parent tab converts it.
        if (oauthRole === "parent" && profile?.role === "student") {
          const { error: claimError } = await supabase.rpc("claim_parent_role");
          if (!claimError) profile = (await loadProfile()).data;
        }
        return { data: profile, error: result.error };
      })
      .then(({ data: profile, error }) => {
        if (!isCurrent) return;
        // Cleared only once a run has handled it, so a re-run of this effect still enforces it.
        try { window.localStorage.removeItem("cognibridge_oauth_role"); } catch { /* storage unavailable */ }
        if (error || !profile) {
          supabase.auth.signOut();
          return;
        }
        // Google sign-in must land on the side the person chose; mentors use their own credentials.
        if (oauthRole && profile.role !== oauthRole) {
          notify(t(profile.role === "mentor" ? "ms_mentorOnlyEmail" : profile.role === "parent" ? "ms_wrongRoleParent" : "ms_wrongRoleStudent"));
          supabase.auth.signOut();
          return;
        }
        setAuthUserId(user.id);
        setAuthRole(profile.role);
        if (profile.role === "student") {
          const selectedSubjects = Array.isArray(profile.preferred_subjects) ? profile.preferred_subjects : [];
          setPreferredSubjects(selectedSubjects);
          if (subjectSelectionUser.current !== user.id) {
            setSubjectSelectionPending(true);
            subjectSelectionUser.current = user.id;
          }
          setMentorOpen(false);
          setSignedIn(true);
          setStudentEmail(user.email || "");
          setStudentProfile({ id: user.id, email: user.email, name: profile.display_name, studentClass: user.user_metadata?.student_class || "", preferredSubjects: selectedSubjects });
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

  // Students see every mentor's notes; the mentor portal loads its own notes itself.
  useEffect(() => {
    if (!supabaseConfigured || !signedIn || authRole !== "student") return undefined;
    let isCurrent = true;
    fetchStudentNotes()
      .then((rows) => {
        if (isCurrent) setLearningNotes(rows);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [signedIn, authRole]);

  useEffect(() => {
    if (activeTab !== "home" || !scrollToAboutOnHome) return;

    scrollToAbout();
    setScrollToAboutOnHome(false);
  }, [activeTab, scrollToAboutOnHome]);

  useEffect(() => {
    if (!sensoryTrackerEnabled && activeTab === "sensory") setActiveTab("home");
  }, [sensoryTrackerEnabled, activeTab]);

  useEffect(() => {
    if (supabaseConfigured) {
      if (!signedIn || !authUserId) {
        setRegisteredSessionIds([]);
        setAttendedSessionIds(new Set());
        return undefined;
      }
      let isCurrent = true;
      loadMyRegistrations()
        .then((registrations) => {
          if (!isCurrent) return;
          setRegisteredSessionIds(registrations.registeredSessionIds);
          setAttendedSessionIds(registrations.attendedSessionIds);
        })
        .catch(() => {});
      return () => {
        isCurrent = false;
      };
    }

    if (!signedIn || !studentEmail) {
      setAttendedSessionIds(new Set());
      return undefined;
    }
    try {
      setAttendedSessionIds(new Set(
        readStudentActivities(studentEmail).map((activity) => activity.sessionId),
      ));
    } catch {
      setAttendedSessionIds(new Set());
    }
    return undefined;
  }, [signedIn, studentEmail, authUserId, activityVersion]);

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

  const registerForSession = async (sessionId) => {
    if (registeredSessionIds.includes(sessionId)) return;

    const session = sessions.find((item) => item.id === sessionId);
    if (supabaseConfigured) {
      try {
        const created = await saveRegistration(sessionId);
        if (created) {
          setSessions((items) => items.map((item) => (
            item.id === sessionId ? { ...item, attendees: item.attendees + 1 } : item
          )));
        }
      } catch {
        notify(t("registrationError"));
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
    if (supabaseConfigured) {
      try {
        const recorded = await saveAttendance(session.id);
        if (!recorded) {
          notify(t("attendanceAlreadyRecorded"));
          return;
        }
        setActivityVersion((version) => version + 1);
        notify(t("attendanceRecordedToast"));
      } catch {
        notify(t("attendanceSyncError"));
      }
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
    else clearDemoStudentCheckins(studentEmail);
    setSignedIn(false);
    setAuthUserId(null);
    setAuthRole(null);
    setActiveTab("home");
    setStudentProfile(null);
    setStudentEmail("");
    setPreferredSubjects([]);
    setSubjectSelectionPending(false);
    subjectSelectionUser.current = null;
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
          accessibilityOpen={accessibilityOpen}
          onToggleAccessibility={() => setAccessibilityOpen((isOpen) => !isOpen)}
        />
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

  if (parentOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <ParentPortal
          key={authUserId}
          parentId={authUserId}
          parentName={authSession?.user?.user_metadata?.full_name || "Parent"}
          onLogout={() => {
            setParentOpen(false);
            if (supabaseConfigured) supabase.auth.signOut();
          }}
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
              showLanguage
              t={t}
              onClose={() => setAccessibilityOpen(false)}
            />
          )}
          t={t}
        />
      </div>
    );
  }

  if (subjectSelectionPending) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentSubjectsPage selectedSubjects={preferredSubjects} onContinue={savePreferredSubjects} t={t} />
      </div>
    );
  }

  if (signupEmail) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentProfileFlow
          email={signupEmail}
          initialClass={signupStudentClass}
          t={t}
          onBack={() => { setSignupEmail(""); setSignupStudentClass(""); }}
          onComplete={(profile) => {
            setSignupEmail("");
            setSignupStudentClass("");
            setStudentProfile(profile);
            setStudentEmail(profile.email);
            setPreferredSubjects(preferredSubjects);
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
            setPreferredSubjects(profile.preferredSubjects || preferredSubjects);
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
          onComplete={(account) => {
            setCreateAccountOpen(false);
            if (account.requiresProfileSetup) {
              setSignupEmail(account.email);
              setSignupStudentClass(account.studentClass);
              setPreferredSubjects([]);
              setSubjectSelectionPending(true);
              subjectSelectionUser.current = account.email.toLowerCase();
            } else {
              setStudentEmail(account.email);
              setStudentProfile({ id: account.id, email: account.email, name: account.name, studentClass: account.studentClass });
              setAuthUserId(account.id);
              setAuthRole("student");
              setPreferredSubjects([]);
              setSubjectSelectionPending(true);
              subjectSelectionUser.current = account.id;
              setSignedIn(true);
              setActiveTab("study");
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
              sessions={studentSessions}
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
          leaderboard: <LeaderboardPage signedIn={signedIn} t={t} />,
          sessions: (
            <SessionsPage
              sessions={studentSessions}
              notes={learningNotes}
              selectedSession={selectedSession}
              signedIn={signedIn}
              preferredSubjects={preferredSubjects}
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
              sessions={studentSessions}
              registeredSessionIds={registeredSessionIds}
              studentEmail={studentEmail}
              studentName={studentName}
              activityVersion={activityVersion}
              onEditHandwriting={() => setProfileOpen(true)}
              t={t}
              onOpenSession={(session) => {
                setSelectedSession(session);
                setActiveTab("sessions");
              }}
            />
          ),
          careers: signedIn && isGrade12 ? <CareerOptionsPage t={t} /> : null,
          flow: <FlowPage t={t} language={studentLanguage} studentEmail={studentEmail} />,
          premium: <PremiumFlowPage
            t={t}
            signedIn={signedIn}
            studentEmail={studentEmail}
            studentName={studentName}
            cartPlan={premiumCartPlan}
            checkoutOpen={premiumCheckoutOpen}
            onCompletePurchase={completeDemoPurchase}
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
              preferredSubjects={preferredSubjects}
              onSaveSubjects={savePreferredSubjects}
              premiumSubscription={premiumSubscription}
              activityVersion={activityVersion}
              onEditProfile={() => setProfileOpen(true)}
              t={t}
            />
          ),
          sensory: sensoryTrackerEnabled ? (
            <SensoryTrackerPage
              key={supabaseConfigured ? authUserId : studentEmail}
              studentId={supabaseConfigured ? authUserId : studentEmail}
              demoMode={sensoryTrackerDemoMode}
              t={t}
            />
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
            const selectedSubjects = profile?.preferred_subjects || savedStudent?.preferredSubjects || [];
            setPreferredSubjects(Array.isArray(selectedSubjects) ? selectedSubjects : []);
            setSubjectSelectionPending(true);
            subjectSelectionUser.current = userId || normalizedEmail;
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
    </div>
  );
};

export default App;
