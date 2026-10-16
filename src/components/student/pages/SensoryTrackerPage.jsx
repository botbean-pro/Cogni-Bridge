import React, { useEffect, useMemo, useState } from "react";
import { Activity, Check, ChevronDown, ChevronUp, Heart, LockKeyhole, Share2, Trash2, Wind, VolumeX, Pause, Play, Sparkles } from "lucide-react";
import {
  causeOptions,
  deleteStudentCheckin,
  emotionOptions,
  helpfulOptions,
  loadAssignedMentors,
  loadStudentCheckins,
  loadStudentResponses,
  mentorHelpOptions,
  moodLabels,
  saveStudentCheckin,
} from "../../../studentSensory";
import "./SensoryTrackerPage.css";

const labelFor = (options, key) => options.find(([value]) => value === key)?.[1] || key;
const labelsFor = (options, keys = []) => keys.map((key) => labelFor(options, key));

const todayString = () => new Date().toLocaleDateString("en-CA");
const entryDay = (entry) => new Date(entry.created_at).toLocaleDateString("en-CA");
const blankEntry = () => ({
  mood: 0, moodCustom: "", emotions: [], energy: 3, comfort: 3, daySummary: "", causes: [],
  overwhelm: "", helpful: [], helpRequest: "none", selectedMentorId: "", mentorMessage: "",
  shared: false, quickReason: "",
});

function TrendChart({ entries, t }) {
  const data = entries.slice(0, 7).reverse();
  if (data.length < 2) return <p className="sensory-muted">{t("Add a few check-ins to see your mood, energy, and comfort trend.")}</p>;
  // Quick check-ins have no energy/comfort rating, so those points are skipped.
  const pointsFor = (field) => data
    .map((entry, index) => entry[field] == null ? null : `${30 + index * (540 / (data.length - 1))},${155 - ((entry[field] - 1) / 4) * 125}`)
    .filter(Boolean)
    .join(" ");
  return (
    <div className="sensory-chart-wrap">
      <div className="sensory-chart-legend"><span className="mood-line">{t("Mood")}</span><span className="energy-line">{t("Energy")}</span><span className="comfort-line">{t("Comfort")}</span></div>
      <svg className="sensory-chart" viewBox="0 0 600 180" role="img" aria-label={t("Your mood, energy, and comfort over your recent check-ins")}>
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="30" x2="570" y1={30 + line * 31} y2={30 + line * 31} />)}
        <polyline className="mood-line" points={pointsFor("mood")} />
        <polyline className="energy-line" points={pointsFor("energy")} />
        <polyline className="comfort-line" points={pointsFor("comfort")} />
      </svg>
      <div className="sensory-chart-dates"><span>{new Date(data[0].created_at).toLocaleDateString(document.documentElement.lang || undefined)}</span><span>{new Date(data[data.length - 1].created_at).toLocaleDateString(document.documentElement.lang || undefined)}</span></div>
    </div>
  );
}

function EntryDetail({ entry, reply, onDelete, t }) {
  return (
    <div className="sensory-entry-detail">
      <p>{entry.day_note || t("No day summary added.")}</p>
      {entry.mood_note && <p><strong>{t("Your words:")}</strong> {entry.mood_note}</p>}
      {entry.causes?.length > 0 && <p><strong>{t("Possible causes:")}</strong> {labelsFor(causeOptions, entry.causes).map(t).join(", ")}</p>}
      {entry.overwhelm_note && <p><strong>{t("What felt overwhelming:")}</strong> {entry.overwhelm_note}</p>}
      {entry.helpful_actions?.length > 0 && <p><strong>{t("What helped:")}</strong> {labelsFor(helpfulOptions, entry.helpful_actions).map(t).join(", ")}</p>}
      {entry.mentor_help !== "none" && <p><strong>{t("Mentor support:")}</strong> {t(labelFor(mentorHelpOptions, entry.mentor_help))}</p>}
      {entry.mentor_message && <p><strong>{t("Message for your mentor:")}</strong> {entry.mentor_message}</p>}
      {reply && <p><strong>{t("Mentor reply:")}</strong> {reply}</p>}
      <button type="button" className="sensory-delete" onClick={() => onDelete(entry)}><Trash2 size={15} /> {t("Delete this check-in")}</button>
    </div>
  );
}

