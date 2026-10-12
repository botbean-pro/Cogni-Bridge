import React from "react";
import { moodIcons } from "../../../studentSensory";

export function MoodBadge({ mood, size = "md" }) {
  return <span className={`parent-mood parent-mood-${mood} parent-mood-${size}`} aria-hidden="true">{moodIcons[mood - 1]}</span>;
}
