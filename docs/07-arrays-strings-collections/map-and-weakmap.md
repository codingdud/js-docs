---
title: Map, WeakMap and Map vs Object
sidebar_position: 4
---

`Map` and `WeakMap` are JavaScript's dedicated key-value collection types. This page covers the `Map` API, how `Map` compares to a plain object, what makes `WeakMap` special (and why that makes it uniterable), and a real bug found in a `WeakMap` demo script.

## `Map` basics

A `Map` can be built directly from an array of `[key, value]` pairs, and preserves **insertion order** when iterated:

```js
let map = new Map([
  ['a', 1],
  ['b', 2],
  ['c', 3],
]);

map.set('a', map.get('a') + 1); // update 'a' using its current value
console.log(map.has('a')); // true

map.delete('a');
console.log(map.size, map.get('a')); // 2 undefined — 'a' is gone

for (let [key, value] of map) console.log(key, value);
// b 2
// c 3

for (let key of map.keys())   console.log(key);   // b, c
for (let value of map.values()) console.log(value); // 2, 3

map.clear();
console.log(map.size); // 0
```

| Method | Purpose |
|---|---|
| `set(key, value)` | Add or update an entry; returns the `Map` (chainable) |
| `get(key)` | Retrieve a value, or `undefined` if the key isn't present |
| `has(key)` | Check whether a key exists |
| `delete(key)` | Remove an entry; returns `true`/`false` |
| `size` | Number of entries (a property, not a method) |
| `clear()` | Remove all entries |
| `keys()` / `values()` / `entries()` | Iterators over keys, values, or `[key, value]` pairs |

A `Map` is directly iterable (`for...of`, spread, `Array.from`) because it implements `Symbol.iterator` itself, defaulting to the same sequence as `entries()`.

## `Map` vs `Object`

| | `Map` | `Object` |
|---|---|---|
| **Keys** | Any type — objects, functions, primitives | Strings or `Symbol`s only |
| **Order** | Insertion order guaranteed | Insertion order mostly, but integer-like keys are always iterated first in ascending numeric order |
| **Size** | `.size` property | Manual — `Object.keys(obj).length` |
| **Iteration** | Directly iterable (`for...of`) | Needs `Object.keys()` / `Object.entries()` |
| **Default keys** | No inherited keys | Inherits keys from `Object.prototype` (`toString`, `constructor`, ...) unless created with `Object.create(null)` |
| **Performance** | Better for frequent add/delete of arbitrary keys | Better for a static, known shape |

### Object keys get coerced to strings

This is the sharpest edge of using a plain object as a map: **any key you use is converted to a string** before it's stored.

```js
const map = new Map();
map.set('name', 'Alice');  // string key, stored as-is
map.set(42, 'number key'); // number key, stored as-is — distinct from the string "42"
map.set({}, 'object key'); // a real object as a key — impossible with a plain object

const obj = {};
obj['name'] = 'Alice';     // fine — already a string
obj[42] = 'becomes "42"';  // the number 42 is coerced to the string key "42"
```

So with a plain object, `obj[42]` and `obj["42"]` are **the same property** — you lose the ability to distinguish a numeric key from its string form, and you can never use an object or array itself as a key. `Map` has neither limitation.

**When to use which:**
- **`Map`** — keys aren't strings, you add/remove entries frequently, you need `.size`, or you need guaranteed iteration order.
- **`Object`** — a fixed, known set of string-keyed fields (a "record"), especially when it needs to be `JSON.stringify`-ed directly.

## `WeakMap`

A `WeakMap` looks similar to `Map` but with three deliberate restrictions:

1. **Keys must be objects** (or, in newer engines, registered symbols) — never primitives.
2. It is **not iterable** — no `keys()`, `values()`, `entries()`, `forEach()`, and no `.size` either.
3. Its references to keys are **weak**: if nothing else in the program still holds a reference to a key object, the engine is free to garbage-collect it, and its `WeakMap` entry disappears along with it.

Those restrictions exist *because* of what `WeakMap` is for: caching or attaching metadata to objects **without preventing those objects from being garbage-collected** when nothing else needs them anymore. If `WeakMap` were iterable, you could enumerate its keys — and merely holding a reference while iterating would keep those objects alive, defeating the whole point.

