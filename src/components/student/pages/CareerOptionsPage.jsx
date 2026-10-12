import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, RotateCcw, Sparkles } from "lucide-react";
import "./CareerOptionsPage.css";

const questions = [
  {
    prompt: "Which kind of activity sounds most interesting?",
    choices: [
      { label: "Solving a puzzle or figuring out how something works", tags: ["technology", "science", "engineering"] },
      { label: "Making something visual, musical, or story-based", tags: ["creative", "communication"] },
      { label: "Helping someone learn or feel supported", tags: ["people", "care", "education"] },
      { label: "Being outdoors and learning about nature", tags: ["nature", "science"] },
      { label: "Planning an event, team, or small project", tags: ["business", "leadership", "people"] },
    ],
  },
  {
    prompt: "Which school topics do you find yourself curious about?",
    choices: [
      { label: "Maths, coding, or computers", tags: ["technology", "engineering"] },
      { label: "Science, the body, or how living things work", tags: ["science", "care", "nature"] },
      { label: "Art, design, music, or languages", tags: ["creative", "communication"] },
      { label: "People, history, society, or how communities work", tags: ["people", "communication", "leadership"] },
      { label: "Business, money, or how ideas become projects", tags: ["business", "leadership"] },
    ],
  },
  {
    prompt: "How do you like to work on a tricky task?",
    choices: [
      { label: "Try things out and build a working solution", tags: ["engineering", "technology", "handsOn"] },
      { label: "Research it carefully and look for patterns", tags: ["science", "technology"] },
      { label: "Talk it through and work with other people", tags: ["people", "communication", "education"] },
      { label: "Sketch ideas and try a few creative approaches", tags: ["creative", "handsOn"] },
      { label: "Make a plan, organize steps, and keep everyone moving", tags: ["business", "leadership"] },
    ],
  },
  {
    prompt: "What kind of difference would you like your work to make?",
    choices: [
      { label: "Help people stay healthy or feel cared for", tags: ["care", "science", "people"] },
      { label: "Create useful tools or solve practical problems", tags: ["technology", "engineering", "handsOn"] },
      { label: "Share ideas, tell stories, or make things people enjoy", tags: ["creative", "communication"] },
      { label: "Protect nature or improve the environment", tags: ["nature", "science"] },
      { label: "Bring people together around a useful idea", tags: ["leadership", "business", "people"] },
    ],
  },
  {
    prompt: "Which strength would you most like to use?",
    choices: [
      { label: "Noticing details and asking good questions", tags: ["science", "technology"] },
      { label: "Explaining ideas and listening to people", tags: ["communication", "education", "people"] },
      { label: "Imagining new possibilities", tags: ["creative", "business"] },
      { label: "Making, fixing, or improving things", tags: ["handsOn", "engineering"] },
      { label: "Organizing a group and taking initiative", tags: ["leadership", "business", "people"] },
    ],
  },
];

const careers = [
  { title: "Software developer", tags: ["technology", "engineering"], summary: "Build apps, websites, and tools that help people do things.", explore: "Try a beginner coding activity or make a simple webpage." },
  { title: "Engineer or robotics designer", tags: ["engineering", "handsOn", "technology"], summary: "Design and improve machines, structures, and useful products.", explore: "Build a small model and test how you could improve it." },
  { title: "Scientist or researcher", tags: ["science", "technology"], summary: "Ask questions, investigate evidence, and discover how things work.", explore: "Pick a question about nature or space and keep a mini observation log." },
  { title: "Health professional", tags: ["care", "science", "people"], summary: "Support people's health through science, care, and teamwork.", explore: "Learn about different health roles and what a typical day looks like." },
  { title: "Teacher or learning designer", tags: ["education", "communication", "people"], summary: "Help people understand ideas and create engaging ways to learn.", explore: "Teach someone a topic you enjoy using a quick activity or drawing." },
  { title: "Artist, designer, or animator", tags: ["creative", "communication"], summary: "Use visuals and imagination to communicate ideas and experiences.", explore: "Make a poster, character, or short animation about something you care about." },
  { title: "Writer or media creator", tags: ["communication", "creative"], summary: "Tell stories and share information through words, audio, or video.", explore: "Write a short review or record a one-minute explanation of a topic." },
  { title: "Environmental scientist or conservationist", tags: ["nature", "science", "handsOn"], summary: "Study the natural world and help care for plants, animals, and places.", explore: "Explore a local nature question and record what you notice." },
  { title: "Entrepreneur or project leader", tags: ["business", "leadership", "creative"], summary: "Turn ideas into projects, products, or services with a team.", explore: "Think of a small problem at school and sketch an idea to help." },
  { title: "Community organizer or public service", tags: ["leadership", "people", "communication"], summary: "Work with people to improve services and solve community problems.", explore: "Find out how a local group is helping people in your community." },
];

export function CareerOptionsPage() {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const results = useMemo(() => {
    const scores = Object.values(answers).flatMap((answer) => answer.tags)
      .reduce((totals, tag) => ({ ...totals, [tag]: (totals[tag] || 0) + 1 }), {});
    return careers.map((career) => ({
      ...career,
      score: career.tags.reduce((total, tag) => total + (scores[tag] || 0), 0),
    })).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 3);
  }, [answers]);

  const choose = (choice) => setAnswers((current) => ({ ...current, [step]: choice }));
  const restart = () => { setAnswers({}); setStep(0); setShowResults(false); };

  return (
    <section className="content career-page">
      <header className="career-heading"><span className="career-icon"><Compass size={25} /></span><div><p className="eyebrow">Explore what could fit you</p><h1>Career Options</h1><p>Answer a few simple questions to find career ideas worth exploring.</p></div></header>
      {!showResults ? (
        <section className="career-card">
          <div className="career-progress-label"><span>Question {step + 1} of {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div>
          <div className="career-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
          <h2>{questions[step].prompt}</h2>
          <div className="career-choices">{questions[step].choices.map((choice) => <button key={choice.label} type="button" className={answers[step]?.label === choice.label ? "selected" : ""} aria-pressed={answers[step]?.label === choice.label} onClick={() => choose(choice)}>{choice.label}</button>)}</div>
          <div className="career-actions">{step > 0 ? <button type="button" className="career-back" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> Back</button> : <span />}{step < questions.length - 1 ? <button type="button" className="career-next" disabled={!answers[step]} onClick={() => setStep((value) => value + 1)}>Next <ArrowRight size={17} /></button> : <button type="button" className="career-next" disabled={!answers[step]} onClick={() => setShowResults(true)}>See my ideas <Sparkles size={17} /></button>}</div>
        </section>
      ) : (
        <section className="career-card career-results">
          <div className="career-results-heading"><div><p className="eyebrow">A few paths to explore</p><h2>Your answers point to these ideas</h2></div><button type="button" className="career-retake" onClick={restart}><RotateCcw size={16} /> Start over</button></div>
          <div className="career-result-list">{results.map((career, index) => <article className="career-result" key={career.title}><span className="career-result-number">{index + 1}</span><div><h3>{career.title}</h3><p>{career.summary}</p><small><strong>Try this:</strong> {career.explore}</small></div></article>)}</div>
          <p className="career-disclaimer">These are ideas based on what you chose today, not a test or a decision about your future. Your interests can change, and there are many paths you may enjoy.</p>
        </section>
      )}
    </section>
  );
}
