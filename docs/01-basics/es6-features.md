---
title: ES6+ Features Overview
sidebar_position: 5
---

# ES6+ Features Overview

ES6 (ECMAScript 2015) was JavaScript's biggest single syntax update; later yearly releases ("ES6+") kept building on it. A map of the headline features, with destructuring and spread covered in depth since they trip people up most.

## The headline list

| Feature | What it gives you |
| --- | --- |
| `let` / `const` | Block scope, no accidental globals (see [Variables](./variables-var-let-const.md)) |
| Arrow functions | Shorter syntax, lexical `this` (no own binding) |
| Classes | Cleaner syntax over prototypal inheritance |
| Template literals | Backtick strings with `${}` interpolation |
| Destructuring | Unpack arrays/objects into variables in one step |
| Spread / rest (`...`) | Expand a collection into elements, or collect elements into one |
| Default parameters | `function f(x = 10) { ... }` |
| Modules | `import` / `export` — file-scoped code, explicit dependencies |
| Promises | Structured, chainable handling of async results |
| `Symbol` | Unique, collision-free primitive values |
| `Map` / `Set` | Purpose-built keyed and unique-value collections |

```js
// Template literal
const name = "Ada";
console.log(`Hello, ${name}!`); // "Hello, Ada!"

// Arrow function
const double = (n) => n * 2;

// Class
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Default parameter
function greet(who = "stranger") {
  return `Hi, ${who}`;
}

// Map / Set
const seen = new Set([1, 2, 2, 3]); // {1, 2, 3} — duplicates collapse
const scores = new Map([["alice", 10]]);
```

Dedicated chapters: [Arrow Functions and this](../03-functions-and-scope/arrow-functions-and-this.md), [Classes & OOP](../06-classes-and-oop/classes-vs-constructors.md), [Map and WeakMap](../07-arrays-strings-collections/map-and-weakmap.md), [Set](../07-arrays-strings-collections/set.md), [Promises](../08-asynchronous-javascript/promises.md). The rest of this page covers destructuring, spread/rest, and object shorthand.

## Destructuring

Unpacks values out of an array or object into individual variables in one expression.

### Destructuring with defaults

```js
const { x = 10 } = {};
console.log(x); // 10 — "x" isn't in the object, so the default kicks in

const { y = 10 } = { y: 5 };
console.log(y); // 5 — the object already has "y", so the default is unused
```

