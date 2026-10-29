import React, { useRef, useState } from 'react';
import { searchThemes } from './wordBank';

// An untimed word search. Drag across the letters, or tap the first letter and
// then the last one, whichever is easier.
const SIZE = 11;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
const key = (x, y) => `${x},${y}`;

const buildGrid = (words) => {
  const cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
  const placed = [];
  words.forEach((word) => {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      const x = Math.floor(Math.random() * SIZE);
      const y = Math.floor(Math.random() * SIZE);
      const endX = x + dx * (word.length - 1);
      const endY = y + dy * (word.length - 1);
      if (endX < 0 || endX >= SIZE || endY < 0 || endY >= SIZE) continue;
      const fits = [...word].every((letter, step) => {
        const current = cells[y + dy * step][x + dx * step];
        return !current || current === letter;
      });
      if (!fits) continue;
      [...word].forEach((letter, step) => { cells[y + dy * step][x + dx * step] = letter; });
      placed.push(word);
      return;
    }
  });
  cells.forEach((row, y) => row.forEach((letter, x) => {
    if (!letter) cells[y][x] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }));
  return { cells, words: placed };
};

const freshPuzzle = () => {
  const theme = searchThemes[Math.floor(Math.random() * searchThemes.length)];
  return { theme: theme.theme, ...buildGrid(theme.words) };
};

const pathBetween = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  return Array.from({ length: steps + 1 }, (_, step) => ({ x: from.x + stepX * step, y: from.y + stepY * step }));
};

export function WordSearch({ t, onComplete, onStatus }) {
  const [puzzle, setPuzzle] = useState(freshPuzzle);
  const [found, setFound] = useState([]);
  // Cell key -> the index of the word found there, so each word keeps its own colour.
  const [foundCells, setFoundCells] = useState({});
  const [anchor, setAnchor] = useState(null);
  const [head, setHead] = useState(null);
  const [note, setNote] = useState('');
  const awarded = useRef(false);
  const dragging = useRef(false);
  const remaining = puzzle.words.filter((word) => !found.includes(word));
  const path = anchor && head ? pathBetween(anchor, head) : null;
  const inPath = new Set((path || []).map((cell) => key(cell.x, cell.y)));

  const settle = (to) => {
    const cells = anchor && to ? pathBetween(anchor, to) : null;
    setAnchor(null);
    setHead(null);
    if (!cells || cells.length < 2) return;
    const letters = cells.map((cell) => puzzle.cells[cell.y][cell.x]).join('');
    const match = remaining.find((word) => word === letters || word === [...letters].reverse().join(''));
    if (!match) {
      setNote(t('Not a word from the list yet. Try another line.'));
      return;
    }
    const nextFound = [...found, match];
    const colour = puzzle.words.indexOf(match) % 6;
    setFound(nextFound);
    setFoundCells((current) => ({ ...current, ...Object.fromEntries(cells.map((cell) => [key(cell.x, cell.y), colour])) }));
    setNote(t('Found {word}!', { word: match }));
    if (nextFound.length === puzzle.words.length && !awarded.current) {
      awarded.current = true;
      onComplete();
    }
  };

  const onCellDown = (event, x, y) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (anchor && !dragging.current) {
      settle({ x, y });
      return;
    }
    dragging.current = true;
    setAnchor({ x, y });
    setHead({ x, y });
  };

  const onCellEnter = (x, y) => { if (dragging.current) setHead({ x, y }); };

  const onCellUp = (x, y) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (anchor && anchor.x === x && anchor.y === y) {
      setHead({ x, y });
      return;
    }
    settle({ x, y });
  };

  const restart = () => {
    awarded.current = false;
    setPuzzle(freshPuzzle());
    setFound([]);
    setFoundCells({});
    setAnchor(null);
    setHead(null);
    setNote('');
    onStatus('');
  };

  return <div className="mc-wordsearch">
    <p>{t('Find every word in the grid. Drag across the letters, or tap the first letter and then the last.')}</p>
    <p className="mc-scoreline"><strong>{t('{done} of {total} words found', { done: found.length, total: puzzle.words.length })}</strong><span>{t(puzzle.theme)}</span></p>
    <div className="mc-wordsearch-grid" style={{ '--search-columns': SIZE }} onPointerLeave={() => { if (!dragging.current) return; dragging.current = false; setAnchor(null); setHead(null); }}>
      {puzzle.cells.map((row, y) => row.map((letter, x) => <button
        key={key(x, y)}
        type="button"
        className={`${foundCells[key(x, y)] === undefined ? '' : `is-found found-${foundCells[key(x, y)]}`}${inPath.has(key(x, y)) ? ' is-tracing' : ''}`}
        aria-label={t('Letter {letter}, row {row}, column {column}', { letter, row: y + 1, column: x + 1 })}
        onPointerDown={(event) => onCellDown(event, x, y)}
        onPointerEnter={() => onCellEnter(x, y)}
        onPointerUp={() => onCellUp(x, y)}
      >{letter}</button>))}
    </div>
    <ul className="mc-wordsearch-list">{puzzle.words.map((word, index) => <li key={word} className={found.includes(word) ? `is-found found-${index % 6}` : ''}>{word}</li>)}</ul>
    <p aria-live="polite">{remaining.length ? note : t('You found every word. Lovely searching!')}</p>
    <div className="mc-controls"><button type="button" onClick={restart}>{t('New puzzle')}</button></div>
  </div>;
}
