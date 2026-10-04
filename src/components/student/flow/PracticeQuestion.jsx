import React, { useState } from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";

export function PracticeQuestion({ quiz }) {
  const [selected, setSelected] = useState(null);
  const answered = selected !== null;
  const isCorrect = selected === quiz.answerIndex;

  return (
    <section className="practice-question" aria-label="Multiple-choice practice question">
      <h3>{quiz.question}</h3>
      <div className="practice-options">
        {quiz.options.map((option, index) => {
          const chosen = selected === index;
          const correct = answered && index === quiz.answerIndex;
          return (
            <button
              key={`${index}-${option}`}
              className={`practice-option${chosen ? " selected" : ""}${correct ? " correct" : ""}`}
              onClick={() => !answered && setSelected(index)}
              disabled={answered}
            >
              <span>{String.fromCharCode(65 + index)}.</span> {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`practice-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status">
          {isCorrect ? <CheckCircle2 size={17} /> : <X size={17} />}
          <span><strong>{isCorrect ? "That's right!" : "Not quite."}</strong> {quiz.explanation}</span>
        </div>
      )}
      {answered && (
        <button className="practice-reset" onClick={() => setSelected(null)}>
          <RotateCcw size={15} /> Try again
        </button>
      )}
    </section>
  );
}
