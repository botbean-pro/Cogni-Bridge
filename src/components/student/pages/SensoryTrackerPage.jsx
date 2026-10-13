import React, { useEffect, useMemo, useState } from "react";
import { Activity, Angry, Frown, Laugh, Meh, Smile, ChevronDown, ChevronUp, Heart, LockKeyhole, Pause, Play, Share2, Sparkles, Users, VolumeX, Wind } from "lucide-react";
import {
  causeOptions,
  emotionOptions,
  helpfulOptions,
  loadAssignedMentors,
  loadLinkedParents,
  loadStudentCheckins,
  loadStudentResponses,
  mentorHelpOptions,
  saveStudentCheckin,
} from "../../../studentSensory";
import { MoodTrendChart } from "../shared/MoodTrendChart";
import "./SensoryTrackerPage.css";

// One icon per moodLabels entry (Very bad -> Great), so the picture always matches the word.
const moodIcons = [Angry, Frown, Meh, Smile, Laugh];
const moodColors = ["#d64545", "#e8833a", "#c9a227", "#5aa469", "#0c9a8a"];

const labelsFor = (t, group, keys = []) => keys.map((key) => t(`${group}_${key}`));

const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayString = () => localDateKey(new Date());
const entryDay = (entry) => localDateKey(new Date(entry.created_at));
const shortNote = (entry) => {
  const note = entry.day_note?.trim();
  if (!note) return "";
  return note.length > 100 ? `${note.slice(0, 100)}…` : note;
};
const blankEntry = () => ({
  mood: 0, moodCustom: "", emotions: [], emotionCustom: "", energy: 3, comfort: 3, daySummary: "", causes: [], causeCustom: "",
  overwhelm: "", helpful: [], helpfulCustom: "", helpRequest: "none", selectedMentorId: "", mentorMessage: "",
  shared: false, quickReason: "",
});

function EntryDetail({ entry, reply, t }) {
  return (
    <div className="sensory-entry-detail">
      <p><strong>{t("sn_dFeeling")}</strong> {t(`mood_${entry.mood}`)}{entry.mood_note ? ` — ${entry.mood_note}` : ""}</p>
      {entry.emotions?.length > 0 && <p><strong>{t("sn_dEmotions")}</strong> {labelsFor(t, "emotion", entry.emotions).join(", ")}{entry.emotion_note ? ` — ${entry.emotion_note}` : ""}</p>}
      {entry.energy != null && <p><strong>{t("sn_dEnergy")}</strong> {entry.energy}/5 · <strong>{t("sn_dComfort")}</strong> {entry.comfort}/5</p>}
      <p><strong>{entry.checkin_type === "quick" ? t("sn_dYourNote") : t("sn_dDayWent")}</strong> {entry.day_note || t("sn_dNoNote")}</p>
      {entry.causes?.length > 0 && <p><strong>{t("sn_dCauses")}</strong> {labelsFor(t, "cause", entry.causes).join(", ")}</p>}
      {entry.cause_note && <p><strong>{t("sn_dOtherCause")}</strong> {entry.cause_note}</p>}
      {entry.overwhelm_note && <p><strong>{t("sn_dOverwhelming")}</strong> {entry.overwhelm_note}</p>}
      {entry.helpful_actions?.length > 0 && <p><strong>{t("sn_dHelped")}</strong> {labelsFor(t, "helpful", entry.helpful_actions).join(", ")}</p>}
      {entry.helpful_note && <p><strong>{t("sn_dOtherHelp")}</strong> {entry.helpful_note}</p>}
      {entry.mentor_help !== "none" && <p><strong>{t("sn_dMentorSupport")}</strong> {t(`mentorHelp_${entry.mentor_help}`)}</p>}
      {entry.mentor_message && <p><strong>{t("sn_dMentorMsg")}</strong> {entry.mentor_message}</p>}
      {reply && <p><strong>{t("sn_dMentorReply")}</strong> {reply}</p>}
    </div>
  );
}

const calmVideos = [
  { id: "v1", source: "HeadStart.gov", url: "https://headstart.gov/video/mindful-breathing" },
  { id: "v2", source: "Cosmic Kids: Zen Den", url: "https://www.youtube.com/watch?v=TCoUnEPeuQk" },
  { id: "v3", source: "Cosmic Kids: Zen Den", url: "https://www.youtube.com/watch?v=8rp5bpFIUpg" },
];

