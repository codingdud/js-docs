---
title: "Arrays: Creation, Mutation and Higher-Order Methods"
sidebar_position: 1
---

Arrays are JavaScript's ordered, index-based collections. This page walks through how arrays are created, which methods mutate the original array versus returning a new one, how `sort` really works, and the higher-order methods (`map`, `filter`, `reduce`, `forEach`) that make arrays so useful for data transformation.

## Creating arrays

There are three common ways to create an array, and they do **not** all behave the same way.

```js
// 1. Array literal — the normal, safe way
const arr = [10, 20, 30, 40, 50];

// 2. new Array(...) with multiple arguments — behaves like a literal
const newArray = new Array(1, 2, 3, 4);
console.log(newArray); // [1, 2, 3, 4]

// 3. new Array(n) with a SINGLE number argument — creates an empty,
//    sparse array of length n, not an array containing n!
const sparse = new Array(4);
console.log(sparse);        // [ <4 empty items> ]
console.log(sparse.length); // 4
```

:::warning new Array(4) vs new Array(1, 2)
`Array`'s constructor overloads on its argument count: a single numeric argument sets the `length` and leaves the array full of holes, while two or more arguments become the elements themselves. `new Array(4)` is **length 4, empty**; `new Array(1, 2)` is `[1, 2]`. This ambiguity is exactly why `[]` literals and `Array.from` / `Array.of` are preferred in real code.
:::

### `fill` and the shared-reference trap

`Array.prototype.fill(value)` writes **the same value** — the same reference, if it's an object or array — into every slot. That's fine for primitives but dangerous for anything by-reference:

```js
const grid = new Array(3).fill([]);
grid[0].push(1);
console.log(grid); // [ [1], [1], [1] ]  — all three slots are the SAME array!
```

To get independent arrays per slot, use `Array.from` with a factory callback instead, which calls the callback once per index:

```js
const safeGrid = Array.from({ length: 3 }, () => []);
safeGrid[0].push(1);
console.log(safeGrid); // [ [1], [], [] ]
```

This is exactly the pattern used to build a triangular/jagged array:

```js
const triangle = Array.from({ length: 4 }, (_, i) => new Array(i).fill(0));
console.log(triangle);
// [ [], [0], [0, 0], [0, 0, 0] ]
```

`Array.from(arrayLike, mapFn)` is the general-purpose "array factory": it turns anything iterable or array-like (`{ length: n }`, a `Set`, a `NodeList`, a string, arguments) into a real array, optionally mapping each item as it goes.

## Mutating vs non-mutating methods

A huge source of bugs is not knowing which array methods mutate the array in place and which return a new one.

| Method | Mutates original? | Returns |
|---|---|---|
| `push(...items)` | Yes | new length |
| `pop()` | Yes | removed element |
| `shift()` | Yes | removed element |
| `unshift(...items)` | Yes | new length |
| `splice(start, deleteCount, ...items)` | Yes | **array of removed items** |
| `slice(start, end)` | No | new array (shallow copy of the range) |
| `sort(compareFn)` | Yes | the same array (sorted in place) |
| `reverse()` | Yes | the same array (reversed in place) |
| `toSorted(compareFn)` (ES2023) | No | new sorted array |
| `toReversed()` (ES2023) | No | new reversed array |
| `fill(value)` | Yes | the same array |
| `map`, `filter` | No | new array |
| `forEach`, `reduce` | No (unless the callback mutates) | `undefined` / accumulated value |

Walking through the classic `push`/`pop`/`shift`/`unshift` sequence:

```js
let arr = [1, 2, 3, 4];

arr.push(1001);
console.log(arr); // [1, 2, 3, 4, 1001]

arr.pop();
console.log(arr); // [1, 2, 3, 4]

arr.shift();
console.log(arr); // [2, 3, 4]

arr.unshift(102);
console.log(arr); // [102, 2, 3, 4]
```

### `slice` vs `splice`

These two look similar but do very different things:

