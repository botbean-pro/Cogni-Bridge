import React from "react";
import { BookOpen, CheckCircle2, FileText, Sparkles } from "lucide-react";

const prompts = [
  { icon: BookOpen, label: "Explain a topic", prompt: "Can you explain basic algebra concepts?" },
  { icon: CheckCircle2, label: "Help with homework", prompt: "I need help with my homework" },
  { icon: Sparkles, label: "Create a study plan", prompt: "Can you help me create a study plan?" },
  { icon: FileText, label: "Practice questions", prompt: "Give me some practice questions" },
];

export function QuickPrompts({ onSelect }) {
  return (
    <div className="quick-prompts">
      <p className="quick-prompts-title">Choose a starting point or type your own question:</p>
      <div className="quick-prompts-grid">
        {prompts.map(({ icon: Icon, label, prompt }) => (
          <button key={label} className="quick-prompt-btn" onClick={() => onSelect(prompt)}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