export function CalmCorner({ onClose, startBreathing = false, t }) {
  const [breathing, setBreathing] = useState(startBreathing);
  const [phase, setPhase] = useState(startBreathing ? "in" : "out");
  useEffect(() => {
    if (!breathing) return undefined;
    const timer = window.setInterval(() => setPhase((current) => current === "in" ? "out" : "in"), 4000);
    return () => window.clearInterval(timer);
  }, [breathing]);
  const phaseLabel = t(phase === "in" ? "sn_breatheIn" : "sn_breatheOut");
  return <section className="sensory-card calm-corner" id="calm-corner" aria-labelledby="calm-corner-title">
    <div className="sensory-card-title"><div><span className="sensory-step">{t("sn_calmEyebrow")}</span><h2 id="calm-corner-title">{t("sn_calmTitle")}</h2></div></div>
    <p className="calm-intro">{t("sn_calmIntro")}</p>
    <div className="calm-tools">
      <div className="calm-breath-card"><div className="breathing-copy"><h3>{t("sn_breathingEx")}</h3><p aria-live="polite">{breathing ? t(phase === "in" ? "sn_breatheInSlow" : "sn_breatheOutSlow") : t("sn_followCircle")}</p></div>
        <div className={`breathing-stage${breathing ? " is-active" : ""}${breathing && phase === "out" ? " is-exhaling" : ""}`} aria-label={breathing ? phaseLabel : t("sn_circleLabel")}>
          <div className="breathing-ring" aria-hidden="true"><span className={`breathing-cue${breathing ? ` is-active ${phase === "out" ? "is-exhaling" : ""}` : ""}`}>{breathing ? t(phase === "in" ? "sn_cueIn" : "sn_cueOut") : t("sn_cueBreathe")}</span></div>
        </div>
        <button type="button" className="calm-action" onClick={() => { setBreathing((current) => !current); setPhase("in"); }} aria-pressed={breathing}>{breathing ? <><Pause size={16} /> {t("sn_pause")}</> : <><Play size={16} /> {t("sn_begin")}</>}</button>
      </div>
      <div className="calm-videos"><h3>{t("sn_quietVideos")}</h3>{calmVideos.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span><strong>{t(`sn_${item.id}t`)}</strong><small>{t(`sn_${item.id}n`)} · {item.source}</small></span><span aria-hidden="true">↗</span></a>)}</div>
    </div>
    <button type="button" className="calm-close" onClick={onClose}>{t("sn_backCheckin")}</button>
  </section>;
}

