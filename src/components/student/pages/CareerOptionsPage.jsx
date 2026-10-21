import React, { useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, ChevronDown, Compass, GraduationCap, HandHeart, RotateCcw, Sparkles } from "lucide-react";
import "./CareerOptionsPage.css";

const questions = [
  {
    promptKey: "cr_q1",
    choices: [
      { id: "c1", labelKey: "cr_q1c1", tags: ["technology", "science", "engineering"] },
      { id: "c2", labelKey: "cr_q1c2", tags: ["creative", "communication"] },
      { id: "c3", labelKey: "cr_q1c3", tags: ["people", "care", "education"] },
      { id: "c4", labelKey: "cr_q1c4", tags: ["nature", "science"] },
      { id: "c5", labelKey: "cr_q1c5", tags: ["business", "leadership", "people"] },
    ],
  },
  {
    promptKey: "cr_q2",
    choices: [
      { id: "c1", labelKey: "cr_q2c1", tags: ["technology", "engineering"] },
      { id: "c2", labelKey: "cr_q2c2", tags: ["science", "care", "nature"] },
      { id: "c3", labelKey: "cr_q2c3", tags: ["creative", "communication"] },
      { id: "c4", labelKey: "cr_q2c4", tags: ["people", "communication", "leadership"] },
      { id: "c5", labelKey: "cr_q2c5", tags: ["business", "leadership"] },
    ],
  },
  {
    promptKey: "cr_q3",
    choices: [
      { id: "c1", labelKey: "cr_q3c1", tags: ["engineering", "technology", "handsOn"] },
      { id: "c2", labelKey: "cr_q3c2", tags: ["science", "technology"] },
      { id: "c3", labelKey: "cr_q3c3", tags: ["people", "communication", "education"] },
      { id: "c4", labelKey: "cr_q3c4", tags: ["creative", "handsOn"] },
      { id: "c5", labelKey: "cr_q3c5", tags: ["business", "leadership"] },
    ],
  },
  {
    promptKey: "cr_q4",
    choices: [
      { id: "c1", labelKey: "cr_q4c1", tags: ["care", "science", "people"] },
      { id: "c2", labelKey: "cr_q4c2", tags: ["technology", "engineering", "handsOn"] },
      { id: "c3", labelKey: "cr_q4c3", tags: ["creative", "communication"] },
      { id: "c4", labelKey: "cr_q4c4", tags: ["nature", "science"] },
      { id: "c5", labelKey: "cr_q4c5", tags: ["leadership", "business", "people"] },
    ],
  },
  {
    promptKey: "cr_q5",
    choices: [
      { id: "c1", labelKey: "cr_q5c1", tags: ["science", "technology"] },
      { id: "c2", labelKey: "cr_q5c2", tags: ["communication", "education", "people"] },
      { id: "c3", labelKey: "cr_q5c3", tags: ["creative", "business"] },
      { id: "c4", labelKey: "cr_q5c4", tags: ["handsOn", "engineering"] },
      { id: "c5", labelKey: "cr_q5c5", tags: ["leadership", "business", "people"] },
    ],
  },
];

