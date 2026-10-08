import React, { useEffect, useMemo, useState } from "react";
import { Activity, Check, ChevronDown, ChevronUp, Heart, LockKeyhole, Share2, Trash2 } from "lucide-react";
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

function TrendChart({ entries }) {
  const data = entries.slice(0, 7).reverse();
  if (data.length < 2) return <p className="sensory-muted">Add a few check-ins to see your mood, energy, and comfort trend.</p>;
  // Quick check-ins have no energy/comfort rating, so those points are skipped.
  const pointsFor = (field) => data
    .map((entry, index) => entry[field] == null ? null : `${30 + index * (540 / (data.length - 1))},${155 - ((entry[field] - 1) / 4) * 125}`)
    .filter(Boolean)
    .join(" ");
  return (
    <div className="sensory-chart-wrap">
      <div className="sensory-chart-legend"><span className="mood-line">Mood</span><span className="energy-line">Energy</span><span className="comfort-line">Comfort</span></div>
      <svg className="sensory-chart" viewBox="0 0 600 180" role="img" aria-label="Your mood, energy, and comfort over your recent check-ins">
        {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="30" x2="570" y1={30 + line * 31} y2={30 + line * 31} />)}
        <polyline className="mood-line" points={pointsFor("mood")} />
        <polyline className="energy-line" points={pointsFor("energy")} />
        <polyline className="comfort-line" points={pointsFor("comfort")} />
      </svg>
      <div className="sensory-chart-dates"><span>{new Date(data[0].created_at).toLocaleDateString()}</span><span>{new Date(data[data.length - 1].created_at).toLocaleDateString()}</span></div>
    </div>
  );
}

function EntryDetail({ entry, reply, onDelete }) {
  return (
    <div className="sensory-entry-detail">
      <p>{entry.day_note || "No day summary added."}</p>
      {entry.mood_note && <p><strong>Your words:</strong> {entry.mood_note}</p>}
      {entry.causes?.length > 0 && <p><strong>Possible causes:</strong> {labelsFor(causeOptions, entry.causes).join(", ")}</p>}
      {entry.overwhelm_note && <p><strong>What felt overwhelming:</strong> {entry.overwhelm_note}</p>}
      {entry.helpful_actions?.length > 0 && <p><strong>What helped:</strong> {labelsFor(helpfulOptions, entry.helpful_actions).join(", ")}</p>}
      {entry.mentor_help !== "none" && <p><strong>Mentor support:</strong> {labelFor(mentorHelpOptions, entry.mentor_help)}</p>}
      {entry.mentor_message && <p><strong>Message for your mentor:</strong> {entry.mentor_message}</p>}
      {reply && <p><strong>Mentor reply:</strong> {reply}</p>}
      <button type="button" className="sensory-delete" onClick={() => onDelete(entry)}><Trash2 size={15} /> Delete this check-in</button>
    </div>
  );
}

