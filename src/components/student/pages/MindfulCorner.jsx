import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LogIn, Pause, Play, RotateCcw, Settings2, X } from 'lucide-react';
import { mergeMindfulProgress, mindfulNote, readCuriousCluesProgress, readMindfulBoard, recordCuriousCluesLevel, recordMindfulActivity } from '../../../mindfulPoints';
import { loadMindfulProgress, saveMindfulProgress } from '../../../mindfulProgress';
import { curiousClueLevels, shuffleClueQuestions } from '../../../curiousClues';
import { mindfulActivityPath, normalizePath, studentTabPaths } from '../../../routes';
import { stopSpeaking } from '../flow/readAloud';
import { speakQuietInstructions } from './quietCornerVoice';
import './MindfulCorner.css';

const activities = [
  { id: 'bubbles', path: 'bubble-pop', title: 'Gentle Bubble Pop', icon: '🫧', group: 'Play', note: 'Pop bubbles at your own pace.' },
  { id: 'breathing', path: 'breathing-buddy', title: 'Breathing Buddy', icon: '🌈', group: 'Relax', note: 'Follow a gentle visual cue, or watch colors change.' },
  { id: 'garden', path: 'sensory-garden', title: 'Sensory Garden', icon: '🌻', group: 'Create', note: 'Choose an object, then choose where it goes.' },
  { id: 'color', path: 'color-and-create', title: 'Color and Create', icon: '🎨', group: 'Create', note: 'Fill a simple picture with color.' },
  { id: 'match', path: 'match-the-pictures', title: 'Match the Pictures', icon: '🧩', group: 'Play', note: 'Find pairs. There is no timer.' },
  { id: 'clues', path: 'curious-clues', title: 'Curious Clues', icon: '🧠', group: 'Explore', note: 'Explore 12 original puzzle levels. No timer, no pressure.' },
];
const activityTitleKeys = { bubbles: 'mcBubblesTitle', breathing: 'mcBreathingTitle', garden: 'mcGardenTitle', color: 'mcColorTitle', match: 'mcMatchTitle', clues: 'mcCluesTitle' };
const activityNoteKeys = { bubbles: 'mcBubblesNote', breathing: 'mcBreathingNote', garden: 'mcGardenNote', color: 'mcColorNote', match: 'mcMatchNote', clues: 'mcCluesNote' };
const initialSettings = { text: 'Standard', motion: true, theme: 'Calm', instructions: 'Text' };
const readSettings = () => { try { const saved = JSON.parse(localStorage.getItem('mindful-corner-settings') || '{}'); return { ...initialSettings, motion: typeof saved.motion === 'boolean' ? saved.motion : !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, ...saved }; } catch { return initialSettings; } };
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
// Match the Pictures grows one grid at a time (columns × rows). Odd grids keep one empty middle space.
const matchLevels = [[2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 5], [6, 6]];
const matchPictures = ['🐢', '🌙', '🐟', '🌼', '🍎', '⭐', '🦋', '🌈', '🐝', '🍀', '🐱', '🎈', '🍓', '🐘', '🌻', '🚲', '🐧', '🍉'];
const dealMatchCards = (level) => {
  const [columns, rows] = matchLevels[level];
  const pairs = Math.floor((columns * rows) / 2);
  const cards = shuffle(shuffle(matchPictures).slice(0, pairs).flatMap((icon) => [icon, icon])).map((icon, i) => ({ icon, id: i, open: false, found: false }));
  if (cards.length < columns * rows) cards.splice(Math.floor(cards.length / 2), 0, { id: 'gap', gap: true });
  return cards;
};
export function MindfulCorner({ studentId = '', accountId = null, signedIn = false, onSignIn, onClose, onAward, t = (key) => key }) {
  const [settings, setSettings] = useState(readSettings);
  // Each activity has its own URL (/mindful-corner/color-and-create, ...) so refresh and back keep it open.
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const requestedPath = normalizePath(pathname).match(/^\/mindful-corner\/([^/]+)$/)?.[1];
  const activity = activities.find((item) => item.path === requestedPath)?.id || '';
  const setActivity = (id) => navigate(id ? mindfulActivityPath(activities.find((item) => item.id === id).path) : studentTabPaths.mindful);
  const [category, setCategory] = useState('All');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [board, setBoard] = useState(() => readMindfulBoard(studentId));
  const [clueProgress, setClueProgress] = useState(() => readCuriousCluesProgress(studentId, curiousClueLevels.length));
  const [lastNote, setLastNote] = useState(() => { const entry = readMindfulBoard(studentId).entries[0]; return entry ? { entry } : null; });
  useEffect(() => { try { localStorage.setItem('mindful-corner-settings', JSON.stringify(settings)); } catch { /* Settings remain active for this visit. */ } }, [settings]);
  useEffect(() => { const next = readMindfulBoard(studentId); setBoard(next); setLastNote(next.entries[0] ? { entry: next.entries[0] } : null); }, [studentId]);
  useEffect(() => { setClueProgress(readCuriousCluesProgress(studentId, curiousClueLevels.length)); }, [studentId]);
  // With an account, pull the saved level/points so they follow the student, then push back anything only this browser had.
  useEffect(() => {
    if (!accountId) return undefined;
    let current = true;
    loadMindfulProgress(accountId).then((remote) => {
      if (!current) return;
      const merged = mergeMindfulProgress(studentId, remote, curiousClueLevels.length);
      setBoard(merged.board); setClueProgress(merged.clues); setLastNote((note) => note || (merged.board.entries[0] ? { entry: merged.board.entries[0] } : null));
      onAward?.();
      return saveMindfulProgress(accountId, merged.board, merged.clues);
    }).catch(() => { /* Progress stays in this browser and syncs on the next visit. */ });
    return () => { current = false; };
  }, [studentId, accountId]);
  const syncProgress = () => {
    if (!accountId) return;
    saveMindfulProgress(accountId, readMindfulBoard(studentId), readCuriousCluesProgress(studentId, curiousClueLevels.length)).catch(() => { /* Retried on the next visit. */ });
  };
  const awardActivity = (activityId, completed) => { const result = recordMindfulActivity(studentId, activities.find((item) => item.id === activityId)?.title || 'Mindful Corner', completed); const note = { entry: result.entry, level: result.level > board.level ? result.level : null }; setBoard({ points: result.points, entries: result.entries, activitiesPlayed: result.activitiesPlayed, level: result.level }); setLastNote(note); syncProgress(); onAward?.(result); return noteText(note); };
  const noteText = (note) => note && [mindfulNote(t, note.entry), note.level && t('Level up! You are now Level {level}.', { level: note.level })].filter(Boolean).join(' ');
  const update = (key, value) => setSettings((old) => ({ ...old, [key]: value }));
  const leaveActivity = () => { if (activity) awardActivity(activity, false); setActivity(''); };
  const completeClueLevel = (completedLevel) => { setClueProgress(recordCuriousCluesLevel(studentId, completedLevel, curiousClueLevels.length)); syncProgress(); };
  const selected = activities.find((item) => item.id === activity);
  const visibleActivities = activities.filter((item) => (category === 'All' || item.group === category));
  return <div className={`mindful-corner theme-${settings.theme.toLowerCase().replace(' ', '-')} text-${settings.text.toLowerCase().replace(' ', '-')}${!settings.motion ? ' reduced-motion' : ''}`}>
    <header className="mc-top">
      <button className="mc-home" onClick={() => activity ? leaveActivity() : onClose?.()} type="button"><ArrowLeft size={18}/>{activity ? t('mcBackToActivities') : t('home')}</button>
      <span className="mc-stats">
        <span aria-label={`${t('mcLevel')} ${board.level}`}>{t('mcLevel')} {board.level}</span>
        <span aria-label={`${board.points} ${t('cogniPoints')}`}>{board.points} {t('cogniPoints')}</span>
      </span>
      <button className="mc-settings-button" type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}><Settings2 size={18}/> {t('mcAccessSettings')}</button>
    </header>
    {settingsOpen && <section className="mc-settings" aria-label={t('mcAccessibilitySettings')}><div className="mc-settings-head"><h2>{t('mcMakeSpaceYours')}</h2><button type="button" onClick={() => setSettingsOpen(false)} aria-label={t('close')}><X size={18}/></button></div><label>{t('mcTextSize')}<select value={settings.text} onChange={(e) => update('text', e.target.value)}><option value="Standard">{t('mcStandard')}</option><option value="Large">{t('mcLarge')}</option><option value="Extra Large">{t('mcExtraLarge')}</option></select></label><label>{t('mcAnimation')}<select value={settings.motion ? 'On' : 'Reduced / off'} onChange={(e) => update('motion', e.target.value === 'On')}><option value="On">{t('mcOn')}</option><option value="Reduced / off">{t('mcReducedOff')}</option></select></label><label>{t('mcVisualTheme')}<select value={settings.theme} onChange={(e) => update('theme', e.target.value)}><option value="Calm">{t('mcCalm')}</option><option value="High Contrast">{t('mcHighContrast')}</option><option value="Colorful">{t('mcColorful')}</option></select></label><label>{t('mcInstructions')}<select value={settings.instructions} onChange={(e) => update('instructions', e.target.value)}><option value="Text">{t('mcText')}</option><option value="Optional Audio">{t('mcOptionalAudio')}</option><option value="Both">{t('mcBoth')}</option></select></label><p>{t('mcAudioPrivacy')}</p></section>}
    {!signedIn ? <section className="mc-intro mc-signin-gate">
      <h1>{t('mcSignInRequiredTitle')}</h1>
      <p>{t('mcSignInRequiredDescription')}</p>
      <button type="button" className="mc-primary" onClick={onSignIn}><LogIn size={18}/> {t('mcSignInToPlay')}</button>
    </section> : !activity ? <>
      <section className="mc-intro">
        <h1>{t('mcTitle')}</h1>
        <p>{t('mcWelcomeDescription')} {t('mcNoScore')}</p>
      </section>
      {lastNote && <p className="mc-latest-note" role="status">{noteText(lastNote)}</p>}
      <section className="mc-activity-section" id="mc-activities">
        <div className="mc-section-head">
          <div className="mc-filters" aria-label={t('mcActivityCategories')}>{['All', 'Relax', 'Create', 'Explore', 'Play'].map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{t(`mcCategory${item}`)}</button>)}</div>
        </div>
        <ul className="mc-grid">{visibleActivities.map((item) => <li key={item.id}><button type="button" className="mc-card" onClick={() => setActivity(item.id)}>
          <span className="mc-card-icon" aria-hidden="true">{item.icon}</span>
          <span className="mc-card-copy"><strong>{t(activityTitleKeys[item.id])}</strong><small>{t(activityNoteKeys[item.id])}</small></span>
        </button></li>)}</ul>
      </section>
    </> : <GameScreen key={activity} activity={{ ...selected, title: t(activityTitleKeys[selected.id]), group: t(`mcCategory${selected.group}`), note: t(activityNoteKeys[selected.id]) }} settings={settings} t={t} clueProgress={clueProgress} onCompleteClueLevel={completeClueLevel} onAward={awardActivity} onExit={() => setActivity('')} />}
  </div>;
}

