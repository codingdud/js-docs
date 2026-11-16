---
title: "async/await"
sidebar_position: 4
---

`async`/`await` is **syntactic sugar over Promises** — it does not introduce a new concurrency model, it just lets promise-based code *read* like synchronous code. Under the hood it's still non-blocking: `await` pauses the surrounding `async` function (not the whole program) until the awaited promise settles, then resumes it as a microtask. (See [How async/await Works](./async-await-under-the-hood.md) for the generator-based mechanism that actually implements this.)

## An `async` function always returns a Promise

This is easy to forget: calling an `async` function **never** gives you back the raw value you `return`ed — it always gives you a `Promise` that will eventually resolve with that value (or reject, if the function throws).

```js
async function test() {
  return "JS";
}

console.log(test()); // Promise { 'JS' }
```

Because `test()` has no `await` inside it, it runs to completion synchronously the moment it's called, and the promise it returns is **already fulfilled** by the time `console.log` sees it — hence `Promise { 'JS' }` rather than `Promise { <pending> }`.

Compare that with a function that *does* contain an `await`:

```js
let p1 = new Promise((resolve) => {
  console.log("start 1");
  setTimeout(() => resolve("Resolve 1"), 1000);
});
let p2 = new Promise((resolve) => {
  console.log("start 2");
  setTimeout(() => resolve("Resolve 2"), 1000);
});

async function resolver() {
  console.log("start async function");
  let a = await p1;
  console.log("promise 1");
  console.log(a);
  let b = await p2;
  console.log("promise 2");
  console.log(b);
}

console.log(resolver());
// start 1
// start 2
// start async function
// Promise { <pending> }
// (~1s later)
// promise 1
// Resolve 1
// promise 2
// Resolve 2
```

`resolver()` hits `await p1` before it can `return` anything, so it **suspends immediately** and hands back a still-pending promise. That's why `console.log(resolver())` prints `Promise { <pending> }`, synchronously, before either timer has fired.

:::tip
A pending vs. already-settled promise logged from `console.log(someAsyncCall())` tells you whether that function suspended on an `await` before returning, or ran straight through without ever yielding.
:::

## Why this example takes ~1s, not ~2s

Notice that `p1` and `p2` above are both created — and both start their 1-second timers — **before** `resolver()` even runs. This is the "eager promise" pattern: start the async work up front, `await` it later.

Because both timers start at essentially the same moment (when `p1` and `p2` are constructed), they run **concurrently**. By the time `resolver()` reaches `await p1`, that timer already has a ~1-second head start finishing; and `p2`'s timer, started in parallel, is essentially done by the time `await p2` is reached. The whole thing finishes in about **1 second total**, not 2 — even though there are two sequential `await`s.

Contrast that with creating the promises *inside* the function, right before each `await`:

```js
async function sequentialResolver() {
  const a = await new Promise((res) => setTimeout(() => res("A"), 1000));
  const b = await new Promise((res) => setTimeout(() => res("B"), 1000));
  return [a, b];
}
// takes ~2 seconds total — the second timer doesn't start until the first one resolves
```

Here each timer only starts once the previous `await` resolves, so the delays truly add up to 2 seconds.

## Sequential vs parallel awaits

The same distinction applies to real async work like `fetch`. Two independent `await`s, one after another, run **sequentially** by default:

```js
const URL = "https://api.github.com/users/codingdud";

async function githubApi() {
  const user = await fetch(URL);
  const data = await user.json();
  console.log(data);

  const user1 = await fetch(URL); // doesn't start until the above fully finishes
  const data1 = await user1.json();
  console.log(data1);
}

githubApi();
```

If the two `fetch` calls don't depend on each other's results, this is slower than it needs to be — each request waits for the previous one to completely resolve before starting. When requests are independent, start them together and let `Promise.all()` wait for both in **parallel**:

