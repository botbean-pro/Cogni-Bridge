import {
  Atom, Banknote, Brain, BrainCircuit, Building2, Calculator, ChefHat, Clapperboard, Code2, Cog, Compass, Dna,
  Dumbbell, Feather, FlaskConical, Gavel, GraduationCap, HandHeart, HardHat, HeartPulse, Keyboard, Landmark,
  LineChart, Megaphone, Music, Newspaper, Palette, PawPrint, PenTool, Pill, Rocket, Scissors, ScrollText,
  ShieldCheck, Shirt, Smartphone, Sprout, Stethoscope, Wand2, Wrench,
} from "lucide-react";

// Career Options by stream. All visible text lives in the i18n catalog (src/i18nCareerStreams.js and
// the i18nCareerPaths*.js files), so this file only holds ids, icons and the facts that are not words.
//
// Keys follow one convention:
//   stream:  cs_s_<id> (name), _sub (subjects), _tag (one-line pitch)
//   career:  cs_c_<id> (title), _s (pitch), _try (a small thing to try this week), _r1.._r4 (roadmap stages)
//   skill:   cs_sk_<skill>
// `routes` are entry routes. Official names (B.Tech, NEET UG, UCEED...) stay as written in every language;
// a value starting with "cs_" is a translation key for a generic route such as a portfolio.
// `mix` rates a career 1-5 for [thinking & logic, creativity, working with people, hands-on work].

export const streamKey = (id, part = "") => `cs_s_${id}${part}`;
export const careerKey = (id, part = "") => `cs_c_${id}${part}`;
export const skillKey = (skill) => `cs_sk_${skill}`;
export const roadmapStages = [1, 2, 3, 4];

