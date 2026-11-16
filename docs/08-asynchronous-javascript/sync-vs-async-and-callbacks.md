---
title: "Sync vs Async and Callbacks"
sidebar_position: 1
---

JavaScript is single-threaded: it has exactly one call stack and can only do one thing at a time. Understanding how it still manages to feel "concurrent" — handling timers, network requests, and user input without freezing the page — starts with the difference between **synchronous** and **asynchronous** code, and the oldest tool for writing async code: the **callback**.

## Synchronous execution

Synchronous programming means code runs step by step, one line at a time, and each statement must finish before the next one starts.

JavaScript uses a **call stack** to do this. A function is pushed onto the stack, runs to completion, and is popped off before the next line executes. Nothing else happens in between — if a synchronous task takes five seconds (a huge loop, a blocking computation), the entire page is frozen for five seconds.

```js
function one() {
  console.log("one");
}
function two() {
  console.log("two");
}

one();
two();
// one
// two
```

Each call is pushed onto the stack, fully executed, and removed before the next statement runs.

## Asynchronous execution

Asynchronous programming means a task is started now but its result arrives later, without blocking the main thread while it waits.

JavaScript itself is still single-threaded — it only ever runs one thing on the call stack. The trick is that slow operations (timers, network requests, file I/O, user events) are **handed off** to the environment surrounding the engine:

- In the browser, these are **Web APIs** (`setTimeout`, `fetch`, the DOM, geolocation, `localStorage`, Web Workers, ...).
- In Node.js, the equivalent is the **libuv** thread pool and its own C++ APIs.

When that offloaded work finishes, its callback is placed into a queue. The **event loop** continuously checks whether the call stack is empty, and if so, pulls the next callback from the queue and pushes it onto the stack to run. (The exact ordering of those queues is covered in [Event Loop, Microtasks and Macrotasks](./event-loop.md).)

JavaScript achieves asynchrony with three progressively better tools:

1. **Callbacks** — functions passed into other functions to run later.
2. **Promises** (ES6) — objects representing a future value.
3. **async/await** — syntax that makes promise-based code read like synchronous code.

:::note
"Async" does not mean "multi-threaded." JavaScript still runs your code on one thread. Asynchronous just means *not blocking that thread while waiting*.
:::

## Callbacks

A **callback** is a function passed as an argument to another function, to be invoked later — usually once some task (a timer, a request, an event) completes.

```js
function callback(val) {
  console.log(val);
}

setTimeout(() => callback(10), 1000);
// after 1000ms: 10
```

### A classic implicit-global bug

Here is a variation that is easy to write by accident and worth studying, because it demonstrates two things at once — hoisting/ordering, and a common scoping mistake:

```js
setTimeout(() => callback(10), 1000);
callback = (val) => console.log(val);

// 10   (printed after ~1000ms)
```

This *works*, but only by luck of execution order, and it has a bug:

- `setTimeout` only **schedules** the arrow function to run after the delay; it does not call `callback` immediately. By the time the timer fires, line 2 has already run synchronously, so `callback` already refers to the logging function. That's why `10` is printed instead of a `TypeError`.
- `callback = (val) => console.log(val);` has no `let`, `const`, or `var`. In non-strict mode this **silently creates a global variable** (`window.callback` in a browser, or a property on `globalThis`). This is almost always a mistake — it pollutes the global scope and would throw `ReferenceError: callback is not defined` in strict mode or inside an ES module (both of which disallow implicit globals).

:::warning
Never rely on assigning to an undeclared identifier. Always declare it (`const callback = ...`) — both for clarity and so the mistake becomes a loud error instead of a silent global.
:::

The corrected version:

```js
const callback = (val) => console.log(val);
setTimeout(() => callback(10), 1000);
// 10
```

## Callback hell (the pyramid of doom)

Callbacks work fine for one async step. They fall apart once you need several steps that each depend on the previous one's result, because each new step has to be nested *inside* the previous callback:

```js
getData(function (a) {
  getMoreData(a, function (b) {
    getMoreData(b, function (c) {
      getMoreData(c, function (d) {
        getMoreData(d, function (e) {
          console.log(e);
        });
      });
    });
  });
});
```

This is called **callback hell** or the **pyramid of doom**, and it causes real problems:

- **Hard to read** — the code grows sideways instead of top to bottom.
- **Hard to handle errors** — there is no single place to catch a failure; every level needs its own error check (and it's easy to forget one).
- **Hard to maintain** — inserting or removing a step in the middle means re-indenting and re-wiring everything below it.

### How it gets solved

1. **Promises** — flatten the nesting into a chain of `.then()` calls with one `.catch()` at the end. See [Promises and Chaining](./promises.md).
2. **async/await** — syntax over promises that makes the sequence read like ordinary synchronous code. See [async/await](./async-await.md).
3. **Modularization** — give each step its own named function instead of an anonymous inline closure, which helps readability even before you adopt promises.

## Callback vs Promise

| | Callback | Promise |
|---|---|---|
| **Structure** | Nested inside each other | Chained with `.then()` |
| **Error handling** | Every level needs its own check | A single `.catch()` handles all upstream failures |
| **Readability** | Pyramid shape — grows sideways | Flat chain — reads top to bottom |
| **Control flow for multiple tasks** | Manual bookkeeping (counters, flags) | Built-in combinators: `Promise.all()`, `Promise.race()`, etc. |
| **Return value** | No standard shape | A well-defined object with states: pending, fulfilled, rejected |
| **Composability** | Poor — hard to reuse across call sites | Good — a promise can be passed around, awaited, or chained anywhere |

## Key takeaways

- JavaScript has one call stack and runs synchronous code top to bottom, blocking until each statement finishes.
- Asynchronous work is delegated to Web APIs / Node APIs; the event loop brings the result back onto the call stack once it's ready and the stack is empty.
- A callback is just "a function to run later" — simple for one step, painful once steps are chained, because nesting grows with every new dependent step.
- Always declare variables you assign to (`const`/`let`) — an undeclared assignment creates an implicit global and is a classic source of hard-to-find bugs.
- Promises and async/await exist specifically to solve callback hell by flattening control flow and centralizing error handling.

## Interview questions

**Q: What's the difference between synchronous and asynchronous code?**
Synchronous code runs line by line, each statement blocking the next until it completes. Asynchronous code starts an operation and continues on without waiting for it to finish, resuming via a callback/promise/await once the result is ready — without blocking the single JS thread.

**Q: Why is JavaScript "single-threaded" if it can still download, time, and animate things in parallel?**
JavaScript's call stack is single-threaded, but the surrounding environment (browser or Node) runs the slow work (networking, timers, disk I/O) outside that thread and only hands the *callback* back to JS to run on the stack when it's ready.

**Q: What problems does callback hell cause, and what replaces it?**
Readability (pyramid shape), error handling (no centralized catch), and maintainability (fragile nesting). It's replaced by promise chaining (flat `.then()`/`.catch()`) and async/await (synchronous-looking syntax).
