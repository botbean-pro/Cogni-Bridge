import React, { useEffect, useMemo, useState } from "react";
import { Activity, Check, ChevronDown, HeartPulse, LockKeyhole, Send, Trash2 } from "lucide-react";
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
import "./sensoryTracker.css";

const emptyCheckin = () => ({
  mood: 0,
  moodNote: "",
  emotions: [],
  emotionNote: "",
  energy: 3,
  comfort: 3,
  dayNote: "",
  causes: [],
  causeNote: "",
  overwhelmNote: "",
  helpfulActions: [],
  helpfulNote: "",
  mentorHelp: "none",
  selectedMentorId: "",
  mentorMessage: "",
  sharedWithMentor: false,
});

const toggleValue = (values, value) => (
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
);

const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date(value));

const formatDateTime = (value) => new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

function ToggleChips({ options, values, onChange, label }) {
  return (
    <div className="sensory-chip-group" role="group" aria-label={label}>
      {options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          className={`sensory-chip${values.includes(value) ? " selected" : ""}`}
          aria-pressed={values.includes(value)}
          onClick={() => onChange(toggleValue(values, value))}
        >
          {values.includes(value) && <Check size={14} aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  );
}

function Rating({ title, value, onChange, low, high, labels, name }) {
  return (
    <fieldset className="sensory-rating">
      <legend>{title}</legend>
      <div className="rating-options">
        {labels.map((label, index) => {
          const score = index + 1;
          return (
            <label key={score} className={value === score ? "selected" : ""}>
              <input
                type="radio"
                name={name}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
              />
              <span>{score}</span>
              <small>{label}</small>
            </label>
          );
        })}
      </div>
      <div className="rating-endpoints"><span>{low}</span><span>{high}</span></div>
    </fieldset>
  );
}

function TrendChart({ entries }) {
  const points = useMemo(() => entries.slice(0, 7).reverse(), [entries]);
  if (points.length < 2) return null;
  const width = 560;
  const height = 190;
  const x = (index) => 30 + (index * (width - 60)) / (points.length - 1);
  const y = (score) => height - 28 - ((score - 1) / 4) * (height - 52);
  const line = (key) => points
    .map((entry, index) => entry[key] === null ? null : `${x(index)},${y(entry[key])}`)
    .filter(Boolean)
    .join(" ");

  return (
    <section className="sensory-panel trend-panel" aria-labelledby="trend-heading">
      <div className="sensory-panel-heading">
        <div><p className="eyebrow">YOUR RECENT ENTRIES</p><h3 id="trend-heading">A small look back</h3></div>
        <Activity size={20} aria-hidden="true" />
      </div>
      <div className="trend-legend" aria-label="Chart legend">
        <span className="mood-line">Mood</span><span className="energy-line">Energy</span><span className="comfort-line">Comfort</span>
      </div>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mood, energy, and comfort ratings across your last check-ins">
        {[1, 2, 3, 4, 5].map((score) => (
          <g key={score}>
            <line x1="30" x2={width - 30} y1={y(score)} y2={y(score)} className="trend-gridline" />
            <text x="12" y={y(score) + 4} className="trend-axis-label">{score}</text>
          </g>
        ))}
        {points.some((entry) => entry.energy !== null) && <polyline points={line("energy")} className="trend-path energy-path" />}
        {points.some((entry) => entry.comfort !== null) && <polyline points={line("comfort")} className="trend-path comfort-path" />}
        <polyline points={line("mood")} className="trend-path mood-path" />
        {points.map((entry, index) => (
          <g key={entry.id}>
            <circle cx={x(index)} cy={y(entry.mood)} r="4" className="trend-dot mood-dot" />
            {entry.energy !== null && <circle cx={x(index)} cy={y(entry.energy)} r="3" className="trend-dot energy-dot" />}
            {entry.comfort !== null && <circle cx={x(index)} cy={y(entry.comfort)} r="3" className="trend-dot comfort-dot" />}
            <text x={x(index)} y={height - 7} textAnchor="middle" className="trend-axis-label">{new Date(entry.created_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

function makeInsights(entries) {
  if (entries.length < 3) return [];
  const recent = entries.slice(0, 7);
  const insights = [];
  const tiredCount = recent.filter((entry) => entry.emotions?.includes("tired")).length;
  const stressCount = recent.filter((entry) => entry.emotions?.includes("stressed")).length;
  if (tiredCount >= 2) insights.push("You reported feeling tired in a few recent entries.");
  if (stressCount >= 2 && recent.some((entry) => entry.causes?.includes("school"))) {
    insights.push("You reported feeling stressed on some school days.");
  }
  const withBreak = recent.filter((entry) => entry.helpful_actions?.includes("break"));
  if (withBreak.length >= 2) {
    const breakMood = withBreak.reduce((total, entry) => total + entry.mood, 0) / withBreak.length;
    const otherEntries = recent.filter((entry) => !entry.helpful_actions?.includes("break"));
    if (otherEntries.length && breakMood > otherEntries.reduce((total, entry) => total + entry.mood, 0) / otherEntries.length) {
      insights.push("Your entries suggest your mood may be brighter on days you take a break.");
    }
  }
  if (entries.length >= 6) {
    const thisWeek = entries.slice(0, 3).reduce((total, entry) => total + entry.mood, 0) / 3;
    const lastWeek = entries.slice(3, 6).reduce((total, entry) => total + entry.mood, 0) / 3;
    if (thisWeek - lastWeek >= 0.75) insights.push("Your recent entries suggest this week may feel a little better than last week.");
  }
  return insights;
}

function suggestionsFor(checkin) {
  const suggestions = [];
  if (checkin.mood <= 2 || checkin.mentorHelp !== "none") suggestions.push("Talk to a trusted person");
  if (checkin.energy <= 2) suggestions.push("Take a short break");
  if (checkin.causes.includes("sensory") || checkin.emotions.includes("overwhelmed")) suggestions.push("Move somewhere quieter");
  if (checkin.causes.includes("homework")) suggestions.push("Break homework into smaller tasks");
  if (checkin.mentorHelp !== "none") suggestions.push("Talk to your mentor");
  if (checkin.emotions.includes("anxious") || checkin.emotions.includes("stressed")) suggestions.push("Try a breathing exercise");
  return [...new Set(suggestions)].slice(0, 3);
}

export function SensoryTrackerPage({ studentId, t }) {
  const [checkin, setCheckin] = useState(emptyCheckin);
  const [quickMood, setQuickMood] = useState(0);
  const [quickNote, setQuickNote] = useState("");
  const [entries, setEntries] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const refresh = async () => {
    const [history, availableMentors, mentorResponses] = await Promise.all([
      loadStudentCheckins(studentId),
      loadAssignedMentors(studentId),
      loadStudentResponses(),
    ]);
    setEntries(history);
    setMentors(availableMentors);
    setResponses(mentorResponses);
  };

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      loadStudentCheckins(studentId),
      loadAssignedMentors(studentId),
      loadStudentResponses(),
    ]).then(([history, availableMentors, mentorResponses]) => {
      if (!isCurrent) return;
      setEntries(history);
      setMentors(availableMentors);
      setResponses(mentorResponses);
    }).catch(() => {
      if (isCurrent) setError("Your check-ins could not be loaded. Please try again.");
    });
    return () => { isCurrent = false; };
  }, [studentId]);

  const update = (field, value) => setCheckin((current) => ({ ...current, [field]: value }));

  const save = async (type, values) => {
    if (!values.mood) {
      setError("Choose how you feel before saving.");
      return;
    }
    if (values.sharedWithMentor && mentors.length === 0) {
      setError("No mentor is assigned to your account, so this entry cannot be shared yet.");
      return;
    }
    if (values.sharedWithMentor && values.mentorHelp === "specific_mentor" && !values.selectedMentorId) {
      setError("Choose an assigned mentor, or select a different support option.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    const data = type === "quick"
      ? {
        checkin_type: "quick",
        mood: values.mood,
        mood_note: "",
        emotions: [],
        emotion_note: "",
        energy: null,
        comfort: null,
        day_note: values.dayNote,
        causes: [],
        cause_note: "",
        overwhelm_note: "",
        helpful_actions: [],
        helpful_note: "",
        mentor_help: "none",
        selected_mentor_id: null,
        mentor_message: "",
        shared_with_mentor: false,
      }
      : {
        checkin_type: "full",
        mood: values.mood,
        mood_note: values.moodNote.trim(),
        emotions: values.emotions,
        emotion_note: values.emotionNote.trim(),
        energy: values.energy,
        comfort: values.comfort,
        day_note: values.dayNote.trim(),
        causes: values.causes,
        cause_note: values.causeNote.trim(),
        overwhelm_note: values.overwhelmNote.trim(),
        helpful_actions: values.helpfulActions,
        helpful_note: values.helpfulNote.trim(),
        mentor_help: values.mentorHelp,
        selected_mentor_id: values.sharedWithMentor ? values.selectedMentorId || null : null,
        mentor_message: values.mentorMessage.trim(),
        shared_with_mentor: values.sharedWithMentor,
      };
    try {
      await saveStudentCheckin(studentId, data);
      await refresh();
      if (type === "quick") {
        setQuickMood(0);
        setQuickNote("");
      } else {
        setCheckin(emptyCheckin());
      }
      setNotice(values.sharedWithMentor
        ? "Saved and shared with your assigned mentor(s)."
        : "Saved privately. Only you can see this check-in.");
    } catch {
      setError("Your check-in could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (entryId) => {
    if (!window.confirm("Delete this check-in? This cannot be undone.")) return;
    setError("");
    try {
      await deleteStudentCheckin(studentId, entryId);
      await refresh();
      setSelectedEntryId(null);
      setNotice("Check-in deleted.");
    } catch {
      setError("This check-in could not be deleted. Please try again.");
    }
  };

  const insights = makeInsights(entries);
  const recentSuggestions = entries[0] ? suggestionsFor({
    mood: entries[0].mood,
    energy: entries[0].energy || 3,
    causes: entries[0].causes || [],
    emotions: entries[0].emotions || [],
    mentorHelp: entries[0].mentor_help,
  }) : [];

  return (
    <main className="content sensory-page">
      <header className="sensory-welcome">
        <div>
          <p className="eyebrow">A MOMENT FOR YOU</p>
          <h1>{t("sensoryTracker")}</h1>
          <p>Check in at your own pace. There are no right or wrong answers.</p>
        </div>
        <span className="sensory-welcome-icon"><HeartPulse size={28} aria-hidden="true" /></span>
      </header>

      {error && <p className="sensory-alert" role="alert">{error}</p>}
      {notice && <p className="sensory-notice" role="status">{notice}</p>}

      <section className="sensory-panel quick-panel" aria-labelledby="quick-checkin-heading">
        <div className="sensory-panel-heading">
          <div><p className="eyebrow">A FEW SECONDS</p><h2 id="quick-checkin-heading">How are you feeling right now?</h2></div>
          <span className="quick-time">Quick check-in</span>
        </div>
        <p className="quick-privacy"><LockKeyhole size={15} /> Quick check-ins are private to you.</p>
        <div className="mood-options" role="group" aria-label="How are you feeling right now?">
          {moodLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`mood-option mood-${index + 1}${quickMood === index + 1 ? " selected" : ""}`}
              aria-pressed={quickMood === index + 1}
              onClick={() => setQuickMood(index + 1)}
            >
              <span>{index + 1}</span>{label}
            </button>
          ))}
        </div>
        {quickMood > 0 && (
          <div className="quick-followup">
            <label htmlFor="quick-note">Want to tell us why? <span>Optional</span></label>
            <input id="quick-note" maxLength={4000} value={quickNote} onChange={(event) => setQuickNote(event.target.value)} placeholder="A few words is enough" />
            <button type="button" className="sensory-primary" disabled={saving} onClick={() => save("quick", { mood: quickMood, dayNote: quickNote, sharedWithMentor: false })}>
              <Check size={17} /> Save quick check-in
            </button>
          </div>
        )}
      </section>

      <form className="sensory-panel full-checkin" onSubmit={(event) => { event.preventDefault(); save("full", checkin); }}>
        <div className="sensory-panel-heading">
          <div><p className="eyebrow">DAILY CHECK-IN</p><h2>How has today felt for you?</h2></div>
          <span className="full-time">About 1–2 minutes</span>
        </div>

        <fieldset className="sensory-fieldset">
          <legend>How are you feeling today?</legend>
          <div className="mood-options" role="group" aria-label="How are you feeling today?">
            {moodLabels.map((label, index) => (
              <button key={label} type="button" className={`mood-option mood-${index + 1}${checkin.mood === index + 1 ? " selected" : ""}`} aria-pressed={checkin.mood === index + 1} onClick={() => update("mood", index + 1)}>
                <span>{index + 1}</span>{label}
              </button>
            ))}
          </div>
          <label className="sensory-label" htmlFor="mood-note">Something else? <span>Optional</span></label>
          <input id="mood-note" className="sensory-input" maxLength={250} value={checkin.moodNote} onChange={(event) => update("moodNote", event.target.value)} placeholder="Add your own words" />
        </fieldset>

        <fieldset className="sensory-fieldset">
          <legend>What emotions are you feeling?</legend>
          <ToggleChips label="Choose any emotions that fit" options={emotionOptions} values={checkin.emotions} onChange={(values) => update("emotions", values)} />
          {checkin.emotions.includes("other") && <input className="sensory-input sensory-followup-input" aria-label="Other emotion" maxLength={250} value={checkin.emotionNote} onChange={(event) => update("emotionNote", event.target.value)} placeholder="What emotion would you add?" />}
        </fieldset>

        <div className="rating-grid">
          <Rating title="How is your energy today?" name="energy" value={checkin.energy} onChange={(value) => update("energy", value)} low="Very low" high="Very high" labels={["Very low", "Low", "Okay", "High", "Very high"]} />
          <Rating title="How comfortable do you feel today?" name="comfort" value={checkin.comfort} onChange={(value) => update("comfort", value)} low="Very uncomfortable" high="Very comfortable" labels={["Very uncomfortable", "Uncomfortable", "Okay", "Comfortable", "Very comfortable"]} />
        </div>

        <fieldset className="sensory-fieldset">
          <legend>How was your day?</legend>
          <label className="sensory-label" htmlFor="day-note">Tell us anything about your day. <span>Optional</span></label>
          <textarea id="day-note" className="sensory-input sensory-textarea" maxLength={4000} value={checkin.dayNote} onChange={(event) => update("dayNote", event.target.value)} rows={4} placeholder="Whatever feels important to you" />
        </fieldset>

        <fieldset className="sensory-fieldset">
          <legend>What caused you to feel this way?</legend>
          <ToggleChips label="Possible causes" options={causeOptions} values={checkin.causes} onChange={(values) => update("causes", values)} />
          {checkin.causes.includes("other") && <input className="sensory-input sensory-followup-input" aria-label="Other cause" maxLength={250} value={checkin.causeNote} onChange={(event) => update("causeNote", event.target.value)} placeholder="Add another cause" />}
        </fieldset>

        <fieldset className="sensory-fieldset">
          <legend>Did anything overwhelm you today?</legend>
          <label className="sensory-label" htmlFor="overwhelm-note">You can leave this blank. <span>Optional</span></label>
          <textarea id="overwhelm-note" className="sensory-input sensory-textarea" maxLength={2000} value={checkin.overwhelmNote} onChange={(event) => update("overwhelmNote", event.target.value)} rows={3} placeholder="Share only what you want to" />
        </fieldset>

        <fieldset className="sensory-fieldset">
          <legend>What helped you feel better?</legend>
          <ToggleChips label="Helpful actions" options={helpfulOptions} values={checkin.helpfulActions} onChange={(values) => update("helpfulActions", values)} />
          {checkin.helpfulActions.includes("other") && <input className="sensory-input sensory-followup-input" aria-label="Other helpful action" maxLength={250} value={checkin.helpfulNote} onChange={(event) => update("helpfulNote", event.target.value)} placeholder="What else helped?" />}
        </fieldset>

        <fieldset className="sensory-fieldset mentor-support">
          <legend>Do you need help from a mentor?</legend>
          <div className="support-options">
            {mentorHelpOptions.map(([value, label]) => (
              <label key={value} className={checkin.mentorHelp === value ? "selected" : ""}>
                <input type="radio" name="mentor-help" value={value} checked={checkin.mentorHelp === value} onChange={() => update("mentorHelp", value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {checkin.mentorHelp === "specific_mentor" && checkin.sharedWithMentor && (
            <label className="sensory-label mentor-select-label">
              Choose an assigned mentor
              <select className="sensory-input" value={checkin.selectedMentorId} onChange={(event) => update("selectedMentorId", event.target.value)} required>
                <option value="">Choose a mentor</option>
                {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.display_name}</option>)}
              </select>
              {mentors.length === 0 && <small>No mentors are assigned to your account yet.</small>}
            </label>
          )}
          {checkin.mentorHelp === "specific_mentor" && !checkin.sharedWithMentor && <p className="sensory-inline-note">If you choose to share, you can pick an assigned mentor.</p>}
          <label className="sensory-label" htmlFor="mentor-message">Is there anything you'd like your mentor to know? <span>Optional</span></label>
          <textarea id="mentor-message" className="sensory-input sensory-textarea" maxLength={2000} value={checkin.mentorMessage} onChange={(event) => update("mentorMessage", event.target.value)} rows={3} placeholder="Write a note for your mentor" />
          <label className="share-control">
            <input type="checkbox" checked={checkin.sharedWithMentor} onChange={(event) => update("sharedWithMentor", event.target.checked)} />
            <span><strong>Share this check-in with my mentor</strong><small>Your full entry is shared only with mentors assigned to support you.</small></span>
          </label>
          <p className={`privacy-status${checkin.sharedWithMentor ? " shared" : ""}`} role="status">
            {checkin.sharedWithMentor ? <Send size={16} /> : <LockKeyhole size={16} />}
            {checkin.sharedWithMentor
              ? checkin.selectedMentorId
                ? `This entry will be shared with ${mentors.find((mentor) => mentor.id === checkin.selectedMentorId)?.display_name || "your selected mentor"}.`
                : "This entry will be shared with your assigned mentor(s)."
              : "Private to you. No mentor can see this entry."}
          </p>
          {checkin.mentorHelp !== "none" && !checkin.sharedWithMentor && <p className="sensory-inline-note">Your support choice will stay private unless you turn on sharing.</p>}
        </fieldset>

        <div className="sensory-submit-row">
          <p>Only you can see private entries. You can delete any entry later.</p>
          <button type="submit" className="sensory-primary" disabled={saving}>{saving ? "Saving…" : "Save today's check-in"}</button>
        </div>
      </form>

      {recentSuggestions.length > 0 && (
        <section className="sensory-panel suggestion-panel">
          <div className="sensory-panel-heading"><div><p className="eyebrow">OPTIONAL IDEAS</p><h2>A few things you could try</h2></div><ChevronDown size={19} aria-hidden="true" /></div>
          <p>These are just ideas, not instructions. Choose what feels right for you.</p>
          <ul>{recentSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
        </section>
      )}

      {insights.length > 0 && (
        <section className="sensory-panel insight-panel" aria-labelledby="insights-heading">
          <p className="eyebrow">YOUR OWN PATTERNS</p><h2 id="insights-heading">Things you may have noticed</h2>
          <ul>{insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
          <small>These are reflections on your entries, not diagnoses or predictions.</small>
        </section>
      )}

      <TrendChart entries={entries} />

      <section className="sensory-history" aria-labelledby="history-heading">
        <div className="sensory-panel-heading"><div><p className="eyebrow">YOUR PRIVATE RECORD</p><h2 id="history-heading">Past check-ins</h2></div><span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span></div>
        {entries.length === 0 ? (
          <p className="sensory-history-empty">Your check-ins will appear here. Start with whichever version feels right today.</p>
        ) : (
          <div className="sensory-history-list">
            {entries.map((entry) => (
              <article className="sensory-history-item" key={entry.id}>
                <button type="button" className="history-open" aria-expanded={selectedEntryId === entry.id} onClick={() => setSelectedEntryId(selectedEntryId === entry.id ? null : entry.id)}>
                  <span className="history-date"><strong>{formatDate(entry.created_at)}</strong><small>{entry.checkin_type === "quick" ? "Quick check-in" : "Daily check-in"}</small></span>
                  <span className={`history-mood mood-text-${entry.mood}`}>{moodLabels[entry.mood - 1]}</span>
                  <span className="history-emotions">{(entry.emotions || []).slice(0, 2).map((emotion) => emotionOptions.find(([key]) => key === emotion)?.[1] || emotion).join(", ") || "No emotions selected"}</span>
                  <span className="history-energy">{entry.energy ? `Energy ${entry.energy}/5` : "Quick entry"}</span>
                  <span className="history-summary">{entry.day_note || entry.overwhelm_note || "No note added"}</span>
                  <ChevronDown size={17} className={selectedEntryId === entry.id ? "expanded" : ""} aria-hidden="true" />
                </button>
                {selectedEntryId === entry.id && (
                  <div className="history-detail">
                    <p className="history-created">Saved {formatDateTime(entry.created_at)} · {entry.shared_with_mentor ? "Shared with assigned mentor(s)" : "Private to you"}</p>
                    {entry.energy && <p>Comfort: {entry.comfort}/5</p>}
                    {(entry.mood_note || entry.emotion_note) && <p>{entry.mood_note || entry.emotion_note}</p>}
                    {entry.day_note && <p><strong>About your day:</strong> {entry.day_note}</p>}
                    {entry.causes?.length > 0 && <p><strong>Causes:</strong> {entry.causes.map((cause) => causeOptions.find(([key]) => key === cause)?.[1] || cause).join(", ")}{entry.cause_note && ` · ${entry.cause_note}`}</p>}
                    {entry.overwhelm_note && <p><strong>Overwhelm:</strong> {entry.overwhelm_note}</p>}
                    {entry.helpful_actions?.length > 0 && <p><strong>What helped:</strong> {entry.helpful_actions.map((action) => helpfulOptions.find(([key]) => key === action)?.[1] || action).join(", ")}{entry.helpful_note && ` · ${entry.helpful_note}`}</p>}
                    {entry.mentor_help !== "none" && <p><strong>Mentor support:</strong> {mentorHelpOptions.find(([key]) => key === entry.mentor_help)?.[1]}</p>}
                    {entry.mentor_message && <p><strong>Message to mentor:</strong> {entry.mentor_message}</p>}
                    {responses.filter((response) => response.checkin_id === entry.id).map((response) => <p className="mentor-reply" key={response.checkin_id}><strong>Mentor replied:</strong> {response.mentor_message}</p>)}
                    <button type="button" className="delete-checkin" onClick={() => removeEntry(entry.id)}><Trash2 size={15} /> Delete this check-in</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}