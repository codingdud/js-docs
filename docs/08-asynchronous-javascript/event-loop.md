---
title: "Event Loop, Microtasks and Macrotasks"
sidebar_position: 2
---

The event loop is the mechanism that lets a **single-threaded** language handle timers, network requests, and user events without blocking. This page walks through the pieces involved (call stack, Web APIs, heap, and the two task queues), the order they run in, and a few puzzles that only make sense once you know that order.

## The pieces

JavaScript is a single-threaded, multi-paradigm language. "Single-threaded" means there is exactly one call stack, so only one line of JS code is ever executing at any instant. Four things cooperate to make async code possible:

| Component | Role |
|---|---|
| **Heap** | Where objects and variables are allocated in memory. |
| **Call stack** | Where synchronous function calls are pushed/popped. Highest priority — it must be empty before anything else runs. |
| **Web APIs** (or Node APIs) | Browser/runtime-provided facilities that do async work outside the JS thread: `setTimeout`/`setInterval`, the DOM, `fetch`, `localStorage`/`sessionStorage`, Web Workers, geolocation, IndexedDB, WebSockets. |
| **Task queues** | Where callbacks wait once their async work finishes, until the event loop moves them to the call stack. There are two queues, with different priority (next section). |

The overall flow:

1. Synchronous code runs immediately on the call stack.
2. When the engine hits async work, it hands that work off to a Web API instead of blocking.
3. When the Web API finishes, it does not run the callback immediately — it places it into the appropriate **task queue**.
4. The **event loop** continuously watches the call stack. The moment the stack is empty, it pulls the next callback off a queue and pushes it onto the stack to execute.

## Microtasks vs macrotasks

Not all queued callbacks have equal priority. There are two queues:

| Queue | Fed by | Priority |
|---|---|---|
| **Microtask queue** | `promise.then()` / `.catch()` / `.finally()`, `queueMicrotask()`, the continuation after an `await` | Higher — fully drained before the next macrotask |
| **Macrotask queue** | `setTimeout`, `setInterval`, `fetch`'s underlying I/O completion, DOM events, `setImmediate` (Node) | Lower |

The event loop's priority order is:

1. Run everything currently on the **call stack** to completion.
2. Once the stack is empty, drain the **entire microtask queue** — including any new microtasks that got queued while draining it.
3. Only once the microtask queue is completely empty, take **one** macrotask off the macrotask queue, run it (and the microtasks it may enqueue get drained again before the next macrotask).
4. Repeat forever.

:::note
Fetch itself (the network operation) is handled off-thread like a macrotask, but the promise returned by `fetch()` resolves and schedules its `.then()` continuations as **microtasks**, exactly like any other promise.
:::

## Worked example: start / end / promise / timeout

This is the canonical ordering puzzle:

```js
console.log("start");

setTimeout(() => console.log("timeout"), 0);

Promise.resolve().then(() => console.log("promise"));

console.log("end");

// start
// end
// promise
// timeout
```

Trace:

1. `console.log("start")` runs synchronously → prints `start`.
2. `setTimeout(..., 0)` schedules its callback as a **macrotask**, even with a `0ms` delay — it still has to wait for the current script to finish and then for the microtask queue to drain.
3. `Promise.resolve().then(...)` schedules its callback as a **microtask**.
4. `console.log("end")` runs synchronously → prints `end`.
5. The call stack is now empty. The event loop drains microtasks first → prints `promise`.
6. Only now does it pick up the macrotask → prints `timeout`.

So the rule of thumb: **all queued microtasks always run before the next macrotask**, no matter how small the macrotask's delay is.

## The executor runs synchronously

A common misconception is that the function passed to `new Promise((resolve, reject) => { ... })` — the **executor** — is itself async. It is not: the executor runs **immediately and synchronously**, the instant the `Promise` constructor is called. Only `resolve`/`reject` calls that happen inside an async callback (like `setTimeout`) are delayed.

```js
let p1 = new Promise((resolve, reject) => {
  console.log("start 1"); // runs synchronously, right now
  setTimeout(() => resolve("Resolve 1"), 2000);
});
let p2 = new Promise((resolve, reject) => {
  console.log("start 2"); // also synchronous
  setTimeout(() => resolve("Resolve 2"), 1000);
});

// start 1
// start 2
// (then, after the timers fire, the promises settle)
```

Both `"start 1"` and `"start 2"` print immediately and in order, before either timer has fired — proof that building a `Promise` does not defer the executor.

## Infinite microtask starvation

Because the event loop insists on draining the **entire** microtask queue before touching a single macrotask, a microtask that keeps re-queueing itself forever will starve every macrotask (including `setTimeout`, UI repaints, and user input) indefinitely:

