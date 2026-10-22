import React from "react";
import { Activity, CheckCircle2, ChevronRight, Gauge, Smile } from "lucide-react";
import { MoodTrendChart } from "../../student/shared/MoodTrendChart";
import { ChildSessionRow } from "../shared/ChildSessionRow";
import { ConnectChildCard } from "../shared/ConnectChildCard";
import { MoodBadge } from "../shared/MoodBadge";

const weekMs = 7 * 24 * 60 * 60 * 1000;

export function ParentOverviewPage({ child, checkins, sessions, onOpenTab, onConnect, showConnect, onDismissConnect, t }) {
  const attended = sessions.filter((session) => session.attended).length;
  const rated = sessions.filter((session) => session.attention != null);
  const averageAttention = rated.length ? rated.reduce((sum, session) => sum + session.attention, 0) / rated.length : null;
  const latest = checkins[0];
  const weekAgo = Date.now() - weekMs;
  const checkinsThisWeek = checkins.filter((entry) => new Date(entry.created_at).getTime() >= weekAgo).length;
  // Most recent finished sessions first, then the soonest upcoming ones.
  const recentSessions = [
    ...sessions.filter((session) => session.ended),
    ...sessions.filter((session) => !session.ended).reverse(),
  ].slice(0, 3);

  const cards = [
    [CheckCircle2, attended, t("sessionsAttended"), t("attendedOfRegistered", { count: sessions.length })],
    [Gauge, averageAttention == null ? "—" : `${averageAttention.toFixed(1)} / 5`, t("avgAttention"), averageAttention == null ? t("attentionNotRated") : t(`attention${Math.round(averageAttention)}`)],
    [Smile, latest ? <><MoodBadge mood={latest.mood} size="sm" /> {t(`mood_${latest.mood}`)}</> : "—", t("latestMood"), latest ? new Date(latest.created_at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : t("noCheckinsYet", { child: child.display_name })],
    [Activity, checkinsThisWeek, t("checkinsThisWeek"), ""],
  ];

  return (
    <>
      <div className="stats-grid parent-stats">
        {cards.map(([Icon, value, label, detail], index) => (
          <article key={label} className="parent-rise" style={{ "--rise-delay": `${index * 70}ms` }}>
            <span className="stat-icon"><Icon size={21} aria-hidden="true" /></span>
            <strong>{value}</strong>
            <span>{label}</span>
            {detail && <small>{detail}</small>}
          </article>
        ))}
      </div>

      <div className="parent-grid">
        <section className="parent-card parent-rise" style={{ "--rise-delay": "280ms" }}>
          <div className="parent-card-title">
            <h2>{t("moodOverTime")}</h2>
            <button type="button" className="parent-link" onClick={() => onOpenTab("moods")}>{t("viewAll")} <ChevronRight size={15} /></button>
          </div>
          <MoodTrendChart
            entries={checkins}
            label={t("moodTrendAria", { child: child.display_name })}
            emptyText={checkins.length ? t("moodTrendEmpty") : t("noCheckinsYet", { child: child.display_name })}
            legend={{ mood: t("moodLabel"), energy: t("energyLabel"), comfort: t("comfortLabel") }}
          />
        </section>

        <section className="parent-card parent-rise" style={{ "--rise-delay": "350ms" }}>
          <div className="parent-card-title">
            <h2>{t("recentSessions")}</h2>
            <button type="button" className="parent-link" onClick={() => onOpenTab("sessions")}>{t("viewAll")} <ChevronRight size={15} /></button>
          </div>
          {recentSessions.length ? (
            <div className="parent-session-list parent-session-list-compact">
              {recentSessions.map((session, index) => <ChildSessionRow key={session.id} session={session} delay={420 + index * 60} t={t} />)}
            </div>
          ) : <p className="parent-muted">{t("noChildSessions", { child: child.display_name })}</p>}
        </section>
      </div>

      {showConnect && <ConnectChildCard title={t("connectAnotherChild")} onConnect={onConnect} onDismiss={onDismissConnect} delay={480} t={t} />}
    </>
  );
}
