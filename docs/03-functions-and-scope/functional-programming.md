---
title: "Higher-Order Functions, Currying, Memoization and Composition"
sidebar_position: 8
---

# Higher-Order Functions, Currying, Memoization and Composition

Functions are [first-class values](./function-types-and-parameters.md#functions-are-first-class-values) in JS — passed around, returned, stored like any value. That's the foundation of **functional programming** (FP): higher-order functions, pure functions, composing small functions into bigger behaviour.

## Higher-order functions (HOF)

> A function is **higher-order** if it takes a function as an argument, returns a function, or both.

### Benefits

- **Abstraction** — hide the "how" behind a simple "what" (`array.map(fn)` vs. a hand-written loop).
- **Reusability** — one generic function (`repeat`, `multiplier`), specialised many ways.
- **Composability** — small HOFs combine without duplicating logic.
- Enables currying, memoization, composition (below).

### `repeat` — a function that takes a function

```js
function repeat(n, action) {
  for (let i = 0; i < n; i++) action(i);
}
repeat(3, (i) => console.log(`Iteration ${i}`));
// Iteration 0
// Iteration 1
// Iteration 2
```

### `multiplier` — a function that returns a function

```js
function multiplier(factor) {
  return function (number) { return number * factor; };
}
const double = multiplier(2);
console.log(double(5)); // 10
```

### `executeOperation` — both at once

```js
function executeOperation(operation) {
  return function (a) {
    return function (b) {
      return operation(a, b);
    };
  };
}
const add = executeOperation((a, b) => a + b);
const addFive = add(5);
console.log(addFive(10)); // 15
```

Takes a function *and* returns a chain of functions — a hand-rolled preview of currying (below).

### `fun(a)` — a minimal HOF

```js
function fun(a) {
  return () => a();
}
fun(() => console.log("hello world"))();
// "hello world"
```

Receives callback `a`, returns a new function that calls it; the trailing `()` invokes that returned function immediately.

## Pure vs. impure functions

> A **pure function** always returns the same output for the same input and causes **no side effects**.

```js
// Impure: reads and mutates external state
let count = 0;
function increment() { count++; }

// Pure equivalent: caller owns the state
function incremented(current) { return current + 1; }
```

Side effects to avoid: mutating args/outer variables, reading/writing globals, I/O (`console.log`, network, DOM), non-deterministic sources (`Math.random()`, `Date.now()`).

Why pure functions matter: predictable, easy to test (no mocking), safe to memoize, and the basis of Redux reducers and `map`/`filter`/`reduce` pipelines.

## Currying

> **Currying** transforms a multi-argument function into a **sequence of one-argument functions**; closures let each step remember arguments already supplied.

```js
const addcurry = (x) => (y) => (z) => x + y + z;
console.log(addcurry(1)(2)(3)); // 6
```

Equivalent to a plain `function add(x, y, z) { return x + y + z; }`, or to the same chain written with explicit `function` keywords and `return` statements — just more verbose. Each returned function closes over the arguments supplied so far ([closures](./closures.md) doing the remembering).

### Partial application with `bind`

[`bind`'s pre-filled arguments](./call-apply-bind.md#bind--dont-call-it-return-a-new-function) give a quick built-in way to fix arguments ahead of time:

```js
function multiply(x, y) { console.log(x * y); }
const multiplyBy2 = multiply.bind(null, 2);
multiplyBy2(3); // 6
```

`null` is the (unused) `this`; `2` is pre-filled as `x`, leaving `y` for call time.

### Partial application with a closure

```js
function multi(x) {
  return (y) => console.log(x * y);
}
const multiplyByTwo = multi(2);
multiplyByTwo(2); // 4
```

Same idea as `bind`, as a plain closure instead.

### A generic `curry(fn)` using `fn.length`

Uses `fn.length` (declared parameter count) to know how many arguments to collect before calling the original:

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
}

function addThree(a, b, c) { return a + b + c; }
const curriedAdd = curry(addThree);

console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6
```

Accumulates args across calls; once enough match `fn.length`, the original runs — otherwise another collector function returns.

:::note `fn.length` only counts simple parameters
Stops at the first default, rest, or destructured parameter — this generic `curry` only works for plain, required parameters.
:::

### Infinite currying: `sum(1)(2)(3)()`

> Call repeatedly with one argument at a time, any number of steps, until called with **no** argument — that signals "stop, give me the total."

```js
function sum(a) {
  return function (b) {
    if (b === undefined) return a; // () - stop, return total
    return sum(a + b);
  };
}
console.log(sum(1)(2)(3)()); // 6
console.log(sum(5)(10)(15)(20)()); // 50
```

Uses: dynamic argument collection, configuration builders (`configure(env)(region)(timeout)()`), chainable APIs.

## Practical currying: logger and middleware

### A configurable logger

```js
function logger(context) {
  return function (message) {
    console.log(`${Date.now()} [${context}] ${message}`);
  };
}
const error = logger("ERROR");
error("Password invalid");
```

A two-step curry that bakes in the `"ERROR"` tag.

### Role-based authorization middleware

```js
const authorize = (role) => (handler) => (req, res) => {
  if (req.user?.role === role) return handler(req, res);
  res.status(403).send("Forbidden");
};

const adminOnly = authorize("admin");
// app.get("/admin/settings", adminOnly(handler));
```

Common Express-style pattern: `authorize(role)` configures the check once, `adminOnly(handler)` wraps a route handler, result is a ready `(req, res)` middleware.

## Memoization

> **Memoization** caches a pure function's results, keyed by arguments, so repeated calls skip recomputation.

```js
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
```

`JSON.stringify(args)` keys the cache by the whole argument list. Only correct for **pure** functions — memoizing an impure one returns stale values.

### A real bug: calling `fn(key)` instead of `fn(...args)`

```js
// ❌ Buggy
function memoization(fn) {
  const cache = new Map();
  return function (...arg) {
    const key = JSON.stringify(arg);
    if (cache.has(key)) return cache.get(key);
    cache.set(key, fn(key)); // bug: passes the STRING key, not the real args
    return cache.get(key);
  };
}
function fn(a, b) { return a + b; }
const mfn = memoization(fn);
mfn(100, 100);
```

`fn(key)` passes the stringified key (`"[100,100]"`) as the only argument, so inside `fn(a, b)`, `a` is that string and `b` is `undefined` → string concatenation, `"[100,100]undefined"`, not `200`.

```js
// ✅ Fix: spread the original arguments
cache.set(key, fn(...arg));
```

:::warning Always re-check what you're passing to the wrapped function
`key` exists only for the cache to tell calls apart — never hand it to the original function. Easy copy-paste bug.
:::

See [Memoization & LRU cache](../12-polyfills-and-utilities/memoization-lru-cache.md) for a bounded, production version (see also the [memory-leak warning](./closures.md#memory-leaks-and-garbage-collection-with-closures)).

## Function composition

> **Composition** combines functions so one's output becomes the next's input.

### `compose` — right to left

```js
const compose = (f, g) => (x) => f(g(x));
const addOne = (x) => x + 1;
const double = (x) => x * 2;

const addOneThenDouble = compose(double, addOne);
console.log(addOneThenDouble(5)); // 12  (double(addOne(5)))
```

Rightmost function (`addOne`) runs first, feeding into the next going left — mirrors nested calls.

### `pipe` — left to right

```js
const pipe = (f, g) => (x) => g(f(x));
const addOneThenDoublePiped = pipe(addOne, double);
console.log(addOneThenDoublePiped(5)); // 12
```

Runs in written order — often easier to read for longer pipelines.

### Generalising to any number of functions

```js
const composeAll = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const pipeAll = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

console.log(composeAll(double, addOne, double)(3)); // 14
console.log(pipeAll(double, addOne, double)(3));    // 14
```

`reduceRight` (right-to-left) vs. `reduce` (left-to-right) — see [`reduce`](../07-arrays-strings-collections/data-transformation.md).

Uses: data pipelines, validation/sanitization chains, composing small testable functions.

## OOP vs. FP in JavaScript

JS supports both; most codebases mix them.

| | Object-Oriented | Functional |
| --- | --- | --- |
| Core unit | Objects bundling state + behaviour | Functions transforming data |
| State | Often mutable, instance-owned | Favors immutable, external data |
| Reuse mechanism | Inheritance, mixins ([see Classes & OOP](../06-classes-and-oop/mixins.md)) | Composition of small functions |
| Easiest to test | Depends on encapsulation | Pure functions — no mocking |
| Natural fit for | Real-world entities with identity/lifecycle | Data pipelines, stateless logic |

### Drawbacks of each

- **OOP:** brittle deep inheritance; mutable shared state bugs; `this` binding issues (see [The `this` Keyword](./this-keyword.md)).
- **FP:** unfamiliar/verbose for imperative devs; naive immutability can cost performance; long composition chains harder to debug step-by-step.

Neither is "correct" alone — `map`/`filter`/`reduce`, currying, memoization are used constantly inside OOP-structured codebases.

## Key takeaways

- A **higher-order function** takes a function, returns one, or both — basis of `repeat`, `multiplier`, array methods, currying.
- A **pure function** gives the same output for the same input with no side effects — makes memoization safe, testing easy.
- **Currying** turns a multi-arg function into one-arg chains via closures — by hand, with `bind`'s partial application, or a generic `curry(fn)` using `fn.length`.
- **Memoization** caches by a stringified key, but must call the wrapped function with the *original* arguments, never the key.
- **`compose`** = right-to-left; **`pipe`** = left-to-right — otherwise identical.
- OOP and FP are complementary, not a binary choice.

## Interview questions

1. **What makes a function "higher-order"?** It takes a function as an argument, returns one, or both.
2. **What two things make a function pure?** Same input → same output, and no observable side effects.
3. **What is currying, and what powers it?** Turning a multi-arg function into one-arg chains; closures let each step remember prior arguments.
4. **Why does a generic `curry` use `fn.length`, and what's its limit?** To know how many args to collect before invoking; undercounts default/rest/destructured parameters.
5. **Why must a memoizer call the wrapped function with the original arguments, not the key?** The key (often a `JSON.stringify`) only indexes the cache; passing it to the real function changes what it computes.
6. **Difference between `compose` and `pipe`?** Both combine functions; `compose` runs right-to-left, `pipe` left-to-right.
