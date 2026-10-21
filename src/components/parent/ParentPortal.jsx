<<<<<<< HEAD
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, GraduationCap, Headphones, LogOut, MessageCircle, Send, UserRound, Users } from "lucide-react";
import { calculateStudentStats, formatLearningTime } from "../../studentActivity";
import { connectParentWithCode, loadParentPortal, sendParentTeacherMessage } from "../../parentPortal";
import { LanguagePicker } from "../AccessAndAuth";
import { LogoImage } from "../Brand";
import { RelaxationRoom } from "../RelaxationRoom";
import { ReflectionChart } from "../student/pages/ReflectionJournal";
import { ScreenTimeSummary } from "../shared/ScreenTimeSummary";
import { loadScreenTime } from "../../screenTime";
import "./ParentPortal.css";

export function ParentPortal({ parentId, parentName, onLogout, language, setLanguage, t }) {
  const [dashboard, setDashboard] = useState({ children: [], activities: [], messages: [], journalEntries: [], screenTime: [] });
  const [code, setCode] = useState("");
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [relaxing, setRelaxing] = useState(false);
=======
import React, { useEffect, useState } from "react";
import { Accessibility, LogOut } from "lucide-react";
import { MouseTrail } from "../Brand";
import { connectParentWithCode, loadChildCheckins, loadChildSessions, loadParentPortal, sendParentTeacherMessage } from "../../parentPortal";
import { ParentSidebar } from "./ParentSidebar";
import { useRouteTab } from "../../routes";
import { ConnectChildCard } from "./shared/ConnectChildCard";
import { ParentMoodsPage } from "./pages/ParentMoodsPage";
import { ParentOverviewPage } from "./pages/ParentOverviewPage";
import { ParentSessionsPage } from "./pages/ParentSessionsPage";
import { ParentTeachersPage } from "./pages/ParentTeachersPage";
import "./ParentPortal.css";

function ParentLoading({ t }) {
  return (
    <div className="stats-grid stats-grid-loading" role="status" aria-label={t("parentLoading")}>
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} aria-hidden="true">
          <span className="stat-skeleton stat-skeleton-icon" />
          <span className="stat-skeleton stat-skeleton-value" />
          <span className="stat-skeleton stat-skeleton-label" />
        </article>
      ))}
    </div>
  );
}
>>>>>>> origin/main

const parentTabs = ["overview", "moods", "sessions", "teachers"];

const pickChild = (children, currentId) => (
  children.some((child) => child.id === currentId) ? currentId : children[0]?.id ?? null
);