const careers = [
  { id: 1, titleKey: "cr_c1t", tags: ["technology", "engineering"], summaryKey: "cr_c1s", exploreKey: "cr_c1e", pathway: ["Explore coding with a beginner-friendly language and notice what you enjoy making.", "Build core skills in programming, problem-solving, data, and software tools through school, courses, or independent study.", "Create small projects, test them, fix problems, and keep your work in a portfolio or code repository.", "Practice working with others: explain your choices, use feedback, and learn basic version control.", "Look for internships, apprenticeships, entry-level roles, or further study that fits your interests.", "Keep learning as tools change; specialize later in areas such as web, mobile, games, data, or accessibility."] },
  { id: 2, titleKey: "cr_c2t", tags: ["engineering", "handsOn", "technology"], summaryKey: "cr_c2s", exploreKey: "cr_c2e", pathway: ["Try practical projects and strengthen the maths and science topics that interest you.", "Explore engineering fields such as mechanical, electrical, civil, or robotics to see what fits.", "Learn relevant tools, which may include design software, electronics, coding, or prototyping.", "Follow an accredited degree, technical course, or apprenticeship route suited to your chosen field and location.", "Build projects with a team and seek supervised placements or internships where available.", "Check local professional requirements, then apply for junior roles and continue developing your specialist skills."] },
  { id: 3, titleKey: "cr_c3t", tags: ["science", "technology"], summaryKey: "cr_c3s", exploreKey: "cr_c3e", pathway: ["Explore science topics and practice asking clear questions about how the world works.", "Build a strong foundation in your chosen subjects, maths, and careful observation.", "Choose a field such as biology, chemistry, physics, or social science and pursue relevant higher education or technical training.", "Learn research methods, data analysis, lab or field safety, and how to evaluate evidence.", "Join supervised projects, research placements, or labs and keep a record of your work.", "For many research roles, further study may be needed; check the requirements for the specific role and country."] },
  { id: 4, titleKey: "cr_c4t", tags: ["care", "science", "people"], summaryKey: "cr_c4s", exploreKey: "cr_c4e", pathway: ["Compare health careers: clinical care, therapy, diagnostics, public health, and support roles have different routes.", "Build relevant science, communication, and teamwork skills at school or through introductory courses.", "Check the official entry requirements for the role where you live; many clinical professions require accredited study.", "Complete the required supervised placements, practical training, and assessments for your chosen profession.", "Apply for registration or a licence if local rules require it, then seek an entry-level position.", "Maintain required credentials and continue learning throughout your career."] },
  { id: 5, titleKey: "cr_c5t", tags: ["education", "communication", "people"], summaryKey: "cr_c5s", exploreKey: "cr_c5e", pathway: ["Choose a subject or learner group you would like to support and practice explaining ideas clearly.", "Get experience through tutoring, mentoring, volunteering, or helping with learning activities.", "Research local teaching qualification and background-check requirements; these vary by school system and role.", "Study education, your subject area, or instructional design through a recognized route that matches your goal.", "Create sample lessons or learning materials and ask learners or educators for feedback.", "Apply to schools, tutoring services, education organizations, or learning-design teams and keep building your practice."] },
  { id: 6, titleKey: "cr_c6t", tags: ["creative", "communication"], summaryKey: "cr_c6s", exploreKey: "cr_c6e", pathway: ["Experiment with drawing, photography, layout, 3D, or animation and find the medium you enjoy.", "Practice visual foundations such as composition, color, storytelling, and design principles.", "Learn suitable creative tools through classes, tutorials, or a design programme.", "Build a portfolio of finished projects that shows your process and range; include personal work as well as assignments.", "Share work, get constructive feedback, and collaborate on projects or community briefs.", "Apply for junior roles, commissions, or further study; continue refining your portfolio around the work you want to do."] },
  { id: 7, titleKey: "cr_c7t", tags: ["communication", "creative"], summaryKey: "cr_c7s", exploreKey: "cr_c7e", pathway: ["Practice writing, audio, video, or another format and choose topics that keep your curiosity.", "Learn research, interviewing, editing, storytelling, and media-literacy basics.", "Create regular samples such as articles, scripts, podcasts, or short videos and collect them in a portfolio.", "Ask for feedback and revise your work for clarity, accuracy, and the audience you want to reach.", "Gain experience through school media, community projects, internships, or freelance assignments.", "Apply to publications, studios, organizations, or independent projects and keep building a body of work."] },
  { id: 8, titleKey: "cr_c8t", tags: ["nature", "science", "handsOn"], summaryKey: "cr_c8s", exploreKey: "cr_c8e", pathway: ["Explore local habitats and environmental issues through observation, nature groups, or volunteering.", "Build foundations in biology, earth science, geography, and data skills.", "Study environmental science, ecology, conservation, or a related technical subject through a suitable local route.", "Practice field methods, mapping or GIS, data collection, and safe outdoor work.", "Seek supervised projects, conservation volunteering, or internships to gain practical experience.", "Explore roles in research, parks, government, nonprofits, or environmental services and check any role-specific requirements."] },
  { id: 9, titleKey: "cr_c9t", tags: ["business", "leadership", "creative"], summaryKey: "cr_c9s", exploreKey: "cr_c9e", pathway: ["Notice a real problem people have and talk with them before deciding on a solution.", "Learn basic budgeting, communication, planning, and how products or services reach people.", "Test a small version of the idea, gather feedback, and track what works.", "Build a simple plan with goals, costs, responsibilities, and risks; ask a trusted mentor to review it.", "If you decide to operate a business, check local rules for registration, taxes, and safety before taking payments or hiring.", "Improve the project from feedback and build experience through school initiatives, community projects, or early roles."] },
  { id: 10, titleKey: "cr_c10t", tags: ["leadership", "people", "communication"], summaryKey: "cr_c10s", exploreKey: "cr_c10e", pathway: ["Learn about an issue in your community by listening to the people it affects.", "Volunteer with a local group, school initiative, or public-service project.", "Build skills in communication, teamwork, event planning, research, and project coordination.", "Study a relevant subject such as public policy, social work, community development, or administration if it fits your target role.", "Look for internships or entry-level work with community organizations, charities, or public agencies.", "Check local qualification or public-service selection requirements for specific roles and keep learning from the communities you serve."] },
];

