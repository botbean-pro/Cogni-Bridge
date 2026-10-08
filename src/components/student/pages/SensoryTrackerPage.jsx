import React, { useMemo, useState } from "react";
import { Activity, Check, ChevronDown, ChevronUp, Heart, LockKeyhole, Share2, Trash2 } from "lucide-react";
import { deleteSensoryEntry, getStudentSensoryEntries, saveSensoryEntry } from "../../../sensoryTracker";
import "./SensoryTrackerPage.css";

const moods = ["Very bad", "Bad", "Okay", "Good", "Great"];
const emotions = ["Happy", "Sad", "Angry", "Anxious", "Stressed", "Tired", "Lonely", "Confused", "Excited", "Overwhelmed", "Calm", "Frustrated", "Other"];
const causes = ["School/classes", "Homework/studying", "Friends", "Family", "Social situations", "Sensory environment", "Sleep", "Physical discomfort", "Something that happened today", "I don't know", "Other"];
const supports = ["Talking to someone", "Taking a break", "Music", "Being alone", "Going outside", "Exercise/movement", "Breathing/relaxation", "Someone helped me", "Nothing yet", "Other"];
const helpOptions = ["No, I'm okay", "I'd like someone to check in with me", "I need help with school", "I need help with something personal", "I need help understanding how I'm feeling", "I'd like to talk to a specific mentor"];
const mentors = ["Priya Sharma"];

const todayString = () => new Date().toLocaleDateString("en-CA");
const blankEntry = () => ({
  mood: "", moodCustom: "", emotions: [], energy: 3, comfort: 3, daySummary: "", causes: [],
  overwhelm: "", helpful: [], helpRequest: helpOptions[0], selectedMentor: "", mentorMessage: "",
  shared: false, quickReason: "",
});

function TrendChart({ entries }) {
  const data = entries.slice(0, 7).reverse();
  if (data.length < 2) return <p className="sensory-muted">Add a few check-ins to see your mood, energy, and comfort trend.</p>;
  const pointsFor = (field) => data.map((entry, index) => `${30 + index * (540 / (data.length - 1))},${155 - ((entry[field] - 1) / 4) * 125}`).join(" ");
  return (
    <div className="sensory-chart-wrap">
      <div className="sensory-chart-legend"><span className="mood-line">Mood</span><span className="energy-line">Energy</span><span className="comfort-line">Comfort</span></div>
      <svg className="sensory-chart" viewBox="0 0 600 180" role="img" aria-label="Your mood, energy, and comfort over your recent check-ins">
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="30" x2="570" y1={30 + line * 31} y2={30 + line * 31} />)}
        <polyline className="mood-line" points={pointsFor("moodValue")} />
        <polyline className="energy-line" points={pointsFor("energy")} />
        <polyline className="comfort-line" points={pointsFor("comfort")} />
      </svg>
      <div className="sensory-chart-dates"><span>{new Date(data[0].createdAt).toLocaleDateString()}</span><span>{new Date(data[data.length - 1].createdAt).toLocaleDateString()}</span></div>
    </div>
  );
}

function EntryDetail({ entry, onDelete }) {
  return (
    <div className="sensory-entry-detail">
      <p>{entry.daySummary || "No day summary added."}</p>
      {entry.moodCustom && <p><strong>Your words:</strong> {entry.moodCustom}</p>}
      {entry.causes?.length > 0 && <p><strong>Possible causes:</strong> {entry.causes.join(", ")}</p>}
      {entry.overwhelm && <p><strong>What felt overwhelming:</strong> {entry.overwhelm}</p>}
      {entry.helpful?.length > 0 && <p><strong>What helped:</strong> {entry.helpful.join(", ")}</p>}
      {entry.helpRequest !== helpOptions[0] && <p><strong>Mentor support:</strong> {entry.helpRequest}</p>}
      {entry.mentorMessage && <p><strong>Message for your mentor:</strong> {entry.mentorMessage}</p>}
      {entry.mentorReply && <p><strong>Mentor reply:</strong> {entry.mentorReply}</p>}
      <button type="button" className="sensory-delete" onClick={() => onDelete(entry)}><Trash2 size={15} /> Delete this check-in</button>
    </div>
  );
}