- `slice(start, end)` is **read-only**: it copies a shallow range into a new array and leaves the original untouched.
- `splice(start, deleteCount, ...items)` **mutates** the array in place — removing `deleteCount` elements starting at `start` and inserting `...items` there — and **returns the removed elements as an array**, not the modified array.

```js
let arr = [102, 2, 3, 4];

console.log(arr.slice(0, 3)); // [102, 2, 3] — new array, arr is untouched

console.log(arr.splice(1, 1, 0)); // [2]  <- the removed element, returned
console.log(arr);                 // [102, 0, 3, 4] <- arr itself changed
```

:::warning splice's return value is easy to misread
`splice` returns what it **removed**, not the resulting array. If you want the array after the edit, log `arr` itself (or chain off the mutation), not the return value of `splice`.
:::

## Sorting: the default is lexicographic

`Array.prototype.sort()` with no comparator converts every element to a **string** and compares them by UTF-16 code unit — not numerically.

```js
const nums = [10, 1, 2, 21];
console.log(nums.sort());          // [1, 10, 2, 21] — "10" < "2" as strings!
console.log(nums.sort((a, b) => a - b)); // [1, 2, 10, 21] — numeric comparator fixes it
```

Always pass a comparator for anything but plain-string arrays: `(a, b) => a - b` for ascending numbers, `(a, b) => b - a` for descending.

### `sort` and `reverse` mutate — and return the *same* array

Both `sort` and `reverse` change the array in place and return a reference to that same array (not a copy). This means a second variable pointing at the "result" is really just an alias:

```js
let arr1 = [1, 2, 3];
let arr2 = arr1.reverse();

console.log(arr2 === arr1); // true — same array, not a new one!

arr2.push(4);
console.log(arr1); // [3, 2, 1, 4] — mutating arr2 also changed arr1
```

If you need the original array left alone, use the ES2023 non-mutating siblings `toSorted()` and `toReversed()`, or copy first with `[...arr]` / `arr.slice()`:

```js
const original = [10, 12, 15, 18, 20, 25, 30];

const sorted = original.toSorted((a, b) => a - b);
const reversed = original.toReversed();

console.log(original === sorted);   // false — original is untouched
console.log(original);              // [10, 12, 15, 18, 20, 25, 30] (unchanged)
```

Putting `sort`, `reverse`, `Math.max`/`Math.min`, and a destructuring swap together:

```js
let arr = [10, 12, 15, 18, 20, 25, 30];

arr.sort((a, b) => a - b);
console.log(arr.reverse());        // [30, 25, 20, 18, 15, 12, 10]

console.log(Math.max(...arr));     // 30
console.log(Math.min(...arr));     // 10

// Destructuring swap — no temp variable needed
[arr[0], arr[1]] = [arr[1], arr[0]];
console.log(arr); // [25, 30, 20, 18, 15, 12, 10]
```

`Math.max`/`Math.min` take individual arguments, not an array, so the spread operator (`...arr`) is what makes them work on a whole array. `Math.max()` with no arguments is `-Infinity`, and `Math.min()` with no arguments is `Infinity` — the identity elements for those comparisons.

## Higher-order methods: `map`, `filter`, `reduce`, `forEach`

These four methods are the backbone of functional-style array processing.

```js
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

const evens = numbers.filter(n => n % 2 === 0);
console.log(evens); // [2, 4]

const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log(sum); // 15

numbers.forEach(n => console.log(n)); // 1, 2, 3, 4, 5 (logged one per line)
```

- `map` transforms every element 1-to-1 into a new array of the same length.
- `filter` keeps only the elements that pass a predicate; the result can be shorter.
- `reduce` folds the whole array down to a single accumulated value.
- `forEach` just runs a side effect per element and always returns `undefined` — it cannot be chained and `return` inside it does **not** break the loop, it only skips to the next iteration (a common source of confusion, see below).

### `reduce` without an initial value

`reduce((acc, item) => ..., initialValue)` is safest with an explicit `initialValue`. If you omit it, the **first element becomes the initial accumulator** and the callback runs starting from the second element:

```js
console.log([1, 2, 3].reduce((acc, curr) => acc + curr)); // 6 — acc starts as 1
```

