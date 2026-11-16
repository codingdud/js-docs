---
title: Polyfill Interview Checklist
sidebar_position: 7
---

# Polyfill Interview Checklist

A commonly circulated interview-prep list groups the JavaScript "re-implement this from scratch" questions into a single checklist of 14 items. This page is that checklist, with links to where each one is already covered in this chapter — and full implementations for the five gaps the earlier pages don't fill: `find`, an event emitter, a `setInterval` polyfill, a general-purpose concurrency limiter, and a deep object flattener.

## The 14-item list

| # | Polyfill | Where it's covered |
| --- | --- | --- |
| 1 | `map`, `reduce`, `filter`, `forEach`, `find` | [Array Method Polyfills](./array-polyfills.md) covers `map`/`reduce`/`filter`/`forEach`; `find` is implemented [below](#find) |
| 2 | `call`, `apply`, `bind` | [`call`, `apply` and `bind` Polyfills](./call-apply-bind-polyfills.md) |
| 3 | `Promise`, `Promise.all()`, `Promise.any()`, `Promise.allSettled()`, `Promise.race()` | [Promise Combinator Polyfills](./promise-polyfills.md) |
| 4 | `mapLimit` | Implemented in [Promise Combinator Polyfills](./promise-polyfills.md#maplimit--run-an-async-function-over-a-list-with-bounded-concurrency); a more general sibling, `parallelLimit`, is implemented [below](#parallel-limit) |
| 5 | Debounce | [Debouncing](./debounce.md) |
| 6 | Throttle | [Throttling](./throttle.md) |
| 7 | Event emitter | Implemented [below](#event-emitter) |
| 8 | `setInterval` polyfill | Implemented [below](#setinterval-polyfill) |
| 9 | Parallel limit function | Implemented [below](#parallel-limit) |
| 10 | Deep vs. shallow copy | [Shallow vs. Deep Copy](../04-objects/shallow-vs-deep-copy.md) |
| 11 | Flatten a deeply nested object | Implemented [below](#flatten-a-deeply-nested-object) |
| 12 | Memoization / caching | [Memoization with an LRU Cache](./memoization-lru-cache.md) |
| 13 | `Promise.prototype.finally` | Implemented in [Promise Combinator Polyfills](./promise-polyfills.md#promiseprototypefinally) |
| 14 | `retry` | Implemented in [Promise Combinator Polyfills](./promise-polyfills.md#retry--re-run-a-failing-async-operation-with-backoff) |

:::tip Where this list comes from
This is a condensed version of a widely shared "JS interview prep" checklist, grouped into two halves: core language *concepts* (scope, closures, prototypes, hoisting, the event loop, `this`, equality, and so on — covered across [Functions, Scope & Closures](../03-functions-and-scope/closures.md), [Prototypes & Inheritance](../05-prototypes/prototype-chain.md) and [Asynchronous JavaScript](../08-asynchronous-javascript/event-loop.md)) and the from-scratch *polyfills* this chapter focuses on.
:::

## The guard pattern every polyfill in this list should use

Every implementation that follows extends a built-in prototype or defines a globally-used utility. In real code — as opposed to a one-off interview answer — always guard the definition so a second script (or a future JS engine version that adds the real method natively) can't silently clobber it:

```js
if (!Array.prototype.myFind) {
  Object.defineProperty(Array.prototype, 'myFind', {
    value: function (predicate, thisArg) {
      for (let i = 0; i < this.length; i++) {
        if (i in this && predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
```

This is the same pattern introduced in [Array Method Polyfills](./array-polyfills.md#the-risky-part-overwriting-filter-and-fill): check first, define with `Object.defineProperty` so the method isn't `enumerable`, and allow it to be `configurable`/`writable` so later code (including the real native implementation, if the environment adds support) can still take over cleanly.

## `find`

```js
if (!Array.prototype.myFind) {
  Array.prototype.myFind = function (predicate, thisArg) {
    for (let i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}
```

```js
const users = [{ id: 1 }, { id: 2 }, { id: 3 }];
console.log(users.myFind((u) => u.id === 2)); // { id: 2 }
console.log([1, 2, 3].myFind((x) => x > 10));  // undefined — no match, matches native find exactly
```

Unlike `filter` (which collects *every* match into a new array), `find` stops and returns the **first** matching element directly — not wrapped in an array, and `undefined` if nothing matches.

## Event emitter

A minimal publish/subscribe implementation — the same shape Node.js's `EventEmitter` and most front-end state libraries use internally:

```js
class MyEventEmitter {
  constructor() {
    this.listeners = new Map(); // event name → array of handler functions
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
    return this; // allow chaining: emitter.on('a', fn1).on('b', fn2)
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (!handlers) return this;
    this.listeners.set(event, handlers.filter((h) => h !== handler));
    return this;
  }

  emit(event, ...args) {
    const handlers = this.listeners.get(event) || [];
    // copy the array before iterating: a handler calling off() mid-emit
    // must not skip or re-run other handlers
    [...handlers].forEach((h) => h(...args));
    return handlers.length > 0;
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }
}
```

```js
const bus = new MyEventEmitter();
const onLogin = (user) => console.log('logged in:', user);

bus.on('login', onLogin);
bus.emit('login', 'animesh'); // "logged in: animesh"

bus.off('login', onLogin);
bus.emit('login', 'ignored'); // nothing happens — handler was removed
```

:::warning Snapshot the handler list before iterating in `emit`
`emit` iterates over `[...handlers]` — a **copy** of the listener array — rather than the live array stored in `this.listeners`. If a handler calls `off()` on itself (or `on()` to add a new one) while `emit` is in the middle of looping, mutating the live array during iteration can skip handlers or re-run the wrong ones, depending on how the loop is written. Iterating a snapshot avoids that entire class of bug.
:::

## `setInterval` polyfill

Built on `setTimeout`, re-scheduling itself after every run — useful for understanding what `setInterval` is actually doing under the hood, and for environments that don't drift-correct the way a "real" interval implementation would:

```js
function mySetInterval(fn, delay, ...args) {
  let cancelled = false;
  let timeoutId;

  function tick() {
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      fn(...args);
      tick(); // schedule the next run only after this one finishes
    }, delay);
  }
  tick();

  return {
    clear() {
      cancelled = true;
      clearTimeout(timeoutId);
    },
  };
}
```

```js
const handle = mySetInterval(() => console.log('tick'), 1000);
// prints "tick" roughly every second

setTimeout(() => handle.clear(), 5000); // stop after ~5 seconds
```

:::note This is a "chained `setTimeout`," not a true interval
A real `setInterval` schedules ticks at a fixed cadence from the start time, so if one callback happens to run long, the *next* tick's timing doesn't necessarily drift. Chaining `setTimeout` calls like this instead measures each `delay` from the moment the *previous* callback finished, so slow callbacks push every subsequent tick later — a classic trade-off, and one worth mentioning explicitly in an interview rather than presenting this as a byte-for-byte equivalent.
:::

## Parallel limit

A general-purpose concurrency limiter, independent of any particular array-mapping shape — useful when you have a queue of arbitrary async tasks (not necessarily "transform each item of an array") and just want to cap how many run at once:

```js
function parallelLimit(tasks, limit) {
  return new Promise((resolve, reject) => {
    if (tasks.length === 0) return resolve([]);
    const results = new Array(tasks.length);
    let nextIndex = 0;
    let completed = 0;
    let rejected = false;

    function runNext() {
      if (rejected || nextIndex >= tasks.length) return;
      const i = nextIndex++;
      tasks[i]()
        .then((value) => {
          results[i] = value;
          completed++;
          if (completed === tasks.length) resolve(results);
          else runNext();
        })
        .catch((err) => {
          rejected = true;
          reject(err);
        });
    }

    for (let k = 0; k < Math.min(limit, tasks.length); k++) runNext();
  });
}
```

```js
const tasks = [1, 2, 3, 4, 5].map((n) => () => fetch(`/api/item/${n}`).then((r) => r.json()));
parallelLimit(tasks, 2).then((results) => console.log(results));
// never more than 2 requests in flight; results array keeps the original task order
```

The difference from `mapLimit` (see [Promise Combinator Polyfills](./promise-polyfills.md#maplimit--run-an-async-function-over-a-list-with-bounded-concurrency)) is purely API shape: `mapLimit(items, limit, fn)` always derives its tasks by calling `fn` on each item of a known array, whereas `parallelLimit(tasks, limit)` takes a list of already-built, zero-argument task functions — closer to what you'd reach for when the tasks aren't a uniform "map this function over this array" operation.

## Flatten a deeply nested object

Not to be confused with flattening a *nested array* (`[1, [2, [3]]] → [1, 2, 3]`) — this flattens a nested **object** into a single level, joining the path to each leaf value with dots:

```js
function flattenObject(obj, prefix = '', result = {}) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, path, result); // recurse into nested plain objects
    } else {
      result[path] = value; // leaf value (including arrays, which are kept intact)
    }
  }
  return result;
}
```

```js
const nested = {
  user: {
    name: 'Animesh',
    address: { city: 'Ranchi', state: 'Jharkhand' },
  },
  tags: ['admin', 'active'],
};

console.log(flattenObject(nested));
// {
//   'user.name': 'Animesh',
//   'user.address.city': 'Ranchi',
//   'user.address.state': 'Jharkhand',
//   'tags': ['admin', 'active']   // arrays are treated as leaves, not recursed into
// }
```

Arrays are deliberately treated as leaf values rather than recursed into — flattening `{ tags: ['admin', 'active'] }` into `{ 'tags.0': 'admin', 'tags.1': 'active' }` is a valid design choice some implementations make instead, but it's lossy about the fact that the value was an ordered list rather than an object with numeric-looking keys, so this version keeps arrays whole by checking `!Array.isArray(value)` before recursing.

## Key takeaways

- Guard every prototype/global polyfill with an existence check (`if (!Array.prototype.x)`), and define it with `Object.defineProperty(..., { enumerable: false })` so it behaves like a real built-in.
- `find` returns the first matching *element* directly; `filter` returns *every* match wrapped in a new array — don't confuse the two contracts.
- An event emitter's `emit` must iterate a snapshot of its handler list, not the live array, so a handler that adds/removes listeners mid-emission can't corrupt the iteration.
- A `setTimeout`-chained `setInterval` polyfill measures each delay from when the previous callback *finished*, not from a fixed cadence — it will drift under slow callbacks, unlike a true interval.
- "Flatten a nested object" (dot-path keys) and "flatten a nested array" (`Array.prototype.flat`) are two different problems that happen to share the word "flatten."

## Interview questions

1. Why does `find` return `undefined` for "no match" instead of an empty array?
2. Why should `emit()` iterate over a copy of the handler list instead of the live array stored on the emitter?
3. What's the practical difference between a `setTimeout`-chained interval and a true `setInterval`, in terms of timing drift?
4. How does `parallelLimit` differ from `mapLimit` in what it takes as input, even though both cap concurrency the same way?
5. Why does `flattenObject` check `!Array.isArray(value)` before deciding to recurse?

See also: every other page in this chapter — [Array Method Polyfills](./array-polyfills.md), [`call`, `apply` and `bind` Polyfills](./call-apply-bind-polyfills.md), [Promise Combinator Polyfills](./promise-polyfills.md), [Debouncing](./debounce.md), [Throttling](./throttle.md), and [Memoization with an LRU Cache](./memoization-lru-cache.md) — for the implementations this checklist links back to.
