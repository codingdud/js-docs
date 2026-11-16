---
title: Array Method Polyfills
sidebar_position: 1
---

# Array Method Polyfills

A classic interview exercise is to re-implement `Array.prototype.map`, `forEach`, `reduce`, `filter` and `fill` using nothing but a `for` loop. Doing this once is worth more than reading about it ten times: it forces you to notice the small contract details — what happens on an empty array, what the callback receives, what the method returns — that the spec quietly guarantees and that a naive loop quietly breaks.

This page builds `mymap`, `myForEach` and `myReduce` as *new*, safely-namespaced methods, then looks at a second, riskier experiment: overwriting the **native** `filter` and `fill` methods directly, and why that's a pattern to avoid in real code.

## Setting up the methods

All five methods are attached to `Array.prototype` so every array instance gets them automatically:

```js
Array.prototype.mymap = function (fn) {
  let res = new Array(this.length);
  for (let i = 0; i < this.length; i++) {
    res[i] = fn(this[i], i);
  }
  return res;
};

Array.prototype.myForEach = function (fn) {
  for (let i = 0; i < this.length; i++) {
    fn(this[i], i);
  }
};

Array.prototype.myReduce = function (fn, idata) {
  let res = idata;
  for (let i = 0; i < this.length; i++) {
    res = fn(res, this[i], i);
  }
  return res;
};
```

:::warning Use a `function`, not an arrow function
Every polyfill here is defined with the `function` keyword, never an arrow function. That's not a style choice — it's required. `Array.prototype.mymap = (fn) => { ... }` would not work, because arrow functions don't have their own `this`; they close over `this` from the surrounding scope (the module/global scope here), not the array the method is called on. Using `function` lets the engine bind `this` to whatever array is to the left of the dot — `[1,2,3].mymap(...)` binds `this` to `[1, 2, 3]`.
:::

### `mymap`

```js
const numbers = [1, 2, 3, 4];
const doubled = numbers.mymap((x) => x * 2);
console.log(doubled); // [2, 4, 6, 8]

const letters = ['a', 'b', 'c'];
console.log(letters.mymap((el, i) => `${el}-${i}`)); // ['a-0', 'b-1', 'c-2']
```

