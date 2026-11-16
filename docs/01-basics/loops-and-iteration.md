---
title: Loops and Iteration
sidebar_position: 4
---

# Loops and Iteration

Ways to repeat work: the classic `for`/`while`/`do-while`, `for...of` (values, any iterable), `for...in` (enumerable keys), and array methods (`forEach`, `map`, `filter`, `reduce`...) built on loops internally.

```js
let arr = [1, 2, 3, 4, 5];
```

## `for`, `while`, `do-while`

```js
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}
// 1, 2, 3, 4, 5
```

```js
let len = arr.length;
while (len--) {
  console.log(arr[len]);
}
// 5, 4, 3, 2, 1
```

`len--` returns the **current** value (tested by `while`), *then* decrements — a compact way to walk an array backwards without re-reading `.length`.

```js
let i = arr.length - 1;
do {
  console.log(arr[i]);
} while (i--);
// 5, 4, 3, 2, 1
```

`do-while` always runs its body **at least once**, then checks the condition — useful for "try once, then retry while a condition holds."

## `for...of` vs `for...in`

```js
for (const val of arr) {
  console.log(val);
}
// 1, 2, 3, 4, 5 — "for...of" gives VALUES
```

```js
for (const key in arr) {
  console.log(key);
}
// "0", "1", "2", "3", "4" — "for...in" gives KEYS, as strings
```

:::warning
Avoid `for...in` on arrays:

- keys come back as **strings**, not numbers;
- iteration order isn't guaranteed the way indexed/`for...of` loops are;
- it walks the **prototype chain**, picking up inherited enumerable properties:

```js
Array.prototype.extra = "oops"; // enumerable property on every array's prototype

for (const key in [10, 20, 30]) {
  console.log(key);
}
// "0", "1", "2", "extra" — the inherited property leaks in!

delete Array.prototype.extra; // clean up
```

Use `for...of`, `.forEach()`, or indexed `for` for arrays; `for...in` is for enumerating an **object's** keys.
:::

## `forEach` vs `map`

| | `forEach` | `map` |
| --- | --- | --- |
| Return value | `undefined` | A **new array**, same length |
| Use it for | Side effects (logging, DOM updates) | Transforming into a new collection |
| Can you `break`? | No | No |

```js
const doubled = [1, 2, 3].map(n => n * 2);
console.log(doubled); // [2, 4, 6] — a new array

const nothing = [1, 2, 3].forEach(n => n * 2);
console.log(nothing); // undefined — forEach builds nothing
```

### You cannot `break` out of `forEach`

```js
const nums = [1, 2, 3];
nums.forEach((n) => {
  if (n === 2) return; // only exits THIS callback call
  console.log(n);
});
// 1
// 3
```

`return` inside the callback only skips the rest of *that single call* — `forEach` keeps going, so `3` still prints. There's no way to `break` it early; use `for...of` (supports `break`) or `.some()`/`.every()` instead:

```js
for (const n of nums) {
  if (n === 2) break; // this DOES stop the loop
  console.log(n);
}
// 1
```

## Array iteration methods

Using `arr = [1, 2, 3, 4, 5]`:

```js
console.log(arr.filter(x => x > 1));
// [2, 3, 4, 5] — keeps elements where the callback returns true

console.log(arr.map(x => x + 2));
// [3, 4, 5, 6, 7] — transforms every element

console.log(arr.flatMap(x => [x, x + 1]));
// [1, 2, 2, 3, 3, 4, 4, 5, 5, 6] — maps, then flattens one level

console.log(arr.find(x => x > 2));
// 3 — the FIRST element matching the condition, not all of them

console.log(arr.reduce((acc, val) => val + acc, 0));
// 15 — accumulates to a single value, starting from 0
```

See [Arrays](../07-arrays-strings-collections/arrays.md), [Data Transformation](../07-arrays-strings-collections/data-transformation.md), and [Iterators and Generators](../07-arrays-strings-collections/iterators-and-generators.md).

## Custom iterators and generators

`for...of` works on anything implementing the **iterator protocol** (an object with `[Symbol.iterator]` returning `{ next() }`):

```js
function counter() {
  let n = 0;
  let done = false;
  return {
    [Symbol.iterator]() {
      return this;
    },
    next: () => {
      n += 10;
      if (n > 50) done = true;
      return { value: n, done };
    },
  };
}

for (const x of counter()) {
  console.log("iterator:", x);
}
// iterator: 10
// iterator: 20
// iterator: 30
// iterator: 40
// iterator: 50
// (60 is never logged — once next() returns done: true, for...of
//  stops WITHOUT using that final value)
```

A **generator function** (`function*`) gives the same protocol for free — `yield` pauses execution, producing one value per `.next()` call:

```js
function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

for (const i of generator()) {
  console.log(i);
}
// 1, 2, 3
```

## The classic `var` + `setTimeout` loop bug

```js
for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 4, 4, 4  — NOT 1, 2, 3!
```

All three callbacks close over the **same** `i`, because `var` is function/global-scoped — by the time the callbacks run, `i` is `4`.

**Fix 1 — use `let`:**

```js
for (let i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 1, 2, 3 — "let" creates a fresh binding per iteration
```

**Fix 2 — wrap in an IIFE for a new scope per iteration:**

```js
for (var i = 1; i <= 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 1000);
  })(i);
}
// 1, 2, 3 — each IIFE call gets its own "j"
```

See [Variables: var, let and const](./variables-var-let-const.md#why-let-and-const-were-introduced-in-es6) and [Closures](../03-functions-and-scope/closures.md) for the mechanics.

## Loop performance

Rough ranking, fastest to slowest:

1. **Plain `for` / reverse `while`** — no function-call overhead, direct index access.
2. **`for...of`** — a little slower (iterator protocol), still fast and readable.
3. **`forEach`/`map`/`filter`/`reduce`** — per-element call overhead, but well optimised by engines.
4. **`for...in`** — slowest and least suited to arrays; enumerates keys (incl. inherited) rather than a dense range.

In practice: reach for `for...of`/array methods by default for clarity; drop to a manual indexed `for` (or reverse `while(len--)`) only in proven hot paths.

## Key takeaways

- `for`, `while`, and `do-while` are the general-purpose loops; `do-while` always runs its body once before checking the condition.
- `for...of` yields **values** and works on any iterable; `for...in` yields **keys as strings** and also picks up inherited enumerable properties — avoid it for arrays.
- `forEach` returns `undefined` and cannot be `break`-ed; `return` inside its callback only skips the current element.
- `map`/`filter`/`flatMap`/`find`/`reduce` each have a distinct purpose — transform, select, flatten, locate, or accumulate.
- The `var` + `setTimeout` loop bug is a direct consequence of `var`'s function scope; fix it with `let` or an IIFE.

Continue to [ES6+ Features Overview](./es6-features.md).
