import React, { useRef, useState } from 'react';

// Flow Pipes: turn the pieces until water from the tap reaches every pipe.
// Each board is grown as a random tree over the grid, so it always has an answer.
const SIZE = 5;
const UP = 1;
const RIGHT = 2;
const DOWN = 4;
const LEFT = 8;
const steps = [
  { bit: UP, dx: 0, dy: -1, opposite: DOWN },
  { bit: RIGHT, dx: 1, dy: 0, opposite: LEFT },
  { bit: DOWN, dx: 0, dy: 1, opposite: UP },
  { bit: LEFT, dx: -1, dy: 0, opposite: RIGHT },
];
const rotate = (mask) => ((mask << 1) | (mask >> 3)) & 15;
const indexAt = (x, y) => y * SIZE + x;

const growBoard = () => {
  const masks = Array(SIZE * SIZE).fill(0);
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const x = current % SIZE;
    const y = Math.floor(current / SIZE);
    const open = steps
      .map((step) => ({ step, x: x + step.dx, y: y + step.dy }))
      .filter(({ x: nx, y: ny }) => nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && !seen.has(indexAt(nx, ny)));
    if (!open.length) {
      stack.pop();
      continue;
    }
    const pick = open[Math.floor(Math.random() * open.length)];
    const next = indexAt(pick.x, pick.y);
    masks[current] |= pick.step.bit;
    masks[next] |= pick.step.opposite;
    seen.add(next);
    stack.push(next);
  }
  return masks.map((mask) => {
    let scrambled = mask;
    const turns = Math.floor(Math.random() * 4);
    for (let turn = 0; turn < turns; turn += 1) scrambled = rotate(scrambled);
    return scrambled;
  });
};

const litCells = (masks) => {
  const lit = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const current = queue.shift();
    const x = current % SIZE;
    const y = Math.floor(current / SIZE);
    steps.forEach((step) => {
      if (!(masks[current] & step.bit)) return;
      const nx = x + step.dx;
      const ny = y + step.dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return;
      const next = indexAt(nx, ny);
      if (lit.has(next) || !(masks[next] & step.opposite)) return;
      lit.add(next);
      queue.push(next);
    });
  }
  return lit;
};

export function FlowPipes({ t, onComplete, onStatus }) {
  const [masks, setMasks] = useState(growBoard);
  const [turns, setTurns] = useState(0);
  const awarded = useRef(false);
  const lit = litCells(masks);
  const solved = lit.size === SIZE * SIZE;

  const turn = (index) => {
    const next = masks.map((mask, cell) => (cell === index ? rotate(mask) : mask));
    setMasks(next);
    setTurns((count) => count + 1);
    if (litCells(next).size === SIZE * SIZE && !awarded.current) {
      awarded.current = true;
      onComplete();
    }
  };

  const restart = () => {
    awarded.current = false;
    setTurns(0);
    setMasks(growBoard());
    onStatus('');
  };

  return <div className="mc-pipes">
    <p className="mc-scoreline"><strong>{t('{done} of {total} pipes flowing', { done: lit.size, total: SIZE * SIZE })}</strong><span>{t('{count} turns', { count: turns })}</span></p>
    <div className="mc-pipes-board" style={{ '--pipe-columns': SIZE }}>
      {masks.map((mask, index) => <button
        key={index}
        type="button"
        className={`${lit.has(index) ? 'is-lit' : ''}${index === 0 ? ' is-source' : ''}`}
        aria-label={t(lit.has(index) ? 'Pipe {n}, flowing. Turn it.' : 'Pipe {n}, dry. Turn it.', { n: index + 1 })}
        onClick={() => turn(index)}
      >
        <svg viewBox="0 0 40 40" aria-hidden="true">
          {steps.map((step) => (mask & step.bit)
            ? <line key={step.bit} x1="20" y1="20" x2={20 + step.dx * 20} y2={20 + step.dy * 20} />
            : null)}
          <circle cx="20" cy="20" r={index === 0 ? 7 : 4} />
        </svg>
      </button>)}
    </div>
    <p aria-live="polite">{solved ? t('Water reaches every pipe. Lovely untangling!') : ''}</p>
    <div className="mc-controls"><button type="button" onClick={restart}>{t('New board')}</button></div>
  </div>;
}
