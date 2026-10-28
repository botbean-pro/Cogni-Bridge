import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { classNames, demoStudents, getSessionTitle, initialSessions, readStudents, subjects } from "./constants";
import { AccessibilityPanel, AuthModal, CreateAccountPage } from "./components/AccessAndAuth";
import { StudentProfileFlow } from "./components/StudentProfileFlow";
import { HomePage, AboutPage, SessionsPage, StudyPage, FlowPage, MessagesPage } from "./components/LearningPages";
import { MentorPortal } from "./components/MentorPortal";
import { StudentPage } from "./components/student/StudentPage";
import { LeaderboardPage } from "./components/student/pages/LeaderboardPage";
import { SettingsPage } from "./components/student/pages/SettingsPage";
import { SensoryTrackerPage } from "./components/student/pages/SensoryTrackerPage";
import { clearDemoStudentCheckins } from "./studentSensory";
import { loadStudentPrivateSessions } from "./privateSessions";
import { readStudentActivities, recordStudentAttendance } from "./studentActivity";
import { fetchSessions, fetchStudentNotes } from "./mentorContent";
import { loadMyRegistrations, markSessionAttended as saveAttendance, registerForSession as saveRegistration, unregisterFromSession as removeRegistration } from "./sessionRegistrations";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { activateDemoPremium, loadPremiumSubscription } from "./premiumFlow";
import { loadCogniWallet } from "./cogniRewards";
import { loadLatestHandwriting } from "./studentHandwriting";
import { translate } from "./i18n";
import { CareerOptionsPage } from "./components/student/pages/CareerOptionsPage";
import { PremiumFlowPage } from "./components/student/pages/PremiumFlowPage";
import { premiumPurchaseHistory } from "./premiumSubscription";
import { ParentPortal } from "./components/parent/ParentPortal";
import { StudentSubjectsPage } from "./components/student/pages/StudentSubjectsPage";
import { setSpeakingVolume, stopSpeaking } from "./components/student/flow/readAloud";
import { useHoverReadAloud } from "./components/student/flow/useHoverReadAloud";
import { isPortalPath, normalizePath, parseStudentPath, sessionPath, studentTabPaths } from "./routes";
import { MindfulCorner } from "./components/student/pages/MindfulCorner";
import { RelaxationRoom } from "./components/RelaxationRoom";
import { useImmersiveEffects } from "./immersiveEffects";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { loadStudentCheckins } from "./studentSensory";
import { addLocalScreenTime, localDateKey, recordScreenTime } from "./screenTime";
import { BreakLockScreen, useBreakTimer } from "./components/student/BreakLockScreen";

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
  const location = useLocation();
  const navigate = useNavigate();
  // The URL decides which student page (and open session) shows; App state decides who may see it.
  const route = parseStudentPath(location.pathname);
  const activeTab = route.tab || "home";
  const setActiveTab = (next) => {
    const tab = typeof next === "function" ? next(activeTab) : next;
    // A functional update that keeps the current tab must not reset the URL, or a reload on an open
    // session (/sessions/:id) or Mindful Corner activity would lose its sub-page once sign-in settles.
    if (typeof next === "function" && tab === activeTab) return;
    const path = studentTabPaths[tab];
    if (path && normalizePath(location.pathname) !== path) navigate(path);
  };
  const [scrollToAboutOnHome, setScrollToAboutOnHome] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [appearance, setAppearance] = useState(() => {
    try {
      const saved = localStorage.getItem("cognibridge_appearance");
      // The cream theme is the default; a choice saved before it shipped is reset once, then respected.
      if (!localStorage.getItem("cognibridge_theme_g1_v1")) return "light";
      return saved || "light";
    } catch {
      return "light";
    }
  });
  const [textScale, setTextScale] = useState(1);
  // Low sensory mode: the whole app runs with the bare minimum of animation. One choice drives both
  // the Accessibility panel switch and the Sensory Tracker's own toggle, saved so it survives reloads.
  const [lowSensory, setLowSensory] = useState(() => {
    try {
      return localStorage.getItem("cognibridge_low_sensory") === "true";
    } catch {
      return false;
    }
  });
  const [studentLanguage, setStudentLanguage] = useState(() => {
    try {
      return localStorage.getItem("cognibridge_language") || "English";
    } catch {
      return "English";
    }
  });
  const [readAloud, setReadAloud] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cognibridge_read_aloud") || "null");
      return { enabled: saved?.enabled === true, volume: typeof saved?.volume === "number" ? saved.volume : 0.8 };
    } catch {
      return { enabled: false, volume: 0.8 };
    }
  });
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
  const [latestMood, setLatestMood] = useState(null);
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
  const [premiumSubscription, setPremiumSubscription] = useState(null);
  const [pendingPremiumLogin, setPendingPremiumLogin] = useState(false);
  const t = useMemo(
    () => (key, values) => translate(studentLanguage, key, values),
    [studentLanguage],
  );
  const selectedSession = route.sessionId
    ? sessions.find((session) => String(session.id) === route.sessionId) || null
    : null;
  const openSession = (session) => navigate(sessionPath(session.id));
  const closeSession = () => navigate(studentTabPaths.sessions);

  useEffect(() => {
    if (!signedIn || !studentEmail || profileOpen || signupEmail || (authRole && authRole !== "student")) return undefined;
    // Any saved sample counts, including older "Type N" results, so the prompt only appears once.
    if (studentProfile?.handwritingType) return undefined;
    let current = true;
    const checkSample = async () => {
      if (supabaseConfigured && authUserId) {
        try {
          const saved = await loadLatestHandwriting(authUserId);
          if (!current) return;
          if (saved?.handwritingType) {
            setStudentProfile((profile) => ({ ...profile, ...saved }));
            return;
          }
        } catch {
          // Don't nag on a failed lookup; the student can still update it from Settings.
          return;
        }
      }
      if (current) setHandwritingPromptOpen(true);
    };
    checkSample();
    return () => { current = false; };
  }, [signedIn, studentEmail, authRole, authUserId, studentProfile?.handwritingType, profileOpen, signupEmail]);
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
  const classLabel = String(studentProfile?.studentClass || "").trim().toLowerCase();
  const isGrade12 = /(^|[^a-z0-9])(12(?:th)?|xii|twelfth)(?=$|[^a-z0-9])/.test(classLabel);
  const studentSessions = sessions.filter((session) => (
    session.subject !== "Physical Education"
    && (!preferredSubjects.length || preferredSubjects.includes(session.subject))
  ));
  const today = new Date().toLocaleDateString("en-CA");
  // Upcoming sessions first (soonest first), then recent past ones, so Cogni-Flow sees what the student sees.
  const assistantSessions = [
    ...studentSessions.filter((session) => session.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    ...studentSessions.filter((session) => session.date < today).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
  ].slice(0, 15);
  const assistantContext = {
    today,
    signedIn,
    mood: latestMood,
    checkInAvailable: sensoryTrackerEnabled,
    subjects: preferredSubjects,
    sessions: assistantSessions.map((session) => ({
      id: session.id,
      title: getSessionTitle(session, t),
      subject: session.subject,
      date: session.date,
      time: session.time,
      endTime: session.endTime,
      registered: registeredSessionIds.includes(session.id),
    })),
  };

  // Cogni-Flow adapts its tone to the student's latest check-in from the last day.
  // Only the 1-5 mood and emotion tags are used; written notes stay private.
  useEffect(() => {
    const checkinStudentId = supabaseConfigured ? authUserId : studentEmail;
    if (activeTab !== "flow" || !sensoryTrackerEnabled || !checkinStudentId) return undefined;
    let current = true;
    loadStudentCheckins(checkinStudentId)
      .then((entries) => {
        if (!current) return;
        const latest = entries[0];
        const hoursAgo = latest ? (Date.now() - new Date(latest.created_at).getTime()) / 3600000 : Infinity;
        setLatestMood(latest?.mood && hoursAgo <= 24
          ? { rating: latest.mood, emotions: Array.isArray(latest.emotions) ? latest.emotions.slice(0, 6) : [], hoursAgo: Math.round(hoursAgo) }
          : null);
      })
      .catch(() => { if (current) setLatestMood(null); });
    return () => { current = false; };
  }, [activeTab, sensoryTrackerEnabled, authUserId, studentEmail]);

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
      return undefined;
    }
    // Supabase accounts keep the membership on the server, where /api/chat can see it.
    if (supabaseConfigured) {
      if (!authUserId) return undefined;
      let current = true;
      loadPremiumSubscription(authUserId)
        .then((subscription) => { if (current) setPremiumSubscription(subscription); })
        .catch(() => { if (current) setPremiumSubscription(null); });
      return () => { current = false; };
    }
    try {
      setPremiumSubscription(JSON.parse(localStorage.getItem(`cognibridge_premium_${studentEmail.toLowerCase()}`) || "null"));
    } catch {
      setPremiumSubscription(null);
    }
    return undefined;
  }, [studentEmail, authUserId]);

  useEffect(() => {
    if (!supabaseConfigured || authRole !== "student" || !authUserId) return undefined;
    let current = true;
    loadCogniWallet().then((wallet) => {
      if (!current) return;
      if (wallet.premium_expires_at) {
        setPremiumSubscription({ planId: "cogni-points", purchasedAt: null, expiresAt: wallet.premium_expires_at, paymentType: "cogni-points" });
      } else {
        setPremiumSubscription((currentSubscription) => currentSubscription?.paymentType === "demo" ? currentSubscription : null);
      }
    }).catch(() => {});
    return () => { current = false; };
  }, [authRole, authUserId, activeTab]);

  const finishPurchase = (purchase) => {
    setPremiumSubscription(purchase);
    setPremiumCheckoutOpen(false);
    setPremiumCartPlan(null);
    setActiveTab("settings");
    setToast(t("pf_demoSuccessToast"));
  };

  const completeDemoPurchase = async (planId) => {
    const months = { monthly: 1, quarterly: 3, yearly: 12 }[planId];
    if (!signedIn || !studentEmail || !months) return;
    if (supabaseConfigured) {
      try {
        finishPurchase(await activateDemoPremium(planId));
      } catch {
        notify(t("pf_purchaseFail"));
      }
      return;
    }
    const purchasedAt = new Date();
    // A purchase made while premium is still active extends it instead of restarting it.
    const currentExpiry = premiumSubscription?.expiresAt ? new Date(premiumSubscription.expiresAt) : null;
    const expiresAt = new Date(currentExpiry && currentExpiry > purchasedAt ? currentExpiry : purchasedAt);
    const expiryDay = expiresAt.getDate();
    expiresAt.setDate(1);
    expiresAt.setMonth(expiresAt.getMonth() + months);
    expiresAt.setDate(Math.min(expiryDay, new Date(expiresAt.getFullYear(), expiresAt.getMonth() + 1, 0).getDate()));
    const purchase = { planId, purchasedAt: purchasedAt.toISOString(), expiresAt: expiresAt.toISOString(), paymentType: "demo" };
    purchase.purchases = [...premiumPurchaseHistory(premiumSubscription), { planId, purchasedAt: purchase.purchasedAt, paymentType: "demo" }];
    try {
      localStorage.setItem(`cognibridge_premium_${studentEmail.toLowerCase()}`, JSON.stringify(purchase));
    } catch {
      // Keep the demo purchase visible for this session if browser storage is unavailable.
    }
    finishPurchase(purchase);
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
      setHandwritingPromptOpen(false);
      setStudentEmail("");
      setPreferredSubjects([]);
      setSubjectSelectionPending(false);
      subjectSelectionUser.current = null;
      setMentorOpen(false);
      setParentOpen(false);
      setLearningNotes([]);
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
          const savedSubjects = Array.isArray(profile.preferred_subjects) && profile.preferred_subjects.length
            ? profile.preferred_subjects
            : readPreferredSubjects(user.email || "");
          setPreferredSubjects(savedSubjects);
          setSubjectSelectionPending(savedSubjects.length === 0);
          setMentorOpen(false);
          setSignedIn(true);
          setStudentEmail(user.email || "");
          setStudentProfile({
            id: user.id,
            email: user.email,
            name: profile.display_name,
            studentClass: user.user_metadata?.student_class || "",
            age: user.user_metadata?.age || "",
            section: user.user_metadata?.section || "",
            school: user.user_metadata?.school || "",
            preferredSubjects: savedSubjects,
          });
          loadLatestHandwriting(user.id).then((handwriting) => {
            if (isCurrent && handwriting) setStudentProfile((current) => current && current.id === user.id ? { ...current, ...handwriting } : current);
          }).catch(() => { /* the handwriting section just shows "not analyzed" */ });
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

  // Auth is settled once Supabase has answered and, for a signed-in user, the profile role has loaded.
  const authSettled = authReady && (!authSession?.user || authRole !== null);

  // Gated or unknown URLs fall back to home, but only once auth has settled so a reload keeps its page.
  useEffect(() => {
    if (!authSettled || mentorOpen || parentOpen) return;
    const path = normalizePath(location.pathname);
    const studentOnly = !signedIn && ["study", "settings", "messages"].includes(activeTab);
    const gated = studentOnly || (activeTab === "sensory" && !sensoryTrackerEnabled) || (activeTab === "careers" && !(signedIn && isGrade12));
    const unknown = !route.tab && path !== "/";
    if (gated || unknown) navigate("/", { replace: true });
  }, [authSettled, mentorOpen, parentOpen, location.pathname, sensoryTrackerEnabled, signedIn, isGrade12]);

  // Portals keep their own tab in the URL under /mentor and /parent.
  useEffect(() => {
    if (mentorOpen && !isPortalPath(location.pathname, "mentor")) navigate("/mentor", { replace: true });
    else if (parentOpen && !isPortalPath(location.pathname, "parent")) navigate("/parent", { replace: true });
  }, [mentorOpen, parentOpen, location.pathname]);

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

  // One-to-one sessions a mentor scheduled for this student, listed on the Sessions page.
  useEffect(() => {
    if (!supabaseConfigured || !signedIn || authRole !== "student" || !authUserId) { setPrivateSessions([]); return undefined; }
    let current = true;
    loadStudentPrivateSessions(authUserId).then((rows) => {
      if (!current) return;
      setPrivateSessions(rows);
    }).catch(() => {});
    return () => { current = false; };
  }, [signedIn, authRole, authUserId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", textScale);
  }, [textScale]);

  useEffect(() => {
    // Every animation rule reads this attribute, so setting it here switches the whole app at once.
    document.documentElement.dataset.lowSensory = lowSensory ? "true" : "false";
    try {
      localStorage.setItem("cognibridge_low_sensory", lowSensory ? "true" : "false");
    } catch {
      // Keep the choice for this session when browser storage is unavailable.
    }
  }, [lowSensory]);

  useEffect(() => {
    if (!readAloud.enabled) stopSpeaking();
  }, [readAloud.enabled]);

  useEffect(() => {
    setSpeakingVolume(readAloud.volume);
  }, [readAloud.volume]);

  useEffect(() => {
    try { localStorage.setItem("cognibridge_read_aloud", JSON.stringify(readAloud)); } catch { /* Session choice remains active. */ }
  }, [readAloud]);

  useHoverReadAloud({ enabled: readAloud.enabled && !mentorOpen && !parentOpen, language: studentLanguage, volume: readAloud.volume });


  useEffect(() => {
    try {
      localStorage.setItem("cognibridge_appearance", appearance);
      localStorage.setItem("cognibridge_theme_g1_v1", "true");
    } catch {
      // Keep the selected theme for this session if browser storage is unavailable.
    }
    document.documentElement.style.colorScheme = appearance;
    // The page behind the app (overscroll, anything rendered outside .app) follows the theme too.
    document.body.classList.toggle("theme-dark", appearance === "dark");
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

  // Each message gets its full time on screen: a new one cancels the previous one's timer.
  const toastTimer = useRef(0);
  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  };
  // Every 30 minutes on the site a signed-in student gets a notification and a 5-minute screen break.
  const breakLockUntil = useBreakTimer({
    studentKey: supabaseConfigured ? authUserId : studentEmail,
    enabled: Boolean(signedIn && studentEmail && (!authRole || authRole === "student") && !mentorOpen && !parentOpen),
    t,
    onNotice: notify,
  });
  const breakLock = breakLockUntil ? <BreakLockScreen lockUntil={breakLockUntil} t={t} /> : null;

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

  // The Register button is a toggle: a second click cancels, unless attendance is already recorded.
  const toggleRegistration = async (sessionId) => {
    if (!registeredSessionIds.includes(sessionId)) {
      await registerForSession(sessionId);
      return;
    }
    if (attendedSessionIds.has(sessionId)) return;
    const session = sessions.find((item) => item.id === sessionId);
    if (supabaseConfigured) {
      try {
        const removed = await removeRegistration(sessionId);
        if (removed) {
          setSessions((items) => items.map((item) => (
            item.id === sessionId ? { ...item, attendees: Math.max(0, item.attendees - 1) } : item
          )));
        }
      } catch {
        notify(t("unregisterError"));
        return;
      }
    }
    setRegisteredSessionIds((ids) => ids.filter((id) => id !== sessionId));
    notify(t("registrationCancelled", { title: session?.title || "Session" }));
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
    setHandwritingPromptOpen(false);
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
      scrollToAbout();
      return;
    }

    if (tab === "home" && activeTab === "about") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setActiveTab(tab);
  };

  // Actions requested by Cogni-Flow; api/chat.js has already checked them against the context it was sent.
  const handleAssistantAction = (action) => {
    if (action.type === "open") {
      goToTab(action.page);
    } else if (action.type === "openSession") {
      const session = sessions.find((item) => item.id === action.sessionId);
      if (session) openSession(session);
    } else if (action.type === "register") {
      if (signedIn) registerForSession(action.sessionId);
      else setLoginOpen(true);
    } else if (action.type === "setting") {
      if (action.name === "textSize") {
        setTextScale((scale) => (action.value === "reset"
          ? 1
          : Math.min(1.35, Math.max(0.85, Math.round((scale + (action.value === "larger" ? 0.1 : -0.1)) * 100) / 100))));
      } else if (action.name === "appearance") {
        setAppearance(action.value);
      } else if (action.name === "readAloud") {
        setReadAloud((current) => ({ ...current, enabled: action.value === "on" }));
      }
    }
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
          onRemoveNote={(id) => setLearningNotes((items) => items.filter((note) => note.id !== id))}
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
            className="accessibility-panel-left"
            textScale={textScale}
            setTextScale={setTextScale}
            appearance={appearance}
            setAppearance={setAppearance}
            lowSensory={lowSensory}
            setLowSensory={setLowSensory}
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
              lowSensory={lowSensory}
              setLowSensory={setLowSensory}
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
        {breakLock}
      </div>
    );
  }

  if (subjectSelectionPending && signedIn && authRole !== "mentor" && !parentOpen) {
    return (
      <div className={classNames("app page-ready", `theme-${appearance}`)} style={{ "--text-scale": textScale }}>
        <StudentSubjectsPage selectedSubjects={preferredSubjects} onContinue={savePreferredSubjects} t={t} />
        {breakLock}
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
        {breakLock}
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
            // Subjects were picked just before this step; don't ask again.
            const savedSubjects = preferredSubjects.length ? preferredSubjects : readPreferredSubjects(profile.email);
            setPreferredSubjects(savedSubjects);
            setSubjectSelectionPending(savedSubjects.length === 0);
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
          studentId={authUserId}
          existingProfile={studentProfile}
          t={t}
          onBack={() => setProfileOpen(false)}
          onComplete={(profile) => {
            setStudentProfile(profile);
            setPreferredSubjects(profile.preferredSubjects || preferredSubjects);
            setProfileOpen(false);
          }}
        />
        {breakLock}
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
              const savedSubjects = readPreferredSubjects(account.email);
              setPreferredSubjects(savedSubjects);
              setSubjectSelectionPending(savedSubjects.length === 0);
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
        studentId={supabaseConfigured && authRole === "student" ? authUserId : null}
        breakKey={supabaseConfigured ? authUserId : studentEmail}
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
            lowSensory={lowSensory}
            setLowSensory={setLowSensory}
            language={studentLanguage}
            setLanguage={setStudentLanguage}
            readAloud={readAloud}
            setReadAloud={setReadAloud}
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
              onOpenSession={openSession}
            />
          ),
          leaderboard: <LeaderboardPage signedIn={signedIn} studentName={studentName} t={t} />,
          mindful: <ErrorBoundary name="Mindful Corner" t={t} onClose={() => goToTab("home")}><MindfulCorner studentId={studentEmail} accountId={supabaseConfigured && authRole === "student" ? authUserId : null} signedIn={signedIn} onSignIn={() => setLoginOpen(true)} t={t} onAward={() => setMindfulVersion((version) => version + 1)} onClose={() => goToTab("home")} /></ErrorBoundary>,
          relax: <RelaxationRoom onBack={() => goToTab("home")} t={t} />,
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
              privateSessions={privateSessions}
              onSelect={openSession}
              onBack={closeSession}
              onSignIn={() => setLoginOpen(true)}
              onRegister={toggleRegistration}
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
              t={t}
              onOpenSession={openSession}
            />
          ),
          careers: signedIn && isGrade12 ? <CareerOptionsPage t={t} studentEmail={studentEmail} handwritingType={studentProfile?.handwritingType} handwritingImage={studentProfile?.handwritingImage} onAddHandwriting={() => setProfileOpen(true)} /> : null,
          flow: (
            <FlowPage
              t={t}
              language={studentLanguage}
              studentEmail={studentEmail}
              readAloud={readAloud}
              assistantContext={assistantContext}
              onAction={handleAssistantAction}
            />
          ),
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
              screenTimeVersion={screenTimeVersion}
              screenTimeStudentKey={supabaseConfigured ? authUserId : studentEmail}
              screenTimeDemoMode={!supabaseConfigured}
              onEditProfile={() => setProfileOpen(true)}
              t={t}
            />
          ),
          sensory: sensoryTrackerEnabled ? (
            <SensoryTrackerPage
              key={supabaseConfigured ? authUserId : studentEmail}
              studentId={supabaseConfigured ? authUserId : studentEmail}
              demoMode={sensoryTrackerDemoMode}
              lowSensory={lowSensory}
              onToggleLowSensory={() => setLowSensory((on) => !on)}
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
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}<button type="button" className="toast-close" onClick={() => setToast("")} aria-label={t("close")}><X size={16} /></button></div>}
      {breakLock}
    </div>
  );
};

export default App;
