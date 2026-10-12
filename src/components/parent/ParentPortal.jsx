import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, GraduationCap, LogOut, MessageCircle, Send, UserRound, Users } from "lucide-react";
import { calculateStudentStats, formatLearningTime } from "../../studentActivity";
import { connectParentWithCode, loadParentPortal, sendParentTeacherMessage } from "../../parentPortal";
import { LogoImage } from "../Brand";
import "./ParentPortal.css";

export function ParentPortal({ parentId, parentName, onLogout, t }) {
  const [dashboard, setDashboard] = useState({ children: [], activities: [], messages: [] });
  const [code, setCode] = useState("");
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!parentId) return;
    const next = await loadParentPortal(parentId);
    setDashboard(next);
  }, [parentId]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    loadParentPortal(parentId).then((next) => { if (current) setDashboard(next); })
      .catch(() => { if (current) setError("Your parent portal couldn't be loaded. Please try again."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [parentId]);

  const connectChild = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const linked = await connectParentWithCode(code.trim());
      setCode("");
      await refresh();
      setNotice(`${linked?.[0]?.student_name || "Your child"} is now connected to your account.`);
    } catch {
      setError("That connection code is invalid, expired, or already used.");
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
      setError("Your message couldn't be sent. Please try again.");
    } finally { setSaving(false); }
  };

  const summary = useMemo(() => {
    const totalMinutes = dashboard.activities.reduce((sum, activity) => sum + activity.duration_minutes, 0);
    return { sessions: dashboard.activities.length, time: formatLearningTime(totalMinutes) };
  }, [dashboard.activities]);

  return <main className="parent-portal">
    <header className="parent-header">
      <div className="parent-brand"><span><LogoImage size={40} /></span><div><strong>CogniBridge</strong><small>Parent portal</small></div></div>
      <div className="parent-header-user"><span>{parentName}</span><button type="button" onClick={onLogout}><LogOut size={17} /> {t("logOut")}</button></div>
    </header>
    <div className="parent-content">
      <section className="parent-welcome"><div><p className="mentor-kicker">FAMILY CONNECTION</p><h1>Welcome, {parentName}</h1><p>Stay connected with your child’s learning and the teachers supporting them.</p></div><GraduationCap size={44} /></section>
      {error && <p className="parent-message parent-error" role="alert">{error}</p>}
      {notice && <p className="parent-message parent-success" role="status">{notice}</p>}
      <section className="parent-connect-card">
        <div><h2>Connect to your child</h2><p>Ask your child to create a one-time connection code in their student account settings. Codes expire after 24 hours.</p></div>
        <form onSubmit={connectChild}><label htmlFor="parent-child-code">Connection code</label><div><input id="parent-child-code" value={code} maxLength={32} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Enter code" required /><button type="submit" disabled={saving}>{saving ? "Connecting…" : <>Connect <ArrowRight size={17} /></>}</button></div></form>
      </section>
      <div className="parent-summary">
        <article><Users size={19} /><strong>{dashboard.children.length}</strong><span>Connected children</span></article>
        <article><CalendarDays size={19} /><strong>{summary.sessions}</strong><span>Recorded sessions</span></article>
        <article><Clock3 size={19} /><strong>{summary.time}</strong><span>Learning time</span></article>
      </div>
      <section className="parent-children"><div className="parent-section-heading"><div><p className="mentor-kicker">LEARNING AT A GLANCE</p><h2>Your child’s performance</h2></div></div>
        {loading ? <p className="parent-empty">Loading your linked students…</p>
          : dashboard.children.length === 0 ? <div className="parent-empty"><UserRound size={26} /><strong>No child connected yet</strong><span>Enter a connection code above to see learning progress and contact teachers.</span></div>
            : dashboard.children.map((child) => {
              const childActivities = dashboard.activities.filter((activity) => activity.student_id === child.id).map((activity) => ({
                sessionId: activity.session_id, subject: activity.subject, activityDate: activity.activity_date, durationMinutes: activity.duration_minutes,
              }));
              const stats = calculateStudentStats(childActivities);
              return <article className="parent-child-card" key={child.id}>
                <div className="parent-child-heading"><span className="parent-child-avatar">{child.display_name?.charAt(0)?.toUpperCase() || "S"}</span><div><h3>{child.display_name}</h3><p>{stats.sessionsAttended} sessions attended · {stats.learningTime} learning time</p></div></div>
                <div className="parent-child-stats"><div><strong>{stats.sessionsAttended}</strong><span>Sessions</span></div><div><strong>{stats.subjectsExplored}</strong><span>Subjects explored</span></div><div><strong>{stats.learningStreak}</strong><span>Day streak</span></div></div>
                <div className="parent-subject-list"><strong>Subjects</strong>{childActivities.length ? [...new Set(childActivities.map((activity) => activity.subject))].map((subject) => <span key={subject}>{subject}</span>) : <small>Learning activity will appear after completed sessions are recorded.</small>}</div>
                <section className="parent-teachers"><h4><MessageCircle size={17} /> Consult with teachers</h4>
                  {child.mentors.length === 0 ? <p className="parent-no-teacher">No teacher is assigned to this student account yet.</p> : child.mentors.map((mentor) => {
                    const thread = dashboard.messages.filter((message) => message.student_id === child.id && message.mentor_id === mentor.id);
                    const key = `${child.id}:${mentor.id}`;
                    return <div className="parent-teacher-thread" key={mentor.id}>
                      <strong>{mentor.display_name}</strong>
                      <div className="parent-thread-messages">{thread.length ? thread.map((message) => <p key={message.id} className={message.sender_role === "parent" ? "from-parent" : "from-teacher"}><span>{message.sender_role === "parent" ? "You" : "Teacher"}</span>{message.message}<small>{new Date(message.created_at).toLocaleString()}</small></p>) : <small>Start a private conversation with this teacher.</small>}</div>
                      <form onSubmit={(event) => sendMessage(event, child, mentor)}><input aria-label={`Message ${mentor.display_name}`} maxLength={4000} value={drafts[key] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder="Write a message…" required /><button type="submit" disabled={saving}><Send size={16} /><span>Send</span></button></form>
                    </div>;
                  })}
                </section>
              </article>;
            })}
      </section>
    </div>
  </main>;
}