const pickRandomCareers = (answers) => {
  const tagScores = Object.values(answers).flatMap((answer) => answer.tags)
    .reduce((scores, tag) => ({ ...scores, [tag]: (scores[tag] || 0) + 1 }), {});
  const pool = careers.map((career) => ({
    career,
    weight: 1 + career.tags.reduce((sum, tag) => sum + (tagScores[tag] || 0), 0),
  }));
  const selected = [];

  while (selected.length < 3 && pool.length) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    const index = pool.findIndex((item) => (roll -= item.weight) < 0);
    selected.push(pool.splice(index < 0 ? pool.length - 1 : index, 1)[0].career);
  }

  return selected;
};

const opportunities = [
  {
    organization: "Wadhwani Foundation",
    title: "My Career Advisor",
    description: "Explore personalized career guidance to identify your interests, strengths, and career possibilities. The platform offers career assessments, tailored job-role recommendations, and access to 1,500+ career pathways for students, parents, and teachers.",
    tags: ["Career Guidance", "Skill Assessment", "Career Exploration"],
    href: "https://wadhwanifoundation.org/our-programs/career-advisor/",
    Icon: Compass,
    color: "teal",
  },
  {
    organization: "Ashish Foundation",
    title: "Ankur Vocational Centre",
    description: "Discover a vocational training programme designed for young adults with disabilities aged 18 and above. Ankur focuses on practical vocational skills, everyday independence, social participation, meaningful community roles, and pathways toward employment.",
    tags: ["Vocational Training", "Life Skills", "Independence", "Employability"],
    href: "https://www.ashishindia.org/ankur-vocational-centre/",
    Icon: HandHeart,
    color: "coral",
  },
  {
    organization: "Adhyayan Inclusive Learning Centre (AILC)",
    title: "Vocational Training at AILC",
    description: "Explore vocational courses and practical learning opportunities that aim to build workplace readiness and independent living skills for young people with special educational needs. AILC also provides special education and other individualized support services.",
    tags: ["Vocational Courses", "Workplace Readiness", "Life Skills", "Inclusive Learning"],
    href: "https://www.ailcspecialschool.com/service/vocational-training",
    Icon: GraduationCap,
    color: "violet",
  },
];

