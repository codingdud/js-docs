---
title: "MCQ Practice: Currying (Hard Questions & Real Implementations)"
sidebar_position: 11
---

import Quiz from '@site/src/components/Quiz';
import {curryingHardQuestions} from '@site/src/data/curryingQuizzes';

# MCQ Practice: Currying (Hard Questions & Real Implementations)

16 hard, implementation-driven questions on currying beyond the basics in
[Higher-Order Functions, Currying, Memoization and Composition](./functional-programming.md#currying):
why a generic `curry(fn)` breaks on rest/default parameters, `curryN` with explicit arity,
the `valueOf`/`toString`-hack that lets a curry chain double as a number, placeholder (`_`)
currying, "deep" auto-currying of nested closures, memoized curry, `curryRight`, currying
combined with `compose`, `this`-binding loss, and why currying only defers the *call* — not
the evaluation of each argument you pass along the way. Every snippet below was actually run
in Node to confirm its answer. Answer to see instant correct/incorrect feedback and the
explanation; **Reset quiz** clears everything and starts over.

<Quiz questions={curryingHardQuestions} title="Currying — Hard" />
