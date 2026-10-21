import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Activity, Check, Clock3, Pause, Play, RotateCcw, Settings2 } from 'lucide-react';
import './SensorySessionSupport.css';

const SETTINGS_KEY = 'cognibridge_sensory_session_settings';
const defaults = { reminderMinutes: 20, breakReminders: true, motion: 'reduced', audio: false, simpleVisuals: false, textSize: 'normal', instructionStyle: 'steps' };
const readSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      ...defaults,
      ...saved,
      reminderMinutes: [10, 20, 30, 45].includes(Number(saved.reminderMinutes)) ? Number(saved.reminderMinutes) : defaults.reminderMinutes,
      motion: ['full', 'reduced', 'off'].includes(saved.motion) ? saved.motion : defaults.motion,
      textSize: ['normal', 'large'].includes(saved.textSize) ? saved.textSize : defaults.textSize,
      instructionStyle: ['steps', 'brief'].includes(saved.instructionStyle) ? saved.instructionStyle : defaults.instructionStyle,
      breakReminders: typeof saved.breakReminders === 'boolean' ? saved.breakReminders : defaults.breakReminders,
      audio: typeof saved.audio === 'boolean' ? saved.audio : defaults.audio,
      simpleVisuals: typeof saved.simpleVisuals === 'boolean' ? saved.simpleVisuals : defaults.simpleVisuals,
    };
  } catch { return defaults; }
};
const makeInitial = (storageKey) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && ['ready', 'active', 'breakSuggested', 'breakActive', 'paused', 'completed'].includes(saved.status)) {
      return {
        ...saved,
        status: ['active', 'breakSuggested', 'breakActive'].includes(saved.status) ? 'paused' : saved.status,
        prompt: ['active', 'breakSuggested', 'breakActive'].includes(saved.status) ? null : saved.prompt,
        events: ['active', 'breakSuggested', 'breakActive'].includes(saved.status)
          ? [...(saved.events || []), { id: `${Date.now()}-resume`, label: 'Session paused after leaving the tracker', elapsed: saved.elapsed || 0 }].slice(-30)
          : saved.events || [],
      };
    }
  } catch { /* Start a fresh in-tab session if saved state is unavailable. */ }
  return { status: 'ready', elapsed: 0, nextPromptAt: 0, prompt: 'pre', promptReason: '', events: [], pauses: 0, tasks: 0, helpRequests: 0, patternPromptSent: false, reflection: '' };
};
const event = (label, elapsed) => ({ id: `${Date.now()}-${Math.random()}`, label, elapsed });