export function CareerOptionsPage({ t }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [openPathway, setOpenPathway] = useState(null);

  const choose = (choice) => setAnswers((current) => ({ ...current, [step]: choice }));
  const showCareerResults = () => {
    setResults(pickRandomCareers(answers));
    setOpenPathway(null);
    setShowResults(true);
  };
  const restart = () => { setAnswers({}); setStep(0); setResults([]); setOpenPathway(null); setShowResults(false); };

  return (
    <section className="content career-page">
      <header className="career-heading"><span className="career-icon"><Compass size={25} /></span><div><p className="eyebrow">{t("cr_eyebrow")}</p><h1>{t("careerOptions")}</h1><p>{t("cr_subtitle")}</p></div></header>
      {!showResults ? (
        <section className="career-card">
          <div className="career-progress-label"><span>{t("cr_questionOf", { n: step + 1, total: questions.length })}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div>
          <div className="career-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
          <h2>{t(questions[step].promptKey)}</h2>
          <div className="career-choices">{questions[step].choices.map((choice) => <button key={choice.id} type="button" className={answers[step]?.id === choice.id ? "selected" : ""} aria-pressed={answers[step]?.id === choice.id} onClick={() => choose(choice)}>{t(choice.labelKey)}</button>)}</div>
          <div className="career-actions">{step > 0 ? <button type="button" className="career-back" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> {t("cr_back")}</button> : <span />}{step < questions.length - 1 ? <button type="button" className="career-next" disabled={!answers[step]} onClick={() => setStep((value) => value + 1)}>{t("cr_next")} <ArrowRight size={17} /></button> : <button type="button" className="career-next" disabled={!answers[step]} onClick={showCareerResults}>{t("cr_see")} <Sparkles size={17} /></button>}</div>
        </section>
      ) : (
        <section className="career-card career-results">
          <div className="career-results-heading"><div><p className="eyebrow">{t("cr_pathsEyebrow")}</p><h2>{t("cr_yourAnswers")}</h2></div><button type="button" className="career-retake" onClick={restart}><RotateCcw size={16} /> {t("cr_startOver")}</button></div>
          <div className="career-result-list">{results.map((career, index) => {
            const pathwayId = `career-pathway-${index}`;
            const isPathwayOpen = openPathway === career.id;
            return <article className="career-result" key={career.id}>
              <span className="career-result-number">{index + 1}</span>
              <div className="career-result-content">
                <h3>{t(career.titleKey)}</h3>
                <p>{t(career.summaryKey)}</p>
                <small><strong>{t("cr_tryThis")}</strong> {t(career.exploreKey)}</small>
                <button type="button" className="career-pathway-toggle" aria-expanded={isPathwayOpen} aria-controls={pathwayId} onClick={() => setOpenPathway(isPathwayOpen ? null : career.id)}>
                  {isPathwayOpen ? t("Hide pathway") : t("How to become this")}
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {isPathwayOpen && <div className="career-pathway" id={pathwayId}>
                  <h4>{t("A possible path")}</h4>
                  <ol>{career.pathway.map((item) => <li key={item}>{t(item)}</li>)}</ol>
                </div>}
              </div>
            </article>;
          })}</div>
          <p className="career-pathway-note">{t("Pathways vary by country, role, and employer. Check local official requirements for the career you choose.")}</p>
          <p className="career-disclaimer">{t("cr_disclaimer")}</p>
        </section>
      )}
      <section className="career-opportunities" aria-labelledby="career-opportunities-title">
        <header className="career-opportunities-heading">
          <span className="career-opportunities-kicker"><BriefcaseBusiness size={15} aria-hidden="true" /> {t("A curated CWSN career support directory")}</span>
          <h2 id="career-opportunities-title">{t("Explore Career & Vocational Opportunities")}</h2>
          <p>{t("Discover career guidance, vocational training, and skill-development opportunities through organizations that support inclusive learning, independence, and future career growth.")}</p>
        </header>
        <div className="career-opportunities-grid">
          {opportunities.map(({ organization, title, description, tags, href, Icon, color }) => (
            <a
              className={`career-opportunity-card career-opportunity-${color}`}
              href={href}
              key={organization}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("Click Here to Explore")} ${t(title)} at ${organization} (${t("opens in a new tab")})`}
            >
              <span className="career-opportunity-icon"><Icon size={25} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="career-opportunity-organization">{organization}</span>
              <span className="career-opportunity-title">{t(title)}</span>
              <span className="career-opportunity-description">{t(description)}</span>
              <span className="career-opportunity-tags" aria-label={t("Skills and services")}>{tags.map((tag) => <span key={tag}>{t(tag)}</span>)}</span>
              <span className="career-opportunity-cta">{t("Click Here to Explore")} <ArrowRight size={17} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}
