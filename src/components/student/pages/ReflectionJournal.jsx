import React, { useEffect, useMemo, useState } from "react";
import { BookHeart, Heart, LoaderCircle, LockKeyhole, Share2, Sparkles, Trash2 } from "lucide-react";
import { emotionOptions, moodLabels } from "../../../studentSensory";
import { createJournalReflection, deleteJournalEntry, loadJournalEntries, saveJournalEntry, setJournalEntrySharing } from "../../../studentJournal";
import "./ReflectionJournal.css";
import "./ReflectionJournalCheckin.css";

const colors = { joy: "#f5bd4f", calm: "#4ab8a6", hope: "#8b78e8", worry: "#5e8ee8", frustration: "#e77d70", tiredness: "#8d9aa8", other: "#cc83ad" };

export function ReflectionChart({ chart, t }) {
  const segments = Array.isArray(chart?.segments) ? chart.segments : [];
  const gradient = useMemo(() => {
    let start = 0;
    return segments.map(({ label, value }) => {
      const end = start + Math.max(0, value);
      const slice = `${colors[label] || colors.other} ${start}% ${end}%`;
      start = end;
      return slice;
    }).join(", ");
  }, [segments]);
  return <div className="journal-chart-wrap">
    <div className="journal-donut" style={{ "--journal-chart": `conic-gradient(${gradient || `${colors.calm} 0 100%`})` }} role="img" aria-label={t("journalChartAria")}>
      <div><Sparkles size={17} aria-hidden="true" /><strong>{t("reflectionChart")}</strong><small>{t("oneEntryOnly")}</small></div>
    </div>
    <ul className="journal-legend">{segments.map((segment) => <li key={segment.label}><span style={{ "--legend-color": colors[segment.label] || colors.other }} /><span>{t(`journal_${segment.label}`)}</span><strong>{segment.value}%</strong></li>)}</ul>
    {chart?.checkin && <div className="journal-checkin-summary"><strong>{t("journalCheckinIncluded")}</strong><span>{t(moodLabels[chart.checkin.mood - 1] || "Okay")}</span>{chart.checkin.emotions?.map((emotion) => <span key={emotion}>{t(emotionOptions.find(([key]) => key === emotion)?.[1] || "Other")}</span>)}</div>}
    {chart?.reflection && <p className="journal-reflection">{chart.reflection}</p>}
    <p className="journal-chart-disclaimer">{t("journalChartDisclaimer")}</p>
  </div>;
}

