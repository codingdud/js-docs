---
title: Promise Combinator Polyfills
sidebar_position: 3
---

# Promise Combinator Polyfills

The four [promise combinators](../08-asynchronous-javascript/promise-combinators.md) — `all`, `allSettled`, `race` and `any` — all follow the same shape: take an array of promises, wire up a `.then()`/`.catch()` on each one, and settle a single outer promise once some condition across all of them is met. Re-implementing them is a good way to notice exactly *which* condition each one waits for, and a few easy-to-miss bugs that show up the moment you try.

This page builds `Promise.myall`, `Promise.mysettleall`, `Promise.myrace` and `Promise.myany`, and then fills in three combinators the checklist asks for but the sources don't implement: `Promise.prototype.finally`, `mapLimit`, and `retry`.

## `Promise.all` — wait for every promise, fail on the first rejection

```js
Promise.myall = function (promises) {
  return new Promise((res, rej) => {
    let result = new Array(promises.length);
    count = 0; // see warning below
    promises.forEach((p, i) => {
      p.then((x) => {
        result[i] = x;
        if (++count === promises.length) res(result);
      }).catch(rej);
    });
  });
};
```

```js
const p1 = new Promise((resolve) => setTimeout(() => resolve('Resolve 1'), 2000));
const p2 = new Promise((resolve) => setTimeout(() => resolve('Resolve 2'), 1000));

Promise.myall([p1, p2]).then(console.log);
// after 2s: ['Resolve 1', 'Resolve 2'] — order matches input order, not resolution order
```

Two things are worth calling out about the implementation:

- **Index storage, not push order.** `result[i] = x` writes each resolved value into the slot matching its position in the *input* array, not the order in which promises actually settle. That's exactly what `Promise.all` guarantees — `p2` resolves after 1s and `p1` after 2s, but the output array still lists `p1`'s value first.
- **`count` increments as each promise settles**, and the outer promise resolves the instant the *last* one does — so `myall`'s total time is the time of the *slowest* promise, same as native `Promise.all`.

:::warning Implicit global `count`
`count = 0;` has no `let`/`const`/`var` in front of it. In non-strict code this silently creates a property on `globalThis` instead of a variable scoped to the function. The practical danger: if two unrelated `Promise.myall(...)` calls are in flight at the same time, they **share the same global `count`** and will stomp on each other's counter, producing wrong results or a promise that never resolves. Always declare it: `let count = 0;`.
:::

:::danger Empty array never resolves
Native `Promise.all([])` resolves immediately with `[]` — an empty input trivially satisfies "all of them have resolved." `myall([])`, however, calls `promises.forEach(...)` on an empty array, which never invokes the callback even once. Nothing ever increments `count`, nothing ever calls `res(result)`, and the returned promise hangs **forever**. Fix it with an explicit early return:

```js
Promise.myall = function (promises) {
  return new Promise((res, rej) => {
    if (promises.length === 0) return res([]);
    let result = new Array(promises.length);
    let count = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then((x) => {
        result[i] = x;
        if (++count === promises.length) res(result);
      }).catch(rej);
    });
  });
};
```
:::

:::warning Non-promise values need `Promise.resolve(...)` wrapping
Native `Promise.all` accepts a mix of promises and plain values — `Promise.all([1, fetchUser()])` works, because every entry is implicitly passed through `Promise.resolve()`. The original `myall` calls `p.then(...)` directly, assuming every element is already a thenable; passing a plain number or string throws `TypeError: p.then is not a function`. Wrapping each entry with `Promise.resolve(p)` (shown above) fixes this and costs nothing for entries that are already promises.
:::

## `Promise.allSettled` — wait for every promise, never reject

```js
Promise.mysettleall = function (promises) {
  return new Promise((res, rej) => {
    let pass = new Array(promises.length);
    let count = 0;
    promises.forEach((x, i) => {
      x.then((y) => {
        pass[i] = { status: 'fullfiled', value: y };
        if (++count === promises.length) res(pass);
      }).catch((y) => {
        pass[i] = { status: 'rejected', reason: y };
        if (++count === promises.length) res(pass);
      });
    });
  });
};
```

