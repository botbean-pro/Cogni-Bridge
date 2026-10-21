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

  const refresh = useCallback(async () => {
    if (!parentId) return;
    const next = await loadParentPortal(parentId);
    setDashboard(next);
  }, [parentId]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    loadParentPortal(parentId).then((next) => { if (current) setDashboard(next); })
      .catch(() => { if (current) setError(t("parentLoadError")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [parentId, t]);

  useEffect(() => {
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
  };

  const sendMessage = async (event, child, mentor) => {
    event.preventDefault();
    const key = `${child.id}:${mentor.id}`;
    const message = drafts[key]?.trim();
    if (!message) return;
    setSaving(true); setError("");
    try {
      await sendParentTeacherMessage({ parentId, studentId: child.id, mentorId: mentor.id, message });
      setDrafts((current) => ({ ...current, [key]: "" }));
      await refresh();
    } catch {
      setError(t("messageSendError"));
    } finally { setSaving(false); }
  };

  const summary = useMemo(() => {
    const totalMinutes = dashboard.activities.reduce((sum, activity) => sum + activity.duration_minutes, 0);
    return { sessions: dashboard.activities.length, time: formatLearningTime(totalMinutes) };
  }, [dashboard.activities]);

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
}
