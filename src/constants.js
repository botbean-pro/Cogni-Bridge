import { CalendarDays, Home, Sparkles, Trophy } from "lucide-react";

export const MENTOR_EMAIL = "mentor@cognibridge.com";
export const MENTOR_PASSWORD = "password123";
export const DEMO_STUDENT_EMAIL = "student@cognibridge.com";
export const DEMO_STUDENT_PASSWORD = "student123";

export const initialSessions = [
  { id: "algebra-basics", subject: "Maths", title: "Algebra Basics", date: "2026-09-22", time: "16:00", endTime: "17:00", meetLink: "https://meet.google.com/algebra-basics", attendees: 12, description: "Build confidence with variables, expressions, and simple equations.", titleKey: "algebraBasicsTitle", descriptionKey: "algebraBasicsDescription", learnKeys: ["algebraLearnVariable", "algebraLearnExpression", "algebraLearnEquation"], learn: ["Identify variables and constants", "Simplify basic algebraic expressions", "Solve one-step equations together"] },
  { id: "fractions-workshop", subject: "Maths", title: "Fractions Workshop", date: "2026-10-26", time: "10:00", endTime: "11:00", meetLink: "https://meet.google.com/fractions-workshop", attendees: 8, titleKey: "fractionsWorkshopTitle", descriptionKey: "fractionsWorkshopDescription", learnKeys: ["fractionsLearnCompare", "fractionsLearnAddSubtract", "fractionsLearnApply"], description: "Use visual models and practical examples to compare and work with fractions.", learn: ["Compare fractions using visual models", "Add and subtract like fractions", "Apply fractions to everyday problems"] }
];

export const navigation = [[Home, "Home", "home"], [CalendarDays, "Sessions", "sessions"], [Trophy, "Cogni Board", "leaderboard"], [Sparkles, "Cogni-Flow AI", "flow"]];
export const demoStudents = [
  { name: "Aarav", email: "aarav@cognibridge.com", password: "password123", role: "Student" },
  { name: "Meera", email: "meera@cognibridge.com", password: "password123", role: "Student" },
  { name: "Harsh", email: "harsh@cognibridge.com", password: "password123", role: "Student" },
  { name: "Saanvi", email: "saanvi@cognibridge.com", password: "password123", role: "Student" },
  { name: "Samar", email: "samar@cognibridge.com", password: "password123", role: "Student" },
  { name: "Ishita", email: "ishita@cognibridge.com", password: "password123", role: "Student" },
  { name: "Vibhor", email: "vibhor@cognibridge.com", password: "password123", role: "Student" },
];
export const subjects = ["Maths", "Science", "English", "SST", "Hindi", "Languages", "Computer Science", "Artificial Intelligence", "Art"];
export const sessionSubjectTranslations = {
  Maths: "subjectMaths",
  Science: "subjectScience",
  English: "subjectEnglish",
  SST: "subjectSST",
  Hindi: "subjectHindi",
  Languages: "subjectLanguages",
  "Computer Science": "subjectComputerScience",
  "Artificial Intelligence": "subjectArtificialIntelligence",
  Art: "subjectArt",
};
export const getSessionSubjectLabel = (subject, t) => sessionSubjectTranslations[subject] ? t(sessionSubjectTranslations[subject]) : subject || t("subjectMaths");
const sessionTitleTranslations = {
  "plants and photosynthesis": "plantsPhotosynthesisTitle",
  "speaking with confidence": "speakingWithConfidenceTitle",
  "intro to scratch coding": "introScratchCodingTitle",
};
export const getSessionTitle = (session, t) => {
  if (session.titleKey) return t(session.titleKey);
  const titleKey = sessionTitleTranslations[String(session.title || "").toLowerCase()];
  return titleKey ? t(titleKey) : session.title;
};
export const indianLanguages = [["English", "English"], ["हिन्दी", "Hindi"], ["বাংলा", "Bengali"], ["తెలుగు", "Telugu"], ["मराठी", "Marathi"], ["தமிழ்", "Tamil"], ["ગુજરાતી", "Gujarati"], ["ಕನ್ನಡ", "Kannada"], ["മലയാളം", "Malayalam"], ["ਪੰਜਾਬੀ", "Punjabi"]];

export const learningLanguages = [...indianLanguages, ["Français", "French"], ["Deutsch", "German"], ["Español", "Spanish"]];
export const classNames = (...names) => names.filter(Boolean).join(" ");
export const formatLocalizedDate = (date, options) => new Date(date).toLocaleDateString(
  typeof document !== "undefined" ? (document.documentElement.lang || "en-IN") : "en-IN",
  options,
);
export const formatSession = (s) => `${formatLocalizedDate(`${s.date}T${s.time}`, { weekday: "short", month: "short", day: "numeric" })}, ${s.time} – ${s.endTime}`;
export const readStudents = () => {
  try {
    const value = JSON.parse(localStorage.getItem("cognibridge_students") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
