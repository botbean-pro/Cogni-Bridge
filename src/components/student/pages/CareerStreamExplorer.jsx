import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, ChevronRight, Compass, Flag, GraduationCap, Heart, Landmark, Lightbulb, LifeBuoy, Shuffle, Sparkles } from "lucide-react";
import { careerKey, careerStreams, findCareer, mixAxes, roadmapStages, skillKey, streamKey } from "./careerStreams";
import { institutionsFor, streamPlaces } from "./careerUniversities";
import "./CareerStreamExplorer.css";

const stageIcons = [Lightbulb, GraduationCap, BriefcaseBusiness, Flag];
const burstPieces = Array.from({ length: 14 }, (_, index) => index);

// The page shows less motion for people who asked for it in Accessibility or in their system settings.
const isCalmMotion = () => {
  const root = document.documentElement.dataset;
  return root.motion === "off" || root.motion === "reduced" || root.lowSensory === "true"
    || Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
};

// A student's dream career is only a preference, so it stays in this browser, per student.
const dreamStorageKey = (email) => `cognibridge_career_dream:${encodeURIComponent(String(email).trim().toLowerCase())}`;
const readDream = (email) => {
  if (!email) return null;
  try {
    const id = localStorage.getItem(dreamStorageKey(email));
    return findCareer(id) ? id : null;
  } catch {
    return null;
  }
};
const writeDream = (email, careerId) => {
  if (!email) return;
  try {
    if (careerId) localStorage.setItem(dreamStorageKey(email), careerId);
    else localStorage.removeItem(dreamStorageKey(email));
  } catch {
    // Private windows can block storage; the dream still shows until the page is closed.
  }
};

// Roadmap stages fade in as they scroll into view; calm settings show them all straight away.
function useStageReveal(listRef, careerId) {
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const stages = [...list.querySelectorAll(".cx-stage")];
    if (isCalmMotion() || !("IntersectionObserver" in window)) {
      stages.forEach((stage) => stage.classList.add("is-in"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }), { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    stages.forEach((stage) => observer.observe(stage));
    return () => observer.disconnect();
  }, [listRef, careerId]);
}

