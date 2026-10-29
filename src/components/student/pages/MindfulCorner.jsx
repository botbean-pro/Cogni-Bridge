import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, Settings2, X } from 'lucide-react';
import { mergeMindfulProgress, mindfulNote, readMindfulBoard, recordMindfulActivity } from '../../../mindfulPoints';
import { loadMindfulProgress, saveMindfulProgress } from '../../../mindfulProgress';
import { mindfulActivityPath, normalizePath, studentTabPaths } from '../../../routes';
import { activities, activityById, activityByPath, categoryKeys, categoryOrder } from './mindful/activities';
import { usePhoneWidth } from './mindful/usePhoneWidth';
import { stopSpeaking } from '../flow/readAloud';
import { speakQuietInstructions } from './quietCornerVoice';
import { BreathingBuddy } from './mindful/BreathingBuddy';
import { FlowPipes } from './mindful/FlowPipes';
import { Game2048 } from './mindful/Game2048';
import { LightsOut } from './mindful/LightsOut';
import { SensoryGarden } from './mindful/SensoryGarden';
import { SimonMemory } from './mindful/SimonMemory';
import { Snake } from './mindful/Snake';
import { UntrustedGame } from './mindful/UntrustedGame';
import { WordCoach } from './mindful/WordCoach';
import { WordSearch } from './mindful/WordSearch';
import './MindfulCorner.css';
import './mindful/games.css';

const games = {
  wordCoach: WordCoach,
  wordSearch: WordSearch,
  untrusted: UntrustedGame,
  g2048: Game2048,
  lights: LightsOut,
  pipes: FlowPipes,
  snake: Snake,
  simon: SimonMemory,
  breathing: BreathingBuddy,
  garden: SensoryGarden,
};
const initialSettings = { text: 'Standard', motion: true, theme: 'Calm', instructions: 'Text' };
const readSettings = () => { try { const saved = JSON.parse(localStorage.getItem('mindful-corner-settings') || '{}'); return { ...initialSettings, motion: typeof saved.motion === 'boolean' ? saved.motion : !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, ...saved }; } catch { return initialSettings; } };

export function MindfulCorner({ studentId = '', accountId = null, signedIn = false, onSignIn, onClose, onAward, t = (key) => key }) {
  const [settings, setSettings] = useState(readSettings);
  // Each activity has its own URL (/mindful-corner/2048, ...) so refresh and back keep it open.
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const requestedPath = normalizePath(pathname).match(/^\/mindful-corner\/([^/]+)$/)?.[1];
  const activity = activityByPath(requestedPath)?.id || '';
  const setActivity = (id) => navigate(id ? mindfulActivityPath(activityById(id).path) : studentTabPaths.mindful);
  // An old bookmark for a retired activity lands back on the list.
  useEffect(() => {
    if (requestedPath && !activity) navigate(studentTabPaths.mindful, { replace: true });
  }, [requestedPath, activity]);
  const [category, setCategory] = useState('All');
  const phone = usePhoneWidth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [board, setBoard] = useState(() => readMindfulBoard(studentId));
  const [lastNote, setLastNote] = useState(() => { const entry = readMindfulBoard(studentId).entries[0]; return entry ? { entry } : null; });
  useEffect(() => { try { localStorage.setItem('mindful-corner-settings', JSON.stringify(settings)); } catch { /* Settings remain active for this visit. */ } }, [settings]);
  useEffect(() => { const next = readMindfulBoard(studentId); setBoard(next); setLastNote(next.entries[0] ? { entry: next.entries[0] } : null); }, [studentId]);
  // With an account, pull the saved points so they follow the student, then push back anything only this browser had.
  useEffect(() => {
    if (!accountId) return undefined;
    let current = true;
    loadMindfulProgress(accountId).then((remote) => {
      if (!current) return;
      const merged = mergeMindfulProgress(studentId, remote);
      setBoard(merged);
      setLastNote((note) => note || (merged.entries[0] ? { entry: merged.entries[0] } : null));
      onAward?.();
      return saveMindfulProgress(accountId, merged);
    }).catch(() => { /* Progress stays in this browser and syncs on the next visit. */ });
    return () => { current = false; };
  }, [studentId, accountId]);
  const syncProgress = () => {
    if (!accountId) return;
    saveMindfulProgress(accountId, readMindfulBoard(studentId)).catch(() => { /* Retried on the next visit. */ });
  };
  const awardActivity = (activityId, completed) => {
    const result = recordMindfulActivity(studentId, activityById(activityId)?.title || 'Mindful Corner', completed);
    const note = { entry: result.entry, level: result.level > board.level ? result.level : null };
    setBoard({ points: result.points, entries: result.entries, activitiesPlayed: result.activitiesPlayed, level: result.level });
    setLastNote(note);
    syncProgress();
    onAward?.(result);
    return noteText(note);
  };
  const noteText = (note) => note && [mindfulNote(t, note.entry), note.level && t('Level up! You are now Level {level}.', { level: note.level })].filter(Boolean).join(' ');
  const update = (key, value) => setSettings((old) => ({ ...old, [key]: value }));
  const leaveActivity = () => { if (activity) awardActivity(activity, false); setActivity(''); };
  const selected = activityById(activity);
  const shownCategories = category === 'All' ? categoryOrder : [category];
  const shellClass = `mindful-corner theme-${settings.theme.toLowerCase().replace(' ', '-')} text-${settings.text.toLowerCase().replace(' ', '-')}${!settings.motion ? ' reduced-motion' : ''}`;
  return <div className={shellClass}>
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
          <div className="mc-filters" aria-label={t('mcActivityCategories')}>{['All', ...categoryOrder].map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{t(item === 'All' ? 'mcCategoryAll' : categoryKeys[item])}</button>)}</div>
        </div>
        {shownCategories.filter((group) => activities.some((item) => item.group === group && !(item.desktopOnly && phone))).map((group) => <div className="mc-group" key={group}>
          <h2 className="mc-group-title">{t(categoryKeys[group])}</h2>
          <ul className="mc-grid">{activities.filter((item) => item.group === group && !(item.desktopOnly && phone)).map((item) => <li key={item.id}><button type="button" className="mc-card" onClick={() => setActivity(item.id)}>
            <span className="mc-card-icon" aria-hidden="true">{item.icon}</span>
            <span className="mc-card-copy"><strong>{t(item.titleKey)}</strong><small>{t(item.noteKey)}</small></span>
          </button></li>)}</ul>
        </div>)}
      </section>
    </> : <GameScreen key={activity} activity={selected} settings={settings} phone={phone} shellClass={shellClass} t={t} onAward={awardActivity} onExit={() => setActivity('')} />}
  </div>;
}

