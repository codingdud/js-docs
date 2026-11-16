---
title: Memoization with an LRU Cache
sidebar_position: 6
---

# Memoization with an LRU Cache

[Memoization](../03-functions-and-scope/closures.md) caches a function's return value so that calling it again with the same arguments skips the computation and returns the cached result instantly. A naive memoization cache grows forever — every unique set of arguments adds one more entry, with nothing ever removed. This page implements a bounded cache that evicts the **Least Recently Used** entry once it's full, using nothing but a `Map` and the fact that `Map` remembers insertion order.

## The implementation

```js
const map = new Map();

function memoization(fn, ...arg) {
  const key = fn.name + '|' + JSON.stringify(arg);

  if (map.has(key)) {
    const temp = map.get(key);
    map.delete(key);
    map.set(key, temp); // re-insert → moves this key to the "most recently used" end
    return temp;
  }

  if (map.size >= 5) {
    map.delete(map.keys().next().value); // evict the oldest ("least recently used") entry
  }

  const result = fn(...arg);
  map.set(key, result);
  return result;
}
```

```js
function slowAdd(a, b) {
  console.log('computed:', a, b);
  return a + b;
}

memoization(slowAdd, 2, 3); // logs "computed: 2 3", returns 5
memoization(slowAdd, 2, 3); // no log — cache hit, returns 5 instantly
```

## How the LRU ordering works with nothing but a `Map`

A JavaScript `Map` iterates its entries in **insertion order** — and that's the entire trick here. There's no separate linked list, no "last used" timestamp field, nothing extra:

- **On a cache hit:** `map.delete(key)` followed immediately by `map.set(key, temp)` removes the entry and re-inserts it. The *value* doesn't change, but its position in the Map's iteration order moves from wherever it was to the very end — "most recently used."
- **On a cache miss, when the cache is full:** `map.keys().next().value` reads the **first** key in iteration order — by construction, the one that has gone the longest without being touched — and deletes it before inserting the new entry.

```js
memoization(slowAdd, 1, 1); // cache: [1,1]
memoization(slowAdd, 2, 2); // cache: [1,1] [2,2]
memoization(slowAdd, 3, 3); // cache: [1,1] [2,2] [3,3]
memoization(slowAdd, 4, 4); // cache: [1,1] [2,2] [3,3] [4,4]
memoization(slowAdd, 5, 5); // cache: [1,1] [2,2] [3,3] [4,4] [5,5]  (size === 5, at the limit)

memoization(slowAdd, 1, 1); // CACHE HIT — re-inserted at the end:
                            // cache: [2,2] [3,3] [4,4] [5,5] [1,1]

memoization(slowAdd, 6, 6); // size was 5 → evict the current oldest, which is now [2,2]
                            // cache: [3,3] [4,4] [5,5] [1,1] [6,6]
```

:::note The cache never exceeds 5 entries — not 6
`if (map.size >= 5) map.delete(...)` runs the eviction check **before** inserting the new entry. Once the cache has reached exactly 5 entries, every subsequent miss evicts one *first*, then adds one — net size stays at 5. It never briefly grows to 6 before trimming back down.
:::

## Key collisions: `fn.name + JSON.stringify(args)`

The cache key is built from the function's name and its JSON-stringified arguments. Both halves of that key can collide in ways that silently return the wrong cached value:

:::warning Two different functions can share a name
If two separate functions are both named, say, `calculate` (easy to end up with across different modules, or two inline arrow functions both assigned to a variable called the same thing), `memoization(calculateA, 5)` and `memoization(calculateB, 5)` produce the **identical key** `"calculate|[5]"`. Whichever one runs first populates the cache, and the second call silently returns the *first* function's result — a correctness bug that gives no error, no warning, nothing.
:::

