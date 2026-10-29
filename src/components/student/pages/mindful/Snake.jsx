import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from 'lucide-react';

// Snake, the arcade classic. The speed never increases, and the goal is a
// length rather than a high score. Easy wraps at the edges so a student can
// never be cornered; Hard ends the run on a wall as well.
const SIZE = 11;
const GOAL = 12;
const TICK = 230;
const START = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
const FACING = { '1,0': 0, '0,1': 90, '-1,0': 180, '0,-1': 270 };

const placeFruit = (snake) => {
  const free = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)];
};

const freshBoard = () => ({ snake: START, fruit: placeFruit(START), facing: 0 });

export function Snake({ settings, t, onComplete, onStatus }) {
  const [board, setBoard] = useState(freshBoard);
  const [mode, setMode] = useState('Easy');
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState('');
  const direction = useRef({ x: 1, y: 0 });
  const queued = useRef({ x: 1, y: 0 });
  const awarded = useRef(false);
  const latest = useRef(board);
  latest.current = board;
  const hardMode = mode === 'Hard';
  const hard = useRef(hardMode);
  hard.current = hardMode;
  const { snake, fruit, facing } = board;

  const steer = (x, y) => {
    if (direction.current.x === -x && direction.current.y === -y) return;
    queued.current = { x, y };
  };

  const restart = () => {
    awarded.current = false;
    direction.current = { x: 1, y: 0 };
    queued.current = { x: 1, y: 0 };
    setEnded('');
    const fresh = freshBoard();
    latest.current = fresh;
    setBoard(fresh);
    setRunning(false);
    onStatus('');
  };

  const chooseMode = (next) => {
    if (next === mode) return;
    setMode(next);
    restart();
  };

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      const current = latest.current;
      direction.current = queued.current;
      const step = { x: current.snake[0].x + direction.current.x, y: current.snake[0].y + direction.current.y };
      const offBoard = step.x < 0 || step.x >= SIZE || step.y < 0 || step.y >= SIZE;
      if (offBoard && hard.current) {
        setRunning(false);
        setEnded('wall');
        return;
      }
      const head = { x: (step.x + SIZE) % SIZE, y: (step.y + SIZE) % SIZE };
      if (current.snake.some((part) => part.x === head.x && part.y === head.y)) {
        setRunning(false);
        setEnded('self');
        return;
      }
      const ate = head.x === current.fruit.x && head.y === current.fruit.y;
      const grown = [head, ...(ate ? current.snake : current.snake.slice(0, -1))];
      const next = {
        snake: grown,
        fruit: ate ? placeFruit(grown) : current.fruit,
        facing: FACING[`${direction.current.x},${direction.current.y}`] ?? current.facing,
      };
      latest.current = next;
      setBoard(next);
      if (grown.length >= GOAL && !awarded.current) {
        awarded.current = true;
        onComplete();
      }
    }, TICK);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
      if (!move) return;
      event.preventDefault();
      steer(...move);
      if (!ended) setRunning(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ended]);

  const arrows = [
    { move: [0, -1], Icon: ArrowUp, name: 'up', label: t('Move up') },
    { move: [-1, 0], Icon: ArrowLeft, name: 'left', label: t('Move left') },
    { move: [0, 1], Icon: ArrowDown, name: 'down', label: t('Move down') },
    { move: [1, 0], Icon: ArrowRight, name: 'right', label: t('Move right') },
  ];

  return <div className="mc-snake">
    <div className="mc-mode-switch" role="group" aria-label={t('Mode')}>
      <span>{t('Mode')}</span>
      {['Easy', 'Hard'].map((option) => <button key={option} type="button" className={mode === option ? 'active' : ''} aria-pressed={mode === option} onClick={() => chooseMode(option)}>{t(option)}</button>)}
    </div>
    <p>{t(hardMode ? 'Hard: a wall ends the run, and so does your own tail.' : 'Easy: the edges wrap around, so only your own tail ends the run.')}</p>
    <p className="mc-scoreline"><strong>{t('Length {count}', { count: snake.length })}</strong><span>{t('Goal: length {count}', { count: GOAL })}</span></p>
    <div className={`mc-snake-board${hardMode ? ' is-hard' : ''}`} style={{ '--snake-columns': SIZE }} aria-label={t('Snake board')}>
      {Array.from({ length: SIZE * SIZE }, (_, index) => {
        const x = index % SIZE;
        const y = Math.floor(index / SIZE);
        const part = snake.findIndex((cell) => cell.x === x && cell.y === y);
        if (part === 0) {
          return <span key={index} className="is-head">
            <svg viewBox="0 0 20 20" aria-hidden="true" style={{ transform: `rotate(${facing}deg)` }}>
              <circle className="mc-snake-eye" cx="11.5" cy="5.8" r="3.4" />
              <circle className="mc-snake-eye" cx="11.5" cy="14.2" r="3.4" />
              <circle className="mc-snake-pupil" cx="13.4" cy="5.8" r="1.7" />
              <circle className="mc-snake-pupil" cx="13.4" cy="14.2" r="1.7" />
              <path className="mc-snake-smile" d="M15.4 8.4 A 3.4 3.4 0 0 0 15.4 11.6" />
              <path className="mc-snake-tongue" d="M18.4 10 h2.6 m0 -1.1 v2.2" />
            </svg>
          </span>;
        }
        if (part > 0) return <span key={index} className="is-body" />;
        return <span key={index} className={fruit.x === x && fruit.y === y ? 'is-fruit' : ''} />;
      })}
    </div>
    <div className="mc-pad">{arrows.map(({ move, Icon, name, label }) => <button key={name} type="button" className={`mc-pad-${name}`} aria-label={label} onClick={() => { steer(...move); if (!ended) setRunning(true); }}><Icon size={18} /></button>)}</div>
    <p aria-live="polite">{ended === 'wall' ? t('The snake hit a wall. Start again whenever you are ready.') : ended === 'self' ? t('The snake met itself. Start again whenever you are ready.') : snake.length >= GOAL ? t('You grew the whole snake. Nicely steered!') : ''}</p>
    <div className="mc-controls">
      <button type="button" disabled={Boolean(ended)} onClick={() => setRunning((value) => !value)}>{running ? <Pause size={16} /> : <Play size={16} />} {running ? t('Pause') : t('Continue')}</button>
      <button type="button" onClick={restart}>{t('New game')}</button>
    </div>
  </div>;
}