```js
const p1 = new Promise((resolve) => setTimeout(() => resolve('Resolve 1'), 2000));
const p2 = new Promise((resolve) => setTimeout(() => resolve('Resolve 2'), 1000));
const p3 = new Promise((_, reject) => setTimeout(() => reject('reject 3'), 400));

Promise.mysettleall([p1, p2, p3]).then(console.log);
// [
//   { status: 'fulfilled', value: 'Resolve 1' },
//   { status: 'fulfilled', value: 'Resolve 2' },
//   { status: 'rejected', reason: 'reject 3' }
// ]
```

:::warning `"fullfiled"` is a typo — it must read `"fulfilled"`
The real `Promise.allSettled` always reports the status string as exactly `"fulfilled"` (two `l`s, one `d`, in that order) or `"rejected"`. The source spells it `"fullfiled"`. This isn't cosmetic: any code that checks `result.status === 'fulfilled'` against this polyfill's output will **always get `false`** for successful entries, silently treating every success as if the branch never matched. Fix the string literal, not the check.
:::

### `then(onFulfilled, onRejected)` vs. `.then().catch()`

Both `myall` and `mysettleall` chain a separate `.catch()` after `.then()`:

```js
p.then((x) => { result[i] = x; /* ... */ }).catch(rej);
```

That reads naturally, but it has a subtle difference from passing both handlers directly to one `.then()` call:

```js
p.then(
  (x) => { result[i] = x; /* ... */ },
  (err) => rej(err)
);
```

With the chained form, if the **success handler itself throws** (say, `result[i] = x` throws because `result` was accidentally frozen), that error is caught by the trailing `.catch()` and routed into `rej` — even though the original promise `p` never actually rejected. The bug gets mislabeled as "the promise rejected" when it was really "my own fulfillment handler crashed." With the two-argument `then(onFulfilled, onRejected)` form, an error thrown inside `onFulfilled` is *not* caught by the paired `onRejected` — it propagates as an unhandled rejection on the promise `then()` returns instead, which is usually easier to diagnose correctly. This is a well-known interview point precisely because the two forms look almost interchangeable but aren't.

## `Promise.race` — settle on whichever promise settles first

```js
Promise.myrace = function (promises) {
  return new Promise((res, rej) => {
    promises.forEach((x) => {
      x.then(res).catch(rej);
    });
  });
};
```

```js
Promise.myrace([p1, p2, p3]).then(console.log).catch(console.log);
// p3 rejects fastest (400ms): "reject 3"
```

This relies on a guarantee built into every native `Promise`: **a promise can only settle once.** Calling `res(...)` or `rej(...)` more than once on the same `(res, rej)` pair is simply ignored after the first call — so even though *all three* promises eventually call `res` or `rej` on the outer promise, only the first call has any effect. `myrace` doesn't need to track "have I already settled?" itself; the `Promise` constructor already enforces it.

## `Promise.any` — resolve on the first success, `AggregateError` if all fail

```js
Promise.myany = function (promise) {
  return new Promise((res, rej) => {
    let count = 0;
    let failsafe = new Array(promise.length);
    promise.forEach((p, i) => {
      p.then(res).catch((f) => {
        failsafe[i] = f;
        if (++count === promise.length) {
          rej(new AggregateError(failsafe, 'All promises were rejected'));
        }
      });
    });
  });
};
```

```js
Promise.myany([p3]).then(console.log).catch(console.log);
// p3 always rejects → AggregateError: All promises were rejected
// error.errors is ['reject 3']
```

This mirrors `Promise.race`'s "first one wins" shape, but flips which outcome short-circuits: any single **fulfillment** settles the outer promise immediately (via `res`, reused directly as the `.then()` handler), while **rejection** only settles the outer promise once *every* input has rejected — at which point it rejects with a real `AggregateError` whose `.errors` array lines up index-for-index with the original input. This matches the native `Promise.any` contract exactly, including the error type.

## Filling the gaps: `finally`, `mapLimit`, `retry`

The [Polyfill Interview Checklist](./polyfill-checklist.md) lists three more promise-related utilities that none of the source files implement. Here they are, built on the combinators above.

### `Promise.prototype.finally`

`finally` runs a callback regardless of whether the promise resolved or rejected, and — critically — passes the original resolution or rejection straight through unchanged:

