import React from "react";
import { formatLocalizedDate } from "../../../constants";
import "./MoodTrendChart.css";

const defaultLegend = { mood: "Mood", energy: "Energy", comfort: "Comfort" };

// Mood, energy and comfort across the 7 most recent check-ins (entries newest first).
export function MoodTrendChart({ entries, label, emptyText, legend = defaultLegend }) {
  const data = entries.slice(0, 7).reverse();
  if (data.length < 2) return <p className="sensory-muted sensory-chart-empty">{emptyText}</p>;
  // Quick check-ins have no energy/comfort rating, so those points are skipped.
  const pointsFor = (field) => data
    .map((entry, index) => entry[field] == null ? null : `${30 + index * (540 / (data.length - 1))},${155 - ((entry[field] - 1) / 4) * 125}`)
    .filter(Boolean)
    .join(" ");
  return (
    <div className="sensory-chart-wrap">
      <div className="sensory-chart-legend"><span className="mood-line">{legend.mood}</span><span className="energy-line">{legend.energy}</span><span className="comfort-line">{legend.comfort}</span></div>
      <svg className="sensory-chart" viewBox="0 0 600 180" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="30" x2="570" y1={30 + line * 31} y2={30 + line * 31} />)}
        <polyline className="mood-line" pathLength="1" points={pointsFor("mood")} />
        <polyline className="energy-line" pathLength="1" points={pointsFor("energy")} />
        <polyline className="comfort-line" pathLength="1" points={pointsFor("comfort")} />
      </svg>
      <div className="sensory-chart-dates"><span>{formatLocalizedDate(data[0].created_at)}</span><span>{formatLocalizedDate(data[data.length - 1].created_at)}</span></div>
    </div>
  );
}