```js
let wm = new WeakMap();
let mp = new Map();
let user = { id: 1 };

mp.set(user, "cached data");
wm.set(user, "cached data");

console.log(wm.get(user)); // "cached data"

user = null; // drop the only *local* strong reference to the object

for (let [x, y] of mp) {
  console.log(x, y); // { id: 1 } 'cached data' — still here!
}
```

Even after `user = null`, the loop over `mp` still finds the object. That's expected: a regular `Map` holds a **strong** reference to its keys, so `mp` alone is enough to keep `{ id: 1 }` alive, regardless of what `wm` does. `WeakMap`'s weak reference only matters once *no* strong reference remains anywhere in the program — and because JavaScript gives no API to force or observe garbage collection synchronously, you can't demonstrate the collection happening from inside the script at all; you only know it's eligible.

### The bug: an undeclared `temp`

The original script ends with:

```js
console.log(wm.get(temp))
```

`temp` was never declared anywhere in this file, so this line throws:

```text
ReferenceError: temp is not defined
```

That's a typo, not a demonstration of `WeakMap` behavior — the intent was presumably `wm.get(user)`. Fixing the typo to use the actual variable shows that `WeakMap.prototype.get` **does not throw** for a key that no longer matches (or is even a non-object), it simply returns `undefined`:

```js
console.log(wm.get(user)); // undefined — user is now null, which isn't a key in wm
```

:::warning get/has/delete tolerate non-object keys; set does not
Only `WeakMap.prototype.set(key, value)` throws `TypeError` if `key` is not an object. `get`, `has`, and `delete` happily accept any value (including `null` or a primitive) and simply report "not found" rather than erroring, which is why `wm.get(user)` after `user = null` returns `undefined` instead of throwing.
:::

### `WeakMap` caching use case

A canonical use of `WeakMap` is memoizing/caching derived data **per object**, without leaking memory for objects that later become unreachable elsewhere in the program — for example, caching the result of an expensive computation keyed by a DOM node or a parsed object, so the cache entry disappears on its own once that node/object is no longer used anywhere else:

```js
const resultCache = new WeakMap();

function computeExpensive(obj) {
  if (resultCache.has(obj)) return resultCache.get(obj);
  const result = /* ...expensive work based on obj... */ JSON.stringify(obj).length;
  resultCache.set(obj, result);
  return result;
}
```

If `obj` is later discarded by the rest of the program, its cache entry in `resultCache` becomes eligible for garbage collection too — a plain `Map` would keep that entry (and the object) alive forever, a classic source of memory leaks in long-running apps.

## Key takeaways

- `Map` preserves insertion order, allows any key type, and exposes `.size` directly — a plain object does none of those reliably.
- Plain object keys are always coerced to strings, so `obj[42]` and `obj["42"]` collide, and objects/arrays can never be used as keys.
- `WeakMap` restricts keys to objects, is not iterable, and holds weak references so cached entries don't prevent garbage collection.
- Only `WeakMap.prototype.set` throws on a non-object key; `get`/`has`/`delete` just return "not found."
- Referencing an undeclared identifier (like the `temp` bug) throws `ReferenceError` — always double check every variable used in a `console.log` actually exists in scope.

## Interview questions

**Q: When would you choose `Map` over a plain object?**
When keys aren't strings (objects, numbers you want to keep distinct from their string form, etc.), when you need guaranteed iteration order, when you need a `.size` property, or when entries are added/removed frequently.

**Q: Why isn't `WeakMap` iterable?**
Because exposing an iterator would require giving out references to its keys, which would keep those objects reachable (alive) for as long as you held the iterator — directly defeating the purpose of a *weak* reference.

**Q: Can you use a string or number as a `WeakMap` key?**
No — `WeakMap.prototype.set` throws `TypeError` if the key isn't an object (ignoring the newer registered-symbol allowance). `get`/`has`/`delete` won't throw for a non-object key, they'll just report that it isn't present.

**Q: What's a realistic use case for `WeakMap`?**
Caching derived/expensive data keyed by an object (or DOM node) so the cache entry is automatically eligible for cleanup once nothing else references that object — avoiding the memory leak a plain `Map`-based cache would cause.

See also [Set and Array vs Set](./set.md) for another built-in collection type, and [Memoization & LRU Cache](../12-polyfills-and-utilities/memoization-lru-cache.md) for more caching patterns.