export function ParentPortal({ parentId, parentName, onLogout, accessibilityOpen, onToggleAccessibility, accessibilityPanel, t }) {
  const [tab, setTab] = useRouteTab("parent", parentTabs);
  const [portal, setPortal] = useState(null);
  const [childId, setChildId] = useState(null);
  const [childData, setChildData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    loadParentPortal(parentId)
      .then((next) => {
        if (!isCurrent) return;
        setPortal(next);
        setChildId((current) => pickChild(next.children, current));
      })
      .catch((loadError) => {
        console.error("Parent portal: loading linked children failed", loadError);
        if (isCurrent) setError(t("parentLoadError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [parentId, retry]);

  useEffect(() => {
<<<<<<< HEAD
    if (!parentId || !dashboard.children.length) return undefined;
    let current = true;
    const refreshScreenTime = () => loadScreenTime(dashboard.children.map((child) => child.id))
      .then((screenTime) => { if (current) setDashboard((latest) => ({ ...latest, screenTime })); })
      .catch(() => {});
    const interval = window.setInterval(refreshScreenTime, 30_000);
    return () => { current = false; window.clearInterval(interval); };
  }, [parentId, dashboard.children]);

  const connectChild = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const linked = await connectParentWithCode(code.trim());
      setCode("");
      await refresh();
      setNotice(t("childConnectedNotice", { name: linked?.[0]?.student_name || t("yourChild") }));
    } catch {
      setError(t("invalidConnectionCode"));
    } finally { setSaving(false); }
=======
    setChildData(null);
    if (!childId) return undefined;
    let isCurrent = true;
    Promise.all([loadChildCheckins(childId), loadChildSessions(childId)])
      .then(([checkins, sessions]) => {
        if (isCurrent) setChildData({ checkins, sessions });
      })
      .catch((loadError) => {
        console.error("Parent portal: loading the child's check-ins/sessions failed", loadError);
        if (isCurrent) setError(t("parentLoadError"));
      });
    return () => {
      isCurrent = false;
    };
  }, [childId, retry]);

  const refreshPortal = async () => {
    const next = await loadParentPortal(parentId);
    setPortal(next);
    return next;
>>>>>>> origin/main
  };

  const connectChild = async (code) => {
    const [linked] = await connectParentWithCode(code);
    const next = await refreshPortal();
    setChildId((current) => (linked?.student_id ? linked.student_id : pickChild(next.children, current)));
    return linked?.student_name;
  };

  const sendMessage = async (mentorId, message) => {
    await sendParentTeacherMessage({ parentId, studentId: childId, mentorId, message });
    await refreshPortal();
  };

<<<<<<< HEAD
  if (relaxing) return <RelaxationRoom onBack={() => setRelaxing(false)} t={t} />;

  return <main className="parent-portal">
    <header className="parent-header">
      <div className="parent-brand"><span><LogoImage size={40} /></span><div><strong>CogniBridge</strong><small>{t("parentPortal")}</small></div></div>
      <div className="parent-header-user"><LanguagePicker compact value={language} onChange={setLanguage} t={t} /><span>{parentName}</span><button type="button" onClick={() => setRelaxing(true)}><Headphones size={17} /> {t("quietSpaceTitle")}</button><button type="button" onClick={onLogout}><LogOut size={17} /> {t("logOut")}</button></div>
    </header>
    <div className="parent-content">
      <section className="parent-welcome"><div><p className="mentor-kicker">{t("familyConnection")}</p><h1>{t("welcomeParent", { name: parentName })}</h1><p>{t("parentWelcomeDescription")}</p></div><GraduationCap size={44} /></section>
      {error && <p className="parent-message parent-error" role="alert">{error}</p>}
      {notice && <p className="parent-message parent-success" role="status">{notice}</p>}
      <section className="parent-connect-card">
        <div><h2>{t("connectChild")}</h2><p>{t("connectChildDescription")}</p></div>
        <form onSubmit={connectChild}><label htmlFor="parent-child-code">{t("connectionCode")}</label><div><input id="parent-child-code" value={code} maxLength={32} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t("enterCode")} required /><button type="submit" disabled={saving}>{saving ? t("connecting") : <>{t("connect")} <ArrowRight size={17} /></>}</button></div></form>
      </section>
      <div className="parent-summary">
        <article><Users size={19} /><strong>{dashboard.children.length}</strong><span>{t("connectedChildren")}</span></article>
        <article><CalendarDays size={19} /><strong>{summary.sessions}</strong><span>{t("recordedSessions")}</span></article>
        <article><Clock3 size={19} /><strong>{summary.time}</strong><span>{t("learningTime")}</span></article>
      </div>
      <section className="parent-children"><div className="parent-section-heading"><div><p className="mentor-kicker">{t("learningAtGlance")}</p><h2>{t("childPerformance")}</h2></div></div>
        {loading ? <p className="parent-empty">{t("loadingLinkedStudents")}</p>
          : dashboard.children.length === 0 ? <div className="parent-empty"><UserRound size={26} /><strong>{t("noChildConnected")}</strong><span>{t("noChildConnectedDescription")}</span></div>
            : dashboard.children.map((child) => {
              const childActivities = dashboard.activities.filter((activity) => activity.student_id === child.id).map((activity) => ({
                sessionId: activity.session_id, subject: activity.subject, activityDate: activity.activity_date, durationMinutes: activity.duration_minutes,
              }));
              const stats = calculateStudentStats(childActivities);
              return <article className="parent-child-card" key={child.id}>
                <div className="parent-child-heading"><span className="parent-child-avatar">{child.display_name?.charAt(0)?.toUpperCase() || "S"}</span><div><h3>{child.display_name}</h3><p>{t("childActivitySummary", { sessions: stats.sessionsAttended, time: stats.learningTime })}</p></div></div>
                <div className="parent-child-stats"><div><strong>{stats.sessionsAttended}</strong><span>{t("sessionsLabel")}</span></div><div><strong>{stats.subjectsExplored}</strong><span>{t("subjectsExplored")}</span></div><div><strong>{stats.learningStreak}</strong><span>{t("dayStreak")}</span></div></div>
                <ScreenTimeSummary rows={dashboard.screenTime} studentId={child.id} t={t} />
                <div className="parent-subject-list"><strong>{t("subjects")}</strong>{childActivities.length ? [...new Set(childActivities.map((activity) => activity.subject))].map((subject) => <span key={subject}>{subject}</span>) : <small>{t("activityAppearsAfterSessions")}</small>}</div>
                <section className="parent-teachers parent-journal-shares"><h4>{t("sharedJournalHeading")}</h4>{dashboard.journalEntries.filter((item) => item.student_id === child.id).length ? dashboard.journalEntries.filter((item) => item.student_id === child.id).map((item) => <article className="parent-shared-journal-entry" key={item.id}><time>{new Date(item.created_at).toLocaleDateString(document.documentElement.lang || undefined, { dateStyle: "medium" })}</time><p>{item.entry}</p><ReflectionChart chart={item.chart} t={t} /></article>) : <p className="parent-no-teacher">{t("sharedJournalEmpty")}</p>}</section>
                <section className="parent-teachers"><h4><MessageCircle size={17} /> {t("consultTeachers")}</h4>
                  {child.mentors.length === 0 ? <p className="parent-no-teacher">{t("noTeacherAssigned")}</p> : child.mentors.map((mentor) => {
                    const thread = dashboard.messages.filter((message) => message.student_id === child.id && message.mentor_id === mentor.id);
                    const key = `${child.id}:${mentor.id}`;
                    return <div className="parent-teacher-thread" key={mentor.id}>
                      <strong>{mentor.display_name}</strong>
                      <div className="parent-thread-messages">{thread.length ? thread.map((message) => <p key={message.id} className={message.sender_role === "parent" ? "from-parent" : "from-teacher"}><span>{message.sender_role === "parent" ? t("you") : t("teacher")}</span>{message.message}<small>{new Date(message.created_at).toLocaleString(document.documentElement.lang || "en-IN")}</small></p>) : <small>{t("startPrivateConversation")}</small>}</div>
                      <form onSubmit={(event) => sendMessage(event, child, mentor)}><input aria-label={`${t("messageLabel")} ${mentor.display_name}`} maxLength={4000} value={drafts[key] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder={t("writeMessage")} required /><button type="submit" disabled={saving}><Send size={16} /><span>{t("send")}</span></button></form>
                    </div>;
                  })}
                </section>
              </article>;
            })}
      </section>
    </div>
  </main>;
=======
  const children = portal?.children || [];
  const child = children.find((item) => item.id === childId);
  const childName = child?.display_name || "";
  const [title, subtitle] = {
    overview: [t("parentGreeting", { name: parentName }), child ? t("parentOverviewCopy", { child: childName }) : ""],
    moods: [t("parentMoods"), ""],
    sessions: [t("childSessionsHeading"), t("attentionRatedBy")],
    teachers: [t("consultTeachers"), child ? t("consultTeachersCopy", { child: childName }) : ""],
  }[tab];

  let body;
  if (error) {
    body = (
      <div className="stats-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>{t("tryAgain")}</button>
      </div>
    );
  } else if (!portal) {
    body = <ParentLoading t={t} />;
  } else if (!child) {
    body = <ConnectChildCard title={t("connectChild")} intro={t("noChildLinked")} onConnect={connectChild} t={t} />;
  } else if (tab === "teachers") {
    body = <ParentTeachersPage key={child.id} child={child} messages={portal.messages.filter((message) => message.student_id === child.id)} onSend={sendMessage} t={t} />;
  } else if (!childData) {
    body = <ParentLoading t={t} />;
  } else if (tab === "moods") {
    body = <ParentMoodsPage child={child} checkins={childData.checkins} t={t} />;
  } else if (tab === "sessions") {
    body = <ParentSessionsPage child={child} sessions={childData.sessions} t={t} />;
  } else {
    body = <ParentOverviewPage child={child} checkins={childData.checkins} sessions={childData.sessions} onOpenTab={setTab} onConnect={connectChild} t={t} />;
  }

  return (
    <>
      <MouseTrail />
      <div className="student-app-shell parent-app-shell">
        <aside className="student-rail">
          <ParentSidebar activeTab={tab} onNavigate={setTab} t={t} />
          <div className="student-rail-footer">
            <button type="button" className="student-rail-link" data-accessibility-toggle onClick={onToggleAccessibility} aria-label={t("openAccessibility")} aria-expanded={accessibilityOpen} title={t("accessibility")}>
              <Accessibility size={19} /><span>{t("accessibility")}</span>
            </button>
            <div className="student-rail-account">
              <button type="button" className="student-rail-link student-rail-logout" onClick={onLogout} aria-label={t("logOut")} title={t("logOut")}>
                <span className="avatar-small">{parentName?.charAt(0)?.toUpperCase() || "P"}</span>
                <span>{parentName}</span>
                <LogOut size={16} className="student-rail-logout-icon" />
              </button>
            </div>
          </div>
        </aside>
        <main className="main">
          <section className="content parent-page" key={tab}>
            <header className="parent-heading parent-rise">
              <div>
                <p className="eyebrow">{t("parentSpace")}</p>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {children.length > 1 ? (
                <label className="parent-child-switch">
                  <span>{t("viewingChild")}</span>
                  <select value={childId || ""} onChange={(event) => setChildId(event.target.value)}>
                    {children.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
                  </select>
                </label>
              ) : child ? (
                <span className="parent-child-chip"><span className="avatar-small">{childName.charAt(0).toUpperCase()}</span>{childName}</span>
              ) : null}
            </header>
            {body}
          </section>
        </main>
      </div>
      {accessibilityOpen && accessibilityPanel}
    </>
  );
>>>>>>> origin/main
}