```js
function loopForever() {
  queueMicrotask(loopForever); // keeps re-scheduling itself as a microtask
}
loopForever();

setTimeout(() => console.log("I will never run"), 0);
```

The `setTimeout` callback never gets a chance to run, because the microtask queue is never empty.

### How to yield

Break the chain by scheduling the next step as a **macrotask** instead of a microtask, which lets the event loop handle pending timers/events/renders in between:

```js
function politeLoop(i = 0) {
  // do some work here
  setTimeout(() => politeLoop(i + 1), 0); // yield to the macrotask queue
}
politeLoop();
```

`setTimeout(fn, 0)` (or, in the browser, `requestAnimationFrame`/`requestIdleCallback`, or `MessageChannel` tricks) hands control back to the event loop between iterations instead of hogging the microtask queue.

## The flag puzzle: why does it print `true`?

This is a favorite interview trap because the *final* value of a variable and what gets *logged* can differ, depending on exactly when each microtask runs.

```js
let flag = false;

async function a() {
  await Promise.resolve();
  flag = true;
  return false;
}

async function b() {
  const res = await a();
  flag = res;
}

b();

Promise.resolve().then(() => {
  console.log(flag);
});

// true
```

Why `true`, even though `b()` eventually sets `flag = res` where `res` is `false`? Because the code **after an `await`** doesn't run synchronously — it runs as a **microtask**, scheduled only once the awaited promise settles. Tracing the microtask queue in the order things get scheduled:

1. `b()` is called. It synchronously calls `a()`.
2. `a()` hits `await Promise.resolve()`. This suspends `a()` and schedules **microtask M1** = "resume `a()` after line 1" (runs once the already-resolved promise's reaction fires).
3. Control returns to `b()`, which is now awaiting `a()`'s (still-pending) returned promise — `b()` itself is suspended until that promise settles.
4. Control returns to the top level. `Promise.resolve().then(() => console.log(flag))` runs, scheduling **microtask M2** = "log flag".
5. The call stack is empty. The microtask queue is now `[M1, M2]` — **M1 was queued first**, so it runs first.
6. **M1 runs**: `flag = true;` then `a()` returns `false`, which resolves `a()`'s promise. Resolving that promise schedules **M3** = "resume `b()` with `res = false`" (the continuation after `await a()`).
7. **M2 runs**: `console.log(flag)` → `flag` is currently `true` (set in step 6) → prints `true`.
8. **M3 runs** afterward: `flag = res` sets `flag` back to `false` — but nothing logs it again, so this change is invisible to the program's output.

The key insight: **everything written after an `await` is deferred into a microtask**, queued only once the awaited value settles — it does not run "immediately after" in the source-order sense. That deferral is exactly what let `M2`'s `console.log` slip in between `a()` setting `flag = true` and `b()` later overwriting it with `false`.

## Key takeaways

- JavaScript has one call stack. Async work is offloaded to Web APIs/Node APIs and comes back as queued callbacks.
- The call stack has top priority; the entire microtask queue is drained before a single macrotask runs.
- Microtasks: `.then()`/`.catch()`/`.finally()`, `queueMicrotask()`, the code after `await`. Macrotasks: `setTimeout`/`setInterval`, DOM events, I/O completion.
- The `Promise` constructor's executor function always runs synchronously, the moment the promise is created — not later.
- A microtask that keeps scheduling itself (directly or via `await` loops with no yielding) starves macrotasks forever; yield with `setTimeout(fn, 0)` or similar.
- Code after `await` is a microtask continuation, not an immediate next line — its exact timing relative to *other* microtasks queued elsewhere is what powers (and complicates) puzzles like the `flag` example above.

## Interview questions

**Q: What's the output order of `console.log`, `setTimeout`, and `Promise.then`?**
Synchronous code first, then all pending microtasks (promise reactions), then one macrotask at a time (timers, etc.) — see the start/end/promise/timeout trace above.

**Q: Does `new Promise(executor)` run `executor` asynchronously?**
No — the executor runs synchronously and immediately when the constructor is called. Only the eventual `resolve`/`reject` (if done inside something like `setTimeout`) is delayed.

**Q: Can a microtask starve the event loop?**
Yes — if a microtask keeps scheduling another microtask (e.g., a recursive `queueMicrotask` or `Promise.resolve().then()` loop), macrotasks like `setTimeout`, rendering, and input events never get a turn. Yield periodically via a macrotask.

**Q: Why might `await`-based code log an "old" value when you expected the "final" one?**
Because the statement after `await` doesn't execute until its own microtask turn arrives, and other microtasks queued earlier (even from unrelated code) can run — and observe shared state — before that continuation does.

See [async/await](./async-await.md) for more on how `await` interacts with the microtask queue, and [How async/await Works](./async-await-under-the-hood.md) for the generator-based mechanism underneath it.