It pre-allocates the result array with `new Array(this.length)` (matching the native implementation's intent) and fills it index by index.

### `myForEach`

```js
let sum = 0;
[1, 2, 3, 4].myForEach((x) => { sum += x; });
console.log(sum); // 10
```

### `myReduce`

```js
const total = [1, 2, 3, 4].myReduce((acc, num) => acc + num, 0);
console.log(total); // 10

const empty = [];
console.log(empty.myReduce((acc, num) => acc + num, 10)); // 10 — initial value passes through untouched
```

:::warning `myReduce` always requires an initial value
The native `Array.prototype.reduce` has a special case this polyfill does **not** implement: when you call `reduce` *without* an initial value, the engine uses the array's first element as the accumulator and starts the loop from index `1`. Call it on an empty array with no initial value and it throws `TypeError: Reduce of empty array with no initial value`.

`myReduce` always starts `res = idata` and loops from index `0`, so:

```js
[1, 2, 3].myReduce((acc, num) => acc + num); // idata is undefined
// res starts as undefined, so acc is NaN/undefined-tainted on the first step
// native reduce without initial value would instead return 6
```

If you want full parity, `myReduce` needs a branch: when `idata` is `undefined` (checked with `arguments.length < 2`, not a falsy check — `0` is a valid initial value), take `this[0]` as the seed and start the loop at `i = 1`, throwing if the array is also empty.
:::

The polyfill also doesn't accept a `thisArg`, doesn't see a 4th "whole array" argument in the callback, and visits sparse-array holes as if they held `undefined` instead of skipping them — all things the real `map`/`forEach`/`reduce` handle. For an interview answer, mentioning these gaps out loud is usually worth more than silently omitting them.

## The risky part: overwriting `filter` and `fill`

The same file also does this:

```js
Array.prototype.filter = function (fn) {
  let res = [];
  for (let i = 0; i < this.length; i++) {
    if (fn(this[i], i)) res.push(this[i]);
  }
  return res;
};

Array.prototype.fill = function (val) {
  for (let i = 0; i < this.length; i++) {
    this[i] = val;
  }
  // no return statement
};
```

This *replaces* the built-in `Array.prototype.filter` and `Array.prototype.fill` for every array in the program, not just a renamed copy. That's a meaningfully different — and more dangerous — exercise than `mymap`/`myForEach`/`myReduce`, for three reasons:

1. **Blast radius.** The moment this file is loaded, *every* `.filter()` and `.fill()` call anywhere in the app or in a third-party library runs this implementation instead of the native one. A subtle behavior difference (see below) now affects code that was never meant to be touched.
2. **Silent redefinition.** Loading the same file twice (or loading it after some other code already patched `filter`) just clobbers whatever was there, with no warning.
3. **Enumerable by default.** `Array.prototype.filter = function () {...}` creates a normal, *enumerable* property. That means `for (const key in [])` and some naive `Object.keys(Array.prototype)`-style introspection will now see `filter` and `fill` show up, which the native, non-enumerable versions never do.

```js
console.log([1, 2, 3, 4, 5, 6].filter((x) => x % 2 === 0)); // [2, 4, 6] — looks fine...

const arr = [1, 2, 3, 4];
arr.fill(0);
console.log(arr); // [0, 0, 0, 0] — mutation works

console.log(arr.fill(9)); // undefined, not [9, 9, 9, 9]!
```

That last line is the real bug: the native `Array.prototype.fill` **returns the mutated array** (so it can be chained, e.g. `new Array(5).fill(0).map(...)`). This replacement mutates `this` correctly but returns nothing, so any chained call after `.fill()` breaks.

:::danger Never overwrite a native prototype method for a learning exercise
If you want to practice re-implementing `filter`/`fill`, give the method a different name (`myFilter`, `myFill`) exactly like `mymap`/`myForEach`/`myReduce` do. If you ever *do* need to patch a prototype in real code (a true polyfill for an environment that lacks the method), follow this pattern instead:

```js
if (!Array.prototype.myFilter) {
  Object.defineProperty(Array.prototype, 'myFilter', {
    value: function (fn, thisArg) {
      const res = [];
      for (let i = 0; i < this.length; i++) {
        if (i in this && fn.call(thisArg, this[i], i, this)) res.push(this[i]);
      }
      return res;
    },
    writable: true,
    configurable: true,
    enumerable: false, // keeps it out of for...in / Object.keys
  });
}
```

The `if (!Array.prototype.myFilter)` guard stops a second script from silently clobbering the first. `Object.defineProperty` with `enumerable: false` matches how every native prototype method actually behaves. This is also exactly the pattern the real [Polyfill Interview Checklist](./polyfill-checklist.md) recommends for any prototype extension.
:::

## Test coverage summary

The accompanying Jest suite (`array.test.ts`) exercises each method against the behaviour above:

| Method | Cases covered |
| --- | --- |
| `mymap` | doubling numbers, using the index argument, empty array, strings → lengths, building objects from primitives |
| `myForEach` | summing, index usage, no-op on empty array, writing into an external array |
| `myReduce` | sum, product, string concatenation, building an object accumulator, **initial value returned untouched on empty array**, finding a max, flattening nested arrays |
| `filter` | even/odd numbers, filtering by index, numeric threshold, string length, no matches → `[]`, all match, empty array |
| `fill` | filling with a number, filling with a string, filling an empty array (no-op) |

None of the tests exercise `thisArg`, the callback's third ("whole array") argument, sparse arrays, or the return value of `fill` — which lines up with the gaps called out above. A thorough polyfill test suite should add those cases explicitly, precisely because they're the parts most likely to silently diverge from the native behaviour.

## Key takeaways

- `mymap`, `myForEach` and `myReduce` are straightforward loop-based re-implementations; the one subtlety worth remembering is that `myReduce` does not support the "no initial value" calling form that native `reduce` has.
- Define polyfills with `function`, not an arrow function, whenever the method needs `this` to be the array (or object) it was called on.
- Never overwrite a native prototype method (`filter`, `fill`, `map`, …) as a throwaway learning exercise — give your version its own name.
- A production-grade polyfill guards with `if (!Array.prototype.x)` and defines the property with `Object.defineProperty(..., { enumerable: false })` so it behaves like the real thing.
- `fill` must return `this` so it can participate in a method chain — a detail easy to drop when hand-rolling it.

## Interview questions

1. Why does `reduce()` without an initial value behave differently on an empty array versus `reduce(fn, initial)`?
2. Why would you define a polyfill with `function` instead of an arrow function?
3. What three things does `Object.defineProperty` give you over a plain `Array.prototype.x = function () {}` assignment?
4. What does `Array.prototype.fill` return, and why does that matter for chaining?
5. What's the practical risk of monkey-patching a native prototype method in an application you don't fully control (e.g. one that also loads third-party libraries)?

See also: [`call`, `apply` and `bind` Polyfills](./call-apply-bind-polyfills.md) for the same "re-implement it yourself" exercise applied to `Function.prototype`, and [the Polyfill Interview Checklist](./polyfill-checklist.md) for `find` and the guard pattern used across every polyfill in this chapter.
