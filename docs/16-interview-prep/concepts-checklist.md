---
title: JavaScript Concepts Checklist and Resources
sidebar_position: 4
---

A single master checklist for interview readiness: 54 core concepts, each mapped to the page on this site that covers it, a dedicated summary of **strict mode** (the one item from the original checklist that doesn't have a home anywhere else), a companion polyfill checklist, and the external resources worth pairing with this site.

:::tip How to use this page
Go down the table and, for each row, try to give a one- or two-sentence answer from memory before clicking through. Anything you can't answer confidently is where to spend your remaining study time.
:::

## The 54-concept checklist

| # | Concept | Covered in |
|---|---|---|
| 1 | Scope in JS (global, function, block) | [Scope chain and shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md) |
| 2 | Scope chaining | [Scope chain and shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md) |
| 3 | Primitive vs. non-primitive types | [Data types and operators](../01-basics/data-types-and-operators.md) |
| 4 | `var`, `let`, and `const` | [Variables: var, let, const](../01-basics/variables-var-let-const.md) |
| 5 | Temporal Dead Zone | [Execution context and hoisting](../03-functions-and-scope/execution-context-and-hoisting.md) |
| 6 | Hoisting | [Execution context and hoisting](../03-functions-and-scope/execution-context-and-hoisting.md) |
| 7 | Prototypes in JS | [Prototype vs. `__proto__`](../05-prototypes/prototype-vs-proto.md) |
| 8 | The prototype object | [Prototype vs. `__proto__`](../05-prototypes/prototype-vs-proto.md) |
| 9 | Prototype chaining | [The prototype chain](../05-prototypes/prototype-chain.md) |
| 10 | Closures | [Closures](../03-functions-and-scope/closures.md) |
| 11 | Pass by reference vs. pass by value | [Shallow vs. deep copy](../04-objects/shallow-vs-deep-copy.md) |
| 12 | Currying | [Functional programming](../03-functions-and-scope/functional-programming.md) |
| 13 | The infinite currying problem | [Functional programming](../03-functions-and-scope/functional-programming.md) |
| 14 | Memoization | [Memoization and LRU cache](../12-polyfills-and-utilities/memoization-lru-cache.md) |
| 15 | Rest parameters | [Function types and parameters](../03-functions-and-scope/function-types-and-parameters.md) |
| 16 | Spread operator | [ES6 features](../01-basics/es6-features.md) |
| 17 | Ways to create an object in JS | [Creating objects](../04-objects/creating-objects.md) |
| 18 | Generator functions | [Iterators and generators](../07-arrays-strings-collections/iterators-and-generators.md) |
| 19 | JavaScript is single-threaded | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 20 | Callbacks, and why we need them | [Sync vs. async and callbacks](../08-asynchronous-javascript/sync-vs-async-and-callbacks.md) |
| 21 | The event loop | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 22 | The callback (macrotask) queue | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 23 | The microtask queue | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 24 | Promises | [Promises](../08-asynchronous-javascript/promises.md) |
| 25 | Event propagation | [Event propagation](../09-dom-and-events/event-propagation.md) |
| 26 | Event bubbling | [Event propagation](../09-dom-and-events/event-propagation.md) |
| 27 | Event capturing | [Event propagation](../09-dom-and-events/event-propagation.md) |
| 28 | `stopPropagation()` | [Event propagation](../09-dom-and-events/event-propagation.md) |
| 29 | Event delegation | [Event delegation](../09-dom-and-events/event-delegation.md) |
| 30 | Type coercion vs. type conversion | [Coercion overview](../02-types-and-coercion/coercion-overview.md) |
| 31 | Throttle | [Throttle](../12-polyfills-and-utilities/throttle.md) |
| 32 | Debounce | [Debounce](../12-polyfills-and-utilities/debounce.md) |
| 33 | How JS parses and compiles code, step by step | [Execution context and hoisting](../03-functions-and-scope/execution-context-and-hoisting.md) |
| 34 | A microtask that keeps re-queuing itself forever | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 35 | First-class functions | [Function types and parameters](../03-functions-and-scope/function-types-and-parameters.md) |
| 36 | Immediately invoked function expressions (IIFEs) | [Function types and parameters](../03-functions-and-scope/function-types-and-parameters.md) |
| 37 | `call`, `apply`, and `bind` | [Call, apply, bind](../03-functions-and-scope/call-apply-bind.md) |
| 38 | `mapLimit` (bounded-concurrency async mapping) | [Promise polyfills](../12-polyfills-and-utilities/promise-polyfills.md) |
| 39 | `async`/`await` | [Async/await](../08-asynchronous-javascript/async-await.md) |
| 40 | `.then()` and `.catch()` | [Promises](../08-asynchronous-javascript/promises.md) |
| 41 | Variable shadowing | [Scope chain and shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md) |
| 42 | `static` members in a class | [Static members](../06-classes-and-oop/static-members.md) |
| 43 | `undefined` vs. "not defined" vs. `null` | [null, undefined, NaN](../01-basics/null-undefined-nan.md) |
| 44 | Higher-order functions | [Functional programming](../03-functions-and-scope/functional-programming.md) |
| 45 | Callback hell | [Sync vs. async and callbacks](../08-asynchronous-javascript/sync-vs-async-and-callbacks.md) |
| 46 | The `this` keyword | [The `this` keyword](../03-functions-and-scope/this-keyword.md) |
| 47 | Function declarations, expressions, and arrow functions | [Function types and parameters](../03-functions-and-scope/function-types-and-parameters.md) |
| 48 | `async` vs. `defer` on `<script>` | [Rendering and script loading](../10-browser-platform/rendering-and-script-loading.md) |
| 49 | Execution context | [Execution context and hoisting](../03-functions-and-scope/execution-context-and-hoisting.md) |
| 50 | The call stack | [The event loop](../08-asynchronous-javascript/event-loop.md) |
| 51 | Garbage collection | — *(not yet a dedicated page; see the note on closures and memory below)* |
| 52 | `===` vs. `==` | [Loose equality](../02-types-and-coercion/loose-equality.md) |
| 53 | Strict mode | Covered below — see [Strict mode](#strict-mode) |
| 54 | Lexical environment | [Scope chain and shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md) |

:::note On garbage collection (item 51)
This site doesn't have a dedicated garbage-collection page yet, but the short version worth knowing for an interview: JavaScript engines use **mark-and-sweep** garbage collection — an object is eligible for collection once nothing reachable from a root (global scope, the current call stack, or an active closure) still references it. The most common *leak* pattern in interview questions is a **closure that outlives its usefulness**, holding a reference to a large object or a detached DOM node and preventing it from ever being collected. See [closures](../03-functions-and-scope/closures.md) for the mechanics of why that reference stays alive.
:::

## Strict mode

Strict mode wasn't covered anywhere else on this site, so here's the dedicated summary the checklist calls for.

Enable it per-file (or per-module — ES modules are strict by default) with a directive at the very top:

```js
"use strict";
```

or per-function:

```js
function strictFn() {
  "use strict";
  // ...
}
```

Strict mode changes a handful of specific behaviors, turning several silent mistakes into thrown errors:

| Without strict mode | With strict mode |
|---|---|
| Assigning to an undeclared variable creates a global | `ReferenceError: x is not defined` |
| `this` in a plain function call is the global object | `this` is `undefined` |
| Duplicate parameter names (`function f(a, a) {}`) are allowed | `SyntaxError` at parse time |
| Assigning to a read-only or non-existent property fails silently | Throws a `TypeError` |
| `delete` on a plain variable or function name is a (silent) no-op | `SyntaxError` |
| Octal literals like `012` are allowed | `SyntaxError` |

:::warning Why this matters for the examples elsewhere on this site
Some of the [tricky edge cases](./tricky-edge-cases.md) — duplicate parameters silently overwriting each other, `this` falling back to the global object — only behave that way in **non-strict** code. Since ES modules (and TypeScript files compiled as modules) are strict by default, you may never actually witness the "silent" version of these bugs in a modern codebase, only the stricter error. That's a feature, not an inconsistency: it's exactly why strict mode exists.
:::

## Polyfill checklist

A companion list, for when the question shifts from "explain X" to "implement X from scratch." All of these are commonly asked as live-coding exercises.

| Polyfill / utility | Where to find it |
|---|---|
| `map`, `filter`, `reduce`, `forEach`, `find` | [Array polyfills](../12-polyfills-and-utilities/array-polyfills.md) |
| `call`, `apply`, `bind` | [Call/apply/bind polyfills](../12-polyfills-and-utilities/call-apply-bind-polyfills.md) |
| `Promise`, `Promise.all`, `Promise.any`, `Promise.allSettled`, `Promise.race` | [Promise polyfills](../12-polyfills-and-utilities/promise-polyfills.md) |
| Debounce | [Debounce](../12-polyfills-and-utilities/debounce.md) |
| Throttle | [Throttle](../12-polyfills-and-utilities/throttle.md) |
| Memoization / caching | [Memoization and LRU cache](../12-polyfills-and-utilities/memoization-lru-cache.md) |
| The full checklist (including `mapLimit`, an event emitter, a `setInterval` polyfill, a parallel-limit function, deep-vs-shallow copy, flattening a nested object, `Promise.prototype.finally`, and a retry helper) | [Polyfill checklist](../12-polyfills-and-utilities/polyfill-checklist.md) |

## Resources for continued practice

The original source list, still solid advice:

1. **[LeetCode — 30 Days of JS](https://leetcode.com/studyplan/30-days-of-javascript/)** — the single most useful practice set for JavaScript-specific coding questions (as opposed to general algorithms). Treated as essential by the source material, and worth prioritizing if you only have time for one resource.
2. **Roadside Coder** — a video playlist focused specifically on implementing polyfills and answering output-prediction questions, a good match for the [question bank](./question-bank.md) on this site.
3. **Namaste JavaScript** — a video series that builds up JavaScript's execution model (execution contexts, the event loop, closures, prototypes) from first principles, useful if any topic in the [checklist above](#the-54-concept-checklist) still feels like a memorized rule rather than something you could re-derive.
4. **[javascript.info](https://javascript.info/)** — the reference to reach for on fundamentals, data types, and edge cases, with a level of rigor that pairs well with the output-prediction questions on this site.

:::tip Pro tip
Pair whichever resource you're using with active recall: after watching a video or reading a section, close it and try to reproduce the key example from memory before checking your work. Explaining a concept out loud, or to an AI assistant that can push back with follow-up questions, is a fast way to find the gaps a passive read-through hides.
:::

## Key takeaways

- The 54 concepts above are the baseline — if every row has a confident one-sentence answer, you're prepared for the conceptual half of a JS interview.
- Strict mode is the one topic in this checklist that didn't fit naturally into any other chapter; know its six behavioral changes, especially the `this`-is-`undefined` one, since it explains several "why doesn't this match the gotcha I read about" moments.
- Treat the [polyfill checklist](#polyfill-checklist) as a separate, harder tier: being able to *explain* `debounce` and being able to *write* it correctly under interview pressure are different skills, and only the second one is actually tested in a live-coding round.