The default applies only when the property is **missing or `undefined`** — same rule as default function parameters (see [`undefined`, `null`, `NaN`](./null-undefined-nan.md#default-parameters-only-trigger-on-undefined)).

### Skipping elements

```js
const arr = [1, 2, 3];
const [a, , c] = arr;
console.log(a, c); // 1 3 — the empty slot between the commas skips index 1
```

### Nested destructuring

```js
const user = {
  name: "Alice",
  address: {
    city: "Berlin",
    coords: { lat: 52.5, lng: 13.4 },
  },
};

const {
  name,
  address: {
    city,
    coords: { lat },
  },
} = user;

console.log(name, city, lat); // "Alice" "Berlin" 52.5
```

Only the leaf names (left of each `:`) become variables — `address` and `coords` themselves don't.

### Destructuring swap

```js
let a = 1;
let b = 2;
[a, b] = [b, a];
console.log(a, b); // 2 1
```

## Spread and rest (`...`)

Same `...` syntax, two meanings: **spread** expands a collection; **rest** collects arguments into one.

```js
// Spread — expand
const nums = [1, 2, 3];
const more = [...nums, 4]; // [1, 2, 3, 4]

// Rest — collect
function sum(...args) {
  return args.reduce((acc, n) => acc + n, 0);
}
console.log(sum(1, 2, 3)); // 6
```

### Spread copies are shallow

```js
const a = { x: 1, nested: { y: 1 } };
const b = { ...a };

b.x = 2;
console.log(a.x); // 1 — unaffected, "x" is a primitive, copied by value

b.nested.y = 2;
console.log(a.nested.y); // 2 — "nested" was never cloned, just referenced
```

:::warning
`{ ...a }` (and `Object.assign({}, a)`) clone only **one level deep**. Nested objects/arrays stay shared between the original and the copy. For a true deep copy, use `structuredClone(a)` or clone recursively. See [Shallow vs Deep Copy](../04-objects/shallow-vs-deep-copy.md).
:::

## Object property shorthand

When a variable's name matches the key you want, skip repeating it:

```js
const x = 1;
const y = 2;

// Old way
const point = { x: x, y: y };

// Shorthand
const pointShort = { x, y };
console.log(pointShort); // { x: 1, y: 2 }
```

Methods get the same treatment:

```js
const calculator = {
  add(a, b) {
    return a + b; // instead of add: function(a, b) { ... }
  },
};
```

## New array/object methods worth knowing

```js
Object.keys({ a: 1, b: 2 });    // ["a", "b"]
Object.values({ a: 1, b: 2 });   // [1, 2]
Object.entries({ a: 1, b: 2 });  // [["a", 1], ["b", 2]]
Object.assign({}, { a: 1 }, { b: 2 }); // { a: 1, b: 2 }

Array.from({ length: 3 }, (_, i) => i); // [0, 1, 2]
Array.of(7); // [7] — unlike Array(7), which makes an empty array of length 7
[1, 2, 3].includes(2); // true
[1, [2, [3, 4]]].flat(Infinity); // [1, 2, 3, 4]
```

See [Iterating and JSON](../04-objects/iterating-and-json.md) and [Data Transformation](../07-arrays-strings-collections/data-transformation.md).

## Worked example: moving zeros to the end (two-pointer swap)

Classic exercise: move all zeros to the end, keeping the relative order of non-zero elements. Buggy attempt using destructuring assignment for the swap:

```js
let arr = [0, 0, 0, 1, 2, 0, 3, 11, 0];
let i = 0;
let j = arr.length; // BUG: should be arr.length - 1

while (i < j) {
  if (arr[i] === 0) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    j--;
  } else {
    i++;
  }
}
```

:::danger
`j` starts at `arr.length` (`9` for a 9-element array) — one past the last valid index. The first swap writes to `arr[9]`, which doesn't exist; JavaScript silently creates it, growing the array to length `10`. From there the bookkeeping is off for the rest of the run, producing a corrupted, longer array instead of a correctly reordered one.

**Fix:** start `j` at `arr.length - 1`.
:::

The correct version uses one pointer (`i`) tracking "the next free slot for a non-zero value" while a second pointer (`j`) scans left to right:

```js
let arr = [0, 0, 0, 1, 2, 0, 3, 11, 0];
let i = 0;
const n = arr.length;

for (let j = 0; j < n; j++) {
  if (arr[j] !== 0) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    i++;
  }
}

console.log(arr); // [1, 2, 3, 11, 0, 0, 0, 0, 0]
```

Non-zero values keep their original relative order at the front, zeros are pushed to the back, and `j` never exceeds `n - 1`, so there's no out-of-bounds access.

## Key takeaways

- ES6 introduced `let`/`const`, arrow functions, classes, template literals, destructuring, spread/rest, default params, modules, Promises, `Symbol`, and `Map`/`Set` — most of modern JavaScript's day-to-day syntax.
- Destructuring defaults only fire on a missing/`undefined` value; `[a, , c]` skips an element; nested destructuring mirrors the shape of the source object.
- Spread/`Object.assign` copies are **shallow** — nested objects/arrays remain shared references after the copy.
- Off-by-one errors on array bounds (like `arr.length` instead of `arr.length - 1`) silently grow arrays rather than throwing, which can hide real bugs — always double-check which end of an index range you actually need.

This closes out the **JavaScript Basics** chapter. From here, move on to [Types & Type Coercion](../02-types-and-coercion/coercion-overview.md) for a deeper dive into how JavaScript converts between types, or to [Functions, Scope & Closures](../03-functions-and-scope/execution-context-and-hoisting.md).
