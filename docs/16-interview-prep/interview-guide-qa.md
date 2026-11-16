---
title: "Interview Guide: Q&A, Best Practices and Pitfalls"
sidebar_position: 2
---

This page condenses a personal interview-prep guide into a single reference: eight core concept areas, eight common interview questions with model answers, eight best practices, six pitfalls to avoid, and a ten-item checklist for the night before an interview. Where a concept has its own full page elsewhere on this site, this page gives the short version and links out — the goal here is a fast recap, not a repeat of the full explanation.

:::note Fixing a gap in the original guide
The source guide's table of contents listed eight sections (Prototypes, Scope & Closures, `this`, Hoisting, Higher-Order Functions, Async, Performance, Common Questions) but the document body actually contained a ninth section — **Advanced Concepts** (generator functions and variable shadowing) — that was never added to the TOC. It's included below so nothing from the original material is lost.
:::

## Prototypes & inheritance

A prototype is the mechanism that lets one object inherit properties and methods from another. `prototype` is a property that exists only on **constructor functions** (and classes, under the hood) — it's the blueprint shared by every instance. `__proto__` is the internal link every **instance** carries back to that blueprint. `arr.__proto__ === Array.prototype` is `true`; the chain ends when `__proto__` is `null` (which happens at `Object.prototype.__proto__`).

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.eat = function () {
  return `${this.name} is eating`;
};

const dog = new Animal("Buddy");
console.log(dog.eat()); // "Buddy is eating" — found via the prototype chain, not on dog itself
```

Full detail, including the three ways to wire up inheritance (`Object.setPrototypeOf`, `Object.create`, and `class … extends`), lives on [prototypes vs. `__proto__`](../05-prototypes/prototype-vs-proto.md) and [the prototype chain](../05-prototypes/prototype-chain.md).

## Scope & closures

Scope is which variables are visible where. A **closure** is a function bundled with the lexical environment it was created in — it keeps that environment alive even after the outer function has returned.

```js
function outer() {
  let count = 0;
  return function inner() {
    count++;
    console.log(count);
  };
}

const counter = outer();
counter(); // 1
counter(); // 2
counter(); // 3 — count survives between calls because inner() closes over it
```

This is also the classic mechanism behind the module pattern (private state via closure) and the `var`-in-a-loop `setTimeout` bug covered on the [tricky edge cases](./tricky-edge-cases.md) page. Full depth: [closures](../03-functions-and-scope/closures.md).

## The `this` keyword

`this` isn't a variable and it isn't fixed at write-time — it's resolved **at call time**, based on how a function is invoked. Four rules, roughly in order of how often they come up:

1. **Implicit binding** — `obj.method()` → `this` is `obj`.
2. **Explicit binding** — `fn.call(ctx)`, `fn.apply(ctx)`, `fn.bind(ctx)` → `this` is whatever you pass.
3. **`new` binding** — `new Fn()` → `this` is the newly created object.
4. **Default binding** — a plain function call with no receiver → `this` is `undefined` in strict mode, or the global object otherwise.

Arrow functions opt out of all four rules: they have no `this` of their own and simply read it from the enclosing scope. Full treatment: [the `this` keyword](../03-functions-and-scope/this-keyword.md) and [arrow functions and `this`](../03-functions-and-scope/arrow-functions-and-this.md).

## Hoisting

| Declaration | Hoisted? | Initialized before use? | In the TDZ? |
|---|---|---|---|
| `var` | Yes | Yes, to `undefined` | No |
| `let` / `const` | Yes | No | Yes — `ReferenceError` if read first |
| `function` declaration | Yes | Yes, fully | No |
| `function` expression / arrow assigned to `const`/`let` | Only the binding, like any other `let`/`const` | No | Yes |
| `class` | Yes | No | Yes |

```js
console.log(a); // undefined — var is hoisted and pre-initialized
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 20;

