import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, LogIn, Pause, Play, RotateCcw, Settings2, X } from 'lucide-react';
import { readCuriousCluesProgress, readMindfulBoard, recordCuriousCluesLevel, recordMindfulActivity } from '../../../mindfulPoints';
import { curiousClueLevels, shuffleClueQuestions } from '../../../curiousClues';
import './MindfulCorner.css';

const activities = [
  { id: 'bubbles', title: 'Gentle Bubble Pop', icon: '🫧', group: 'Play', note: 'Pop bubbles at your own pace.' },
  { id: 'breathing', title: 'Breathing Buddy', icon: '🌈', group: 'Relax', note: 'Follow a gentle visual cue, or watch colors change.' },
  { id: 'garden', title: 'Sensory Garden', icon: '🌻', group: 'Create', note: 'Choose an object, then choose where it goes.' },
  { id: 'color', title: 'Color and Create', icon: '🎨', group: 'Create', note: 'Fill a simple picture with color.' },
  { id: 'match', title: 'Match the Pictures', icon: '🧩', group: 'Play', note: 'Find pairs. There is no timer.' },
  { id: 'clues', title: 'Curious Clues', icon: '🧠', group: 'Explore', note: 'Explore 12 original puzzle levels. No timer, no pressure.' },
  { id: 'puzzle', title: 'Calm Puzzle', icon: '🧩', group: 'Play', note: 'Put a picture in order, one piece at a time.' },
  { id: 'feelings', title: 'Draw Your Feelings', icon: '😊', group: 'Create', note: 'Make a picture if you want. Nothing is saved.' },
  { id: 'patterns', title: 'Slow Pattern Play', icon: '✨', group: 'Explore', note: 'Build a repeating pattern at your own pace.' },
];
const activityTitleKeys = { bubbles: 'mcBubblesTitle', breathing: 'mcBreathingTitle', garden: 'mcGardenTitle', color: 'mcColorTitle', match: 'mcMatchTitle', clues: 'mcCluesTitle', puzzle: 'mcPuzzleTitle', feelings: 'mcFeelingsTitle', patterns: 'mcPatternsTitle' };
const activityNoteKeys = { bubbles: 'mcBubblesNote', breathing: 'mcBreathingNote', garden: 'mcGardenNote', color: 'mcColorNote', match: 'mcMatchNote', clues: 'mcCluesNote', puzzle: 'mcPuzzleNote', feelings: 'mcFeelingsNote', patterns: 'mcPatternsNote' };
const initialSettings = { text: 'Standard', motion: true, theme: 'Calm', instructions: 'Text' };
const readSettings = () => { try { const saved = JSON.parse(localStorage.getItem('mindful-corner-settings') || '{}'); return { ...initialSettings, motion: typeof saved.motion === 'boolean' ? saved.motion : !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, ...saved }; } catch { return initialSettings; } };
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const shuffledPuzzle = () => { const pieces = shuffle([1, 2, 3, 4]); return pieces.every((piece, index) => piece === index + 1) ? [2, 1, 3, 4] : pieces; };
export function MindfulCorner({ studentId = '', startBreathing = false, signedIn = false, onSignIn, onClose, onAward, t = (key) => key }) {
  const [settings, setSettings] = useState(readSettings);
  const [activity, setActivity] = useState(startBreathing ? 'breathing' : '');
  const [category, setCategory] = useState('All');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [board, setBoard] = useState(() => readMindfulBoard(studentId));
  const [clueProgress, setClueProgress] = useState(() => readCuriousCluesProgress(studentId, curiousClueLevels.length));
  const [lastNote, setLastNote] = useState(() => readMindfulBoard(studentId).entries[0]?.note || '');
  useEffect(() => { try { localStorage.setItem('mindful-corner-settings', JSON.stringify(settings)); } catch { /* Settings remain active for this visit. */ } }, [settings]);
  useEffect(() => { const next = readMindfulBoard(studentId); setBoard(next); setLastNote(next.entries[0]?.note || ''); }, [studentId]);
  useEffect(() => { setClueProgress(readCuriousCluesProgress(studentId, curiousClueLevels.length)); }, [studentId]);
  const awardActivity = (activityId, completed) => { const result = recordMindfulActivity(studentId, activities.find((item) => item.id === activityId)?.title || 'Mindful Corner', completed); const note = result.level > board.level ? `${result.entry.note} Level up! You are now Level ${result.level}.` : result.entry.note; setBoard({ points: result.points, entries: result.entries, activitiesPlayed: result.activitiesPlayed, level: result.level }); setLastNote(note); onAward?.(result); return note; };
  const update = (key, value) => setSettings((old) => ({ ...old, [key]: value }));
  const leaveActivity = () => { if (activity) awardActivity(activity, false); setActivity(''); };
  const completeClueLevel = (completedLevel) => setClueProgress(recordCuriousCluesLevel(studentId, completedLevel, curiousClueLevels.length));
  const selected = activities.find((item) => item.id === activity);
  useEffect(() => { if (activity && !selected) setActivity(''); }, [activity, selected]);
  const visibleActivities = activities.filter((item) => (category === 'All' || item.group === category) && `${t(activityTitleKeys[item.id])} ${t(activityNoteKeys[item.id])}`.toLowerCase().includes(search.toLowerCase()));
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
    </section> : !selected ? <>
      <section className="mc-intro">
        <h1>{t('mcTitle')}</h1>
        <p>{t('mcWelcomeDescription')} {t('mcNoScore')}</p>
      </section>
      {lastNote && <p className="mc-latest-note" role="status">{lastNote}</p>}
      <section className="mc-activity-section" id="mc-activities">
        <div className="mc-section-head">
          <div className="mc-filters" aria-label={t('mcActivityCategories')}>{['All', 'Relax', 'Create', 'Explore', 'Play'].map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{t(`mcCategory${item}`)}</button>)}</div>
          <label className="mc-search"><span className="sr-only">{t('mcFindActivity')}</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('mcFindActivity')} /></label>
        </div>
        <ul className="mc-grid">{visibleActivities.map((item) => <li key={item.id}><button type="button" className="mc-card" onClick={() => setActivity(item.id)}>
          <span className="mc-card-icon" aria-hidden="true">{item.icon}</span>
          <span className="mc-card-copy"><strong>{t(activityTitleKeys[item.id])}</strong><small>{t(activityNoteKeys[item.id])}</small></span>
        </button></li>)}</ul>
      </section>
    </> : <GameScreen key={activity} activity={{ ...selected, title: t(activityTitleKeys[selected.id]), group: t(`mcCategory${selected.group}`), note: t(activityNoteKeys[selected.id]) }} settings={settings} t={t} clueProgress={clueProgress} onCompleteClueLevel={completeClueLevel} onAward={awardActivity} onExit={() => setActivity('')} />}
  </div>;
}

