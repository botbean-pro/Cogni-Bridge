import React, { useRef, useState } from 'react';

// Sensory Garden: choose a thing, choose a space. Nothing can be done wrong,
// and the garden is never saved anywhere.
const scenes = ['Garden', 'Beach', 'Sky'];
const things = ['🌼', '🍃', '🪨', '🌷', '☁️'];
const PLACED = 6;

export function SensoryGarden({ t, onComplete, onStatus }) {
  const [scene, setScene] = useState('Garden');
  const [thing, setThing] = useState('🌼');
  const [objects, setObjects] = useState([]);
  const awarded = useRef(false);

  const place = (spot) => {
    const next = [...objects, { spot, thing }];
    setObjects(next);
    if (next.length >= PLACED && !awarded.current) {
      awarded.current = true;
      onComplete();
    }
  };

  const clear = () => {
    awarded.current = false;
    setObjects([]);
    onStatus('');
  };

  return <div className="mc-garden">
    <div className="mc-controls">
      <label>{t('Scene')} <select value={scene} onChange={(event) => setScene(event.target.value)}>{scenes.map((name) => <option key={name} value={name}>{t(name)}</option>)}</select></label>
      {things.map((option) => <button type="button" key={option} aria-pressed={thing === option} aria-label={t('Choose {thing}', { thing: option })} onClick={() => setThing(option)}>{option}</button>)}
      <button type="button" onClick={clear}>{t('Clear garden')}</button>
      <button type="button" onClick={() => setObjects((current) => current.slice(0, -1))}>{t('Undo')}</button>
    </div>
    <div className={`mc-garden-board scene-${scene.toLowerCase()}`} aria-label={t('{scene} scene', { scene: t(scene) })}>
      {Array.from({ length: 12 }, (_, spot) => <button key={spot} type="button" aria-label={t('Place {thing} in spot {n}', { thing, n: spot + 1 })} onClick={() => place(spot)}>
        {objects.filter((item) => item.spot === spot).map((item, index) => <span key={index}>{item.thing}</span>)}
      </button>)}
    </div>
  </div>;
}
