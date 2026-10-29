import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

// Breathing Buddy: a slow in-and-out cue. With animation switched off the orb
// changes colour instead of changing size.
const BREATHS = 4;

export function BreathingBuddy({ settings, t, onComplete, onStatus }) {
  const [phase, setPhase] = useState('Breathe in');
  const [breathing, setBreathing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [breaths, setBreaths] = useState(0);
  const awarded = useRef(false);
  const latest = useRef({ phase, breaths });
  latest.current = { phase, breaths };

  useEffect(() => {
    if (!breathing || paused) return undefined;
    const id = window.setInterval(() => {
      const current = latest.current;
      const next = current.phase === 'Breathe out' ? 'Breathe in' : 'Breathe out';
      const count = next === 'Breathe in' ? current.breaths + 1 : current.breaths;
      latest.current = { phase: next, breaths: count };
      setPhase(next);
      setBreaths(count);
      if (count >= BREATHS && !awarded.current) {
        awarded.current = true;
        onComplete();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [breathing, paused]);

  const restart = () => {
    awarded.current = false;
    setBreathing(false);
    setPaused(false);
    setPhase('Breathe in');
    setBreaths(0);
    latest.current = { phase: 'Breathe in', breaths: 0 };
    onStatus('');
  };

  const active = breathing && !paused;
  return <div className="mc-breath">
    <p aria-live="polite">{active ? t(phase) : paused ? t('Paused') : t('Ready when you are')}</p>
    <div className={`mc-breath-orb${active && settings.motion ? ` ${phase === 'Breathe in' ? 'grow' : 'shrink'}` : ''}${active && !settings.motion ? ' hue' : ''}`} aria-hidden="true">{active ? '☁' : '☼'}</div>
    <p className="mc-scoreline"><strong>{t('{count} slow breaths', { count: breaths })}</strong></p>
    <div className="mc-controls">
      <button type="button" aria-pressed={active} onClick={() => { if (!breathing) { setBreathing(true); setPaused(false); setPhase('Breathe in'); return; } setPaused((value) => !value); }}>
        {active ? <Pause size={16} /> : <Play size={16} />} {!breathing ? t('Begin gentle breathing') : paused ? t('Continue') : t('Pause')}
      </button>
      <button type="button" onClick={restart}>{t('Start over')}</button>
    </div>
  </div>;
}
