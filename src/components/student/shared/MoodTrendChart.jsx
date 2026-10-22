import React from "react";
import { formatLocalizedDate } from "../../../constants";
import "./MoodTrendChart.css";

const defaultLegend = { mood: "Mood", energy: "Energy", comfort: "Comfort" };
const fields = ["mood", "energy", "comfort"];
const width = 600;
const height = 200;
const padX = 26;
const padY = 14;

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

// Daily averages of mood, energy and comfort over the 7 most recent days with check-ins (entries newest first).
// Quick check-ins have no energy/comfort rating, so they only count towards mood.
export function MoodTrendChart({ entries, label, emptyText, legend = defaultLegend }) {
  const days = [];
  entries.forEach((entry) => {
    const day = new Date(entry.created_at).toLocaleDateString("en-CA");
    let bucket = days.find((item) => item.day === day);
    if (!bucket) {
      if (days.length === 7) return;
      bucket = { day, mood: [], energy: [], comfort: [] };
      days.push(bucket);
    }
    fields.forEach((field) => { if (entry[field] != null) bucket[field].push(Number(entry[field])); });
  });
  if (entries.length < 2) return <p className="sensory-muted sensory-chart-empty">{emptyText}</p>;

  const data = days.reverse().map((bucket) => ({ day: bucket.day, ...Object.fromEntries(fields.map((field) => [field, average(bucket[field])])) }));
  const x = (index) => (data.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (data.length - 1)));
  const y = (value) => padY + ((5 - value) / 4) * (height - padY * 2);
  const pointsFor = (field) => data
    .map((point, index) => (point[field] == null ? null : { x: x(index), y: y(point[field]), value: point[field], day: point.day }))
    .filter(Boolean);

  return (
    <div className="sensory-chart-wrap">
      <div className="sensory-chart-legend">{fields.map((field) => <span key={field} className={`${field}-line`}>{legend[field]}</span>)}</div>
      <div className="sensory-chart-plot">
        <div className="sensory-chart-y" aria-hidden="true">
          {[5, 4, 3, 2, 1].map((value) => <span key={value} style={{ top: `${(y(value) / height) * 100}%` }}>{value}</span>)}
        </div>
        <svg className="sensory-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          {[5, 4, 3, 2, 1].map((value) => <line key={value} x1={padX} x2={width - padX} y1={y(value)} y2={y(value)} />)}
          {fields.map((field) => {
            const points = pointsFor(field);
            return (
              <g key={field} className={`${field}-line`}>
                {points.length > 1 && <polyline pathLength="1" points={points.map((point) => `${point.x},${point.y}`).join(" ")} />}
                {points.map((point) => (
                  <circle key={point.day} cx={point.x} cy={point.y} r="5.5">
                    <title>{`${legend[field]}: ${Math.round(point.value * 10) / 10}/5 · ${formatLocalizedDate(`${point.day}T12:00`, { weekday: "short", month: "short", day: "numeric" })}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="sensory-chart-dates" aria-hidden="true">
        {data.map((point, index) => (
          <span key={point.day} style={{ left: `${(x(index) / width) * 100}%` }}>
            {formatLocalizedDate(`${point.day}T12:00`, { weekday: "short", day: "numeric" })}
          </span>
        ))}
      </div>
    </div>
  );
}