export function ReflectionJournal({ studentId, studentKey, signedIn, language, t }) {
  const [entry, setEntry] = useState("");
  const [showToSupport, setShowToSupport] = useState(false);
  const [includeCheckin, setIncludeCheckin] = useState(false);
  const [checkinMood, setCheckinMood] = useState(0);
  const [checkinEmotions, setCheckinEmotions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let live = true;
    loadJournalEntries({ studentId, studentKey }).then((rows) => { if (live) setEntries(rows); }).catch(() => { if (live) setError(t("journalLoadError")); });
    return () => { live = false; };
  }, [studentId, studentKey, t]);

  const submit = async (event) => {
    event.preventDefault();
    const text = entry.trim();
    if (!text) return;
    if (includeCheckin && !checkinMood) { setError(t("journalCheckinChooseMood")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const checkin = includeCheckin && checkinMood ? { mood: checkinMood, emotions: checkinEmotions } : null;
      const prompt = checkin
        ? `${text}\n\nOptional self-reported check-in: mood ${checkinMood}/5 (${moodLabels[checkinMood - 1]}). Selected emotions: ${checkinEmotions.map((key) => emotionOptions.find(([emotion]) => emotion === key)?.[1] || key).join(", ") || "none selected"}. Treat these as the student's own choices.`
        : text;
      let chart;
      try {
        chart = await createJournalReflection(prompt, language, checkin);
      } catch (reason) {
        setError(t(reason.code || "journalAnalysisError"));
        return;
      }
      if (checkin) chart.checkin = checkin;
      let saved;
      try {
        saved = await saveJournalEntry({ studentId: signedIn ? studentId : null, studentKey, entry: text, chart, showToSupport: Boolean(signedIn && studentId && showToSupport) });
      } catch {
        setError(t("journalSaveError"));
        return;
      }
      setEntries((current) => [saved, ...current]);
      setEntry(""); setShowToSupport(false); setIncludeCheckin(false); setCheckinMood(0); setCheckinEmotions([]);
      setNotice(saved.local_only ? t("journalSavedOffline") : chart.method === "local" ? t("journalSavedLocalChart") : t("journalSaved"));
    } catch {
      setError(t("journalUnavailable"));
    } finally { setBusy(false); }
  };

  const changeSharing = async (item) => {
    if (!studentId) return;
    setError("");
    try {
      const updated = await setJournalEntrySharing(item.id, studentId, !item.show_to_support);
      setEntries((current) => current.map((entryItem) => entryItem.id === item.id ? updated : entryItem));
    } catch { setError(t("journalSharingError")); }
  };

  const remove = async (item) => {
    try {
      await deleteJournalEntry(item.id, studentId, studentKey);
      setEntries((current) => current.filter((entryItem) => entryItem.id !== item.id));
    } catch { setError(t("journalDeleteError")); }
  };

  return <div className="reflection-journal">
    <header className="journal-heading"><span className="journal-heading-icon"><BookHeart size={25} /></span><div><p className="journal-eyebrow">{t("journalEyebrow")}</p><h1>{t("journalTitle")}</h1><p>{t("journalIntro")}</p></div></header>
    {!signedIn && <div className="journal-signin-note"><LockKeyhole size={18} />{t("journalSignInRequired")}</div>}
    <section className="journal-compose">
      <form onSubmit={submit}>
        <label htmlFor="journal-entry">{t("journalPrompt")}</label>
        <textarea id="journal-entry" value={entry} onChange={(event) => setEntry(event.target.value)} maxLength={3000} placeholder={t("journalPlaceholder")} disabled={!signedIn || busy} />
        <label className="journal-checkin-toggle"><input type="checkbox" checked={includeCheckin} onChange={(event) => setIncludeCheckin(event.target.checked)} disabled={!signedIn || busy} /><span><strong>{t("journalIncludeCheckin")}</strong><small>{t("journalCheckinHint")}</small></span></label>
        {includeCheckin && <fieldset className="journal-checkin-fields" disabled={!signedIn || busy}><legend>{t("journalCheckinPrompt")}</legend><div className="journal-mood-options">{moodLabels.map((mood, index) => <button type="button" key={mood} aria-pressed={checkinMood === index + 1} className={checkinMood === index + 1 ? "selected" : ""} onClick={() => setCheckinMood(index + 1)}><span aria-hidden="true">{["☹", "🙁", "◉", "🙂", "☺"][index]}</span>{t(mood)}</button>)}</div>{!checkinMood && <small>{t("journalCheckinChooseMood")}</small>}<div className="journal-emotion-list" aria-label={t("What emotions are you feeling?")}>{emotionOptions.map(([key, label]) => <button type="button" key={key} aria-pressed={checkinEmotions.includes(key)} className={checkinEmotions.includes(key) ? "selected" : ""} onClick={() => setCheckinEmotions((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}>{t(label)}</button>)}</div></fieldset>}
        <div className="journal-compose-footer"><span>{entry.length}/3000</span><button type="submit" disabled={!signedIn || busy || !entry.trim() || (includeCheckin && !checkinMood)}>{busy ? <><LoaderCircle size={17} className="journal-spinner" />{t("journalThinking")}</> : <><Sparkles size={17} />{t("createJournalChart")}</>}</button></div>
        <p className="journal-ai-note">{t("journalAiDisclosure")}</p>
        <label className="journal-share-option"><input type="checkbox" checked={showToSupport} onChange={(event) => setShowToSupport(event.target.checked)} disabled={!studentId || !signedIn || busy} /><span><strong><Share2 size={16} />{t("showToSupport")}</strong><small>{t(studentId ? "showToSupportHint" : "showToSupportDemoHint")}</small></span></label>
      </form>
      {error && <p role="alert" className="journal-alert">{error}</p>}{notice && <p role="status" className="journal-notice">{notice}</p>}
    </section>
    <section className="journal-history"><div className="journal-history-heading"><div><p className="journal-eyebrow">{t("journalKeepsake")}</p><h2>{t("yourReflections")}</h2></div><Heart size={21} aria-hidden="true" /></div>
      {!entries.length ? <p className="journal-empty">{t("journalEmpty")}</p> : <div className="journal-entry-list">{entries.map((item) => <article className="journal-entry-card" key={item.id}>
        <div className="journal-entry-top"><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(document.documentElement.lang || undefined, { dateStyle: "medium" })}</time><span className={item.show_to_support ? "journal-shared" : "journal-private"}>{item.show_to_support ? t("sharedWithSupport") : t("privateToYou")}</span><button type="button" className="journal-delete" aria-label={t("deleteJournalEntry")} onClick={() => remove(item)}><Trash2 size={17} /></button></div>
        <p className="journal-entry-text">{item.entry}</p><ReflectionChart chart={item.chart} t={t} />
        {studentId && !item.local_only && <label className="journal-entry-share"><input type="checkbox" checked={item.show_to_support} onChange={() => changeSharing(item)} /><span>{t("showThisEntryToSupport")}</span></label>}
      </article>)}</div>}
    </section>
  </div>;
}
