import React from "react";
import { Clock3 } from "lucide-react";
import { formatScreenTime, makeScreenTimeDays } from "../../screenTime";

export function ScreenTimeSummary({ rows = [], studentId, title, t }) {
  const days = makeScreenTimeDays(rows, studentId);
  const total = days.reduce((sum, day) => sum + day.seconds, 0);
  const peak = Math.max(60, ...days.map((day) => day.seconds));
  const today = days[days.length - 1];
  const locale = document.documentElement.lang || undefined;
  return <section className="screen-time-summary" aria-label={title || t("screenTimeTitle")}>
    <div className="screen-time-summary-heading"><span className="screen-time-icon"><Clock3 size={19} /></span><div><h3>{title || t("screenTimeTitle")}</h3><p>{t("screenTimeDescription")}</p></div></div>
    <div className="screen-time-totals"><article><strong>{formatScreenTime(today?.seconds)}</strong><span>{t("screenTimeToday")}</span></article><article><strong>{formatScreenTime(total)}</strong><span>{t("screenTimeLast7Days")}</span></article></div>
    <div className="screen-time-chart" role="img" aria-label={`${t("screenTimeLast7Days")}: ${formatScreenTime(total)}`}>
      {days.map((day) => <div className="screen-time-day" key={day.key} title={`${day.date.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}: ${formatScreenTime(day.seconds)}`}>
        <span className="screen-time-bar-track"><span className="screen-time-bar" style={{ height: `${Math.max(day.seconds ? 8 : 0, Math.round((day.seconds / peak) * 100))}%` }} /></span>
        <small>{day.date.toLocaleDateString(locale, { weekday: "short" })}</small>
        <small>{formatScreenTime(day.seconds)}</small>
      </div>)}
    </div>
  </section>;
}
