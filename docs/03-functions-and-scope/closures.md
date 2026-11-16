---
title: Closures
sidebar_position: 3
---

# Closures

A closure is a function that remembers the scope it was created in, even after that scope has finished running. Basis of modules, memoization, debouncing and most state-management patterns.

## Definition and formula

> A closure is formed when an **inner function** remembers (closes over) variables from its **outer lexical scope** — even after the outer function has finished executing.

```text
Inner function + Outer function's variables = Closure
```

When a function is *created*, the engine attaches a hidden reference to the `[[Environment]]` it was defined in (the `[[Outer]]` link from [Lexical Scope, Scope Chain and Shadowing](./scope-chain-and-shadowing.md)). A closure is a function value plus that reference, kept alive as long as the function is reachable.

```js
function outer() {
  let count = 0; // persists across calls
  return function inner() {
    count++;
    console.log(count);
  };
}

const counter = outer();
counter(); // 1
counter(); // 2
counter(); // 3 - count persists between calls
```

### What happens internally after `outer()` returns

1. `outer()` runs, pushing a new context onto the [call stack](./execution-context-and-hoisting.md#the-call-stack).
2. `inner` is created, capturing a reference to `outer`'s lexical environment (where `count` lives).
3. `outer()` returns `inner`; its context is popped off the stack.
4. Normally the local scope would be garbage-collected, but `inner` still references it, so `count` survives.
5. Each `counter()` call reads/writes that same preserved `count`.

## Characteristics and scope vs. closure

| Aspect | Description |
| --- | --- |
| **Scope preservation** | Outer variables stay reachable through the inner function |
| **Privacy** | Variables unreachable from outside, except via granted functions |
| **State management** | A function keeps state between calls without globals |
| **Memory** | Captured variables stay alive as long as the closure does — can leak if unbounded |

| Term | Meaning |
| --- | --- |
| **Scope** | *Where* a variable is accessible (parse-time rule) |
| **Closure** | A *function plus the scope it preserves* (run-time, live binding) |

:::note Every function is a closure
Every function closes over its defining scope technically; it only becomes interesting when a function outlives its creation context or is handed out while still using outer variables.
:::

## Closures capture variables, not values

> A closure stores a **reference** to a variable binding, not a snapshot of its value at creation time.

```js
function makeGreeter() {
  let name = "Ana";
  const greet = () => console.log(`Hi, ${name}`);
  name = "Bianca"; // changed after greet was created
  return greet;
}

makeGreeter()(); // "Hi, Bianca" - the live value, not "Ana"
```

## The classic bug: `var` in a `setTimeout` loop

`var` is function-scoped, so a `for` loop using it creates **one shared binding** across all iterations. By the time callbacks run, the loop has finished and `i` holds its final value.

```js
for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// Output: 4, 4, 4  (loop stops once i <= 3 is false, at i === 4; all closures share that one i)
```

### Fix 1 — use `let`

```js
for (let i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// Output: 1, 2, 3
```

`let` gives each loop iteration its own fresh binding, so each closure captures a different `i`.

### Fix 2 — wrap each iteration in an IIFE

```js
for (var i = 1; i <= 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 1000);
  })(i);
}
// Output: 1, 2, 3
```

The [IIFE](./function-types-and-parameters.md#iife--immediately-invoked-function-expression) runs immediately each iteration, receiving `i` as its own `j` — a fresh variable per call.

:::tip
Prefer the `let` fix in new code. The IIFE pattern predates `let`/`const`; useful mainly for legacy code or interviews.
:::

## Practical uses: module pattern and function factories

### Module pattern — private state with `createBankAccount`

```js
function createBankAccount(initialBalance) {
  let balance = initialBalance; // private - unreachable from outside

  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount <= balance) {
        balance -= amount;
        return balance;
      }
      return "Insufficient funds";
    },
    getBalance() {
      return balance;
    },
  };
}

const account = createBankAccount(1000);
console.log(account.getBalance()); // 1000
console.log(account.deposit(500)); // 1500
console.log(account.balance); // undefined - no such property
```

Standard way to simulate private fields alongside the [private class fields](../06-classes-and-oop/private-fields.md) syntax: keep state local, expose only the functions allowed to touch it.

### Function factory — `multiplyBy`

```js
function multiplyBy(multiplier) {
  return function (number) {
    return number * multiplier;
  };
}

const double = multiplyBy(2);
const triple = multiplyBy(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

`double` and `triple` are different closures over different `multiplier` bindings, from the same function body.

## Reaching a value nested two levels deep: parameter vs. closure

Exercise: a nested object's child `getValue` method should return the **parent's** value. Two correct approaches:

```js
// Solution: capture the parent's value in a closure
const parent1 = {
  value: 100,
  getChild() {
    const parentValue = this.value; // read while `this` is still parent1
    return {
      value: 200,
      getValue: () => parentValue, // closes over parentValue, not `this`
    };
  },
};

const child = parent1.getChild();
console.log(child.getValue()); // 100
```

`getChild()` reads `this.value` once while bound to `parent1`, stores it locally; the returned arrow closes over that local, needing no extra argument. Also sidesteps arrow functions having no own `this` (see [The this Keyword](./this-keyword.md)) — it never needs one.

The alternative (pass `parent` in as a parameter to `getValue(parentObj)`) also works but leaks the relationship into every call site.

:::tip When to prefer which
Parameter: when the parent/child relationship isn't fixed at creation. Closure: when it's fixed once, and you want a clean, argument-free API.
:::

## Memory leaks and garbage collection with closures

Closures keep captured variables alive as long as the closure is reachable — useful, but can leak memory if left unbounded.

Common leaks:

- **Event listeners never removed** — closure over a large object keeps it alive until `removeEventListener` runs.
- **Long-lived closures capturing large objects** — module-level variables, caches, singletons live as long as the program; everything they close over stays alive.
- **Unbounded caches/memoization** — a memoizer (see [Memoization](./functional-programming.md#memoization)) closing over a `Map` that grows forever without an eviction policy.

```js
// Leak-prone: cache grows forever, never cleared
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

:::warning Keep closures intentionally scoped
Capture only what you need, remove listeners you attach, and bound any cache (LRU limit, `WeakMap`, periodic clear). See [Memoization & LRU cache](../12-polyfills-and-utilities/memoization-lru-cache.md).
:::

## Key takeaways

- A closure is a function paired with its creation-time lexical environment; matters once the function outlives that environment.
- Closures capture **bindings**, not value snapshots — later mutations are visible.
- `var` in a loop shares one binding; `let` gives each iteration its own; an IIFE isolates manually.
- Module pattern and function factories are closures used deliberately for private state and specialised functions.
- Closures power currying, memoization, debouncing/throttling and private state — and must be bounded to avoid leaks.

## Interview questions

1. **What is a closure?** A function plus references to its outer lexical scope's variables, preserved after the outer function returns.
2. **Why isn't `count` garbage-collected in the `outer`/`inner` example?** `inner` (reachable via `counter`) still references the environment holding `count`.
3. **Do closures capture values or variables?** Variables (live bindings) — reassignment after creation is visible.
4. **Why does a `var` loop with `setTimeout` print the same number each time, and what are two fixes?** All iterations share one `var` binding, which holds its final value by the time callbacks run. Fix: `let` (fresh binding per iteration) or an IIFE receiving the current value as its own parameter.
5. **How do closures enable private state?** Outer-function variables are unreachable from outside; only inner functions returned from it (closing over them) can read/change them — the module pattern.
6. **How can closures cause memory leaks?** By keeping a reference to something large alive as long as the closure is reachable — e.g. an undetached event listener, or an unbounded memoization cache.