function reducer(state, action) {
  const addEvent = (label, elapsed = state.elapsed) => [...state.events, event(label, elapsed)].slice(-30);
  switch (action.type) {
    case 'START': return { ...state, status: 'active', prompt: null, elapsed: 0, nextPromptAt: action.interval, events: [...state.events, ...(state.prompt === 'pre' ? [event('Pre-session reminder accepted', 0)] : []), event('Session started', 0)].slice(-30) };
    case 'DISMISS_PRE': return { ...state, prompt: null, events: addEvent('Pre-session reminder dismissed', 0) };
    case 'TICK': {
      if (state.status !== 'active') return state;
      const elapsed = state.elapsed + 1;
      if (action.breakReminders && elapsed >= state.nextPromptAt && !state.prompt) {
        return { ...state, elapsed, status: 'breakSuggested', prompt: 'mid', promptReason: 'scheduled', nextPromptAt: elapsed + action.interval, events: addEvent('Mid-session reminder shown', elapsed) };
      }
      return { ...state, elapsed };
    }
    case 'PAUSE': return state.status !== 'active' ? state : { ...state, status: 'paused', prompt: null, pauses: state.pauses + 1, events: addEvent('Session paused') };
    case 'RESUME': {
      if (state.status !== 'paused') return state;
      const patternPrompt = state.pauses >= 2 && !state.patternPromptSent;
      return { ...state, status: patternPrompt ? 'breakSuggested' : 'active', prompt: patternPrompt ? 'mid' : null, promptReason: patternPrompt ? 'pauses' : '', patternPromptSent: state.patternPromptSent || patternPrompt, events: patternPrompt ? [...addEvent('Session resumed'), event('Break suggestion offered after two recorded pauses', state.elapsed)].slice(-30) : addEvent('Session resumed') };
    }
    case 'TIMEOUT': return state.status !== 'breakSuggested' || state.prompt !== 'mid' ? state : { ...state, status: 'active', prompt: null, nextPromptAt: state.elapsed + 300, events: addEvent('Break prompt timed out') };
    case 'POSTPONE': return { ...state, status: 'active', prompt: null, nextPromptAt: state.elapsed + 300, events: addEvent('Break prompt postponed for five minutes') };
    case 'DISMISS': return { ...state, status: state.prompt === 'mid' ? 'active' : state.status, prompt: null, nextPromptAt: state.elapsed + action.interval, events: addEvent(`${action.promptName} reminder dismissed`) };
    case 'BREAK_START': return { ...state, status: 'breakActive', prompt: null, events: [...addEvent('Break accepted'), event('Break started', state.elapsed)].slice(-30) };
    case 'BREAK_END': return { ...state, status: 'active', prompt: null, nextPromptAt: state.elapsed + action.interval, events: addEvent(action.completed ? 'Break completed' : 'Break ended early') };
    case 'HELP': {
      const helpRequests = state.helpRequests + 1;
      const promptNow = state.status === 'active' && helpRequests >= 3 && !state.patternPromptSent;
      const events = addEvent('Help request recorded');
      if (promptNow) events.push(event('Break suggestion offered after three recorded help requests', state.elapsed));
      return { ...state, helpRequests, status: promptNow ? 'breakSuggested' : state.status, prompt: promptNow ? 'mid' : state.prompt, promptReason: promptNow ? 'help' : state.promptReason, patternPromptSent: state.patternPromptSent || promptNow, events: events.slice(-30) };
    }
    case 'TASK': return { ...state, tasks: state.tasks + 1, events: addEvent('Task completion recorded') };
    case 'REPORT': {
      const label = action.value === 'okay' ? 'Comfort reported as okay' : `Student reported feeling ${action.value}`;
      const promptNow = action.value !== 'okay' && state.status === 'active';
      const events = addEvent(label);
      if (promptNow) events.push(event('Break suggestion offered after student self-report', state.elapsed));
      return { ...state, comfortReport: action.value, status: promptNow ? 'breakSuggested' : state.status, prompt: promptNow ? 'mid' : state.prompt, promptReason: promptNow ? 'self-report' : state.promptReason, patternPromptSent: state.patternPromptSent || promptNow, events: events.slice(-30) };
    }
    case 'COMPLETE': return ['active', 'paused'].includes(state.status) ? { ...state, status: 'completed', prompt: 'post', events: [...addEvent('Session completed'), event('Post-session reflection offered', state.elapsed)].slice(-30) } : state;
    case 'POST_ACCEPT': return { ...state, prompt: null, events: addEvent('Post-session reflection accepted') };
    case 'REFLECT': return { ...state, reflection: action.value };
    case 'RESET': return makeInitial();
    default: return state;
  }
}

const clock = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const statusCopy = { ready: 'Ready', active: 'Session active', breakSuggested: 'Break suggested', breakActive: 'Break active', paused: 'Paused', completed: 'Completed' };

