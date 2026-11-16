import React, {useState} from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';

/**
 * Renders a plain string, turning `backtick` segments into <code> spans,
 * so explanations/prompts can mention identifiers without needing JSX.
 */
function renderInline(text) {
  if (!text) return null;
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function makeEmptyAnswers(questions) {
  return questions.map(() => ({locked: false, chosen: []}));
}

function isCorrect(question, chosen) {
  if (question.multiple) {
    const correct = [...(question.correctIndices || [])].sort();
    const picked = [...chosen].sort();
    return correct.length === picked.length && correct.every((v, i) => v === picked[i]);
  }
  return chosen[0] === question.correctIndex;
}

/**
 * Interactive MCQ practice block.
 *
 * questions: Array<{
 *   id?: string,
 *   prompt?: string,                 // defaults to "Predict the output:"
 *   code?: string,
 *   language?: string,               // defaults to "js"
 *   options: string[],
 *   correctIndex?: number,           // single-choice (default mode)
 *   multiple?: boolean,              // set true for multi-select questions
 *   correctIndices?: number[],       // used when multiple: true
 *   explanation: string,
 * }>
 */
export default function Quiz({questions, title}) {
  const [answers, setAnswers] = useState(() => makeEmptyAnswers(questions));

  const lockedCount = answers.filter((a) => a.locked).length;
  const correctCount = answers.filter((a, i) => a.locked && isCorrect(questions[i], a.chosen)).length;
  const allDone = lockedCount === questions.length;

  function toggleOption(qIndex, optIndex) {
    setAnswers((prev) => {
      const next = prev.map((a) => ({...a, chosen: [...a.chosen]}));
      const current = next[qIndex];
      if (current.locked) return prev;
      const q = questions[qIndex];
      if (q.multiple) {
        const pos = current.chosen.indexOf(optIndex);
        if (pos === -1) current.chosen.push(optIndex);
        else current.chosen.splice(pos, 1);
      } else {
        current.chosen = [optIndex];
        current.locked = true;
      }
      return next;
    });
  }

  function submitMultiple(qIndex) {
    setAnswers((prev) => {
      const next = prev.map((a) => ({...a, chosen: [...a.chosen]}));
      if (next[qIndex].chosen.length > 0) next[qIndex].locked = true;
      return next;
    });
  }

  function reset() {
    setAnswers(makeEmptyAnswers(questions));
  }

  return (
    <div className={styles.quiz}>
      <div className={styles.scoreBar}>
        <span className={styles.scoreText}>
          {title ? <strong>{title} — </strong> : null}
          Score: <strong>{correctCount}</strong> / {lockedCount} answered
          {allDone ? <> — {Math.round((correctCount / questions.length) * 100)}% overall</> : null}
        </span>
        <button type="button" className={styles.resetButton} onClick={reset}>
          ↺ Reset quiz
        </button>
      </div>

      {allDone && (
        <div className={styles.summary}>
          🎉 Done! You scored <strong>{correctCount} / {questions.length}</strong>.
        </div>
      )}

      <ol className={styles.questionList}>
        {questions.map((q, qIndex) => {
          const answer = answers[qIndex];
          const locked = answer.locked;
          const correct = locked && isCorrect(q, answer.chosen);

          return (
            <li key={q.id || qIndex} className={styles.questionCard}>
              <p className={styles.prompt}>{renderInline(q.prompt || 'Predict the output:')}</p>

              {q.code && <CodeBlock language={q.language || 'js'}>{q.code}</CodeBlock>}

              <div className={styles.options} role={q.multiple ? 'group' : 'radiogroup'}>
                {q.options.map((opt, optIndex) => {
                  const isChosen = answer.chosen.includes(optIndex);
                  const isTheCorrectOne = q.multiple
                    ? (q.correctIndices || []).includes(optIndex)
                    : optIndex === q.correctIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      role={q.multiple ? 'checkbox' : 'radio'}
                      aria-checked={isChosen}
                      disabled={locked}
                      className={clsx(
                        styles.option,
                        !locked && isChosen && styles.selected,
                        locked && isTheCorrectOne && styles.correct,
                        locked && isChosen && !isTheCorrectOne && styles.incorrect
                      )}
                      onClick={() => toggleOption(qIndex, optIndex)}>
                      <span className={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}</span>
                      <span className={styles.optionText}>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {q.multiple && !locked && (
                <button
                  type="button"
                  className={styles.submitButton}
                  disabled={answer.chosen.length === 0}
                  onClick={() => submitMultiple(qIndex)}>
                  Check answer
                </button>
              )}

              {locked && (
                <div className={correct ? styles.explanationCorrect : styles.explanationIncorrect}>
                  <strong>{correct ? '✅ Correct.' : '❌ Not quite.'}</strong>{' '}
                  {renderInline(q.explanation)}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
