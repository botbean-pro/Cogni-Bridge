import React, { useState } from "react";
import { BookOpen, CheckCircle2, FileText, X } from "lucide-react";
import { LogoImage } from "../../Brand";

const BrandIcon = ({ size }) => <LogoImage size={size} />;

const prompts = [
  { icon: BookOpen, label: "explainTopic", prompt: "promptExplain" },
  { icon: CheckCircle2, label: "homeworkHelp", prompt: "promptHomework" },
  { icon: BrandIcon, label: "studyPlan", prompt: "promptPlan" },
  { icon: FileText, label: "practiceQuestions", prompt: "promptPractice" },
];

export function QuickPrompts({ onSelect, t }) {
  const [dismissedPrompts, setDismissedPrompts] = useState([]);
  const visiblePrompts = prompts.filter(({ label }) => !dismissedPrompts.includes(label));

  if (!visiblePrompts.length) return null;

  return (
    <div className="quick-prompts">
      <p className="quick-prompts-title">{t("choosePrompt")}</p>
      <div className="quick-prompts-grid">
        {visiblePrompts.map(({ icon: Icon, label, prompt }) => (
          <div className="quick-prompt-row" key={label}>
            <button className="quick-prompt-btn" onClick={() => onSelect(t(prompt))}>
              <Icon size={18} /><span>{t(label)}</span>
            </button>
            <button
              type="button"
              className="quick-prompt-dismiss"
              onClick={() => setDismissedPrompts((current) => [...current, label])}
              aria-label={t("close")}
              title={t("close")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