export const careerStreams = [
  {
    id: "pcm",
    Icon: Atom,
    tone: "indigo",
    careers: [
      { id: "software", Icon: Code2, skills: ["logic", "problem", "learn", "patience"], mix: [5, 3, 2, 1], routes: ["B.Tech CSE", "BCA", "JEE Main", "cs_rt_self"] },
      { id: "data", Icon: BrainCircuit, skills: ["numbers", "logic", "curiosity", "detail"], mix: [5, 3, 2, 1], routes: ["B.Tech CS / AI", "B.Sc Statistics", "BS Data Science (IIT Madras)", "JEE Main"] },
      { id: "robotics", Icon: Cog, skills: ["hands", "problem", "creativity", "teamwork"], mix: [4, 4, 2, 5], routes: ["B.Tech Mechanical / Robotics", "JEE Main", "State CETs", "cs_rt_diploma"] },
      { id: "civil", Icon: HardHat, skills: ["planning", "problem", "teamwork", "detail"], mix: [4, 3, 3, 4], routes: ["B.Tech Civil", "JEE Main", "State CETs", "cs_rt_diploma"] },
      { id: "architect", Icon: Building2, skills: ["drawing", "creativity", "planning", "communication"], mix: [3, 5, 3, 3], routes: ["B.Arch", "NATA", "JEE Main Paper 2", "Council of Architecture"] },
      { id: "cyber", Icon: ShieldCheck, skills: ["curiosity", "logic", "detail", "calm"], mix: [5, 2, 2, 2], routes: ["B.Tech CS", "BCA", "B.Sc IT", "cs_rt_cert"] },
    ],
  },
  {
    id: "pcb",
    Icon: Dna,
    tone: "rose",
    careers: [
      { id: "doctor", Icon: Stethoscope, skills: ["empathy", "calm", "persistence", "communication"], mix: [4, 1, 5, 4], routes: ["MBBS", "NEET UG", "BAMS / BHMS", "MCC counselling"] },
      { id: "nurse", Icon: HeartPulse, skills: ["empathy", "patience", "teamwork", "calm"], mix: [3, 1, 5, 4], routes: ["B.Sc Nursing", "GNM", "State Nursing Council", "cs_rt_state"] },
      { id: "physio", Icon: HandHeart, skills: ["empathy", "patience", "communication", "hands"], mix: [3, 2, 5, 5], routes: ["BPT", "cs_rt_state", "cs_rt_intern"] },
      { id: "pharmacist", Icon: Pill, skills: ["detail", "numbers", "communication", "focus"], mix: [4, 1, 3, 3], routes: ["D.Pharm", "B.Pharm", "Pharm.D", "State Pharmacy Council"] },
      { id: "biotech", Icon: FlaskConical, skills: ["curiosity", "observation", "patience", "logic"], mix: [5, 3, 2, 3], routes: ["B.Sc / B.Tech Biotechnology", "CUET UG", "JEE Main", "M.Sc & PhD"] },
      { id: "vet", Icon: PawPrint, skills: ["empathy", "calm", "observation", "hands"], mix: [4, 1, 4, 5], routes: ["BVSc & AH", "NEET UG", "Veterinary Council of India"] },
    ],
  },
  {
    id: "commerce",
    Icon: LineChart,
    tone: "amber",
    careers: [
      { id: "ca", Icon: Calculator, skills: ["numbers", "detail", "focus", "persistence"], mix: [5, 1, 3, 1], routes: ["CA Foundation (ICAI)", "CA Intermediate", "CA Final", "B.Com"] },
      { id: "entre", Icon: Rocket, skills: ["creativity", "leadership", "planning", "persistence"], mix: [3, 5, 4, 2], routes: ["BBA / B.Com", "Startup India", "cs_rt_incubator"] },
      { id: "finance", Icon: Banknote, skills: ["numbers", "logic", "detail", "communication"], mix: [5, 2, 3, 1], routes: ["B.Com", "BBA Finance", "NISM", "CFA"] },
      { id: "cs", Icon: ScrollText, skills: ["detail", "writing", "planning", "communication"], mix: [4, 2, 3, 1], routes: ["CS Foundation (ICSI)", "CS Executive", "CS Professional"] },
      { id: "digital", Icon: Megaphone, skills: ["creativity", "writing", "curiosity", "communication"], mix: [3, 5, 4, 1], routes: ["BBA / B.Com", "cs_rt_mass", "cs_rt_cert", "cs_rt_portfolio"] },
      { id: "economist", Icon: Landmark, skills: ["numbers", "curiosity", "writing", "logic"], mix: [5, 2, 3, 1], routes: ["BA / B.Sc Economics", "CUET UG", "MA Economics"] },
    ],
  },
  {
    id: "arts",
    Icon: Compass,
    tone: "violet",
    careers: [
      { id: "lawyer", Icon: Gavel, skills: ["speaking", "writing", "logic", "listening"], mix: [4, 2, 5, 1], routes: ["CLAT", "BA LLB", "Bar Council of India"] },
      { id: "psych", Icon: Brain, skills: ["empathy", "listening", "observation", "patience"], mix: [4, 2, 5, 1], routes: ["BA / B.Sc Psychology", "CUET UG", "MA / M.Sc", "RCI licence (clinical)"] },
      { id: "teacher", Icon: GraduationCap, skills: ["communication", "patience", "empathy", "planning"], mix: [3, 4, 5, 1], routes: ["B.Ed", "CTET / State TET", "cs_rt_subject"] },
      { id: "journalist", Icon: Newspaper, skills: ["writing", "curiosity", "listening", "speaking"], mix: [3, 4, 4, 1], routes: ["BA Journalism & Mass Comm.", "IIMC", "cs_rt_portfolio"] },
      { id: "civils", Icon: Landmark, skills: ["leadership", "planning", "listening", "persistence"], mix: [4, 2, 5, 1], routes: ["UPSC Civil Services", "State PSC exams", "cs_rt_anydegree"] },
      { id: "social", Icon: HandHeart, skills: ["empathy", "listening", "communication", "planning"], mix: [3, 3, 5, 2], routes: ["BSW / BA Social Work", "MSW", "TISS NET", "cs_rt_volunteer"] },
    ],
  },
  {
    id: "creative",
    Icon: Palette,
    tone: "pink",
    careers: [
      { id: "design", Icon: PenTool, skills: ["creativity", "drawing", "empathy", "detail"], mix: [3, 5, 3, 2], routes: ["B.Des", "UCEED", "NID DAT", "cs_rt_portfolio"] },
      { id: "animator", Icon: Wand2, skills: ["drawing", "storytelling", "patience", "creativity"], mix: [2, 5, 2, 3], routes: ["B.Des Animation", "BFA", "B.Sc Animation & VFX", "cs_rt_portfolio"] },
      { id: "film", Icon: Clapperboard, skills: ["storytelling", "creativity", "teamwork", "planning"], mix: [3, 5, 4, 3], routes: ["FTII", "SRFTI", "cs_rt_mass", "cs_rt_portfolio"] },
      { id: "music", Icon: Music, skills: ["creativity", "listening", "patience", "focus"], mix: [3, 5, 3, 3], routes: ["cs_rt_musicdeg", "cs_rt_sound", "cs_rt_portfolio"] },
      { id: "fashion", Icon: Shirt, skills: ["drawing", "creativity", "hands", "planning"], mix: [2, 5, 3, 5], routes: ["NIFT", "NID", "B.Des Fashion", "cs_rt_portfolio"] },
      { id: "writer", Icon: Feather, skills: ["writing", "creativity", "storytelling", "persistence"], mix: [3, 5, 3, 1], routes: ["BA English", "cs_rt_writing", "cs_rt_portfolio"] },
    ],
  },
  {
    id: "skills",
    Icon: Wrench,
    tone: "green",
    careers: [
      { id: "chef", Icon: ChefHat, skills: ["creativity", "hands", "planning", "patience"], mix: [2, 4, 3, 5], routes: ["NCHM JEE", "cs_rt_food", "cs_rt_apprentice"] },
      { id: "office", Icon: Keyboard, skills: ["organising", "detail", "focus", "communication"], mix: [3, 1, 3, 2], routes: ["NIELIT CCC", "Skill India", "cs_rt_apprentice"] },
      { id: "technician", Icon: Smartphone, skills: ["hands", "problem", "detail", "patience"], mix: [4, 2, 3, 5], routes: ["ITI Electronics", "NCVT certificate", "ESSCI courses", "cs_rt_apprentice"] },
      { id: "farmer", Icon: Sprout, skills: ["patience", "observation", "planning", "hands"], mix: [3, 3, 2, 5], routes: ["B.Sc Agriculture", "B.Sc Horticulture", "Krishi Vigyan Kendra", "State agri universities"] },
      { id: "artisan", Icon: Scissors, skills: ["creativity", "hands", "patience", "drawing"], mix: [2, 5, 3, 5], routes: ["cs_rt_craft", "cs_rt_textile", "cs_rt_portfolio"] },
      { id: "fitness", Icon: Dumbbell, skills: ["communication", "empathy", "patience", "planning"], mix: [2, 3, 5, 5], routes: ["cs_rt_yoga", "cs_rt_firstaid", "cs_rt_apprentice"] },
    ],
  },
];

export const mixAxes = [
  { id: "analytical", labelKey: "cs_mixThink" },
  { id: "creative", labelKey: "cs_mixCreate" },
  { id: "people", labelKey: "cs_mixPeople" },
  { id: "hands", labelKey: "cs_mixHands" },
];

export const findCareer = (careerId) => {
  for (const stream of careerStreams) {
    const career = stream.careers.find((item) => item.id === careerId);
    if (career) return { stream, career };
  }
  return null;
};
