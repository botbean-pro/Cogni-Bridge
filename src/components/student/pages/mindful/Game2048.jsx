import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

// After 2048 by Gabriele Cirulli (MIT). Rewritten for Cogni-Bridge: no timer,
// and the game never ends on its own without saying what to do next.
const SIZE = 4;
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const BEST_KEY = 'cognibridge_mindful_2048_best';

const lineIndexes = (direction) => {
  const lines = [];
  for (let line = 0; line < SIZE; line += 1) {
    const indexes = [];
    for (let step = 0; step < SIZE; step += 1) {
      if (direction === 'left') indexes.push(line * SIZE + step);
      else if (direction === 'right') indexes.push(line * SIZE + (SIZE - 1 - step));
      else if (direction === 'up') indexes.push(step * SIZE + line);
      else indexes.push((SIZE - 1 - step) * SIZE + line);
    }
    lines.push(indexes);
  }
  return lines;
};

const collapse = (values) => {
  const filled = values.filter(Boolean);
  const merged = [];
  let gained = 0;
  for (let i = 0; i < filled.length; i += 1) {
    if (filled[i] === filled[i + 1]) {
      merged.push(filled[i] * 2);
      gained += filled[i] * 2;
      i += 1;
    } else {
      merged.push(filled[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { merged, gained };
};

const slide = (cells, direction) => {
  const next = [...cells];
  let gained = 0;
  let moved = false;
  lineIndexes(direction).forEach((indexes) => {
    const result = collapse(indexes.map((index) => cells[index]));
    gained += result.gained;
    indexes.forEach((index, position) => {
      if (next[index] !== result.merged[position]) moved = true;
      next[index] = result.merged[position];
    });
  });
  return { cells: next, gained, moved };
};

const withNewTile = (cells) => {
  const free = cells.map((value, index) => (value ? -1 : index)).filter((index) => index >= 0);
  if (!free.length) return cells;
  const next = [...cells];
  next[free[Math.floor(Math.random() * free.length)]] = Math.random() < 0.9 ? 2 : 4;
  return next;
};

const freshBoard = () => withNewTile(withNewTile(Array(SIZE * SIZE).fill(0)));
const readBest = () => {
  try {
    const saved = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
};

export function Game2048({ t, onComplete, onStatus }) {
  const [game, setGame] = useState(() => ({ cells: freshBoard(), score: 0 }));
  const [best, setBest] = useState(readBest);
  const [won, setWon] = useState(false);
  const awarded = useRef(false);
  const swipeStart = useRef(null);
  const latest = useRef(game);
  latest.current = game;
  const { cells, score } = game;

  const stuck = !cells.includes(0) && DIRECTIONS.every((direction) => !slide(cells, direction).moved);

  const play = (direction) => {
    const current = latest.current;
    const result = slide(current.cells, direction);
    if (!result.moved) return;
    const next = { cells: withNewTile(result.cells), score: current.score + result.gained };
    latest.current = next;
    setGame(next);
    if (next.score > best) {
      setBest(next.score);
      try { localStorage.setItem(BEST_KEY, String(next.score)); } catch { /* The score still shows for this visit. */ }
    }
    if (next.cells.includes(2048) && !awarded.current) {
      awarded.current = true;
      setWon(true);
      onComplete();
    }
  };

  const restart = () => {
    awarded.current = false;
    setWon(false);
    const fresh = { cells: freshBoard(), score: 0 };
    latest.current = fresh;
    setGame(fresh);
    onStatus('');
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key];
      if (!direction) return;
      event.preventDefault();
      play(direction);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const startSwipe = (event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; };
  const endSwipe = (event) => {
    if (!swipeStart.current) return;
    const dx = event.clientX - swipeStart.current.x;
    const dy = event.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? 'right' : 'left');
    else play(dy > 0 ? 'down' : 'up');
  };

  const arrows = [
    { direction: 'up', Icon: ArrowUp, label: t('Move up') },
    { direction: 'left', Icon: ArrowLeft, label: t('Move left') },
    { direction: 'down', Icon: ArrowDown, label: t('Move down') },
    { direction: 'right', Icon: ArrowRight, label: t('Move right') },
  ];

  return <div className="mc-2048">
    <p>{t('Arrow keys, swipes and the buttons all work.')}</p>
    <p className="mc-scoreline"><strong>{t('Score {score}', { score })}</strong><span>{t('Best {score}', { score: best })}</span></p>
    <div className="mc-2048-board" onPointerDown={startSwipe} onPointerUp={endSwipe} role="grid" aria-label={t('2048 board')}>
      {cells.map((value, index) => <span key={index} className={`mc-tile mc-tile-${Math.min(value, 2048)}`} role="gridcell" aria-label={value ? String(value) : t('Empty space')}>{value || ''}</span>)}
    </div>
    <div className="mc-pad">{arrows.map(({ direction, Icon, label }) => <button key={direction} type="button" className={`mc-pad-${direction}`} aria-label={label} onClick={() => play(direction)}><Icon size={18} /></button>)}</div>
    <p aria-live="polite">{won ? t('You reached 2048! Keep going or start a fresh board.') : stuck ? t('No moves left. Start a fresh board whenever you like.') : ''}</p>
    <div className="mc-controls"><button type="button" onClick={restart}>{t('New board')}</button></div>
  </div>;
}
