import React, { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { coachQuestions } from './wordBank';

// A two-choice vocabulary workout in the shape of Google's Word Coach, written
// here so it works offline, inside the app, and without leaving for a search page.
const ROUND = 10;
const dealRound = () => [...coachQuestions]
  .sort(() => Math.random() - 0.5)
  .slice(0, ROUND)
  .map((question) => ({ ...question, options: Math.random() < 0.5 ? [question.answer, question.other] : [question.other, question.answer] }));

export function WordCoach({ t, onComplete, onStatus }) {
  const [questions, setQuestions] = useState(dealRound);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState('');
  const [correct, setCorrect] = useState(0);
  const awarded = useRef(false);
  const question = questions[round];
  const done = round >= questions.length;

  const pick = (option) => {
    if (picked) return;
    setPicked(option);
    if (option === question.answer) setCorrect((count) => count + 1);
  };

  const next = () => {
    setPicked('');
    if (round + 1 < questions.length) {
      setRound(round + 1);
      return;
    }
    setRound(questions.length);
    if (!awarded.current) {
      awarded.current = true;
      onComplete();
    }
  };

  const restart = () => {
    awarded.current = false;
    setQuestions(dealRound());
    setRound(0);
    setPicked('');
    setCorrect(0);
    onStatus('');
  };

  if (done) {
    return <div className="mc-coach">
      <h2>{t('Round finished')}</h2>
      <p aria-live="polite">{t('You answered {score} of {total} correctly.', { score: correct, total: questions.length })}</p>
      <p>{t('Every round uses a different set of words, so there is always something new to meet.')}</p>
      <div className="mc-controls"><button type="button" onClick={restart}>{t('Another round')}</button></div>
    </div>;
  }

  return <div className="mc-coach">
    <p className="mc-scoreline"><strong>{t('Word {n} of {total}', { n: round + 1, total: questions.length })}</strong><span>{t('{score} right so far', { score: correct })}</span></p>
    <div className="mc-coach-progress" aria-hidden="true"><span style={{ width: `${(round / questions.length) * 100}%` }} /></div>
    <p className="mc-coach-prompt">{t(question.kind === 'same' ? 'Which word means the same as {word}?' : 'Which word means the opposite of {word}?', { word: question.word })}</p>
    <div className="mc-coach-options">
      {question.options.map((option) => <button
        key={option}
        type="button"
        className={picked ? (option === question.answer ? 'is-right' : option === picked ? 'is-wrong' : '') : ''}
        disabled={Boolean(picked)}
        onClick={() => pick(option)}
      >{option}</button>)}
    </div>
    <p aria-live="polite">{!picked ? t('Take your time. A wrong guess costs nothing.') : picked === question.answer ? t('That is right!') : t('Not quite — the answer is {answer}.', { answer: question.answer })}</p>
    <div className="mc-controls"><button type="button" disabled={!picked} onClick={next}>{round + 1 === questions.length ? t('See your round') : t('Next word')} <ArrowRight size={16} /></button></div>
  </div>;
}
