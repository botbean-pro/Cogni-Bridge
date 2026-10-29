import React, { useRef, useState } from 'react';

// Lights Out, the classic grid puzzle. Boards are built by switching a solved
// board at random, so every board can always be solved again.
const SIZE = 5;
const neighbours = (index) => {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const cells = [index];
  if (row > 0) cells.push(index - SIZE);
  if (row < SIZE - 1) cells.push(index + SIZE);
  if (column > 0) cells.push(index - 1);
  if (column < SIZE - 1) cells.push(index + 1);
  return cells;
};

const press = (lights, index) => {
  const next = [...lights];
  neighbours(index).forEach((cell) => { next[cell] = !next[cell]; });
  return next;
};

const freshBoard = () => {
  let lights = Array(SIZE * SIZE).fill(false);
  for (let step = 0; step < 8; step += 1) lights = press(lights, Math.floor(Math.random() * SIZE * SIZE));
  return lights.some(Boolean) ? lights : freshBoard();
};

export function LightsOut({ t, onComplete, onStatus }) {
  const [lights, setLights] = useState(freshBoard);
  const [moves, setMoves] = useState(0);
  const awarded = useRef(false);
  const lit = lights.filter(Boolean).length;

  const tap = (index) => {
    const next = press(lights, index);
    setLights(next);
    setMoves((count) => count + 1);
    if (!next.some(Boolean) && !awarded.current) {
      awarded.current = true;
      onComplete();
    }
  };

  const restart = () => {
    awarded.current = false;
    setMoves(0);
    setLights(freshBoard());
    onStatus('');
  };

  return <div className="mc-lights">
    <p className="mc-scoreline"><strong>{t('{count} lights still on', { count: lit })}</strong><span>{t('{count} taps', { count: moves })}</span></p>
    <div className="mc-lights-board">
      {lights.map((on, index) => <button
        key={index}
        type="button"
        className={on ? 'is-on' : ''}
        aria-pressed={on}
        aria-label={t(on ? 'Light {n}, on' : 'Light {n}, off', { n: index + 1 })}
        onClick={() => tap(index)}
      >{on ? '●' : '○'}</button>)}
    </div>
    <p aria-live="polite">{lit ? '' : t('Every light is off. Beautifully worked out!')}</p>
    <div className="mc-controls"><button type="button" onClick={restart}>{t('New board')}</button></div>
  </div>;
}