function GameScreen({ activity, settings, phone, shellClass, t, onAward, onExit }) {
  const [status, setStatus] = useState('');
  const resultSaved = React.useRef(false);
  const Game = games[activity.id];
  const title = t(activity.titleKey);
  const note = t(activity.noteKey);
  const fullScreen = activity.fullScreen && !phone;

  const finishActivity = (completed) => {
    if (resultSaved.current) return;
    resultSaved.current = true;
    setStatus(onAward(activity.id, completed));
  };
  const exitActivity = () => { if (!resultSaved.current) finishActivity(false); onExit(); };
  const resetStatus = () => { resultSaved.current = false; setStatus(''); };

  useEffect(() => {
    if (!fullScreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [fullScreen]);

  const speakInstructions = () => {
    const pageLanguage = (document.documentElement.lang || 'en-IN').toLowerCase();
    stopSpeaking();
    if (!window.speechSynthesis && !window.Audio) { setStatus(t('Audio instructions are not available in this browser. You can read the text instructions.')); return; }
    speakQuietInstructions(`${title}. ${note}`, pageLanguage);
  };

  if (fullScreen) {
    return createPortal(<div className={`${shellClass} mc-full-layer`}>
      <section className="mc-game mc-game-full"><Game settings={settings} t={t} onComplete={() => finishActivity(true)} onStatus={resetStatus} onExit={exitActivity} /></section>
    </div>, document.body);
  }

  return <section className="mc-game">
    <div className="mc-game-heading">
      <div>
        <p className="mc-game-group">{t(categoryKeys[activity.group])}</p>
        <h1>{title}</h1>
        <p>{note}</p>
        {settings.instructions !== 'Text' && <button type="button" onClick={speakInstructions}>{t('Hear instructions')}</button>}
      </div>
      <button type="button" className="mc-exit" onClick={exitActivity}><ArrowLeft size={17}/> {t('Exit activity')}</button>
    </div>
    <div className="mc-play-area"><Game settings={settings} t={t} onComplete={() => finishActivity(true)} onStatus={resetStatus} onExit={exitActivity} /></div>
    <footer className="mc-game-footer">
      <span aria-live="polite">{status}</span>
      <button type="button" onClick={exitActivity}>{t('Back to Activities')}</button>
      <span className="mc-kind-note">{t('For fun and exploration. Mistakes do not take away points.')}</span>
    </footer>
  </section>;
}