export function SensoryTrackerPage({ studentId, demoMode = false, t }) {
  const [entries, setEntries] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [parents, setParents] = useState([]);
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(blankEntry);
  const [view, setView] = useState("quick");
  const [expandedId, setExpandedId] = useState(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [lowSensory, setLowSensory] = useState(false);
  const [showCalmCorner, setShowCalmCorner] = useState(false);
  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at)), [entries]);
  const todayFullEntry = sortedEntries.find((entry) => entry.checkin_type === "full" && entryDay(entry) === todayString());

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
    setEntries([]);
    setMentors([]);
    setParents([]);
    setResponses([]);
    setExpandedId(null);
    setForm(blankEntry());
    setView("quick");
    setStatus("");
    // Only changes the privacy wording, so a failure here shouldn't block the tracker.
    loadLinkedParents(studentId)
      .then((linkedParents) => {
        if (isCurrent) setParents(linkedParents);
      })
      .catch(() => {});
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
      if (isCurrent) setStatus(t("sn_stLoadFail"));
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
    const shared = !quick && !demoMode && form.shared;
    const specificMentor = shared && form.helpRequest === "specific_mentor";
    if (shared && mentors.length === 0) {
      setStatus(t("sn_stNoMentorShare"));
      return;
    }
    if (specificMentor && !form.selectedMentorId) {
      setStatus(t("sn_stChooseMentor"));
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
        emotion_note: form.emotions.includes("other") ? form.emotionCustom.trim() : "",
        energy: Number(form.energy),
        comfort: Number(form.comfort),
        day_note: form.daySummary.trim(),
        causes: form.causes,
        cause_note: form.causes.includes("other") ? form.causeCustom.trim() : "",
        overwhelm_note: form.overwhelm.trim(),
        helpful_actions: form.helpful,
        helpful_note: form.helpful.includes("other") ? form.helpfulCustom.trim() : "",
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
      setView("quick");
      setStatus(t(demoMode
        ? "sn_stSavedDemo"
        : shared ? "sn_stSavedShared"
          : parents.length ? "sn_stSavedParent"
            : "sn_stSavedPrivate"));
    } catch {
      setStatus(t("sn_stSaveFail"));
    } finally {
      setSaving(false);
    }
  };

  const suggestionKeys = form.mood === 1 || form.mood === 2
    ? ["sn_sugTalk", "sn_sugBreath", "sn_sugQuieter"]
    : form.causes.includes("homework")
      ? ["sn_sugSmaller", "sn_sugBreak", demoMode ? "sn_sugTalk" : "sn_sugTalkMentor"]
      : ["sn_sugBreak", "sn_sugBreathEx", "sn_sugTalk"];
  const suggestions = suggestionKeys.map((key) => t(key));

  const tiredCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("tired")).length;
  const stressedCount = sortedEntries.slice(0, 7).filter((entry) => entry.emotions?.includes("stressed") && entry.causes?.includes("school")).length;
  const moodRatings = sortedEntries.slice(0, 8).map((entry) => entry.mood);
  const recentMoodAverage = moodRatings.length >= 8 ? moodRatings.slice(0, 4).reduce((sum, rating) => sum + rating, 0) / 4 : null;
  const earlierMoodAverage = moodRatings.length >= 8 ? moodRatings.slice(4, 8).reduce((sum, rating) => sum + rating, 0) / 4 : null;

  return (
    <section className={`content sensory-page${lowSensory ? " low-sensory-mode" : ""}`}>
      <header className="sensory-heading"><div><p className="eyebrow">{t("sn_eyebrow")}</p><h1>{t("sensoryTracker")}</h1><p>{t("sn_subtitle")}</p></div><div className="sensory-heading-actions"><button className={`low-sensory-toggle${lowSensory ? " active" : ""}`} type="button" aria-pressed={lowSensory} onClick={() => setLowSensory((value) => !value)}><VolumeX size={17} /> {t(lowSensory ? "sn_lowOn" : "sn_lowMode")}</button><span><Heart size={18} /> {t("sn_noJudgement")}</span></div></header>
      <section className="break-banner"><div><span className="sensory-step">{t("sn_pauseEyebrow")}</span><h2>{t("sn_needBreakTitle")}</h2><p>{t("sn_needBreakCopy")}</p></div><button type="button" onClick={() => setShowCalmCorner(true)}><Wind size={18} /> {t("sn_needBreak")}</button></section>
      {showCalmCorner && <CalmCorner onClose={() => setShowCalmCorner(false)} t={t} />}
      {demoMode ? (
        <div className="sensory-demo-banner" role="note"><LockKeyhole size={17} /> {t("sn_demoBanner")}</div>
      ) : (
        <div className="sensory-privacy"><LockKeyhole size={17} /> {t("sn_privacy")}</div>
      )}
      {!demoMode && parents.length > 0 && (
        <div className="sensory-privacy"><Users size={17} /> {t("sn_parentsSee", { names: parents.map((parent) => parent.display_name).join(", ") })}</div>
      )}
      {status && <p className="sensory-status" role="status">{status}</p>}

      <section className="sensory-card sensory-checkin">
          <div className="sensory-card-title"><div><span className="sensory-step">{t("sn_todayEyebrow")}</span><h2>{t(view === "quick" ? "sn_feelNow" : "sn_feelToday")}</h2></div><Activity size={22} /></div>
          {todayFullEntry && <p className="sensory-status" role="status">{t(todayFullEntry.shared_with_mentor ? "sn_fullDoneShared" : "sn_fullDonePrivate")}</p>}
          <div className="sensory-view-switch"><button className={view === "quick" ? "active" : ""} onClick={() => setView("quick")} type="button">{t("sn_quick")}</button><button className={view === "full" ? "active" : ""} onClick={() => setView("full")} type="button" disabled={Boolean(todayFullEntry)} title={todayFullEntry ? t("sn_fullSaved") : undefined}>{t("sn_full")}</button></div>
          <form onSubmit={(event) => submit(event, view === "quick")}>
            <fieldset className="sensory-field"><legend>{t(view === "quick" ? "sn_feelNow" : "sn_feelToday")}</legend><div className="sensory-mood-options">{[1, 2, 3, 4, 5].map((_, index) => <button type="button" key={index} className={form.mood === index + 1 ? "selected" : ""} aria-pressed={form.mood === index + 1} onClick={() => updateForm("mood", index + 1)}><span aria-hidden="true" style={{ color: moodColors[index] }}>{React.createElement(moodIcons[index], { size: 28, strokeWidth: 1.9 })}</span>{t(`mood_${index + 1}`)}</button>)}</div></fieldset>
            {view === "quick" ? (
              <label className="sensory-field">{t("sn_whyTell")}<textarea value={form.quickReason} maxLength={4000} onChange={(event) => updateForm("quickReason", event.target.value)} placeholder={t("sn_whyPlaceholder")} rows="3" /></label>
            ) : (
              <>
                <fieldset className="sensory-field"><legend>{t("sn_whatEmotions")}</legend><div className="sensory-chips">{emotionOptions.map(([key]) => <button type="button" key={key} className={form.emotions.includes(key) ? "selected" : ""} aria-pressed={form.emotions.includes(key)} onClick={() => toggleArray("emotions", key)}>{t(`emotion_${key}`)}</button>)}</div>{form.emotions.includes("other") && <label className="sensory-other-field">{t("sn_otherEmotion")} <input value={form.emotionCustom} maxLength={250} onChange={(event) => updateForm("emotionCustom", event.target.value)} /></label>}</fieldset>
                <label className="sensory-field">{t("sn_callFeeling")}<input value={form.moodCustom} maxLength={250} onChange={(event) => updateForm("moodCustom", event.target.value)} placeholder={t("sn_optional")} /></label>
                <div className="sensory-field"><label htmlFor="energy-range">{t("sn_energyQ")} <strong>{t(`energyLvl_${form.energy}`)}</strong></label><input id="energy-range" type="range" min="1" max="5" value={form.energy} aria-valuetext={t(`energyLvl_${form.energy}`)} onChange={(event) => updateForm("energy", event.target.value)} /></div>
                <div className="sensory-field"><label htmlFor="comfort-range">{t("sn_comfortQ")} <strong>{t(`comfortLvl_${form.comfort}`)}</strong></label><input id="comfort-range" type="range" min="1" max="5" value={form.comfort} aria-valuetext={t(`comfortLvl_${form.comfort}`)} onChange={(event) => updateForm("comfort", event.target.value)} /></div>
                <label className="sensory-field">{t("sn_howDay")}<textarea value={form.daySummary} maxLength={4000} onChange={(event) => updateForm("daySummary", event.target.value)} placeholder={t("sn_dayPlaceholder")} rows="4" /></label>
                <fieldset className="sensory-field"><legend>{t("sn_contributed")}</legend><div className="sensory-chips">{causeOptions.map(([key]) => <button type="button" key={key} className={form.causes.includes(key) ? "selected" : ""} aria-pressed={form.causes.includes(key)} onClick={() => toggleArray("causes", key)}>{t(`cause_${key}`)}</button>)}</div>{form.causes.includes("other") && <label className="sensory-other-field">{t("sn_elseContributed")} <input value={form.causeCustom} maxLength={250} onChange={(event) => updateForm("causeCustom", event.target.value)} /></label>}</fieldset>
                <label className="sensory-field">{t("sn_overwhelmQ")}<textarea value={form.overwhelm} maxLength={2000} onChange={(event) => updateForm("overwhelm", event.target.value)} placeholder={t("sn_optional")} rows="3" /></label>
                <fieldset className="sensory-field"><legend>{t("sn_helpedQ")}</legend><div className="sensory-chips">{helpfulOptions.map(([key]) => <button type="button" key={key} className={form.helpful.includes(key) ? "selected" : ""} aria-pressed={form.helpful.includes(key)} onClick={() => toggleArray("helpful", key)}>{t(`helpful_${key}`)}</button>)}</div>{form.helpful.includes("other") && <label className="sensory-other-field">{t("sn_elseHelped")} <input value={form.helpfulCustom} maxLength={250} onChange={(event) => updateForm("helpfulCustom", event.target.value)} /></label>}</fieldset>
                {demoMode ? (
                  <p className="sensory-share-note">{t("sn_demoShareNote")}</p>
                ) : (
                  <>
                    <label className="sensory-field">{t("sn_needMentorQ")}<select value={form.helpRequest} onChange={(event) => updateForm("helpRequest", event.target.value)}>{mentorHelpOptions.map(([key]) => <option key={key} value={key}>{t(`mentorHelp_${key}`)}</option>)}</select></label>
                    {form.helpRequest !== "none" && !form.shared && <p className="sensory-share-note">{t("sn_requestPrivate")}</p>}
                    {form.helpRequest === "specific_mentor" && <label className="sensory-field">{t("sn_chooseMentor")}<select value={form.selectedMentorId} onChange={(event) => updateForm("selectedMentorId", event.target.value)}><option value="">{t("sn_selectMentor")}</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.display_name}</option>)}</select>{mentors.length === 0 && <small>{t("sn_noMentors")}</small>}</label>}
                    {form.helpRequest !== "none" && <label className="sensory-field">{t("sn_mentorKnow")}<textarea value={form.mentorMessage} maxLength={2000} onChange={(event) => updateForm("mentorMessage", event.target.value)} rows="3" /></label>}
                    <label className="sensory-share"><input type="checkbox" checked={form.shared} onChange={(event) => updateForm("shared", event.target.checked)} /><span><Share2 size={17} /><strong>{t("sn_shareCheckin")}</strong><small>{t(form.shared ? "sn_shareOn" : "sn_shareOff")}</small></span></label>
                    {form.shared && <p className="sensory-share-note">{t("sn_sharedVisible")}</p>}
                  </>
                )}
              </>
            )}
            {view === "quick" && <p className="sensory-private-note"><LockKeyhole size={15} /> {t(parents.length ? "sn_quickPrivateParent" : "sn_quickPrivate")}</p>}
            <button className="sensory-submit" type="submit" disabled={!form.mood || saving}>{saving ? t("sn_saving") : t(view === "quick" ? "sn_saveQuick" : "sn_saveToday")}</button>
          </form>
      </section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("sn_gentleEyebrow")}</span><h2>{t("sn_tryTitle")}</h2></div><Heart size={22} /></div><div className="sensory-suggestions">{suggestions.map((item) => <span key={item}>{item}</span>)}</div><small>{t("sn_optionalIdeas")}</small></section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("sn_recentEyebrow")}</span><h2>{t("sn_patterns")}</h2></div></div><MoodTrendChart entries={sortedEntries} label={t("sn_chartLabel")} emptyText={t("sn_chartEmpty")} legend={{ mood: t("moodLabel"), energy: t("energyLabel"), comfort: t("comfortLabel") }} />
        {sortedEntries.length >= 4 && <div className="sensory-insights">{tiredCount >= 3 && <p>{t("sn_insightTired")}</p>}{stressedCount >= 3 && <p>{t("sn_insightStressed")}</p>}{recentMoodAverage != null && recentMoodAverage > earlierMoodAverage && <p>{t("sn_insightMood")}</p>}{tiredCount < 3 && stressedCount < 3 && !(recentMoodAverage != null && recentMoodAverage > earlierMoodAverage) && <p>{t("sn_insightDefault")}</p>}</div>}
      </section>

      <section className="sensory-card"><div className="sensory-card-title"><div><span className="sensory-step">{t("sn_historyEyebrow")}</span><h2>{t("sn_prevCheckins")}</h2></div></div>
        {!sortedEntries.length ? <p className="sensory-muted">{t(parents.length ? "sn_historyEmpty" : "sn_historyEmptyPrivate")}</p> : <div className="sensory-history">{sortedEntries.map((entry) => <article key={entry.id} className="sensory-history-entry"><button type="button" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}><span><strong>{new Date(entry.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong><small>{t(`mood_${entry.mood}`)}{entry.emotions?.length ? ` · ${labelsFor(t, "emotion", entry.emotions.slice(0, 3)).join(", ")}` : ""}{entry.energy != null ? ` · ${t("sn_energyN", { n: entry.energy })}` : ` · ${t("sn_quick")}`}{shortNote(entry) ? ` · ${shortNote(entry)}` : ""}</small><em className={entry.shared_with_mentor ? "is-shared" : ""}>{t(entry.shared_with_mentor ? "sn_sharedTag" : "sn_privateTag")}</em></span>{expandedId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{expandedId === entry.id && <EntryDetail entry={entry} reply={responses.find((response) => response.checkin_id === entry.id)?.mentor_message} t={t} />}</article>)}</div>}
      </section>
    </section>
  );
}
