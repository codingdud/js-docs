---
title: "Promise.all, allSettled, race and any"
sidebar_position: 5
---

Once you have several independent promises, you often need to combine them: wait for all of them, wait for the first to finish, or just find out which ones failed. JavaScript ships four built-in combinators for exactly this, each with different fail/succeed semantics.

## Test setup

All four combinators below are demonstrated against the same three promises, so their outputs can be compared directly:

```js
let p1 = new Promise((resolve, reject) => {
  console.log("start 1");
  setTimeout(() => resolve("Resolve 1"), 2000);
});
let p2 = new Promise((resolve, reject) => {
  console.log("start 2");
  setTimeout(() => resolve("Resolve 2"), 1000);
});
let p3 = new Promise((resolve, reject) => {
  console.log("start 3");
  setTimeout(() => reject("reject 3"), 400);
});
// start 1
// start 2
// start 3
```

All three executors run synchronously the instant each promise is constructed (see [Event Loop](./event-loop.md)), so all three `"start N"` lines print immediately, before any timer fires. The timers then race against each other: `p3` rejects first at 400ms, `p2` resolves at 1000ms, `p1` resolves last at 2000ms.

## `Promise.all()` — wait for all, fail fast

```js
Promise.all([p1, p2])
  .then((x) => console.log(x))
  .catch((x) => console.log(x));
// (after ~2000ms, the slower of p1/p2)
// [ 'Resolve 1', 'Resolve 2' ]
```

`Promise.all()` resolves only once **every** promise in the array has resolved, and resolves with an array of their values **in the same order as the input array** — regardless of which one actually finished first (`p2` finishes before `p1`, but `"Resolve 1"` still comes first in the result because `p1` was first in the input).

If *any* promise in the array rejects, `Promise.all()` immediately rejects with that reason — it doesn't wait for the others:

```js
Promise.all([p1, p2, p3])
  .then((x) => console.log(x))
  .catch((x) => console.log(x));
// (after ~400ms)
// reject 3
```

This is the **fail-fast** behavior: one rejection anywhere short-circuits the whole thing, even though `p1` and `p2` would have eventually succeeded.

### Classic gotcha: `Promise.all` with one rejection

```js
Promise.all([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)])
  .then(console.log)
  .catch(console.log);
// err
```

Even though two of the three promises resolve, the single rejection makes the whole `Promise.all()` reject — you never see `1` or `3` here, only `"err"`.

## `Promise.allSettled()` — wait for all, never fails

```js
Promise.allSettled([p1, p2, p3]).then((results) => console.log(results));
// (after ~2000ms, the slowest one)
// [
//   { status: 'fulfilled', value: 'Resolve 1' },
//   { status: 'fulfilled', value: 'Resolve 2' },
//   { status: 'rejected',  reason: 'reject 3' }
// ]
```

`allSettled` waits for **every** promise to finish, whether it resolves or rejects, and never rejects itself. Each entry in the result array is a status object: `{ status: "fulfilled", value }` or `{ status: "rejected", reason }`, in input order.

### Rewriting the `Promise.all` gotcha with `allSettled`

```js
Promise.allSettled([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)]).then(
  console.log
);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected',  reason: 'err' },
//   { status: 'fulfilled', value: 3 }
// ]
```

Use `allSettled` whenever a single failure shouldn't throw away the results you *did* get — for example, running several independent API calls where some are allowed to fail without aborting the rest.

## `Promise.race()` — first to settle, win or lose

```js
Promise.race([p1, p2, p3])
  .then((x) => console.log(x))
  .catch((x) => console.log(x));
// (after ~400ms)
// reject 3
```

`race()` settles as soon as the **first** promise settles — whether it fulfills or rejects. Here `p3` rejects fastest (400ms), so the whole `race()` rejects with `"reject 3"`, even though `p1` and `p2` would have resolved successfully later. "First to settle" includes failures, which makes `race()` risky for "give me whichever result arrives first" use cases — a fast failure beats a slow success.

