import { CalendarDays, Home, Info, Sparkles } from "lucide-react";

export const MENTOR_EMAIL = "mentor@cognibridge.com";
export const MENTOR_PASSWORD = "password123";
export const DEMO_STUDENT_EMAIL = "student@cognibridge.com";
export const DEMO_STUDENT_PASSWORD = "student123";

export const initialSessions = [
  { id: "algebra-basics", subject: "Maths", title: "Algebra Basics", date: "2026-09-22", time: "16:00", endTime: "17:00", meetLink: "https://meet.google.com/algebra-basics", attendees: 12, description: "Build confidence with variables, expressions, and simple equations.", titleKey: "algebraBasicsTitle", descriptionKey: "algebraBasicsDescription", learnKeys: ["algebraLearnVariable", "algebraLearnExpression", "algebraLearnEquation"], learn: ["Identify variables and constants", "Simplify basic algebraic expressions", "Solve one-step equations together"] },
  { id: "fractions-workshop", subject: "Maths", title: "Fractions Workshop", date: "2026-09-26", time: "10:00", endTime: "11:00", meetLink: "https://meet.google.com/fractions-workshop", attendees: 8, titleKey: "fractionsWorkshopTitle", descriptionKey: "fractionsWorkshopDescription", learnKeys: ["fractionsLearnCompare", "fractionsLearnAddSubtract", "fractionsLearnApply"], description: "Use visual models and practical examples to compare and work with fractions.", learn: ["Compare fractions using visual models", "Add and subtract like fractions", "Apply fractions to everyday problems"] }
];

export const navigation = [[Home, "Home", "home"], [Info, "About Us", "about"], [CalendarDays, "Sessions", "sessions"], [Sparkles, "Cogni-Flow AI", "flow"]];
export const subjects = ["Maths", "Science", "English", "SST", "Languages"];
export const sessionSubjectTranslations = {
  Maths: "subjectMaths",
  Science: "subjectScience",
  English: "subjectEnglish",
  SST: "subjectSST",
  Languages: "subjectLanguages",
};
export const getSessionSubjectLabel = (subject, t) => t(sessionSubjectTranslations[subject] || "subjectMaths");
export const indianLanguages = [["English", "English"], ["हिन्दी", "Hindi"], ["বাংলा", "Bengali"], ["తెలుగు", "Telugu"], ["मराठी", "Marathi"], ["தமிழ்", "Tamil"], ["ગુજરાતી", "Gujarati"], ["ಕನ್ನಡ", "Kannada"], ["മലയാളം", "Malayalam"], ["ਪੰਜਾਬੀ", "Punjabi"]];

export const classNames = (...names) => names.filter(Boolean).join(" ");
export const formatSession = (s) => `${new Date(`${s.date}T${s.time}`).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}, ${s.time} – ${s.endTime}`;
export const readStudents = () => {
  try {
    const value = JSON.parse(localStorage.getItem("cognibridge_students") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
