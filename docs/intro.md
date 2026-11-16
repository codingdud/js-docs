---
title: Introduction
sidebar_position: 0
slug: /intro
---

# JavaScript Handbook

This handbook turns a personal collection of JavaScript notes, practice code and interview-prep
material into one organized reference — from fundamentals through the tricky parts that come up
in interviews.

It was built from three kinds of source material:

- **Workspace notes and code** — day-to-day practice files covering closures, prototypes,
  classes, async patterns, DOM manipulation, Web Workers and hand-written polyfills.
- **Midterm study notes** — concept write-ups on hoisting, closures, the event loop, OOP,
  prototypes, Git/CI-CD, and a large interview question bank.
- **You Don't Know JS — Types & Grammar, Ch. 4 (Coercion)** — a detailed reference on `ToString`,
  `ToNumber`, `ToBoolean`, `ToPrimitive`, and the rules behind `==` and `+`.

Every chapter was fact-checked against its sources and against real JavaScript semantics (verified
live where it mattered — exact error messages, coercion results, ordering, output), so code
examples and their stated output should run as written.

## How it's organized

| Chapter | What's inside |
|---|---|
| [1. JavaScript Basics](./01-basics/variables-var-let-const.md) | Variables (`var`/`let`/`const`), data types, operators, `null`/`undefined`/`NaN`, loops, ES6 syntax |
| [2. Types & Type Coercion (YDKJS)](./02-types-and-coercion/coercion-overview.md) | Abstract operations, explicit vs. implicit coercion, loose equality, relational comparison |
| [3. Functions, Scope & Closures](./03-functions-and-scope/execution-context-and-hoisting.md) | Hoisting/TDZ, scope chain, closures, `this`, arrow functions, `call`/`apply`/`bind`, FP basics |
| [4. Objects](./04-objects/creating-objects.md) | Creating objects, property descriptors, iteration, JSON, shallow vs. deep copy |
| [5. Prototypes & Inheritance](./05-prototypes/prototype-vs-proto.md) | `prototype` vs `__proto__`, the prototype chain, `new` and inheritance wiring |
| [6. Classes & OOP](./06-classes-and-oop/classes-vs-constructors.md) | Classes vs constructors, statics, accessors, private fields, mixins, abstract classes, symbols |
| [7. Arrays, Strings & Collections](./07-arrays-strings-collections/arrays.md) | Array/string methods, data transformation, `Map`/`WeakMap`/`Set`, iterators & generators |
| [8. Asynchronous JavaScript](./08-asynchronous-javascript/sync-vs-async-and-callbacks.md) | Callbacks, the event loop, promises, async/await, promise combinators, `fetch` |
| [9. DOM & Events](./09-dom-and-events/dom-basics.md) | DOM basics, event handling, propagation, delegation, forms, scroll events |
| [10. Browser Platform](./10-browser-platform/web-apis-and-geolocation.md) | Web APIs, storage/cookies, rendering & script loading, HTML/CSS/accessibility |
| [11. Web Workers & Service Workers](./11-web-workers/dedicated-workers.md) | Dedicated/shared workers, service worker lifecycle & caching strategies |
| [12. Polyfills & Utilities](./12-polyfills-and-utilities/array-polyfills.md) | Hand-written array/`call`/`apply`/`bind`/promise polyfills, debounce, throttle, LRU cache |
| [13. TypeScript](./13-typescript/basic-types.md) | Basic types, functions & classes, interfaces vs types, generics, narrowing, modules, Jest |
| [14. DSA & Problem Solving](./14-dsa/string-problems.md) | String/math problems, searching & recursion, LeetCode patterns, Node CLI input |
| [15. Git, CI/CD & Engineering Practices](./15-tooling/git-fundamentals.md) | Git fundamentals, branching/conflicts, CI/CD, testing polyfills with Jest, design principles |
| [16. Edge Cases & Interview Prep](./16-interview-prep/tricky-edge-cases.md) | Tricky output questions, the interview guide, a question bank, a concepts checklist |

:::tip How to read it
Chapters 1–7 build the fundamentals; 8–12 cover the browser and async runtime; 13–16 are
reference material for TypeScript, problem-solving and interviews. If you already know the
basics, jump straight to [Chapter 16](./16-interview-prep/tricky-edge-cases.md) for a rapid
self-check, then backfill from the table above wherever you get stuck.
:::

Use the sidebar on the left to browse by chapter, or the search bar to jump straight to a topic.