A common, safer use of `race()` is implementing a timeout: race the real operation against a promise that rejects after N milliseconds, so a slow operation doesn't hang forever.

## `Promise.any()` — first to *resolve*, ignore rejections

```js
Promise.any([p1, p2, p3])
  .then((x) => console.log(x))
  .catch((x) => console.log(x));
// (after ~1000ms)
// Resolve 2
```

`any()` resolves as soon as **any** promise resolves, and ignores rejections along the way (unlike `race()`). Here `p3` rejects first (400ms) but that's not enough to settle `any()` — it keeps waiting. `p2` resolves next (1000ms), so `any()` resolves with `"Resolve 2"`, never even waiting for `p1`.

`any()` only rejects if **every** promise in the array rejects — and when that happens, it rejects with an `AggregateError` whose `.errors` property is an array of all the individual rejection reasons, in input order:

```js
Promise.any([Promise.reject("A"), Promise.reject("B")]).catch((err) => {
  console.log(err instanceof AggregateError); // true
  console.log(err.errors); // [ 'A', 'B' ]
});
```

## Side-by-side comparison

| Combinator | Settles when | Resolves with | Rejects when |
|---|---|---|---|
| `Promise.all()` | All resolve, **or** first rejection | Array of values, input order | Any single promise rejects (fail-fast) |
| `Promise.allSettled()` | All settle (resolve or reject) | Array of `{status, value\|reason}` | Never |
| `Promise.race()` | First promise to settle, either way | That promise's value | The first-settled promise rejected |
| `Promise.any()` | First promise to **resolve** | That promise's value | Only if *all* reject → `AggregateError` |

## Concurrency-limited mapping: `mapLimit`

Running `Promise.all()` over thousands of async tasks at once can overwhelm a server or hit a rate limit. A **`mapLimit`** utility runs an array through an async mapper function with at most `limit` tasks in flight at a time, while still returning results in the same order as the input — a common interview exercise that builds directly on the combinators above.

```js
async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  // Start up to `limit` workers, all pulling from the same shared cursor.
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);

  return results;
}

// Example: fetch 10 URLs, at most 3 at a time
const urls = Array.from({ length: 10 }, (_, i) => `/api/item/${i}`);
const results = await mapLimit(urls, 3, (url) => fetch(url).then((r) => r.json()));
```

Each `worker()` is a small loop that claims the next unclaimed index and writes its result into the matching slot of `results` — so even though tasks finish in whatever order they happen to complete, the output array is always in the same order as `items`, just like `Promise.all()` guarantees.

:::tip
`mapLimit` is essentially `Promise.all()` with a concurrency cap. Reach for it whenever "run all of these in parallel" would open too many sockets, hit a rate limit, or overload a downstream service.
:::

## Key takeaways

- `Promise.all()`: all-or-nothing, fails fast on the first rejection, preserves input order.
- `Promise.allSettled()`: always resolves, with a per-item status object — use it when partial failure is acceptable.
- `Promise.race()`: first to *settle* wins, even if that's a rejection — useful for timeouts, risky for "first success."
- `Promise.any()`: first to *resolve* wins; rejects only if everything rejects, with an `AggregateError`.
- A concurrency-limited `mapLimit` combines these ideas with a worker-pool pattern to cap how many promises run at once while keeping results in input order.

## Interview questions

**Q: `Promise.all([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)])` — what happens?**
It rejects immediately with `"err"`, the first rejection it sees; the other two resolved values are discarded. Rewriting with `Promise.allSettled()` instead returns all three outcomes as status objects without rejecting.

**Q: What's the difference between `Promise.race()` and `Promise.any()`?**
`race()` settles on whichever promise finishes first, win or lose — a fast rejection can "win." `any()` only cares about the first *resolution*, ignoring rejections, and only rejects (with an `AggregateError`) if every promise rejects.

**Q: When would you choose `allSettled()` over `all()`?**
When you want the outcome of every operation regardless of individual failures — e.g., firing off several independent requests and wanting to know which succeeded and which failed, instead of aborting everything on the first error.