```js
async function githubApiParallel() {
  const [res1, res2] = await Promise.all([fetch(URL), fetch(URL)]);
  const [data, data1] = await Promise.all([res1.json(), res2.json()]);
  console.log(data, data1);
}
```

This issues both requests at (almost) the same time instead of waiting for the first to fully round-trip before starting the second. See [Promise.all, allSettled, race and any](./promise-combinators.md) for more on combinators.

:::warning
`await`ing promises one after another is only correct when each step genuinely depends on the previous result. If the operations are independent, sequential `await`s silently turn parallelizable work into a slower, serial pipeline.
:::

## A real bug: a delay helper that ignores its argument

```js
function deelay(sec) {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res();
    }, 1000); // <- bug: ignores `sec` entirely
  });
}

async function run() {
  await deelay(1000);
  console.log("hello");
}

run();
```

`deelay(sec)` takes a parameter called `sec` but never uses it — the `setTimeout` is hardcoded to `1000`. Calling `deelay(1000)` happens to "work" because the caller passed `1000` too, but `deelay(5000)` would still only wait one second. The parameter is dead code, and this will silently misbehave for every other caller.

The fix is simply to use the parameter:

```js
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function run() {
  await delay(2000); // now genuinely waits 2 seconds
  console.log("hello");
}
```

(Also worth noting: naming a function `async` — as in the original snippet's `async function async() { ... }` — is legal, since `async` is a contextual keyword, not a reserved word, but it's confusing to read and best avoided.)

## Error handling with try/catch

Inside an `async` function, a `throw` behaves exactly like calling `reject()` on the promise it returns — it does **not** need a `.catch()` to be "caught" at the call site; you can use a plain `try`/`catch` around the `await`:

```js
async function demo() {
  throw new Error("Oops");
}

// Caught via .catch() on the returned promise:
demo().catch((err) => console.log(err.message)); // Oops
```

Or, equivalently, from inside another `async` function:

```js
async function caller() {
  try {
    await demo();
  } catch (err) {
    console.log(err.message); // Oops
  }
}
caller();
```

Both are correct; `try`/`catch` is generally preferred *inside* async code because it reads naturally alongside the rest of the sequential logic, while `.catch()` is the right tool at the boundary where you call an async function from non-async code (since you can't `await` outside an `async` function or the top level of a module).

See [Fetch and Error Handling](./fetch-and-error-handling.md) for the specific pitfalls of catching errors from `fetch` and from code scheduled with `setTimeout`.

## Key takeaways

- `async`/`await` is syntactic sugar over Promises: non-blocking under the hood, synchronous-looking on the surface.
- Every `async` function returns a Promise. If it never hits an `await`, that promise can already be settled by the time you inspect it; if it does hit one, the promise starts out pending.
- Starting independent promises eagerly (before the first `await`) lets their work overlap; awaiting them one after another in sequence does not "restart the clock" for each one.
- Sequential `await`s are correct only when each step depends on the last. Use `Promise.all()` for independent async work.
- `throw` inside an `async` function rejects its returned promise — catchable with either `try`/`catch` (inside async code) or `.catch()` (at the call site).

## Interview questions

**Q: Does an `async` function always return a Promise, even if you `return` a plain value?**
Yes. The return value is automatically wrapped in a (possibly already-fulfilled) Promise.

**Q: Why might two sequential `await`s on two 1-second timers finish in ~1s instead of ~2s?**
If both promises/timers were created (and so, started) before either `await`, they run concurrently; the `await`s just wait for each one's already-in-progress timer, rather than starting a fresh timer in series.

**Q: How do you handle an error thrown inside an `async` function?**
Either wrap the `await` in `try`/`catch` inside another `async` function, or call `.catch()` on the promise returned by the first call, since a `throw` inside an `async` function is equivalent to rejecting its returned promise.

**Q: When should you use `Promise.all()` instead of sequential `await`s?**
When the operations don't depend on each other's results — running them in parallel with `Promise.all()` is strictly faster than awaiting them one at a time.