export function SensoryTrackerPage({ studentId }) {
  const [entries, setEntries] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(blankEntry);
  const [view, setView] = useState("quick");
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at)), [entries]);
  const todayEntry = sortedEntries.find((entry) => entryDay(entry) === todayString());

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
    }).catch(() => {
      if (isCurrent) setStatus("Your check-ins couldn't be loaded. Please try again.");
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
    const shared = !quick && form.shared;
    const specificMentor = shared && form.helpRequest === "specific_mentor";
    if (shared && mentors.length === 0) {
      setStatus("No mentor is assigned to your account yet, so this check-in can't be shared.");
      return;
    }
    if (specificMentor && !form.selectedMentorId) {
      setStatus("Choose a mentor, or pick a different support option.");
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
        mentor_help: form.helpRequest,
        selected_mentor_id: specificMentor ? form.selectedMentorId : null,
        mentor_message: form.helpRequest === "none" ? "" : form.mentorMessage.trim(),
        shared_with_mentor: shared,
      };
    setSaving(true);
    try {
      await saveStudentCheckin(studentId, checkin);
      await refresh();
      setForm(blankEntry());
      setStatus(shared ? "Saved and shared with your mentor." : "Saved privately. Only you can see this check-in.");
    } catch {
      setStatus("This check-in couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entry) => {
    try {
      await deleteStudentCheckin(studentId, entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setExpandedId(null);
      setStatus("Check-in deleted.");
    } catch {
      setStatus("This check-in couldn't be deleted. Please try again.");
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
    <section className="content sensory-page">
      <header className="sensory-heading"><div><p className="eyebrow">A private space for you</p><h1>Sensory Tracker</h1><p>Check in with yourself. Share only what you choose.</p></div><span><Heart size={18} /> No judgement, just your own notes</span></header>
      <div className="sensory-privacy"><LockKeyhole size={17} /> Your check-ins are private by default. You'll see a clear label when you choose to share one.</div>
      {status && <p className="sensory-status" role="status">{status}</p>}

      {!todayEntry ? (
        <section className="sensory-card sensory-checkin">
          <div className="sensory-card-title"><div><span className="sensory-step">TODAY'S CHECK-IN</span><h2>{view === "quick" ? "How are you feeling right now?" : "How are you feeling today?"}</h2></div><Activity size={22} /></div>
          <div className="sensory-view-switch"><button className={view === "quick" ? "active" : ""} onClick={() => setView("quick")} type="button">Quick check-in</button><button className={view === "full" ? "active" : ""} onClick={() => setView("full")} type="button">Full check-in</button></div>
          <form onSubmit={(event) => submit(event, view === "quick")}>
            <div className="sensory-field"><div className="sensory-label">How are you feeling today?</div><div className="sensory-mood-options">{moodLabels.map((mood, index) => <button type="button" key={mood} className={form.mood === index + 1 ? "selected" : ""} onClick={() => updateForm("mood", index + 1)}><span aria-hidden="true">{["☹", "🙁", "◉", "🙂", "☺"][index]}</span>{mood}</button>)}</div></div>
            {view === "quick" ? (
              <label className="sensory-field">Want to tell us why?<textarea value={form.quickReason} maxLength={4000} onChange={(event) => updateForm("quickReason", event.target.value)} placeholder="Anything you'd like to remember..." rows="3" /></label>
            ) : (
              <>
                <fieldset className="sensory-field"><legend>What emotions are you feeling?</legend><div className="sensory-chips">{emotionOptions.map(([key, label]) => <button type="button" key={key} className={form.emotions.includes(key) ? "selected" : ""} onClick={() => toggleArray("emotions", key)}>{label}</button>)}</div></fieldset>
                <label className="sensory-field">Anything else you'd like to call this feeling?<input value={form.moodCustom} maxLength={250} onChange={(event) => updateForm("moodCustom", event.target.value)} placeholder="Optional" /></label>
                <div className="sensory-field"><label htmlFor="energy-range">How is your energy today? <strong>{["Very low", "Low", "Okay", "High", "Very high"][form.energy - 1]}</strong></label><input id="energy-range" type="range" min="1" max="5" value={form.energy} onChange={(event) => updateForm("energy", event.target.value)} /></div>
                <div className="sensory-field"><label htmlFor="comfort-range">How comfortable do you feel today? <strong>{["Very uncomfortable", "Uncomfortable", "Okay", "Comfortable", "Very comfortable"][form.comfort - 1]}</strong></label><input id="comfort-range" type="range" min="1" max="5" value={form.comfort} onChange={(event) => updateForm("comfort", event.target.value)} /></div>
                <label className="sensory-field">How was your day?<textarea value={form.daySummary} maxLength={4000} onChange={(event) => updateForm("daySummary", event.target.value)} placeholder="Tell us anything about your day." rows="4" /></label>
                <fieldset className="sensory-field"><legend>What might have contributed to how you feel?</legend><div className="sensory-chips">{causeOptions.map(([key, label]) => <button type="button" key={key} className={form.causes.includes(key) ? "selected" : ""} onClick={() => toggleArray("causes", key)}>{label}</button>)}</div></fieldset>
                <label className="sensory-field">Did anything overwhelm you today?<textarea value={form.overwhelm} maxLength={2000} onChange={(event) => updateForm("overwhelm", event.target.value)} placeholder="Optional" rows="3" /></label>
                <fieldset className="sensory-field"><legend>What helped you feel better?</legend><div className="sensory-chips">{helpfulOptions.map(([key, label]) => <button type="button" key={key} className={form.helpful.includes(key) ? "selected" : ""} onClick={() => toggleArray("helpful", key)}>{label}</button>)}</div></fieldset>
                <label className="sensory-field">Do you need help from a mentor?<select value={form.helpRequest} onChange={(event) => updateForm("helpRequest", event.target.value)}>{mentorHelpOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                {form.helpRequest === "specific_mentor" && <label className="sensory-field">Choose a mentor<select value={form.selectedMentorId} onChange={(event) => updateForm("selectedMentorId", event.target.value)}><option value="">Select a mentor</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.display_name}</option>)}</select>{mentors.length === 0 && <small>No mentors are assigned to your account yet.</small>}</label>}
                {form.helpRequest !== "none" && <label className="sensory-field">Is there anything you'd like your mentor to know?<textarea value={form.mentorMessage} maxLength={2000} onChange={(event) => updateForm("mentorMessage", event.target.value)} rows="3" /></label>}
                <label className="sensory-share"><input type="checkbox" checked={form.shared} onChange={(event) => updateForm("shared", event.target.checked)} /><span><Share2 size={17} /><strong>Share this check-in with my mentor</strong><small>{form.shared ? "Your assigned mentor can see the details in their dashboard." : "This stays private unless you turn this on."}</small></span></label>
                {form.shared && <p className="sensory-share-note">Shared entries are visible only to mentors assigned to you.</p>}
              </>
            )}
            {view === "quick" && <p className="sensory-private-note"><LockKeyhole size={15} /> Quick check-ins are private.</p>}
            <button className="sensory-submit" type="submit" disabled={!form.mood || saving}>{saving ? "Saving…" : view === "quick" ? "Save quick check-in" : "Save today's check-in"}</button>
          </form>
        </section>
      ) : (
        <section className="sensory-card sensory-done"><Check size={21} /><div><h2>You've checked in today.</h2><p>Your entry is {todayEntry.shared_with_mentor ? "shared with your mentor" : "private"}. You can still review or delete it in your history.</p></div></section>
      )}

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">GENTLE IDEAS</span><h2>A few things you could try</h2></div><Heart size={22} /></div><div className="sensory-suggestions">{suggestions.map((item) => <span key={item}>{item}</span>)}</div><small>Optional ideas only. You know what works best for you.</small></section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">YOUR RECENT CHECK-INS</span><h2>Patterns over time</h2></div></div><TrendChart entries={sortedEntries} />
        {sortedEntries.length >= 4 && <div className="sensory-insights">{tiredCount >= 3 && <p>Your entries suggest you reported feeling tired on several recent days.</p>}{stressedCount >= 3 && <p>You reported feeling stressed on several school days recently.</p>}{tiredCount < 3 && stressedCount < 3 && <p>You're building a picture of what your days feel like. Keep checking in if it feels helpful.</p>}</div>}
      </section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">YOUR HISTORY</span><h2>Previous check-ins</h2></div></div>
        {!sortedEntries.length ? <p className="sensory-muted">Your check-ins will appear here. Only you can see private entries.</p> : <div className="sensory-history">{sortedEntries.map((entry) => <article key={entry.id} className="sensory-history-entry"><button type="button" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}><span><strong>{new Date(entry.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong><small>{moodLabels[entry.mood - 1]}{entry.emotions?.length ? ` · ${labelsFor(emotionOptions, entry.emotions.slice(0, 3)).join(", ")}` : ""}{entry.energy != null ? ` · Energy ${entry.energy}/5` : " · Quick check-in"}</small><em className={entry.shared_with_mentor ? "is-shared" : ""}>{entry.shared_with_mentor ? "Shared" : "Private"}</em></span>{expandedId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{expandedId === entry.id && <EntryDetail entry={entry} reply={responses.find((response) => response.checkin_id === entry.id)?.mentor_message} onDelete={removeEntry} />}</article>)}</div>}
      </section>
    </section>
  );
}