```js
if (!Promise.prototype.myfinally) {
  Promise.prototype.myfinally = function (onFinally) {
    return this.then(
      (value) => {
        onFinally();
        return value; // pass the resolved value through
      },
      (err) => {
        onFinally();
        throw err; // re-throw so the rejection still propagates
      }
    );
  };
}
```

```js
fetchUser()
  .then((user) => render(user))
  .catch((err) => showError(err))
  .myfinally(() => hideSpinner());
// hideSpinner() runs whether fetchUser() succeeded or failed
```

### `mapLimit` — run an async function over a list with bounded concurrency

`mapLimit` applies an async `fn` to every item in `items`, but never lets more than `limit` calls run at the same time, while still returning results **in the original order**:

```js
function mapLimit(items, limit, fn) {
  return new Promise((resolve, reject) => {
    if (items.length === 0) return resolve([]);
    const results = new Array(items.length);
    let inFlight = 0;
    let nextIndex = 0;
    let completed = 0;

    function runNext() {
      if (nextIndex >= items.length) return;
      const i = nextIndex++;
      inFlight++;
      Promise.resolve(fn(items[i], i))
        .then((value) => {
          results[i] = value;
          inFlight--;
          completed++;
          if (completed === items.length) return resolve(results);
          runNext();
        })
        .catch(reject);
    }

    for (let k = 0; k < Math.min(limit, items.length); k++) runNext();
  });
}
```

```js
const ids = [1, 2, 3, 4, 5];
mapLimit(ids, 2, (id) => fetchUser(id)).then((users) => {
  console.log(users); // 5 users, in id order, never more than 2 requests in flight at once
});
```

The key idea: start exactly `limit` "workers," and whenever one finishes, immediately pull the next unstarted item — rather than chunking the array into fixed-size batches (which would needlessly wait for a slow item in one batch before starting the next batch).

### `retry` — re-run a failing async operation with backoff

```js
function retry(fn, attempts = 3, delayMs = 300) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch((err) => {
          if (remaining <= 1) return reject(err);
          setTimeout(() => attempt(remaining - 1), delayMs);
        });
    }
    attempt(attempts);
  });
}
```

```js
retry(() => fetch('/api/flaky-endpoint').then((r) => r.json()), 3, 500)
  .then((data) => console.log('got it:', data))
  .catch((err) => console.log('gave up after 3 attempts:', err));
```

`Promise.resolve().then(fn)` guarantees `fn` runs as a microtask even if it throws *synchronously* rather than returning a rejected promise — without that wrapper, a synchronous throw inside `fn` would skip the `.catch()` entirely and escape as an uncaught exception.

## Key takeaways

- `Promise.all`/`myall` resolves with results in **input order**, regardless of which promise actually settles first — made possible by writing into `result[i]` rather than pushing.
- An empty input array is an edge case every "wait for N things" combinator must handle explicitly, or it hangs forever.
- `Promise.race` and `Promise.any` lean on the built-in guarantee that a promise settles only once — no manual "already settled" flag needed.
- `AggregateError` is the correct rejection type for `Promise.any` when every input rejects; a plain `Error` would lose the per-input failure reasons.
- `.then(ok).catch(fail)` and `.then(ok, fail)` are *not* interchangeable: the first lets an error thrown inside `ok` get mislabeled as a rejection of the original promise.
- `finally` must re-throw (not swallow) the original error to preserve the rejection.

## Interview questions

1. Why does `Promise.all` return results in input order even when the promises resolve out of order?
2. What happens if you call `Promise.myall([])` with the version shown above that lacks the empty-array guard? Why?
3. Why is `rej(new AggregateError(...))` only called once `count === promise.length` inside `myany`, rather than on the very first rejection?
4. What's the practical difference between `promise.then(ok).catch(fail)` and `promise.then(ok, fail)`?
5. Why does `mapLimit` need to track `nextIndex` and start a new item the moment one finishes, rather than processing the array in fixed-size chunks of `limit`?

See also: [Promise Combinators](../08-asynchronous-javascript/promise-combinators.md) for the conceptual background on `all`/`allSettled`/`race`/`any`, and the [Polyfill Interview Checklist](./polyfill-checklist.md) for the full 14-item list these implementations are drawn from.