foo(); // "Hello" — function declarations are hoisted whole
function foo() {
  console.log("Hello");
}
```

When a `var` and a `function` share a name, the function declaration wins the hoisting slot first; a later `var` assignment then overwrites it during execution. Full detail: [execution context & hoisting](../03-functions-and-scope/execution-context-and-hoisting.md).

## Higher-order functions

A higher-order function either takes a function as an argument, returns one, or both. `map`, `filter`, and `reduce` are the built-in examples everyone reaches for daily:

```js
const numbers = [1, 2, 3, 4, 5];
console.log(numbers.map((n) => n * 2));            // [2, 4, 6, 8, 10]
console.log(numbers.filter((n) => n % 2 === 0));   // [2, 4]
console.log(numbers.reduce((acc, n) => acc + n, 0)); // 15
```

Writing your own is just as common in interviews — a function that returns a function (a factory), or a `compose`/`curry` helper. See [functional programming](../03-functions-and-scope/functional-programming.md) for currying, composition, and purity in depth.

## Asynchronous JavaScript

Callback-based async code nests indefinitely as operations depend on each other — the "pyramid of doom", also called **callback hell**. Promises flatten that nesting into a chain; `async`/`await` then makes the chain read like synchronous code.

The four Promise combinators answer different "run many promises at once" questions:

| Combinator | Settles when | Settles with |
|---|---|---|
| `Promise.all` | every promise fulfills, **or** one rejects (fails fast) | array of values, or the first rejection reason |
| `Promise.allSettled` | every promise settles (never rejects) | array of `{status, value \| reason}` objects |
| `Promise.race` | the first promise to settle, either way | that promise's value or reason |
| `Promise.any` | the first promise to fulfill, **or** all reject | that value, or an `AggregateError` |

Full treatment: [promises](../08-asynchronous-javascript/promises.md), [async/await](../08-asynchronous-javascript/async-await.md), and [promise combinators](../08-asynchronous-javascript/promise-combinators.md).

## Performance optimization: throttle vs. debounce

| | Throttle | Debounce |
|---|---|---|
| Fires | At most once per fixed interval, during the event stream | Once, after the event stream goes quiet for a delay |
| Good for | Scroll position tracking, resize sampling, game loops | Search-as-you-type, form validation, "final" resize handling |

```js
function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

Full implementations and tests: [debounce](../12-polyfills-and-utilities/debounce.md) and [throttle](../12-polyfills-and-utilities/throttle.md).

## Advanced concepts

### Generator functions

A generator (`function*`) can pause and resume execution, yielding one value at a time instead of computing everything up front:

```js
function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }
```

They're useful for lazy evaluation, infinite sequences, and (historically) for driving async flows before `async`/`await` existed. Full page: [iterators and generators](../07-arrays-strings-collections/iterators-and-generators.md).

### Variable shadowing

A variable declared in an inner scope with the same name as one in an outer scope hides the outer one for the rest of that inner scope:

```js
let name = "Global";
function outer() {
  let name = "Outer";
  console.log(name); // "Outer"
}
outer();
console.log(name); // "Global" — unaffected by the shadowing inside outer()
```

More on this in [scope chain & shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md).

## Common interview questions

**Q1. Explain the prototype chain.**
When you access a property, the engine first looks on the object itself. If it's not there, it looks at the object's internal `[[Prototype]]` (exposed as `__proto__`), then that object's prototype, and so on, until it finds the property or reaches `Object.prototype`, whose own prototype is `null`.

**Q2. What's the difference between `call`, `apply`, and `bind`?**
`call` invokes the function immediately with a given `this` and arguments listed individually. `apply` does the same but takes arguments as an array. `bind` doesn't invoke anything — it returns a *new* function permanently bound to the given `this`, which you call later.

**Q3. How do closures create private variables?**
A returned inner function keeps a live reference to variables in its enclosing function's scope. Since nothing outside that returned function can reach those variables directly, they behave as private state — accessible only through whatever methods the closure chooses to expose (the module pattern).

**Q4. When would you use throttle vs. debounce?**
Throttle when you want steady updates *during* a stream of events (e.g., tracking scroll position). Debounce when you only care about the *final* state after the user stops (e.g., firing a search request after they stop typing).