function GameScreen({ activity, settings, clueProgress, onCompleteClueLevel, onAward, onExit }) {
  const [status, setStatus] = useState('');
  const [popped, setPopped] = useState([]);
  const [resultNote, setResultNote] = useState('');
  const [paused, setPaused] = useState(false);
  const [popCount, setPopCount] = useState(0);
  const [phase, setPhase] = useState('Ready when you are');
  const [breathing, setBreathing] = useState(false);
  const [watchingColor, setWatchingColor] = useState(false);
  const [objects, setObjects] = useState([]);
  const [thing, setThing] = useState('🌼');
  const [color, setColor] = useState('#f6c85f');
  const [tiles, setTiles] = useState(Array(9).fill(''));
  const [cards, setCards] = useState(() => shuffle(['🐢','🐢','🌙','🌙']).map((icon, i) => ({ icon, id: i, open: false, found: false })));
  const [first, setFirst] = useState(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const matchTimer = React.useRef(null);
  const resultSaved = React.useRef(false);
  const [puzzle, setPuzzle] = useState(shuffledPuzzle);
  const [puzzleSelection, setPuzzleSelection] = useState(null);
  const [activeClueLevel, setActiveClueLevel] = useState(null);
  const [clueQuestions, setClueQuestions] = useState([]);
  const [clueRound, setClueRound] = useState(0);
  const [clueSolved, setClueSolved] = useState(false);
  const [clueHintOpen, setClueHintOpen] = useState(false);
  const [clueLevelComplete, setClueLevelComplete] = useState(false);
  const [sticker, setSticker] = useState('😊');
  const [pattern, setPattern] = useState([]);
  const [garden, setGarden] = useState('Garden');
  const matchCount = cards.filter((c) => c.found).length / 2;
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
  useEffect(() => { if (activity.id === 'match' && cards.length && matchCount === cards.length / 2) finishActivity(true); }, [activity.id, cards.length, matchCount]);
  useEffect(() => { if (!breathing || paused || !settings.motion) return undefined; const id = window.setInterval(() => setPhase((p) => p === 'Breathe in' ? 'Breathe out' : 'Breathe in'), 5000); return () => window.clearInterval(id); }, [breathing, paused, settings.motion]);
  useEffect(() => () => { window.clearTimeout(matchTimer.current); window.speechSynthesis?.cancel(); }, []);
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
    setWatchingColor(false);
    setObjects([]);
    setTiles(Array(9).fill(''));
    setCards(shuffle(['🐢','🐢','🌙','🌙']).map((icon, i) => ({ icon, id: i, open: false, found: false })));
    setFirst(null);
    setPuzzle(shuffledPuzzle());
    setPuzzleSelection(null);
    setActiveClueLevel(null);
    setClueQuestions([]);
    setClueRound(0);
    setClueSolved(false);
    setClueHintOpen(false);
    setClueLevelComplete(false);
    setPattern([]);
  };
  const pickCard = (card) => { if (card.open || card.found || paused || cardsLocked) return; if (first == null) { setFirst(card.id); setCards((cs) => cs.map((c) => c.id === card.id ? { ...c, open: true } : c)); return; } const a = cards.find((c) => c.id === first); const next = cards.map((c) => c.id === card.id || c.id === first ? { ...c, open: true } : c); if (a?.icon === card.icon) { next.forEach((c) => { if (c.id === card.id || c.id === first) c.found = true; }); setStatus('A pair! Great exploring.'); setCards(next); setFirst(null); } else { setStatus("Let's try another one!"); setCards(next); setFirst(null); setCardsLocked(true); matchTimer.current = window.setTimeout(() => { setCards((current) => current.map((c) => c.found ? c : { ...c, open: false })); setCardsLocked(false); }, 900); } };
  const speakInstructions = () => { if (!window.speechSynthesis) { setStatus('Audio instructions are not available in this browser. You can read the text instructions.'); return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(`${activity.title}. ${activity.note}`); utterance.rate = 0.82; utterance.volume = 0.55; window.speechSynthesis.speak(utterance); };
  return <section className="mc-game"><div className="mc-game-heading"><div><p className="mc-game-group">{activity.group}</p><h1>{activity.title}</h1><p>{activity.note}</p>{settings.instructions !== 'Text' && <button type="button" onClick={speakInstructions}>Hear instructions</button>}</div><button type="button" className="mc-exit" onClick={exitActivity}><ArrowLeft size={17}/> Exit activity</button></div><div className="mc-play-area">
    {activity.id === 'bubbles' && <div className="mc-bubbles"><p>Tap any bubble. No rush.</p><div className="mc-bubble-row">{Array.from({ length: 6 }, (_, i) => <button key={i} type="button" className={popped.includes(i) ? 'is-popped' : ''} aria-label={popped.includes(i) ? `Bubble ${i+1} popped` : `Pop bubble ${i+1}`} aria-pressed={popped.includes(i)} disabled={popped.includes(i)} onClick={() => { const next = [...popped, i]; setPopped(next); setPopCount(next.length); if (next.length === 6) finishActivity(true); else setStatus('Pop! Nice exploring.'); }}>{['○','◯','◌','◉','◎','◦'][i]}</button>)}</div><p aria-live="polite">{status || `${popCount} of 6 bubbles popped`}</p></div>}
    {activity.id === 'breathing' && <div className="mc-breath"><p aria-live="polite">{breathing && !paused ? phase : watchingColor ? 'Just watch the color change.' : 'Choose a gentle visual guide.'}</p><div className={`mc-breath-orb${breathing && !paused && settings.motion ? ` ${phase === 'Breathe in' ? 'grow' : 'shrink'}` : ''}${watchingColor && settings.motion && !paused ? ' color-cycle' : ''}`} aria-hidden="true">{breathing && !paused ? '☁' : '☼'}</div><div className="mc-controls"><button type="button" onClick={() => { setWatchingColor(false); setBreathing(true); setPaused(false); setPhase('Breathe in'); }}>Begin gentle breathing</button><button type="button" onClick={() => { setBreathing(false); setWatchingColor(true); setPaused(false); }}>Watch changing color instead</button><button type="button" onClick={() => setPaused((p) => !p)}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? 'Continue' : 'Pause'}</button><button type="button" onClick={() => { setBreathing(false); setWatchingColor(false); setPaused(false); setPhase('Ready when you are'); }}>Stop</button></div></div>}
    {activity.id === 'garden' && <div className="mc-garden"><div className="mc-controls"><label>Scene <select value={garden} onChange={(e) => setGarden(e.target.value)}><option>Garden</option><option>Beach</option><option>Sky</option></select></label>{['🌼','🍃','🪨','🌷','☁️'].map((v) => <button type="button" key={v} aria-pressed={thing === v} onClick={() => setThing(v)}>{v}</button>)}<button type="button" onClick={() => setObjects([])}>Clear garden</button><button type="button" onClick={() => setObjects((v) => v.slice(0, -1))}>Undo</button></div><div className={`mc-garden-board scene-${garden.toLowerCase()}`} aria-label={`${garden} scene`}>{Array.from({ length: 12 }, (_, i) => <button key={i} type="button" aria-label={`Place ${thing} in spot ${i+1}`} onClick={() => setObjects((v) => [...v, { i, thing }])}>{objects.filter((o) => o.i === i).map((o, n) => <span key={n}>{o.thing}</span>)}</button>)}</div></div>}
    {activity.id === 'color' && <div><p>Choose a color, then choose a space to fill or draw in the picture.</p><div className="mc-palette">{['#f6c85f','#ef7f78','#76b7a5','#7394cf','#b48bd2','#253d46','#ffffff'].map((v) => <button key={v} type="button" style={{ background: v }} aria-label={`Choose ${v} color`} aria-pressed={color === v} onClick={() => setColor(v)} />)}</div><div className="mc-color-art">{['☀','☁','🌱','🌼','○','○','○','○','○'].map((v, i) => <button key={i} type="button" aria-label={`Color area ${i+1}`} style={{ color: tiles[i] || '#59706b' }} onClick={() => setTiles((t) => t.map((c, n) => n === i ? color : c))}>{v}</button>)}</div><DrawingPad color={color} label="Free drawing area"/><div className="mc-controls"><button type="button" onClick={() => setTiles(Array(9).fill(''))}>Clear filled areas</button><button type="button" onClick={() => setTiles((t) => t.map((v, i) => i === t.findIndex(Boolean) ? '' : v))}>Undo last fill</button></div></div>}
    {activity.id === 'match' && <div><p>Find two pictures that are the same. Take all the time you need.</p><div className="mc-match-grid">{cards.map((c) => <button key={c.id} type="button" aria-label={c.open || c.found ? c.icon : `Picture card ${c.id+1}, hidden`} onClick={() => pickCard(c)} disabled={c.found}>{c.open || c.found ? c.icon : '❔'}</button>)}</div><p aria-live="polite">{matchCount === cards.length / 2 ? 'You found them all. Lovely exploring!' : status || `${matchCount} pairs found`}</p><button type="button" onClick={() => { resultSaved.current = false; setResultNote(''); setCards(shuffle(['🐢','🐢','🌙','🌙','🐟','🐟']).map((icon, i) => ({ icon, id: i, open: false, found: false }))); setFirst(null); setStatus('Three pairs ready. Take your time.'); }}>Try three pairs</button></div>}
    {activity.id === 'clues' && (activeClueLevel == null ? <div className="mc-clue-level-menu">
      <div className="mc-clue-level-intro"><h2>Choose your puzzle level</h2><p>Finish a level to open the next one. No timer, no lives to lose, and hints are always available.</p>
        <strong>{clueProgress.completedLevels.length} of {curiousClueLevels.length} levels complete</strong>
        <div className="mc-level-progress" role="progressbar" aria-label="Puzzle level progress" aria-valuemin="0" aria-valuemax={curiousClueLevels.length} aria-valuenow={clueProgress.completedLevels.length}><span style={{ width: `${(clueProgress.completedLevels.length / curiousClueLevels.length) * 100}%` }} /></div>
      </div>
      <div className="mc-level-grid">{curiousClueLevels.map((level, index) => {
        const levelNumber = index + 1;
        const completed = clueProgress.completedLevels.includes(levelNumber);
        const locked = levelNumber > clueProgress.unlockedLevel;
        return <button key={level.title} type="button" className={`mc-level-card${completed ? ' is-complete' : ''}`} disabled={locked} aria-label={`Level ${levelNumber}: ${level.title}${locked ? ', locked' : ''}`} onClick={() => startClueLevel(levelNumber)}>
          <span className="mc-level-number">{completed ? '✓' : levelNumber}</span><strong>{level.title}</strong><small>{completed ? 'Complete · replay' : locked ? 'Solve the level before this one' : 'Play level'}</small>
        </button>;
      })}</div>
    </div> : clueLevelComplete ? <div className="mc-clue-level-win" role="status">
      <p className="mc-game-group">Level {activeClueLevel} complete</p><h2>Brilliant puzzle solving!</h2>
      <p>You solved every clue. This level is saved, and the next level is now open.</p>
      <div className="mc-level-win-actions">{activeClueLevel < curiousClueLevels.length && <button type="button" className="mc-clue-next" onClick={() => startClueLevel(activeClueLevel + 1)}>Play level {activeClueLevel + 1} <ArrowRight size={16} /></button>}<button type="button" className="mc-level-map-button" onClick={() => { setActiveClueLevel(null); setClueLevelComplete(false); }}>Choose a level</button></div>
    </div> : currentClue && <div className="mc-clue-game">
      <div className="mc-clue-game-meta"><button type="button" className="mc-level-map-button" onClick={() => { setActiveClueLevel(null); setClueLevelComplete(false); }}>All levels</button><span>{curiousClueLevels[activeClueLevel - 1].title}</span><strong>Puzzle {clueRound + 1} of {clueQuestions.length}</strong></div>
      <div className="mc-clue-round-progress" aria-label={`Puzzle ${clueRound + 1} of ${clueQuestions.length}`}><span style={{ width: `${((clueRound + (clueSolved ? 1 : 0)) / clueQuestions.length) * 100}%` }} /></div>
      <h2>{currentClue.prompt}</h2>
      <button type="button" className="mc-clue-hint-toggle" aria-expanded={clueHintOpen} onClick={() => setClueHintOpen((open) => !open)}>{clueHintOpen ? 'Hide hint' : 'Want a hint?'}</button>
      {clueHintOpen && <p className="mc-clue-hint">{currentClue.hint}</p>}
      <div className="mc-clue-options">{currentClue.options.map((option) => <button key={option} type="button" disabled={clueSolved} aria-pressed={clueSolved && option === currentClue.answer} onClick={() => {
        if (option === currentClue.answer) {
          setClueSolved(true);
          setStatus('That is it! Nice thinking.');
        } else {
          setStatus('Not quite yet. Try another answer. No points are lost.');
        }
      }}><strong>{option}</strong></button>)}</div>
      <p className="mc-clue-feedback" role="status">{status || 'Take your time. You can try again whenever you like.'}</p>
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
      }}>{clueRound === clueQuestions.length - 1 ? 'Complete level' : 'Next clue'} <ArrowRight size={16} aria-hidden="true" /></button>
    </div>)}
    {activity.id === 'puzzle' && <div><p>Choose a piece, then choose where it goes. Hint: the picture is a little flower.</p><div className="mc-puzzle">{puzzle.map((n, i) => <button key={i} type="button" aria-pressed={puzzleSelection === i} aria-label={`Puzzle piece ${n}, position ${i+1}`} onClick={() => { if (puzzleSelection == null) setPuzzleSelection(i); else { const copy = [...puzzle]; [copy[puzzleSelection], copy[i]] = [copy[i], copy[puzzleSelection]]; setPuzzle(copy); setPuzzleSelection(null); if (copy.every((x, j) => x === j + 1)) finishActivity(true); else setStatus('Piece moved. Keep exploring.'); } }}>{n === 1 ? '🌼' : n === 2 ? '🌿' : n === 3 ? '🟩' : '☀️'}</button>)}</div><p aria-live="polite">{puzzleSelection != null ? 'Choose where to place the selected piece.' : status}</p><button type="button" onClick={() => { setPuzzle(shuffledPuzzle()); setPuzzleSelection(null); }}>Mix pieces</button><button type="button" onClick={() => { setPuzzle([1,2,3,4]); setPuzzleSelection(null); setStatus('Picture preview: flower, leaf, grass, sun.'); }}>Show hint</button></div>}
    {activity.id === 'feelings' && <div><p>Choose stickers or colors to make a picture, if you want. You do not need to explain it.</p><div className="mc-controls">{['😊','😐','😌','🌈','☀️','🌧️','⭐','💚'].map((s) => <button type="button" key={s} aria-pressed={sticker === s} onClick={() => setSticker(s)}>{s}</button>)}</div><div className="mc-feeling-canvas" aria-label="Your picture, only on this screen"><button type="button" aria-label={`Add ${sticker} to picture`} onClick={() => setObjects((v) => [...v, sticker])}>{objects.map((o, i) => <span key={i}>{o}</span>)}<span>{sticker}</span></button></div><DrawingPad color={color} label="Optional free drawing area"/><div className="mc-palette">{['#f6c85f','#ef7f78','#76b7a5','#7394cf','#b48bd2','#253d46'].map((v) => <button key={v} type="button" style={{ background: v }} aria-label={`Choose drawing color ${v}`} aria-pressed={color === v} onClick={() => setColor(v)} />)}</div><div className="mc-controls"><button type="button" onClick={() => setObjects((v) => v.slice(0, -1))}>Undo sticker</button><button type="button" onClick={() => setObjects([])}>Clear stickers</button></div></div>}
    {activity.id === 'patterns' && <div><p>Add shapes to make a pattern. Pause whenever you like.</p><div className="mc-pattern" aria-live="polite">{pattern.map((p, i) => <span key={i}>{p}</span>)}</div><div className="mc-controls">{['○','△','□','☆'].map((p) => <button type="button" key={p} onClick={() => setPattern((v) => [...v, p])}>{p} Add shape</button>)}</div><div className="mc-controls"><button type="button" onClick={() => setPaused((p) => !p)}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? 'Continue' : 'Pause'}</button><button type="button" onClick={() => setPattern([])}>Stop and clear</button></div></div>}
  </div><footer className="mc-game-footer"><span aria-live="polite">{paused ? 'Paused. Continue whenever you are ready.' : resultNote || status}</span>{!resultNote && <button type="button" onClick={() => finishActivity(true)}>Finish this activity</button>}<button type="button" onClick={reset}><RotateCcw size={16}/> Start over</button><button type="button" onClick={exitActivity}>Back to Activities</button><span className="mc-kind-note">For fun and exploration. Mistakes do not take away points.</span></footer></section>;
}

function DrawingPad({ color, label }) {
  const [strokes, setStrokes] = useState([]);
  const point = (event) => { const rect = event.currentTarget.getBoundingClientRect(); return `${((event.clientX - rect.left) / rect.width * 360).toFixed(1)} ${((event.clientY - rect.top) / rect.height * 150).toFixed(1)}`; };
  const start = (event) => { event.currentTarget.setPointerCapture(event.pointerId); const first = `M ${point(event)}`; setStrokes((items) => [...items, { color, path: first }]); };
  const move = (event) => { if (event.buttons !== 1) return; const next = `L ${point(event)}`; setStrokes((items) => items.map((stroke, index) => index === items.length - 1 ? { ...stroke, path: `${stroke.path} ${next}` } : stroke)); };
  return <div className="mc-drawing-wrap"><svg className="mc-drawing-pad" viewBox="0 0 360 150" role="img" aria-label={label} onPointerDown={start} onPointerMove={move}><rect width="360" height="150" rx="14" fill="#fbfdfb"/>{strokes.map((stroke, i) => <path key={i} d={stroke.path} fill="none" stroke={stroke.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>)}</svg><button type="button" onClick={() => setStrokes([])}>Clear drawing</button><span>Or use the large buttons above.</span></div>;
}