On an **empty array with no initial value**, there is nothing to use as a starting accumulator, so `reduce` throws:

```js
[].reduce((acc, curr) => acc + curr);
// TypeError: Reduce of empty array with no initial value
```

:::warning Always pass an initial value to reduce
`arr.reduce(fn, 0)` (or `[]`, `{}`, whatever your accumulator's identity value is) avoids both the "first element used as accumulator" surprise and the empty-array `TypeError`.
:::

### `forEach` cannot be stopped with `return`

```js
const arr = [1, 2, 3];
arr.forEach(n => {
  if (n === 2) return; // only skips THIS callback invocation
  console.log(n);
});
// 1
// 3
```

`return` inside the `forEach` callback behaves like `continue` in a loop, not `break`. There is no way to stop `forEach` early short of throwing; use a plain `for...of` loop (which supports `break`) or `arr.some()` / `arr.find()` when you need to exit early.

## Array vs object

A frequent interview question: what's the actual difference between an array and a plain object?

| | Array | Object |
|---|---|---|
| Keys | Sequential integer indices (`0, 1, 2, ...`) plus `length` | Any string or `Symbol` |
| Order | Guaranteed insertion/index order for integer keys | Integer-like keys are iterated first in ascending order, then string keys in insertion order |
| Purpose | Ordered lists, sequences | Named fields, records |
| Built-ins | `push`, `map`, `filter`, `reduce`, `length`, ... | `Object.keys`, `Object.entries`, `Object.assign`, ... |
| `typeof` | `"object"` | `"object"` |
| Detecting it | `Array.isArray(x)` | `typeof x === "object" && x !== null && !Array.isArray(x)` |

Under the hood, a JavaScript array **is** an object — `Array.prototype` sits in its prototype chain — with special handling for the `length` property and integer-indexed keys. That's also why `typeof []` is `"object"` rather than something array-specific, and why `Array.isArray()` (not `typeof`) is the correct way to check for an array.

## Key takeaways

- Prefer array literals `[]`; reach for `new Array(n)` only when you deliberately want a pre-sized, empty array, and remember the single-number-argument special case.
- `fill()` shares one reference across every slot — use `Array.from({ length }, factory)` when the fill value is an object or array.
- `slice` is non-mutating and returns a copy; `splice` mutates and returns the **removed** elements, not the result array.
- `sort()` with no comparator is **lexicographic** — always supply `(a, b) => a - b` for numbers.
- `sort`/`reverse` mutate in place and hand back a reference to the *same* array; use `toSorted`/`toReversed` (ES2023) when you need a copy.
- `reduce` without an initial value uses the first element as the seed and throws on an empty array — pass an initial value.
- `forEach`'s callback `return` only skips to the next item; it can't break the loop.

## Interview questions

**Q: What's the difference between `slice` and `splice`?**
`slice(start, end)` is non-destructive and returns a new array copy of the range. `splice(start, deleteCount, ...items)` mutates the original array (removing and/or inserting elements) and returns the array of removed elements.

**Q: Why does `[10, 1, 2].sort()` return `[1, 10, 2]`?**
Because without a comparator, `sort` coerces every element to a string and compares lexicographically — `"1" < "10" < "2"` as strings. A numeric comparator (`(a, b) => a - b`) is required for correct numeric ordering.

**Q: Does `arr.reverse()` return a new array?**
No — it mutates `arr` in place and returns a reference to that same array. `toReversed()` is the non-mutating ES2023 alternative.

**Q: What happens when you call `reduce` on an empty array with no initial value?**
It throws `TypeError: Reduce of empty array with no initial value`, because there's no element to use as a starting accumulator.

**Q: How are arrays different from plain objects internally?**
Arrays are objects with `Array.prototype` in their prototype chain, integer-indexed keys, and an automatically maintained `length` property — they're specialized objects, not a separate data type.

See also [Data Transformation with map and reduce](./data-transformation.md) for a deeper look at `map`/`reduce` pipelines, and [Functional Programming](../03-functions-and-scope/functional-programming.md) for the broader FP concepts these methods build on.