:::warning Anonymous functions all collide on the same empty name
`fn.name` is `''` for a function with no inferred name (e.g. `memoization(function (x) { return x * 2; }, 3)` called directly with an inline anonymous function expression that isn't assigned to a variable first). Every anonymous call like this collapses to the same `'' + JSON.stringify(args)` key family, so two *different* anonymous functions called with the same arguments would collide.
:::

:::warning `JSON.stringify` drops information `Map`-aware equality wouldn't
`JSON.stringify` silently omits `undefined` values, functions, and symbols from the serialized arguments, and serializes `Map`/`Set`/custom objects in ways that don't necessarily reflect their actual contents (e.g. a `Map` argument serializes to `{}`, with its entries entirely invisible). Two calls with genuinely different arguments of these kinds can end up with the exact same cache key.
:::

## Caching impure functions

```js
function getRandom() {
  return Math.random();
}

memoization(getRandom); // computes a fresh random number, caches it
memoization(getRandom); // CACHE HIT — returns the *same* number as the call above
```

This is a direct consequence of what memoization fundamentally is: "same inputs → return the previously computed output, without re-running the function." `Math.random()` always receives the exact same (empty) arguments, so after the first call every subsequent call returns that one frozen value — which is almost certainly not what you want from a function whose entire purpose is to be different every time.

:::danger Memoization is only safe for pure functions
A function is safe to memoize only if it's **pure**: the same arguments always produce the same result, and it has no side effects the caller depends on. `Math.random()`, `Date.now()`, anything reading mutable external state, or anything with a side effect (writing to a DOM element, making a network call) breaks the moment it's wrapped in this cache — not because the cache is buggy, but because memoization and impurity are fundamentally incompatible. Always check that a function is pure *before* reaching for memoization, not after noticing stale results in production.
:::

## One shared, global cache for every memoized function

```js
const map = new Map(); // module-level — shared by every call to memoization(), for every fn
```

Because there's exactly one `map`, memoizing two *different* functions (`slowAdd` and `slowMultiply`, say) pours both of their cache entries into the same 5-slot bucket. Calling `slowAdd` five times fills the cache entirely with `slowAdd` results; the very next call — even to `slowMultiply` — evicts one of those `slowAdd` entries to make room, regardless of how "important" or recently useful it was relative to `slowMultiply`'s own entries. A more robust design gives each memoized function (or each call to a `memoize(fn)` factory) its **own**, independent `Map`:

```js
function memoize(fn, limit = 5) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args); // fn is fixed per-closure — no need to include fn.name
    if (cache.has(key)) {
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const memoizedAdd = memoize(slowAdd);
const memoizedMultiply = memoize(slowMultiply); // fully independent cache, no shared eviction pressure
```

This factory form also sidesteps the `fn.name` collision problem entirely — since `fn` is fixed once per closure, there's no need to fold its name into the key at all.

## Test cases summary

The Jest suite exercises the behaviour above directly:

| Area | Cases |
| --- | --- |
| **Basic caching** | repeated identical calls compute once; different arguments each compute; two different functions with the same arguments both compute (not confused with each other, since the test functions have distinct names); zero/negative numbers |
| **LRU eviction** | cache never exceeds size 5; the oldest entry is recomputed after 6 distinct calls evict it; accessing an entry moves it to the back, protecting it from the next eviction |
| **Complex scenarios** | string arguments; array arguments (serialized via `JSON.stringify`); single-argument and zero-argument functions |
| **Impure functions** | `Math.random()` memoized twice returns the *same* value both times — asserted as the expected (if surprising) behaviour |
| **Edge cases** | `boolean`, `null` and `undefined` arguments all produce distinct, stable cache keys |

## Key takeaways

- A `Map`'s iteration order is insertion order — delete-then-reinsert on a hit, and evict-the-first-key on a miss, is enough to implement full LRU behaviour with no extra data structure.
- The eviction check runs *before* inserting the new entry, so the cache size caps at exactly the configured limit, never one over.
- `fn.name + JSON.stringify(args)` is a convenient key but collides for same-named or anonymous functions, and loses information for arguments `JSON.stringify` can't faithfully serialize.
- Memoization is only correct for pure functions — wrapping an impure one (random numbers, timestamps, anything with side effects) produces a cache that's "working as designed" but gives wrong results for the use case.
- A single shared cache across unrelated functions creates eviction pressure between functions that have nothing to do with each other; give each memoized function its own cache instead.

## Interview questions

1. How does a plain `Map` give you LRU ordering without a separate linked list or timestamp field?
2. Why does `map.delete(key)` immediately followed by `map.set(key, value)` move an entry to the "most recently used" position?
3. What's wrong with using `fn.name` as part of the cache key, and how would you fix it?
4. Why is it unsafe to memoize `Math.random`, and what property must a function have to be safely memoizable?
5. What problem does giving each memoized function its own `Map` solve that a single shared `Map` doesn't?

See also: [Closures](../03-functions-and-scope/closures.md) for why memoization and currying both depend on a function "remembering" state between calls, and the [Polyfill Interview Checklist](./polyfill-checklist.md) for memoization listed alongside the other 13 classic polyfills.
