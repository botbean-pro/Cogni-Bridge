import React from "react";
import { LockKeyhole } from "lucide-react";
import { MoodTrendChart } from "../../student/shared/MoodTrendChart";
import { MoodBadge } from "../shared/MoodBadge";

function RatingMeter({ label, value }) {
  return (
    <div className="parent-meter">
      <span>{label}</span>
      <span className="parent-meter-track" aria-hidden="true"><span className="parent-meter-fill" style={{ width: `${value * 20}%` }} /></span>
      <small>{value}/5</small>
    </div>
  );
}

// Only ratings, emotions and causes reach the parent; written notes never leave the
// child's account (see child_checkins in 20261012000600_parent_portal.sql).
export function ParentMoodsPage({ child, checkins, t }) {
  return (
    <>
      <p className="parent-privacy parent-rise"><LockKeyhole size={16} /> {t("moodsPrivacy", { child: child.display_name })}</p>

      <section className="parent-card parent-rise" style={{ "--rise-delay": "70ms" }}>
        <div className="parent-card-title"><h2>{t("moodOverTime")}</h2></div>
        <MoodTrendChart
          entries={checkins}
          label={t("moodTrendAria", { child: child.display_name })}
          emptyText={checkins.length ? t("moodTrendEmpty") : t("noCheckinsYet", { child: child.display_name })}
          legend={{ mood: t("moodLabel"), energy: t("energyLabel"), comfort: t("comfortLabel") }}
        />
      </section>

      <section className="parent-card parent-rise" style={{ "--rise-delay": "140ms" }}>
        <div className="parent-card-title"><h2>{t("checkinHistory")}</h2></div>
        {checkins.length ? (
          <div className="parent-checkins">
            {checkins.map((entry, index) => (
              <article className="parent-checkin parent-rise" key={entry.id} style={{ "--rise-delay": `${200 + Math.min(index, 8) * 50}ms` }}>
                <MoodBadge mood={entry.mood} />
                <div className="parent-checkin-body">
                  <div className="parent-checkin-top">
                    <strong>{t(`mood_${entry.mood}`)}</strong>
                    <small>{new Date(entry.created_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
                    {entry.checkin_type === "quick" && <em>{t("quickCheckin")}</em>}
                  </div>
                  {entry.emotions?.length > 0 && (
                    <div className="parent-chips">{entry.emotions.map((key) => <span key={key}>{t(`emotion_${key}`)}</span>)}</div>
                  )}
                  {entry.energy != null && (
                    <div className="parent-meters">
                      <RatingMeter label={t("energyLabel")} value={entry.energy} />
                      <RatingMeter label={t("comfortLabel")} value={entry.comfort} />
                    </div>
                  )}
                  {entry.causes?.length > 0 && (
                    <p className="parent-causes"><strong>{t("possibleCauses")}:</strong> {entry.causes.map((key) => t(`cause_${key}`)).join(", ")}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="parent-muted">{t("noCheckinsYet", { child: child.display_name })}</p>}
      </section>
    </>
  );
}