// Links to the universities, institutes and official portals for a career or a whole stream.
// They open the institution's own website in a new tab.
function UniversityLinks({ t, id, places, portals }) {
  if (!places.length && !portals.length) return null;
  const label = (item) => `${item.name}, ${item.place}. ${t("cs_visitSite")} (${t("opens in a new tab")})`;
  return (
    <section className="cx-unis" aria-labelledby={id}>
      <h3 id={id}><Landmark size={18} aria-hidden="true" /> {t("cs_unis")}</h3>
      <p className="cx-unis-copy">{t("cs_unisCopy")}</p>
      <ul className="cx-uni-grid">
        {places.map((item, index) => (
          <li key={item.id} className="cx-rise" style={{ "--i": index }}>
            <a className="cx-uni" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={label(item)}>
              <span className="cx-uni-icon" aria-hidden="true"><GraduationCap size={20} /></span>
              <span className="cx-uni-text">
                <strong>{item.name}</strong>
                <small>{item.place}</small>
              </span>
              <ArrowUpRight className="cx-uni-go" size={18} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      {portals.length > 0 && (
        <>
          <h4>{t("cs_portals")}</h4>
          <ul className="cx-portals">
            {portals.map((item) => (
              <li key={item.id}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={label(item)}>{item.name} <ArrowUpRight size={14} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function CareerStreamExplorer({ t, studentEmail, onOpenQuiz }) {
  const [streamId, setStreamId] = useState(null);
  const [careerId, setCareerId] = useState(null);
  const [dreamId, setDreamId] = useState(() => readDream(studentEmail));
  const [burst, setBurst] = useState(0);
  const [status, setStatus] = useState("");
  const [motion] = useState(() => !isCalmMotion());
  const rootRef = useRef(null);
  const headingRef = useRef(null);
  const timelineRef = useRef(null);

  const stream = careerStreams.find((item) => item.id === streamId) || null;
  const career = stream?.careers.find((item) => item.id === careerId) || null;
  const step = career ? 3 : stream ? 2 : 1;
  const dream = dreamId ? findCareer(dreamId) : null;
  const isDream = Boolean(career && dreamId === career.id);
  const viewKey = `${streamId}|${careerId}`;
  const lastView = useRef(viewKey);

  useEffect(() => { setDreamId(readDream(studentEmail)); }, [studentEmail]);
  useStageReveal(timelineRef, career?.id);

  // Moving between steps brings the new heading into view and tells screen readers where they are.
  // Comparing against the last view (not "first render") keeps StrictMode's double effect from stealing focus on load.
  useEffect(() => {
    if (lastView.current === viewKey) return;
    lastView.current = viewKey;
    rootRef.current?.scrollIntoView({ block: "start", behavior: isCalmMotion() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [viewKey]);

  const goToStep = (target) => {
    if (target === 1) { setStreamId(null); setCareerId(null); }
    if (target === 2) setCareerId(null);
  };
  const openStream = (id) => { setStreamId(id); setCareerId(null); };
  const surprise = () => {
    const options = stream.careers.filter((item) => item.id !== careerId);
    setCareerId(options[Math.floor(Math.random() * options.length)].id);
  };
  const openDream = () => {
    if (!dream) return;
    setStreamId(dream.stream.id);
    setCareerId(dream.career.id);
  };
  const toggleDream = () => {
    const next = isDream ? null : career.id;
    setDreamId(next);
    writeDream(studentEmail, next);
    setStatus(next ? t("cs_dreamCelebrate", { career: t(careerKey(career.id)) }) : t("cs_dreamCleared"));
    if (next && !isCalmMotion()) setBurst((count) => count + 1);
  };

  const stepItems = [
    { label: t("cs_step1"), value: stream && t(streamKey(stream.id)) },
    { label: t("cs_step2"), value: career && t(careerKey(career.id)) },
    { label: t("cs_step3"), value: null },
  ];

  return (
    <section ref={rootRef} className={`cx-root cx-tone-${stream?.tone || "teal"}${motion ? " cx-motion" : ""}`}>
      <p className="cx-sr" role="status" aria-live="polite">{status}</p>

      <ol className="cx-steps" aria-label={t("cs_stepsLabel")}>
        {stepItems.map((item, index) => {
          const number = index + 1;
          const state = number === step ? "current" : number < step ? "done" : "todo";
          return (
            <li key={number} className={`cx-step is-${state}`}>
              <button type="button" disabled={state === "todo"} aria-current={state === "current" ? "step" : undefined} onClick={() => state === "done" && goToStep(number)}>
                <span className="cx-step-badge">{state === "done" ? <Check size={14} aria-hidden="true" /> : number}</span>
                <span className="cx-step-text">
                  <small>{item.label}</small>
                  {item.value && <strong>{item.value}</strong>}
                </span>
              </button>
              {number < stepItems.length && <ChevronRight className="cx-step-arrow" size={16} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {dream && !isDream && (
        <div className="cx-dream-banner">
          <Heart size={16} fill="currentColor" aria-hidden="true" />
          <span>{t("cs_dreamBanner", { career: t(careerKey(dream.career.id)) })}</span>
          <button type="button" onClick={openDream}>{t("cs_seeRoadmap")} <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      )}

      {step === 1 && (
        <div className="cx-view">
          <header className="cx-hero">
            <div className="cx-hero-orbit" aria-hidden="true">
              {careerStreams.map(({ id, Icon }, index) => <span key={id} style={{ "--n": index }}><Icon size={22} /></span>)}
            </div>
            <div className="cx-hero-copy">
              <p className="cx-eyebrow"><Compass size={14} aria-hidden="true" /> {t("cs_step1")} · 1/3</p>
              <h2 ref={headingRef} tabIndex={-1}>{t("cs_heroTitle")}</h2>
              <p>{t("cs_heroCopy")}</p>
            </div>
          </header>
          <div className="cx-stream-grid">
            {careerStreams.map((item, index) => (
              <button key={item.id} type="button" className={`cx-stream cx-tone-${item.tone} cx-rise`} style={{ "--i": index }} onClick={() => openStream(item.id)}>
                <span className="cx-stream-art" aria-hidden="true">
                  <item.Icon size={46} strokeWidth={1.6} />
                  <span className="cx-stream-count">{t("cs_careersCount", { n: item.careers.length })}</span>
                </span>
                <span className="cx-stream-body">
                  <span className="cx-stream-name">{t(streamKey(item.id))}</span>
                  <span className="cx-stream-subjects">{t(streamKey(item.id, "_sub"))}</span>
                  <span className="cx-stream-tag">{t(streamKey(item.id, "_tag"))}</span>
                  <span className="cx-stream-foot">
                    <span className="cx-minis" aria-hidden="true">
                      {item.careers.map(({ id, Icon }) => <span key={id}><Icon size={14} /></span>)}
                    </span>
                    <span className="cx-go" aria-hidden="true"><ArrowRight size={17} /></span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          {onOpenQuiz && (
            <p className="cx-quiz-nudge">
              {t("cs_notSure")}
              <button type="button" onClick={onOpenQuiz}><Sparkles size={15} aria-hidden="true" /> {t("cs_tryQuiz")}</button>
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="cx-view">
          <header className="cx-banner">
            <span className="cx-banner-icon" aria-hidden="true"><stream.Icon size={30} strokeWidth={1.7} /></span>
            <div className="cx-banner-copy">
              <p className="cx-eyebrow">{t(streamKey(stream.id, "_sub"))}</p>
              <p className="cx-banner-name">{t(streamKey(stream.id))}</p>
              <p>{t(streamKey(stream.id, "_tag"))}</p>
            </div>
            <div className="cx-banner-actions">
              <button type="button" onClick={() => goToStep(1)}><ArrowLeft size={16} aria-hidden="true" /> {t("cs_changeStream")}</button>
              <button type="button" onClick={surprise}><Shuffle size={16} aria-hidden="true" /> {t("cs_surprise")}</button>
            </div>
          </header>
          <div className="cx-section-head">
            <h2 ref={headingRef} tabIndex={-1}>{t("cs_pickTitle")}</h2>
            <p>{t("cs_pickCopy")}</p>
          </div>
          <div className="cx-career-grid">
            {stream.careers.map((item, index) => (
              <button key={item.id} type="button" className="cx-career cx-rise" style={{ "--i": index }} onClick={() => setCareerId(item.id)}>
                <span className="cx-career-top">
                  <span className="cx-career-icon" aria-hidden="true"><item.Icon size={24} strokeWidth={1.8} /></span>
                  {dreamId === item.id && <span className="cx-career-heart"><Heart size={15} fill="currentColor" aria-hidden="true" /><span className="cx-sr">{t("cs_dreamSaved")}</span></span>}
                </span>
                <span className="cx-career-name">{t(careerKey(item.id))}</span>
                <span className="cx-career-tag">{t(careerKey(item.id, "_s"))}</span>
                <span className="cx-chips" aria-hidden="true">
                  {item.skills.slice(0, 3).map((skill) => <span key={skill}>{t(skillKey(skill))}</span>)}
                </span>
                <span className="cx-career-cta">{t("cs_seeRoadmap")} <ArrowRight size={15} aria-hidden="true" /></span>
              </button>
            ))}
          </div>
          <UniversityLinks t={t} id="cx-stream-unis" places={streamPlaces(stream.id)} portals={[]} />
        </div>
      )}

      {step === 3 && (
        <div className="cx-view" key={career.id}>
          <header className="cx-detail-hero">
            <career.Icon className="cx-detail-watermark" size={210} strokeWidth={1} aria-hidden="true" />
            <span className="cx-detail-icon" aria-hidden="true"><career.Icon size={38} strokeWidth={1.7} /></span>
            <div className="cx-detail-copy">
              <p className="cx-eyebrow">{t(streamKey(stream.id))}</p>
              <h2 ref={headingRef} tabIndex={-1}>{t(careerKey(career.id))}</h2>
              <p>{t(careerKey(career.id, "_s"))}</p>
              <div className="cx-detail-actions">
                <span className="cx-dream-wrap">
                  <button type="button" className={`cx-dream-btn${isDream ? " is-saved" : ""}`} aria-pressed={isDream} title={isDream ? t("cs_dreamRemove") : undefined} onClick={toggleDream}>
                    {isDream ? <Check size={17} aria-hidden="true" /> : <Heart size={17} aria-hidden="true" />}
                    {isDream ? t("cs_dreamSaved") : t("cs_dreamSet")}
                  </button>
                  {burst > 0 && (
                    <span className="cx-burst" key={burst} aria-hidden="true">
                      {burstPieces.map((piece) => <i key={piece} style={{ "--a": `${piece * (360 / burstPieces.length)}deg`, "--d": `${72 + (piece % 3) * 24}px` }} />)}
                    </span>
                  )}
                </span>
                <button type="button" className="cx-ghost-btn" onClick={() => goToStep(2)}><ArrowLeft size={16} aria-hidden="true" /> {t("cs_backToCareers")}</button>
              </div>
              {isDream && studentEmail && <p className="cx-dream-note">{t("cs_dreamNote")}</p>}
            </div>
          </header>

          <div className="cx-detail-grid">
            <section className="cx-roadmap" aria-labelledby="cx-roadmap-title">
              <h3 id="cx-roadmap-title">{t("cs_roadmap")}</h3>
              <ol className="cx-timeline" ref={timelineRef}>
                {roadmapStages.map((stage, index) => {
                  const StageIcon = stageIcons[index];
                  return (
                    <li key={stage} className="cx-stage" style={{ "--i": index }}>
                      <span className="cx-node" aria-hidden="true">{stage === roadmapStages.length ? <Flag size={19} /> : stage}</span>
                      <div className="cx-stage-card">
                        <p className="cx-stage-label"><StageIcon size={14} aria-hidden="true" /> {t(`cs_stage${stage}`)}</p>
                        <p className="cx-stage-text">{t(careerKey(career.id, `_r${stage}`))}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <aside className="cx-side">
              <section className="cx-panel">
                <h3>{t("cs_skills")}</h3>
                <ul className="cx-chips cx-chips-lg">
                  {career.skills.map((skill) => <li key={skill}>{t(skillKey(skill))}</li>)}
                </ul>
              </section>
              <section className="cx-panel">
                <h3>{t("cs_mix")}</h3>
                <ul className="cx-mix">
                  {mixAxes.map((axis, index) => {
                    const label = t(axis.labelKey);
                    const level = career.mix[index];
                    return (
                      <li key={axis.id}>
                        <span>{label}</span>
                        <span className="cx-meter" role="img" aria-label={t("cs_mixLevel", { label, n: level })}>
                          {[1, 2, 3, 4, 5].map((segment) => <i key={segment} className={segment <= level ? "on" : ""} style={{ "--s": segment }} />)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <section className="cx-panel">
                <h3>{t("cs_routes")}</h3>
                <ul className="cx-chips cx-chips-lg cx-routes">
                  {career.routes.map((route) => <li key={route}>{route.startsWith("cs_") ? t(route) : route}</li>)}
                </ul>
              </section>
              <section className="cx-panel cx-try">
                <h3><Sparkles size={16} aria-hidden="true" /> {t("cs_tryWeek")}</h3>
                <p>{t(careerKey(career.id, "_try"))}</p>
              </section>
              <section className="cx-panel cx-support">
                <h3><LifeBuoy size={16} aria-hidden="true" /> {t("cs_supportTitle")}</h3>
                <p>{t("cs_supportCopy")}</p>
              </section>
            </aside>
          </div>
          <UniversityLinks t={t} id="cx-career-unis" {...institutionsFor(career.id)} />
          <p className="cx-note">{t("Pathways vary by country, role, and employer. Check local official requirements for the career you choose.")}</p>
        </div>
      )}
    </section>
  );
}
