import React from "react";
import { Angry, Frown, Laugh, Meh, Smile } from "lucide-react";

// One icon per moodLabels entry (Very bad -> Great), matching the student's mood picker.
const icons = [Angry, Frown, Meh, Smile, Laugh];

export function MoodBadge({ mood, size = "md" }) {
  const Icon = icons[mood - 1];
  return <span className={`parent-mood parent-mood-${mood} parent-mood-${size}`} aria-hidden="true">{Icon && <Icon size="1em" strokeWidth={2} />}</span>;
}