const calmVideos = [
  { title: "Mindful breathing", source: "HeadStart.gov", url: "https://headstart.gov/video/mindful-breathing", note: "A gentle guided breathing practice" },
  { title: "Body scan meditation", source: "Cosmic Kids: Zen Den", url: "https://www.youtube.com/watch?v=TCoUnEPeuQk", note: "Notice how each part of your body feels" },
  { title: "What is mindfulness?", source: "Cosmic Kids: Zen Den", url: "https://www.youtube.com/watch?v=8rp5bpFIUpg", note: "A simple introduction to mindful moments" },
];

export function CalmCorner({ onClose, startBreathing = false, t = (value) => value }) {
  const [breathing, setBreathing] = useState(startBreathing);
  const [phase, setPhase] = useState(startBreathing ? "Breathe in" : "Breathe out");
  useEffect(() => {
    if (!breathing) return undefined;
    const timer = window.setInterval(() => setPhase((current) => current === "Breathe in" ? "Breathe out" : "Breathe in"), 4000);
    return () => window.clearInterval(timer);
  }, [breathing]);
  return <section className="sensory-card calm-corner" id="calm-corner" aria-labelledby="calm-corner-title">
    <div className="sensory-card-title"><div><span className="sensory-step">{t("YOUR CALM CORNER")}</span><h2 id="calm-corner-title">{t("A little space to reset")}</h2></div><Sparkles size={21} /></div>
    <p className="calm-intro">{t("Choose what feels comfortable. You can stop or leave whenever you like.")}</p>
    <div className="calm-tools">
      <div className="calm-breath-card"><div className="breathing-copy"><h3>{t("Breathing exercise")}</h3><p aria-live="polite">{breathing ? `${t(phase)} ${t("slowly")}` : t("Follow the circle. Breathe in, then breathe out.")}</p></div>
        <div className={`breathing-stage${breathing ? " is-active" : ""}${breathing && phase === "Breathe out" ? " is-exhaling" : ""}`} aria-label={breathing ? t(phase) : t("Breathing circle")}>
          <div className="breathing-ring" aria-hidden="true"><span className={`breathing-cue${breathing ? ` is-active ${phase === "Breathe out" ? "is-exhaling" : ""}` : ""}`}>{breathing ? t(phase === "Breathe in" ? "in" : "out") : t("breathe")}</span></div>
        </div>
        <button type="button" className="calm-action" onClick={() => { setBreathing((current) => !current); setPhase("Breathe in"); }} aria-pressed={breathing}>{breathing ? <><Pause size={16} /> {t("Pause")}</> : <><Play size={16} /> {t("Begin")}</>}</button>
      </div>
      <div className="calm-videos"><h3>{t("Quiet videos & mindfulness")}</h3>{calmVideos.map((item) => <a key={t(item.title)} href={item.url} target="_blank" rel="noreferrer"><span><strong>{t(item.title)}</strong><small>{t(item.note)} · {item.source}</small></span><span aria-hidden="true">↗</span></a>)}</div>
    </div>
    <button type="button" className="calm-close" onClick={onClose}>{t("Back to my check-in")}</button>
  </section>;
}

