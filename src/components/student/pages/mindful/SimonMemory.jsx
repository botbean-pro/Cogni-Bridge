import React, { useEffect, useRef, useState } from 'react';

// Simon: watch a pattern of colours, then repeat it. Sound is off until the
// student switches it on, and a wrong tap replays the round instead of ending it.
const pads = [
  { id: 'green', glyph: '●', tone: 330 },
  { id: 'amber', glyph: '■', tone: 392 },
  { id: 'blue', glyph: '▲', tone: 494 },
  { id: 'plum', glyph: '◆', tone: 587 },
];
const GOAL = 6;
const padLabels = { green: 'Green circle', amber: 'Amber square', blue: 'Blue triangle', plum: 'Plum diamond' };

const playTone = (frequency) => {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  const context = new Audio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.12, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.34);
  window.setTimeout(() => context.close(), 600);
};

export function SimonMemory({ settings, t, onComplete, onStatus }) {
  const [sequence, setSequence] = useState([]);
  const [step, setStep] = useState(0);
  const [showing, setShowing] = useState(-1);
  const [watching, setWatching] = useState(false);
  const [sound, setSound] = useState(false);
  const [note, setNote] = useState('');
  const awarded = useRef(false);
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const showSequence = (order) => {
    clearTimers();
    setWatching(true);
    setStep(0);
    order.forEach((pad, position) => {
      timers.current.push(window.setTimeout(() => {
        setShowing(pad);
        if (sound) playTone(pads[pad].tone);
      }, position * 700 + 400));
      timers.current.push(window.setTimeout(() => setShowing(-1), position * 700 + 1000));
    });
    timers.current.push(window.setTimeout(() => setWatching(false), order.length * 700 + 500));
  };

  const nextRound = (current) => {
    const order = [...current, Math.floor(Math.random() * pads.length)];
    setSequence(order);
    setNote('');
    showSequence(order);
  };

  const tap = (pad) => {
    if (watching || !sequence.length) return;
    if (sound) playTone(pads[pad].tone);
    if (sequence[step] !== pad) {
      setNote(t('Not that one. Watch the pattern again — nothing is lost.'));
      showSequence(sequence);
      return;
    }
    if (step + 1 < sequence.length) {
      setStep(step + 1);
      return;
    }
    if (sequence.length >= GOAL && !awarded.current) {
      awarded.current = true;
      onComplete();
    }
    setNote(t('Right pattern! Here comes one more.'));
    nextRound(sequence);
  };

  const restart = () => {
    clearTimers();
    awarded.current = false;
    setSequence([]);
    setStep(0);
    setShowing(-1);
    setWatching(false);
    setNote('');
    onStatus('');
  };

  return <div className="mc-simon">
    <p className="mc-scoreline"><strong>{t('Round {n}', { n: sequence.length || 1 })}</strong><span>{t('Goal: round {n}', { n: GOAL })}</span></p>
    <div className="mc-simon-pads">
      {pads.map((pad, index) => <button
        key={pad.id}
        type="button"
        className={`mc-simon-${pad.id}${showing === index ? ' is-lit' : ''}${settings.motion ? '' : ' reduced'}`}
        disabled={watching || !sequence.length}
        aria-label={t(padLabels[pad.id])}
        onClick={() => tap(index)}
      >{pad.glyph}</button>)}
    </div>
    <p aria-live="polite">{watching ? t('Watch closely…') : sequence.length ? note || t('Your turn.') : t('Press Start the pattern when you are ready.')}</p>
    <div className="mc-controls">
      <button type="button" onClick={() => (sequence.length ? restart() : nextRound([]))}>{sequence.length ? t('Start over') : t('Start the pattern')}</button>
      <button type="button" aria-pressed={sound} onClick={() => setSound((value) => !value)}>{sound ? t('Sound on') : t('Sound off')}</button>
    </div>
  </div>;
}