**Q5. What problems do Promises solve that callbacks don't?**
They flatten nested callback pyramids into flat chains, give you a single `.catch()` for error handling instead of an error-first argument at every level, and provide built-in combinators (`all`, `race`, etc.) for coordinating multiple async operations.

**Q6. Explain hoisting across `var`, `let`, and function declarations.**
`var` is hoisted and pre-initialized to `undefined`. `let`/`const` are hoisted but left uninitialized in the Temporal Dead Zone, so reading them before their declaration line throws. Function declarations are hoisted completely, body included, so they're callable from anywhere in their scope — even above the line where they're written.

**Q7. Why don't arrow functions have their own `this`?**
By design: they inherit `this` lexically from the scope that encloses them. This makes them ideal as callbacks (event handlers, array-method callbacks) where you want to keep referring to the outer `this` without writing `.bind(this)` everywhere.

**Q8. What's the difference between `prototype` and `__proto__`?**
`prototype` is a property that lives on constructor functions and is the shared blueprint for instances they create. `__proto__` is the internal link that every *instance* uses to reach that blueprint when a property lookup misses on the instance itself.

## Best practices

1. Use `const` by default; use `let` only when you'll reassign; avoid `var` entirely in new code.
2. Prefer arrow functions for callbacks specifically to preserve the surrounding `this`.
3. Prefer `async`/`await` over raw `.then()` chains once logic branches — it reads top-to-bottom like sync code.
4. Put shared methods on `prototype` (or inside a `class` body, which does the same thing) rather than reassigning them inside the constructor, so every instance shares one function object instead of allocating a new one each time.
5. Throttle continuous events (scroll, mousemove); debounce discrete user input that settles (search boxes, resize-finished handlers).
6. Flatten nested callbacks into Promise chains or `async`/`await` — don't let "callback hell" accumulate.
7. Use `Object.create()` or `class … extends` for inheritance rather than hand-rolling `__proto__` manipulation.
8. Be deliberate about closures that outlive their usefulness — a long-lived closure holding a reference to a large object (or a DOM node) is a common source of memory leaks.

## Common pitfalls

1. Passing a class method as a bare callback (`setTimeout(obj.method, 0)`) without binding — `this` is lost at the call site.
2. Confusing `prototype` (on constructors) with `__proto__` (on instances) — they are related but not interchangeable.
3. Reading a `let`/`const` variable before its declaration line and being surprised by a `ReferenceError` instead of `undefined`.
4. Creating functions inside a `var`-based loop and expecting each to capture "its own" loop variable — it won't, because there's only one shared `var` binding (see [tricky edge cases](./tricky-edge-cases.md)).
5. Assuming `this` means "the object this function is defined inside" — it means "whatever called this function," except for arrow functions.
6. Reaching for throttle/debounce (or any optimization) before measuring whether it's actually needed — both add state and subtlety that isn't free.

## Interview preparation checklist

- [ ] Can explain the prototype chain and at least two ways to wire up inheritance.
- [ ] Can explain closures with a concrete example (counter or module pattern).
- [ ] Knows all four `this`-binding rules and which one wins when several could apply.
- [ ] Can distinguish `var`/`let`/`const` hoisting behavior, including the TDZ.
- [ ] Can write (not just describe) a higher-order function.
- [ ] Knows the four Promise combinators and when each applies.
- [ ] Can implement throttle and debounce from scratch, not just describe the difference.
- [ ] Can explain lexical scope and the scope chain without reaching for "it just knows."
- [ ] Has a one-sentence rule for choosing `var` vs. `let` vs. `const` (spoiler: default to `const`).
- [ ] Can explain why arrow functions behave differently from regular functions for `this`.

:::tip Pro tip
Practice explaining these out loud, as if teaching someone else. The gap between "I recognize this when I see it" and "I can explain it clearly in one pass" is exactly the gap an interviewer is probing for.
:::
