import React from "react";
import { BookOpen, CheckCircle2, FileText } from "lucide-react";
import { LogoImage } from "../../Brand";

const BrandIcon = ({ size }) => <LogoImage size={size} />;

const prompts = [
  { icon: BookOpen, label: "explainTopic", prompt: "promptExplain" },
  { icon: CheckCircle2, label: "homeworkHelp", prompt: "promptHomework" },
  { icon: BrandIcon, label: "studyPlan", prompt: "promptPlan" },
  { icon: FileText, label: "practiceQuestions", prompt: "promptPractice" },
];

export function QuickPrompts({ onSelect, t }) {
  return (
    <div className="quick-prompts">
      <p className="quick-prompts-title">{t("choosePrompt")}</p>
      <div className="quick-prompts-grid">
        {prompts.map(({ icon: Icon, label, prompt }) => (
          <button key={label} className="quick-prompt-btn" onClick={() => onSelect(t(prompt))}>
            <Icon size={18} /><span>{t(label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