function GameScreen({ activity, settings, t, clueProgress, onCompleteClueLevel, onAward, onExit }) {
  const [status, setStatus] = useState('');
  const [popped, setPopped] = useState([]);
  const [resultNote, setResultNote] = useState('');
  const [paused, setPaused] = useState(false);
  const [popCount, setPopCount] = useState(0);
  const [phase, setPhase] = useState('Ready when you are');
  const [breathing, setBreathing] = useState(false);
  const [objects, setObjects] = useState([]);
  const [thing, setThing] = useState('🌼');
  const [color, setColor] = useState('#f6c85f');
  const [tiles, setTiles] = useState(Array(9).fill(''));
  const [matchLevel, setMatchLevel] = useState(0);
  const [cards, setCards] = useState(() => dealMatchCards(0));
  const [first, setFirst] = useState(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const matchTimer = React.useRef(null);
  const resultSaved = React.useRef(false);
  const [activeClueLevel, setActiveClueLevel] = useState(null);
  const [clueQuestions, setClueQuestions] = useState([]);
  const [clueRound, setClueRound] = useState(0);
  const [clueSolved, setClueSolved] = useState(false);
  const [clueHintOpen, setClueHintOpen] = useState(false);
  const [clueLevelComplete, setClueLevelComplete] = useState(false);
  const [garden, setGarden] = useState('Garden');
  const matchPairs = cards.filter((c) => !c.gap).length / 2;
  const matchCount = cards.filter((c) => c.found).length / 2;
  const matchDone = matchCount === matchPairs;
  const startMatchLevel = (level) => { window.clearTimeout(matchTimer.current); setMatchLevel(level); setCards(dealMatchCards(level)); setFirst(null); setCardsLocked(false); setStatus(''); };
  const currentClue = clueQuestions[clueRound];
  const finishActivity = (completed) => {
    if (resultSaved.current) return;
    resultSaved.current = true;
    const note = onAward(activity.id, completed);
    setResultNote(note);
    setStatus(note);
  };
  const startClueLevel = (level) => {
    setActiveClueLevel(level);
    setClueQuestions(shuffleClueQuestions(curiousClueLevels[level - 1].questions));
    setClueRound(0);
    setClueSolved(false);
    setClueHintOpen(false);
    setClueLevelComplete(false);
    setResultNote('');
    setStatus('');
    resultSaved.current = false;
  };
  const exitActivity = () => { if (!resultSaved.current) finishActivity(false); onExit(); };
  useEffect(() => { if (activity.id === 'match' && matchDone) finishActivity(true); }, [activity.id, matchDone]);
  useEffect(() => { if (!breathing || paused || !settings.motion) return undefined; const id = window.setInterval(() => setPhase((p) => p === 'Breathe in' ? 'Breathe out' : 'Breathe in'), 5000); return () => window.clearInterval(id); }, [breathing, paused, settings.motion]);
  // Let spoken instructions finish if the student navigates to another app tab.
  useEffect(() => () => { window.clearTimeout(matchTimer.current); }, []);
  const reset = () => {
    if (activity.id === 'clues' && activeClueLevel) {
      startClueLevel(activeClueLevel);
      return;
    }
    window.clearTimeout(matchTimer.current);
    resultSaved.current = false;
    setResultNote('');
    setCardsLocked(false);
    setStatus('');
    setPaused(false);
    setPopped([]);
    setPopCount(0);
    setBreathing(false);
    setObjects([]);
    setTiles(Array(9).fill(''));
    setCards(dealMatchCards(matchLevel));
    setFirst(null);
    setActiveClueLevel(null);
    setClueQuestions([]);
    setClueRound(0);
    setClueSolved(false);
    setClueHintOpen(false);
    setClueLevelComplete(false);
  };
  const pickCard = (card) => { if (card.open || card.found || paused || cardsLocked) return; if (first == null) { setFirst(card.id); setCards((cs) => cs.map((c) => c.id === card.id ? { ...c, open: true } : c)); return; } const a = cards.find((c) => c.id === first); const next = cards.map((c) => c.id === card.id || c.id === first ? { ...c, open: true } : c); if (a?.icon === card.icon) { next.forEach((c) => { if (c.id === card.id || c.id === first) c.found = true; }); setStatus(t('A pair! Great exploring.')); setCards(next); setFirst(null); } else { setStatus(t("Let's try another one!")); setCards(next); setFirst(null); setCardsLocked(true); matchTimer.current = window.setTimeout(() => { setCards((current) => current.map((c) => c.found ? c : { ...c, open: false })); setCardsLocked(false); }, 900); } };
  const speakInstructions = () => {
    const pageLanguage = (document.documentElement.lang || 'en-IN').toLowerCase();
    const text = `${activity.title}. ${activity.note}`;
    stopSpeaking();
    if (!window.speechSynthesis && !window.Audio) { setStatus(t('Audio instructions are not available in this browser. You can read the text instructions.')); return; }
    speakQuietInstructions(text, pageLanguage);
  };
  return <section className="mc-game"><div className="mc-game-heading"><div><p className="mc-game-group">{activity.group}</p><h1>{activity.title}</h1><p>{activity.note}</p>{settings.instructions !== 'Text' && <button type="button" onClick={speakInstructions}>{t('Hear instructions')}</button>}</div><button type="button" className="mc-exit" onClick={exitActivity}><ArrowLeft size={17}/> {t('Exit activity')}</button></div><div className="mc-play-area">
    {activity.id === 'bubbles' && <div className="mc-bubbles"><p>{t('Tap any bubble. No rush.')}</p><div className="mc-bubble-row">{Array.from({ length: 6 }, (_, i) => <button key={i} type="button" className={popped.includes(i) ? 'is-popped' : ''} aria-label={popped.includes(i) ? t('Bubble {n} popped', { n: i + 1 }) : t('Pop bubble {n}', { n: i + 1 })} aria-pressed={popped.includes(i)} disabled={popped.includes(i)} onClick={() => { const next = [...popped, i]; setPopped(next); setPopCount(next.length); if (next.length === 6) finishActivity(true); else setStatus(t('Pop! Nice exploring.')); }}>{['○','◯','◌','◉','◎','◦'][i]}</button>)}</div><p aria-live="polite">{status || t('{count} of 6 bubbles popped', { count: popCount })}</p></div>}
    {activity.id === 'breathing' && <div className="mc-breath"><p aria-live="polite">{breathing && !paused ? t(phase) : paused ? t('Paused') : t('Ready when you are')}</p><div className={`mc-breath-orb${breathing && !paused && settings.motion ? ` ${phase === 'Breathe in' ? 'grow' : 'shrink'}` : ''}`} aria-hidden="true">{breathing && !paused ? '☁' : '☼'}</div><div className="mc-controls"><button type="button" aria-pressed={breathing && !paused} onClick={() => { if (!breathing) { setBreathing(true); setPaused(false); setPhase('Breathe in'); return; } setPaused((p) => !p); }}>{breathing && !paused ? <Pause size={16}/> : <Play size={16}/>} {!breathing ? t('Begin gentle breathing') : paused ? t('Continue') : t('Pause')}</button></div></div>}
    {activity.id === 'garden' && <div className="mc-garden"><div className="mc-controls"><label>{t('Scene')} <select value={garden} onChange={(e) => setGarden(e.target.value)}>{['Garden', 'Beach', 'Sky'].map((scene) => <option key={scene} value={scene}>{t(scene)}</option>)}</select></label>{['🌼','🍃','🪨','🌷','☁️'].map((v) => <button type="button" key={v} aria-pressed={thing === v} onClick={() => setThing(v)}>{v}</button>)}<button type="button" onClick={() => setObjects([])}>{t('Clear garden')}</button><button type="button" onClick={() => setObjects((v) => v.slice(0, -1))}>{t('Undo')}</button></div><div className={`mc-garden-board scene-${garden.toLowerCase()}`} aria-label={t('{scene} scene', { scene: t(garden) })}>{Array.from({ length: 12 }, (_, i) => <button key={i} type="button" aria-label={t('Place {thing} in spot {n}', { thing, n: i + 1 })} onClick={() => setObjects((v) => [...v, { i, thing }])}>{objects.filter((o) => o.i === i).map((o, n) => <span key={n}>{o.thing}</span>)}</button>)}</div></div>}
    {activity.id === 'color' && <div><p>{t('Choose a color, then choose a space to fill or draw in the picture.')}</p><div className="mc-palette">{['#f6c85f','#ef7f78','#76b7a5','#7394cf','#b48bd2','#253d46','#ffffff'].map((v) => <button key={v} type="button" style={{ background: v }} aria-label={t('Choose {color} color', { color: v })} aria-pressed={color === v} onClick={() => setColor(v)} />)}</div><div className="mc-color-art">{['☀','☁','🌱','🌼','○','○','○','○','○'].map((v, i) => <button key={i} type="button" aria-label={t('Color area {n}', { n: i + 1 })} style={{ color: tiles[i] || '#59706b' }} onClick={() => setTiles((t) => t.map((c, n) => n === i ? color : c))}>{v}</button>)}</div><DrawingPad color={color} label={t('Free drawing area')} t={t}/><div className="mc-controls"><button type="button" onClick={() => setTiles(Array(9).fill(''))}>{t('Clear filled areas')}</button><button type="button" onClick={() => setTiles((t) => t.map((v, i) => i === t.findIndex(Boolean) ? '' : v))}>{t('Undo last fill')}</button></div></div>}
    {activity.id === 'match' && <div><p>{t('Find two pictures that are the same. Take all the time you need.')}</p><p className="mc-match-level">{t('mcLevel')} {matchLevel + 1} / {matchLevels.length}</p><div className="mc-match-grid" style={{ '--match-columns': matchLevels[matchLevel][0] }}>{cards.map((c, index) => c.gap ? <span key={c.id} className="mc-match-gap" aria-hidden="true" /> : <button key={c.id} type="button" aria-label={c.open || c.found ? c.icon : t('Picture card {n}, hidden', { n: index + 1 })} onClick={() => pickCard(c)} disabled={c.found}>{c.open || c.found ? c.icon : '❔'}</button>)}</div><p aria-live="polite">{matchDone ? (matchLevel + 1 < matchLevels.length ? t('Level {n} complete', { n: matchLevel + 1 }) : t('You found them all. Lovely exploring!')) : status}</p>{matchDone && matchLevel + 1 < matchLevels.length && <button type="button" onClick={() => startMatchLevel(matchLevel + 1)}>{t('Play level {n}', { n: matchLevel + 2 })} <ArrowRight size={16} /></button>}</div>}
    {activity.id === 'clues' && (activeClueLevel == null ? <div className="mc-clue-level-menu">
      <div className="mc-clue-level-intro"><h2>{t('Choose your puzzle level')}</h2><p>{t('Finish a level to open the next one. No timer, no lives to lose, and hints are always available.')}</p>
        <strong>{t('{done} of {total} levels complete', { done: clueProgress.completedLevels.length, total: curiousClueLevels.length })}</strong>
        <div className="mc-level-progress" role="progressbar" aria-label={t('Puzzle level progress')} aria-valuemin="0" aria-valuemax={curiousClueLevels.length} aria-valuenow={clueProgress.completedLevels.length}><span style={{ width: `${(clueProgress.completedLevels.length / curiousClueLevels.length) * 100}%` }} /></div>
      </div>
      <div className="mc-level-grid">{curiousClueLevels.map((level, index) => {
        const levelNumber = index + 1;
        const completed = clueProgress.completedLevels.includes(levelNumber);
        const locked = levelNumber > clueProgress.unlockedLevel;
        return <button key={level.title} type="button" className={`mc-level-card${completed ? ' is-complete' : ''}`} disabled={locked} aria-label={t(locked ? 'Level {n}: {title}, locked' : 'Level {n}: {title}', { n: levelNumber, title: t(level.title) })} onClick={() => startClueLevel(levelNumber)}>
          <span className="mc-level-number">{completed ? '✓' : levelNumber}</span><strong>{t(level.title)}</strong><small>{t(completed ? 'Complete · replay' : locked ? 'Solve the level before this one' : 'Play level')}</small>
        </button>;
      })}</div>
    </div> : clueLevelComplete ? <div className="mc-clue-level-win" role="status">
      <p className="mc-game-group">{t('Level {n} complete', { n: activeClueLevel })}</p><h2>{t('Brilliant puzzle solving!')}</h2>
      <p>{t('You solved every clue. This level is saved, and the next level is now open.')}</p>
      <div className="mc-level-win-actions">{activeClueLevel < curiousClueLevels.length && <button type="button" className="mc-clue-next" onClick={() => startClueLevel(activeClueLevel + 1)}>{t('Play level {n}', { n: activeClueLevel + 1 })} <ArrowRight size={16} /></button>}<button type="button" className="mc-level-map-button" onClick={() => { setActiveClueLevel(null); setClueLevelComplete(false); }}>{t('Choose a level')}</button></div>
    </div> : currentClue && <div className="mc-clue-game">
      <div className="mc-clue-game-meta"><button type="button" className="mc-level-map-button" onClick={() => { setActiveClueLevel(null); setClueLevelComplete(false); }}>{t('All levels')}</button><span>{t(curiousClueLevels[activeClueLevel - 1].title)}</span><strong>{t('Puzzle {n} of {total}', { n: clueRound + 1, total: clueQuestions.length })}</strong></div>
      <div className="mc-clue-round-progress" aria-label={t('Puzzle {n} of {total}', { n: clueRound + 1, total: clueQuestions.length })}><span style={{ width: `${((clueRound + (clueSolved ? 1 : 0)) / clueQuestions.length) * 100}%` }} /></div>
      <h2>{t(currentClue.prompt)}</h2>
      <button type="button" className="mc-clue-hint-toggle" aria-expanded={clueHintOpen} onClick={() => setClueHintOpen((open) => !open)}>{clueHintOpen ? t('Hide hint') : t('Want a hint?')}</button>
      {clueHintOpen && <p className="mc-clue-hint">{t(currentClue.hint)}</p>}
      <div className="mc-clue-options">{currentClue.options.map((option) => <button key={option} type="button" disabled={clueSolved} aria-pressed={clueSolved && option === currentClue.answer} onClick={() => {
        if (option === currentClue.answer) {
          setClueSolved(true);
          setStatus(t('That is it! Nice thinking.'));
        } else {
          setStatus(t('Not quite yet. Try another answer. No points are lost.'));
        }
      }}><strong>{t(option)}</strong></button>)}</div>
      <p className="mc-clue-feedback" role="status">{status || t('Take your time. You can try again whenever you like.')}</p>
      <button type="button" className="mc-clue-next" disabled={!clueSolved} onClick={() => {
        if (clueRound === clueQuestions.length - 1) {
          onCompleteClueLevel(activeClueLevel);
          setClueLevelComplete(true);
          finishActivity(true);
        } else {
          setClueRound((round) => round + 1);
          setClueSolved(false);
          setClueHintOpen(false);
          setStatus('');
        }
      }}>{clueRound === clueQuestions.length - 1 ? t('Complete level') : t('Next puzzle')} <ArrowRight size={16} aria-hidden="true" /></button>
    </div>)}
  </div><footer className="mc-game-footer"><span aria-live="polite">{paused ? t('Paused. Continue whenever you are ready.') : resultNote || status}</span><button type="button" onClick={reset}><RotateCcw size={16}/> {t('Start over')}</button><button type="button" onClick={exitActivity}>{t('Back to Activities')}</button><span className="mc-kind-note">{t('For fun and exploration. Mistakes do not take away points.')}</span></footer></section>;
}

function DrawingPad({ color, label, t }) {
  const [strokes, setStrokes] = useState([]);
  const point = (event) => { const rect = event.currentTarget.getBoundingClientRect(); return `${((event.clientX - rect.left) / rect.width * 360).toFixed(1)} ${((event.clientY - rect.top) / rect.height * 150).toFixed(1)}`; };
  const start = (event) => { event.currentTarget.setPointerCapture(event.pointerId); const path = `M ${point(event)}`; setStrokes((items) => [...items, { color, path }]); };
  const move = (event) => { if (event.buttons !== 1) return; const next = `L ${point(event)}`; setStrokes((items) => items.map((stroke, index) => index === items.length - 1 ? { ...stroke, path: `${stroke.path} ${next}` } : stroke)); };
  return <div className="mc-drawing-wrap"><svg className="mc-drawing-pad" viewBox="0 0 360 150" role="img" aria-label={label} onPointerDown={start} onPointerMove={move}><rect width="360" height="150" rx="14" fill="#fbfdfb"/>{strokes.map((stroke, i) => <path key={i} d={stroke.path} fill="none" stroke={stroke.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>)}</svg><button type="button" onClick={() => setStrokes([])}>{t('Clear drawing')}</button><span>{t('Or use the large buttons above.')}</span></div>;
}