export function SensoryTrackerPage({ studentId, demoMode = false, t = (value) => value }) {
  const [entries, setEntries] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(blankEntry);
  const [view, setView] = useState("quick");
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [lowSensory, setLowSensory] = useState(false);
  const [showCalmCorner, setShowCalmCorner] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(true);
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at)), [entries]);
  const todayEntries = sortedEntries.filter((entry) => entryDay(entry) === todayString());
  const todayEntry = todayEntries[0];
  const todayFullCount = todayEntries.filter((entry) => entry.checkin_type === "full").length;
  const canStartFullCheckin = todayFullCount < 3;
  const shouldShowCheckinForm = canStartFullCheckin && (todayEntries.length === 0 || showCheckinForm);

  const refresh = async () => {
    const [history, assignedMentors, mentorResponses] = await Promise.all([
      loadStudentCheckins(studentId),
      loadAssignedMentors(studentId),
      loadStudentResponses(),
    ]);
    setEntries(history);
    setMentors(assignedMentors);
    setResponses(mentorResponses);
  };

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      loadStudentCheckins(studentId),
      loadAssignedMentors(studentId),
      loadStudentResponses(),
    ]).then(([history, assignedMentors, mentorResponses]) => {
      if (!isCurrent) return;
      setEntries(history);
      setMentors(assignedMentors);
      setResponses(mentorResponses);
      if (history.some((entry) => entryDay(entry) === todayString())) setShowCheckinForm(false);
    }).catch(() => {
      if (isCurrent) setStatus(t("Your check-ins couldn't be loaded. Please try again."));
    });
    return () => { isCurrent = false; };
  }, [studentId]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleArray = (field, value) => setForm((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
  }));

  const submit = async (event, quick = false) => {
    event.preventDefault();
    if (!form.mood) return;
    const shared = !demoMode && !quick && form.shared;
    const specificMentor = shared && form.helpRequest === "specific_mentor";
    if (shared && mentors.length === 0) {
      setStatus(t("No mentor is assigned to your account yet, so this check-in can't be shared."));
      return;
    }
    if (specificMentor && !form.selectedMentorId) {
      setStatus(t("Choose a mentor, or pick a different support option."));
      return;
    }
    const checkin = quick
      ? {
        checkin_type: "quick",
        mood: form.mood,
        day_note: form.quickReason.trim(),
        energy: null,
        comfort: null,
        mentor_help: "none",
        shared_with_mentor: false,
      }
      : {
        checkin_type: "full",
        mood: form.mood,
        mood_note: form.moodCustom.trim(),
        emotions: form.emotions,
        energy: Number(form.energy),
        comfort: Number(form.comfort),
        day_note: form.daySummary.trim(),
        causes: form.causes,
        overwhelm_note: form.overwhelm.trim(),
        helpful_actions: form.helpful,
        mentor_help: demoMode ? "none" : form.helpRequest,
        selected_mentor_id: specificMentor ? form.selectedMentorId : null,
        mentor_message: demoMode || form.helpRequest === "none" ? "" : form.mentorMessage.trim(),
        shared_with_mentor: shared,
      };
    setSaving(true);
    try {
      await saveStudentCheckin(studentId, checkin);
      await refresh();
      setForm(blankEntry());
      setShowCheckinForm(false);
      setStatus(t(shared ? "Saved and shared with your mentor." : "Saved privately. Only you can see this check-in."));
    } catch {
      setStatus(t("This check-in couldn't be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entry) => {
    try {
      await deleteStudentCheckin(studentId, entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setExpandedId(null);
      setStatus(t("Check-in deleted."));
    } catch {
      setStatus(t("This check-in couldn't be deleted. Please try again."));
    }
  };

  const suggestions = form.mood === 1 || form.mood === 2
    ? ["Talk to someone you trust", "Try a short breathing break", "Move somewhere quieter"]
    : form.causes.includes("homework")
      ? ["Break homework into smaller tasks", "Take a short break", "Talk to your mentor"]
      : ["Take a short break", "Try a breathing exercise", "Talk to someone you trust"];

  const tiredCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("tired")).length;
  const stressedCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("stressed") && entry.causes?.includes("school")).length;

  return (
    <section className={`content sensory-page${lowSensory ? " low-sensory-mode" : ""}`}>
      <header className="sensory-heading"><div><p className="eyebrow">{t("A private space for you")}</p><h1>{t("Sensory Tracker")}</h1><p>{t("Check in with yourself. Share only what you choose.")}</p></div><div className="sensory-heading-actions"><button className={`low-sensory-toggle${lowSensory ? " active" : ""}`} type="button" aria-pressed={lowSensory} onClick={() => setLowSensory((value) => !value)}><VolumeX size={17} /> {lowSensory ? t("Low sensory on") : t("Low sensory mode")}</button><span><Heart size={18} /> {t("No judgement, just your own notes")}</span></div></header>
      <section className="break-banner"><div><span className="sensory-step">{t("IT'S OKAY TO PAUSE")}</span><h2>{t("Need a little break?")}</h2><p>{t("Take a moment for yourself. There is no rush to continue.")}</p></div><button type="button" onClick={() => setShowCalmCorner(true)}><Wind size={18} /> {t("I need a break")}</button></section>
      {showCalmCorner && <CalmCorner t={t} onClose={() => setShowCalmCorner(false)} />}
      <div className="sensory-privacy"><LockKeyhole size={17} /> {t(demoMode ? "Demo check-ins stay private in this session and aren't shared with a mentor." : "Your check-ins are private by default. You'll see a clear label when you choose to share one.")}</div>
      {status && <p className="sensory-status" role="status">{status}</p>}

      {shouldShowCheckinForm ? (
        <section className="sensory-card sensory-checkin">
          <div className="sensory-card-title"><div><span className="sensory-step">{t("TODAY'S CHECK-IN")}</span><h2>{view === "quick" ? t("How are you feeling right now?") : t("How are you feeling today?")}</h2></div><Activity size={22} /></div>
          <div className="sensory-view-switch"><button className={view === "quick" ? "active" : ""} onClick={() => setView("quick")} type="button">{t("Quick check-in")}</button><button className={view === "full" ? "active" : ""} onClick={() => setView("full")} type="button">{t("Full check-in")}</button></div>
          <form onSubmit={(event) => submit(event, view === "quick")}>
            <div className="sensory-field"><div className="sensory-label">{t("How are you feeling today?")}</div><div className="sensory-mood-options">{moodLabels.map((mood, index) => <button type="button" key={mood} className={form.mood === index + 1 ? "selected" : ""} onClick={() => updateForm("mood", index + 1)}><span aria-hidden="true">{["☹", "🙁", "◉", "🙂", "☺"][index]}</span>{t(mood)}</button>)}</div></div>
            {view === "quick" ? (
              <label className="sensory-field">{t("Want to tell us why?")}<textarea value={form.quickReason} maxLength={4000} onChange={(event) => updateForm("quickReason", event.target.value)} placeholder={t("Anything you'd like to remember...")} rows="3" /></label>
            ) : (
              <>
                <fieldset className="sensory-field"><legend>{t("What emotions are you feeling?")}</legend><div className="sensory-chips">{emotionOptions.map(([key, label]) => <button type="button" key={key} className={form.emotions.includes(key) ? "selected" : ""} onClick={() => toggleArray("emotions", key)}>{t(label)}</button>)}</div></fieldset>
                <label className="sensory-field">{t("Anything else you'd like to call this feeling?")}<input value={form.moodCustom} maxLength={250} onChange={(event) => updateForm("moodCustom", event.target.value)} placeholder={t("Optional")} /></label>
                <div className="sensory-field"><label htmlFor="energy-range">{t("How is your energy today?")} <strong>{t(["Very low", "Low", "Okay", "High", "Very high"][form.energy - 1])}</strong></label><input id="energy-range" type="range" min="1" max="5" value={form.energy} onChange={(event) => updateForm("energy", event.target.value)} /></div>
                <div className="sensory-field"><label htmlFor="comfort-range">{t("How comfortable do you feel today?")} <strong>{t(["Very uncomfortable", "Uncomfortable", "Okay", "Comfortable", "Very comfortable"][form.comfort - 1])}</strong></label><input id="comfort-range" type="range" min="1" max="5" value={form.comfort} onChange={(event) => updateForm("comfort", event.target.value)} /></div>
                <label className="sensory-field">{t("How was your day?")}<textarea value={form.daySummary} maxLength={4000} onChange={(event) => updateForm("daySummary", event.target.value)} placeholder={t("Tell us anything about your day.")} rows="4" /></label>
                <fieldset className="sensory-field"><legend>{t("What might have contributed to how you feel?")}</legend><div className="sensory-chips">{causeOptions.map(([key, label]) => <button type="button" key={key} className={form.causes.includes(key) ? "selected" : ""} onClick={() => toggleArray("causes", key)}>{t(label)}</button>)}</div></fieldset>
                <label className="sensory-field">{t("Did anything overwhelm you today?")}<textarea value={form.overwhelm} maxLength={2000} onChange={(event) => updateForm("overwhelm", event.target.value)} placeholder={t("Optional")} rows="3" /></label>
                <fieldset className="sensory-field"><legend>{t("What helped you feel better?")}</legend><div className="sensory-chips">{helpfulOptions.map(([key, label]) => <button type="button" key={key} className={form.helpful.includes(key) ? "selected" : ""} onClick={() => toggleArray("helpful", key)}>{t(label)}</button>)}</div></fieldset>
                {!demoMode && <>
                  <label className="sensory-field">{t("Do you need help from a mentor?")}<select value={form.helpRequest} onChange={(event) => updateForm("helpRequest", event.target.value)}>{mentorHelpOptions.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
                  {form.helpRequest === "specific_mentor" && <label className="sensory-field">{t("Choose a mentor")}<select value={form.selectedMentorId} onChange={(event) => updateForm("selectedMentorId", event.target.value)}><option value="">{t("Select a mentor")}</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.display_name}</option>)}</select>{mentors.length === 0 && <small>{t("No mentors are assigned to your account yet.")}</small>}</label>}
                  {form.helpRequest !== "none" && <label className="sensory-field">{t("Is there anything you'd like your mentor to know?")}<textarea value={form.mentorMessage} maxLength={2000} onChange={(event) => updateForm("mentorMessage", event.target.value)} rows="3" /></label>}
                  <label className="sensory-share"><input type="checkbox" checked={form.shared} onChange={(event) => updateForm("shared", event.target.checked)} /><span><Share2 size={17} /><strong>{t("Share this check-in with my mentor")}</strong><small>{form.shared ? t("Your assigned mentor can see the details in their dashboard.") : t("This stays private unless you turn this on.")}</small></span></label>
                  {form.shared && <p className="sensory-share-note">{t("Shared entries are visible only to mentors assigned to you.")}</p>}
                </>}
              </>
            )}
            {view === "quick" && <p className="sensory-private-note"><LockKeyhole size={15} /> {t("Quick check-ins are private.")}</p>}
            <button className="sensory-submit" type="submit" disabled={!form.mood || saving}>{saving ? t("Saving") : view === "quick" ? t("Save quick check-in") : t("Save today's check-in")}</button>
          </form>
        </section>
      ) : (
        <section className="sensory-card sensory-done"><Check size={21} /><div><h2>{todayFullCount >= 3 ? t("Full check-in limit reached") : t("You've checked in today.")}</h2><p>{todayFullCount >= 3 ? t("You have completed three full check-ins today. You can start again tomorrow.") : t("Your entry is {sharing}. You can still review or delete it in your history.", { sharing: t(todayEntry?.shared_with_mentor ? "shared with your mentor" : "private") })}</p>{canStartFullCheckin && <button type="button" className="sensory-upgrade" onClick={() => { setForm(blankEntry()); setView("full"); setShowCheckinForm(true); }}>{todayFullCount ? t("Start another full check-in ({remaining} left today)", { remaining: 3 - todayFullCount }) : t("Add a full check-in")}</button>}</div></section>
      )}

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("GENTLE IDEAS")}</span><h2>{t("A few things you could try")}</h2></div><Heart size={22} /></div><div className="sensory-suggestions">{suggestions.map((item) => <span key={item}>{t(item)}</span>)}</div><small>{t("Optional ideas only. You know what works best for you.")}</small></section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("YOUR RECENT CHECK-INS")}</span><h2>{t("Patterns over time")}</h2></div></div><TrendChart entries={sortedEntries} t={t} />
        {sortedEntries.length >= 4 && <div className="sensory-insights">{tiredCount >= 3 && <p>{t("Your entries suggest you reported feeling tired on several recent days.")}</p>}{stressedCount >= 3 && <p>{t("You reported feeling stressed on several school days recently.")}</p>}{tiredCount < 3 && stressedCount < 3 && <p>{t("You're building a picture of what your days feel like. Keep checking in if it feels helpful.")}</p>}</div>}
      </section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("YOUR HISTORY")}</span><h2>{t("Previous check-ins")}</h2></div></div>
        {!sortedEntries.length ? <p className="sensory-muted">{t("Your check-ins will appear here. Only you can see private entries.")}</p> : <div className="sensory-history">{sortedEntries.map((entry) => <article key={entry.id} className="sensory-history-entry"><button type="button" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}><span><strong>{new Date(entry.created_at).toLocaleDateString(document.documentElement.lang || undefined, { weekday: "short", month: "short", day: "numeric" })}</strong><small>{t(moodLabels[entry.mood - 1])}{entry.emotions?.length ? ` · ${labelsFor(emotionOptions, entry.emotions.slice(0, 3)).map(t).join(", ")}` : ""}{entry.energy != null ? `\u00b7 ${t("Energy")} ${entry.energy}/5` : `\u00b7 ${t("Quick check-in")}`}</small><em className={entry.shared_with_mentor ? "is-shared" : ""}>{entry.shared_with_mentor ? t("Shared") : t("Private")}</em></span>{expandedId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{expandedId === entry.id && <EntryDetail t={t} entry={entry} reply={responses.find((response) => response.checkin_id === entry.id)?.mentor_message} onDelete={removeEntry} />}</article>)}</div>}
      </section>
    </section>
  );
}