export function SensorySessionSupport({ studentId, t = (value) => value }) {
  const storageKey = `cognibridge_sensory_session_${encodeURIComponent(String(studentId || 'student'))}`;
  const [session, dispatch] = useReducer(reducer, storageKey, makeInitial);
  const sessionRef = useRef(session);
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Keep current settings for this visit. */ }
  }, [settings]);
  useEffect(() => {
    sessionRef.current = session;
    try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* Keep session data in memory when tab storage is unavailable. */ }
  }, [session, storageKey]);
  useEffect(() => {
    const pauseForExit = () => {
      const current = sessionRef.current;
      if (!['active', 'breakSuggested', 'breakActive'].includes(current.status)) return;
      const paused = { ...current, status: 'paused', prompt: null, events: [...current.events, event('Session paused after leaving the tracker', current.elapsed)].slice(-30) };
      sessionRef.current = paused;
      try { sessionStorage.setItem(storageKey, JSON.stringify(paused)); } catch { /* Session will reset if tab storage is unavailable. */ }
    };
    window.addEventListener('pagehide', pauseForExit);
    return () => {
      window.removeEventListener('pagehide', pauseForExit);
      pauseForExit();
    };
  }, [storageKey]);
  useEffect(() => {
    if (session.status !== 'active') return undefined;
    const timer = window.setInterval(() => dispatch({ type: 'TICK', interval: settings.reminderMinutes * 60, breakReminders: settings.breakReminders }), 1000);
    return () => window.clearInterval(timer);
  }, [session.status, settings.reminderMinutes, settings.breakReminders]);
  useEffect(() => {
    if (session.status !== 'breakSuggested' || session.prompt !== 'mid') return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'TIMEOUT' }), 90000);
    return () => window.clearTimeout(timer);
  }, [session.status, session.prompt, session.elapsed]);

  const changeSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const previewSound = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!settings.audio || !AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
    oscillator.onended = () => context.close();
  };

  const suggestionReason = session.promptReason === 'scheduled'
    ? t(`You've been in this session for ${Math.floor(session.elapsed / 60)} minutes. A short break is available if you want one.`)
    : session.promptReason === 'pauses'
      ? t('You recorded two pauses in this session. Would a short break help?')
      : session.promptReason === 'help'
        ? t('You recorded three help requests. Would a short break help?')
        : t('Based on what you reported, would you like a short break?');

  return (
    <section className={`sensory-session-panel session-motion-${settings.motion}${settings.simpleVisuals ? ' session-simple-visuals' : ''} session-text-${settings.textSize}`} aria-labelledby="session-support-title">
      <header className="session-support-head">
        <div><span className="sensory-step">{t('OPTIONAL SESSION SUPPORT')}</span><h2 id="session-support-title">{t('Learning session, at your pace')}</h2><p>{t('Use this optional timer to note session activity and decide for yourself when a pause would help.')}</p></div>
        <div className="session-support-clock"><Clock3 size={17} /><strong>{clock(session.elapsed)}</strong><span>{t(statusCopy[session.status])}</span></div>
      </header>

      <details className="session-settings" open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}>
        <summary><Settings2 size={17} /> {t('Session preferences')}</summary>
        <div className="session-setting-grid">
          <label>{t('Reminder frequency')}<select value={settings.reminderMinutes} onChange={(event) => changeSetting('reminderMinutes', Number(event.target.value))}><option value="10">{t('Every 10 minutes')}</option><option value="20">{t('Every 20 minutes')}</option><option value="30">{t('Every 30 minutes')}</option><option value="45">{t('Every 45 minutes')}</option></select></label>
          <label>{t('Motion')}<select value={settings.motion} onChange={(event) => changeSetting('motion', event.target.value)}><option value="full">{t('Full')}</option><option value="reduced">{t('Reduced')}</option><option value="off">{t('Off')}</option></select></label>
          <label>{t('Text size')}<select value={settings.textSize} onChange={(event) => changeSetting('textSize', event.target.value)}><option value="normal">{t('Normal')}</option><option value="large">{t('Large')}</option></select></label>
          <label>{t('Instructions')}<select value={settings.instructionStyle} onChange={(event) => changeSetting('instructionStyle', event.target.value)}><option value="steps">{t('Step by step')}</option><option value="brief">{t('Brief')}</option></select></label>
          <label className="session-setting-check"><input type="checkbox" checked={settings.breakReminders} onChange={(event) => changeSetting('breakReminders', event.target.checked)} /> {t('Offer time-based break reminders')}</label>
          <label className="session-setting-check"><input type="checkbox" checked={settings.simpleVisuals} onChange={(event) => changeSetting('simpleVisuals', event.target.checked)} /> {t('Use a simpler visual layout')}</label>
          <label className="session-setting-check"><input type="checkbox" checked={settings.audio} onChange={(event) => changeSetting('audio', event.target.checked)} /> {t('Enable optional sound preview')}</label>
          {settings.audio && <button type="button" className="session-secondary" onClick={previewSound}>{t('Preview gentle sound')}</button>}
          <button type="button" className="session-secondary" onClick={() => setSettings(defaults)}><RotateCcw size={15} /> {t('Restore preferences')}</button>
        </div>
        <p className="session-settings-note">{t('Sound plays only when you choose Preview. Preferences stay on this device. This session is kept in this browser tab and is not shared. Time prompts follow your selected interval. Other suggestions use only the pauses, help requests, or comfort option you choose to record; they are not an assessment.')}</p>
      </details>

      {session.status === 'ready' && <div className="session-prompt session-prompt-pre"><div><strong>{t('Before you begin')}</strong><p>{t('Get comfortable, gather what you need, and begin at a pace that works for you.')}</p></div><div className="session-controls"><button type="button" className="session-primary" onClick={() => dispatch({ type: 'START', interval: settings.reminderMinutes * 60 })}><Play size={16} /> {t('Start session')}</button>{session.prompt === 'pre' && <button type="button" className="session-secondary" onClick={() => dispatch({ type: 'DISMISS_PRE', promptName: 'Pre-session' })}>{t('Dismiss reminder')}</button>}</div></div>}

      {session.status === 'active' && <div className="session-active-content">
        <p className="session-instructions">{settings.instructionStyle === 'steps' ? t('1. Work on one activity. 2. Pause or ask for help whenever you want. 3. Finish the session when you are ready.') : t('Work at your own pace. Pause or finish whenever you want.')}</p>
        <div className="session-activity-row"><span>{t('Activity notes are optional')}</span><div><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'TASK' })}><Check size={15} /> {t('I finished a task')} · {session.tasks}</button><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'HELP' })}><Activity size={15} /> {t('I asked for help')} · {session.helpRequests}</button></div></div>
        <div className="session-report-row"><span>{t('How does your comfort feel right now?')}</span><div>{[['okay', 'Okay'], ['tired', 'A little tired'], ['overwhelmed', 'Overwhelmed']].map(([value, label]) => <button type="button" key={value} className={`session-chip${session.comfortReport === value ? ' selected' : ''}`} aria-pressed={session.comfortReport === value} onClick={() => dispatch({ type: 'REPORT', value })}>{t(label)}</button>)}</div></div>
        <div className="session-controls"><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'PAUSE' })}><Pause size={16} /> {t('Pause session')}</button><button type="button" className="session-primary" onClick={() => dispatch({ type: 'COMPLETE' })}>{t('Finish session')}</button></div>
      </div>}

      {session.status === 'breakSuggested' && <div className="session-prompt session-prompt-mid" role="status"><div><strong>{t('A pause is here if you want it')}</strong><p>{suggestionReason}</p></div><div className="session-controls"><button type="button" className="session-primary" onClick={() => dispatch({ type: 'BREAK_START' })}>{t('Take a short break')}</button><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'POSTPONE' })}>{t('Remind me in 5 minutes')}</button><button type="button" className="session-text-button" onClick={() => dispatch({ type: 'DISMISS', promptName: 'Break' })}>{t('Dismiss')}</button></div></div>}

      {session.status === 'breakActive' && <div className="session-prompt session-prompt-break"><div><strong>{t('Take the time you need.')}</strong><p>{t('The session timer is paused. You can return when you feel ready.')}</p></div><div className="session-controls"><button type="button" className="session-primary" onClick={() => dispatch({ type: 'BREAK_END', completed: true, interval: settings.reminderMinutes * 60 })}><Play size={16} /> {t('Return to session')}</button><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'BREAK_END', completed: false, interval: settings.reminderMinutes * 60 })}>{t('End break early')}</button></div></div>}

      {session.status === 'paused' && <div className="session-prompt"><strong>{t('Session paused')}</strong><div className="session-controls"><button type="button" className="session-primary" onClick={() => dispatch({ type: 'RESUME' })}><Play size={16} /> {t('Resume session')}</button><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'COMPLETE' })}>{t('Finish session')}</button></div></div>}

      {session.status === 'completed' && <div className="session-summary" aria-live="polite"><div className="session-summary-heading"><Check size={19} /><div><strong>{t('Session complete. Thanks for checking in with yourself.')}</strong><p>{t('This is a record of activity and choices, not an assessment of how you feel.')}</p></div></div>
        {session.prompt === 'post' && <div className="session-prompt session-prompt-post"><div><strong>{t('Would a short reflection or quiet moment feel useful?')}</strong><p>{t('Only continue if you want to. You can leave this blank.')}</p></div><label>{t('Optional reflection')}<textarea value={session.reflection} maxLength={1000} rows="2" onChange={(event) => dispatch({ type: 'REFLECT', value: event.target.value })} /></label><div className="session-controls"><button type="button" className="session-primary" onClick={() => dispatch({ type: 'POST_ACCEPT' })}>{t('Keep reflection in summary')}</button><button type="button" className="session-secondary" onClick={() => dispatch({ type: 'DISMISS', promptName: 'Post-session' })}>{t('Not now')}</button></div></div>}
        {session.reflection && <p className="session-reflection-summary"><strong>{t('Your reflection')}</strong><br />{session.reflection}</p>}
        <div className="session-summary-stats"><span><strong>{clock(session.elapsed)}</strong>{t('Active session time')}</span><span><strong>{session.pauses}</strong>{t('Pauses')}</span><span><strong>{session.tasks}</strong>{t('Tasks noted')}</span><span><strong>{session.helpRequests}</strong>{t('Help requests noted')}</span></div>
        <details className="session-timeline"><summary>{t('Session timeline')} · {session.events.length}</summary><ol>{session.events.map((item) => <li key={item.id}><time>{clock(item.elapsed)}</time><span>{t(item.label)}</span></li>)}</ol></details>
        <button type="button" className="session-secondary session-new" onClick={() => dispatch({ type: 'RESET' })}>{t('Start a new session')}</button>
      </div>}
    </section>
  );
}