export function SensoryTrackerPage({ studentEmail, studentName, onSaved }) {
  const [entries, setEntries] = useState(() => getStudentSensoryEntries(studentEmail));
  const [form, setForm] = useState(blankEntry);
  const [view, setView] = useState("quick");
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState("");
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries]);
  const todayEntry = sortedEntries.find((entry) => entry.day === todayString());

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleArray = (field, value) => setForm((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
  }));

  const submit = (event, quick = false) => {
    event.preventDefault();
    if (!form.mood) return;
    const moodValue = moods.indexOf(form.mood) + 1;
    const now = new Date();
    const entry = {
      ...form,
      id: `${studentEmail}-${now.getTime()}`,
      studentEmail: studentEmail.trim().toLowerCase(),
      studentName,
      day: todayString(),
      createdAt: now.toISOString(),
      moodValue,
      emotions: quick ? [] : form.emotions,
      daySummary: quick ? form.quickReason : form.daySummary,
      energy: quick ? 3 : Number(form.energy),
      comfort: quick ? 3 : Number(form.comfort),
      causes: quick ? [] : form.causes,
      overwhelm: quick ? "" : form.overwhelm,
      helpful: quick ? [] : form.helpful,
      helpRequest: quick ? helpOptions[0] : form.helpRequest,
      selectedMentor: quick ? "" : form.selectedMentor,
      mentorMessage: quick ? "" : form.mentorMessage,
      shared: quick ? false : form.shared,
      quick,
      viewedByMentor: false,
      addressed: false,
    };
    if (!saveSensoryEntry(entry)) {
      setStatus("This check-in couldn't be saved. Your browser may be out of storage space.");
      return;
    }
    const nextEntries = [entry, ...entries.filter((item) => item.day !== entry.day)];
    setEntries(nextEntries);
    onSaved?.();
    setForm(blankEntry());
    setStatus(entry.shared ? "Saved and shared with your mentor." : "Saved privately. Only you can see this check-in.");
  };

  const removeEntry = (entry) => {
    if (!deleteSensoryEntry(entry.id, studentEmail)) return;
    const nextEntries = entries.filter((item) => item.id !== entry.id);
    setEntries(nextEntries);
    onSaved?.();
    setExpandedId(null);
    setStatus("Check-in deleted.");
  };

  const suggestions = form.mood === "Very bad" || form.mood === "Bad"
    ? ["Talk to someone you trust", "Try a short breathing break", "Move somewhere quieter"]
    : form.causes.includes("Homework/studying")
      ? ["Break homework into smaller tasks", "Take a short break", "Talk to your mentor"]
      : ["Take a short break", "Try a breathing exercise", "Talk to someone you trust"];

  const tiredCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("Tired")).length;
  const stressedCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("Stressed") && entry.causes?.includes("School/classes")).length;

  return (
    <section className="content sensory-page">
      <header className="sensory-heading"><div><p className="eyebrow">A private space for you</p><h1>Sensory Tracker</h1><p>Check in with yourself. Share only what you choose.</p></div><span><Heart size={18} /> No judgement, just your own notes</span></header>
      <div className="sensory-privacy"><LockKeyhole size={17} /> Your check-ins are private by default. You'll see a clear label when you choose to share one.</div>
      {status && <p className="sensory-status" role="status">{status}</p>}

      {!todayEntry ? (
        <section className="sensory-card sensory-checkin">
          <div className="sensory-card-title"><div><span className="sensory-step">TODAY'S CHECK-IN</span><h2>{view === "quick" ? "How are you feeling right now?" : "How are you feeling today?"}</h2></div><Activity size={22} /></div>
          <div className="sensory-view-switch"><button className={view === "quick" ? "active" : ""} onClick={() => setView("quick")} type="button">Quick check-in</button><button className={view === "full" ? "active" : ""} onClick={() => setView("full")} type="button">Full check-in</button></div>
          <form onSubmit={(event) => submit(event, view === "quick")}>
            <div className="sensory-field"><div className="sensory-label">How are you feeling today?</div><div className="sensory-mood-options">{moods.map((mood, index) => <button type="button" key={mood} className={form.mood === mood ? "selected" : ""} onClick={() => updateForm("mood", mood)}><span aria-hidden="true">{["☹", "🙁", "◉", "🙂", "☺"][index]}</span>{mood}</button>)}</div></div>
            {view === "quick" ? (
              <label className="sensory-field">Want to tell us why?<textarea value={form.quickReason} onChange={(event) => updateForm("quickReason", event.target.value)} placeholder="Anything you'd like to remember..." rows="3" /></label>
            ) : (
              <>
                <fieldset className="sensory-field"><legend>What emotions are you feeling?</legend><div className="sensory-chips">{emotions.map((emotion) => <button type="button" key={emotion} className={form.emotions.includes(emotion) ? "selected" : ""} onClick={() => toggleArray("emotions", emotion)}>{emotion}</button>)}</div></fieldset>
                <label className="sensory-field">Anything else you'd like to call this feeling?<input value={form.moodCustom} onChange={(event) => updateForm("moodCustom", event.target.value)} placeholder="Optional" /></label>
                <div className="sensory-field"><label htmlFor="energy-range">How is your energy today? <strong>{["Very low", "Low", "Okay", "High", "Very high"][form.energy - 1]}</strong></label><input id="energy-range" type="range" min="1" max="5" value={form.energy} onChange={(event) => updateForm("energy", event.target.value)} /></div>
                <div className="sensory-field"><label htmlFor="comfort-range">How comfortable do you feel today? <strong>{["Very uncomfortable", "Uncomfortable", "Okay", "Comfortable", "Very comfortable"][form.comfort - 1]}</strong></label><input id="comfort-range" type="range" min="1" max="5" value={form.comfort} onChange={(event) => updateForm("comfort", event.target.value)} /></div>
                <label className="sensory-field">How was your day?<textarea value={form.daySummary} onChange={(event) => updateForm("daySummary", event.target.value)} placeholder="Tell us anything about your day." rows="4" /></label>
                <fieldset className="sensory-field"><legend>What might have contributed to how you feel?</legend><div className="sensory-chips">{causes.map((cause) => <button type="button" key={cause} className={form.causes.includes(cause) ? "selected" : ""} onClick={() => toggleArray("causes", cause)}>{cause}</button>)}</div></fieldset>
                <label className="sensory-field">Did anything overwhelm you today?<textarea value={form.overwhelm} onChange={(event) => updateForm("overwhelm", event.target.value)} placeholder="Optional" rows="3" /></label>
                <fieldset className="sensory-field"><legend>What helped you feel better?</legend><div className="sensory-chips">{supports.map((item) => <button type="button" key={item} className={form.helpful.includes(item) ? "selected" : ""} onClick={() => toggleArray("helpful", item)}>{item}</button>)}</div></fieldset>
                <label className="sensory-field">Do you need help from a mentor?<select value={form.helpRequest} onChange={(event) => updateForm("helpRequest", event.target.value)}>{helpOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                {form.helpRequest === "I'd like to talk to a specific mentor" && <label className="sensory-field">Choose a mentor<select value={form.selectedMentor} onChange={(event) => updateForm("selectedMentor", event.target.value)}><option value="">Select a mentor</option>{mentors.map((mentor) => <option key={mentor}>{mentor}</option>)}</select></label>}
                {form.helpRequest !== helpOptions[0] && <label className="sensory-field">Is there anything you'd like your mentor to know?<textarea value={form.mentorMessage} onChange={(event) => updateForm("mentorMessage", event.target.value)} rows="3" /></label>}
                <label className="sensory-share"><input type="checkbox" checked={form.shared} onChange={(event) => updateForm("shared", event.target.checked)} /><span><Share2 size={17} /><strong>Share this check-in with my mentor</strong><small>{form.shared ? "Your mentor can see the details in their dashboard." : "This stays private unless you turn this on."}</small></span></label>
                {form.shared && <p className="sensory-share-note">Shared entries are visible to the mentor account in this demo.</p>}
              </>
            )}
            {view === "quick" && <p className="sensory-private-note"><LockKeyhole size={15} /> Quick check-ins are private.</p>}
            <button className="sensory-submit" type="submit" disabled={!form.mood}>{view === "quick" ? "Save quick check-in" : "Save today's check-in"}</button>
          </form>
        </section>
      ) : (
        <section className="sensory-card sensory-done"><Check size={21} /><div><h2>You've checked in today.</h2><p>Your entry is {todayEntry.shared ? "shared with your mentor" : "private"}. You can still review or delete it in your history.</p></div></section>
      )}

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">GENTLE IDEAS</span><h2>A few things you could try</h2></div><Heart size={22} /></div><div className="sensory-suggestions">{suggestions.map((item) => <span key={item}>{item}</span>)}</div><small>Optional ideas only. You know what works best for you.</small></section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">YOUR RECENT CHECK-INS</span><h2>Patterns over time</h2></div></div><TrendChart entries={sortedEntries} />
        {sortedEntries.length >= 4 && <div className="sensory-insights">{tiredCount >= 3 && <p>Your entries suggest you reported feeling tired on several recent days.</p>}{stressedCount >= 3 && <p>You reported feeling stressed on several school days recently.</p>}{tiredCount < 3 && stressedCount < 3 && <p>You're building a picture of what your days feel like. Keep checking in if it feels helpful.</p>}</div>}
      </section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">YOUR HISTORY</span><h2>Previous check-ins</h2></div></div>
        {!sortedEntries.length ? <p className="sensory-muted">Your check-ins will appear here. Only you can see private entries.</p> : <div className="sensory-history">{sortedEntries.map((entry) => <article key={entry.id} className="sensory-history-entry"><button type="button" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}><span><strong>{new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong><small>{entry.mood}{entry.emotions?.length ? ` · ${entry.emotions.slice(0, 3).join(", ")}` : ""} · Energy {entry.energy}/5</small><em className={entry.shared ? "is-shared" : ""}>{entry.shared ? "Shared" : "Private"}</em></span>{expandedId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{expandedId === entry.id && <EntryDetail entry={entry} onDelete={removeEntry} />}</article>)}</div>}
      </section>
    </section>
  );
}
