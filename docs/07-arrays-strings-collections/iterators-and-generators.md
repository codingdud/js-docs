---
title: Iterators and Generators
sidebar_position: 6
---

Iterators are the protocol that powers `for...of`, the spread operator, and destructuring over any custom collection. Generators are a special kind of function that implement that protocol for you, pausing and resuming execution instead of running start-to-finish in one go. This page builds a custom iterator by hand, then shows how generators make the same job far less error-prone — including the trickier semantics of `next(arg)`, return values, and single-use iteration.

## The iterator protocol

An object is an "iterator" if it has a `next()` method that returns `{ value, done }`. An object is "iterable" if it has a `[Symbol.iterator]()` method that returns an iterator. `for...of`, spread, and destructuring all work by calling `[Symbol.iterator]()` and then repeatedly calling `next()` until `done` is `true`.

Here's a hand-written iterable object that counts `10, 20, 30, 40, 50`:

```js
function iteratorPattern() {
  let n = 0;
  let done = false;
  return {
    [Symbol.iterator]() {
      return this; // this object is its own iterator
    },
    next: () => {
      n += 10;
      if (n > 50) done = true;
      return { value: n, done: done };
    },
  };
}

for (let x of iteratorPattern()) {
  console.log("iterator:", x);
}
// iterator: 10
// iterator: 20
// iterator: 30
// iterator: 40
// iterator: 50
```

Walking through `next()` call by call: `n` becomes `10, 20, 30, 40, 50` with `done` still `false` each time (because `n > 50` is false right up through `n === 50`), and only on the **sixth** call does `n` become `60` with `done` set to `true`.

:::warning The value paired with done: true is discarded
On that sixth call, `next()` returns `{ value: 60, done: true }`. `for...of` (and spread, and destructuring) **never uses the value from a `done: true` result** — by protocol, that final value is simply thrown away. That's why `60` never appears in the logged output above, even though the iterator did technically produce it.
:::

This same protocol is what makes arrays, strings, `Map`, and `Set` all work with `for...of` — each implements `[Symbol.iterator]()` internally.

## Generators: functions that pause

Writing an iterator by hand means manually tracking state (`n`, `done`) across calls, which gets unwieldy fast. A **generator function** — declared with `function*` — does this automatically: calling it doesn't run the function body immediately, it returns a generator object that is *both* an iterator and iterable, and each call to `.next()` runs the body until the next `yield`.

```js
function* generator() {
  yield 1;
  yield 2;
  yield 3;
}

let it = generator();
for (let i of it) console.log(i);
// 1
// 2
// 3
```

### Execution is lazy — logs appear only as you call `next()`

Because the body doesn't run until you call `.next()`, any side effects (like `console.log`) inside the generator are deferred too:

```js
function* numberGenerator() {
  console.log('Start');
  yield 1;
  console.log('After first yield');
  yield 2;
  console.log('After second yield');
  yield 3;
  console.log('End');
}

const gen = numberGenerator();

console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }
```

The actual interleaved output is:

```text
Start
{ value: 1, done: false }
After first yield
{ value: 2, done: false }
After second yield
{ value: 3, done: false }
End
{ value: undefined, done: true }
```

Notice `'Start'` isn't logged until the **first** `.next()` call — nothing inside a generator body runs just from calling `numberGenerator()`. This laziness is exactly what makes generators useful for infinite sequences, streaming data on demand, or any "compute only what's actually consumed" pipeline — you pay the cost of each step only when something asks for it.

### Return value with `done: true` is ignored by `for...of`

A generator can `return` a final value, which shows up as `{ value: ..., done: true }` from `next()` — but just like the hand-written iterator earlier, `for...of` **discards** it:

```js
function* gen() {
  yield 1;
  yield 2;
  return 99; // never seen by for...of
}

for (const v of gen()) console.log(v);
// 1
// 2
// (99 is never logged)
```

### A generator is iterable only once

A generator object's `[Symbol.iterator]()` returns `this` — itself — so once it's exhausted (`done: true`), iterating it again yields nothing further. Unlike an array, you can't restart a generator; you have to call the generator **function** again to get a fresh generator object.

```js
function* gen() {
  yield 1;
  yield 2;
}

const it = gen();
console.log([...it]); // [1, 2]
console.log([...it]); // []  — already exhausted, this is the SAME generator object

console.log([...gen()]); // [1, 2] — calling gen() again makes a brand-new generator
```

## `next(arg)`: passing values back into a generator

`yield` is actually an expression that can **receive** a value — the argument you pass to the *next* `.next()` call becomes the result of the `yield` expression that's currently paused:

```js
function* generator() {
  const a = yield 1;
  const b = yield 2;
  const c = yield 3;
  console.log(a, b, c);
  return 4;
}

let it = generator();

function executer(y = 10) {
  const res = it.next(y);
  if (res.done) {
    console.log(res);
  } else {
    console.log(res);
    executer(++y);
  }
}
executer();
```

:::warning The argument to the first next() call is always ignored
The very first `.next()` call only *starts* the generator — execution runs from the top down to the first `yield 1`, and there is no `yield` expression waiting to receive a value yet. Whatever you pass to that first call is thrown away. Only the *second* call's argument becomes the result of the *first* `yield`, and so on — `next(arg)` is one step "behind" the `yield` it feeds.
:::

Tracing `executer()` with its default `y = 10`:

1. `it.next(10)` — the `10` is discarded (first call). Runs to `yield 1`. Returns `{ value: 1, done: false }`. Logged, then `executer(++y)` → `executer(11)`.
2. `it.next(11)` — resumes after `yield 1`, so `a = 11`. Runs to `yield 2`. Returns `{ value: 2, done: false }`. Logged, then `executer(12)`.
3. `it.next(12)` — resumes after `yield 2`, so `b = 12`. Runs to `yield 3`. Returns `{ value: 3, done: false }`. Logged, then `executer(13)`.
4. `it.next(13)` — resumes after `yield 3`, so `c = 13`. The function body continues past the last `yield`, runs `console.log(a, b, c)`, then `return 4`. Returns `{ value: 4, done: true }`.

Full output:

```text
{ value: 1, done: false }
{ value: 2, done: false }
{ value: 3, done: false }
11 12 13
{ value: 4, done: true }
```

Once `res.done` is `true`, `executer` stops recursing — the final `{ value: 4, done: true }` is logged but no further `next()` calls happen.

## Generator use cases

- **Lazy/infinite sequences** — generate values on demand instead of building a whole array upfront (e.g. an infinite counter, a Fibonacci stream).
- **Custom iterables** — implement `[Symbol.iterator]()` by simply writing a `function*` instead of hand-managing `{ value, done }` state.
- **Pausable, resumable computation** — any process that needs to yield control back to the caller between steps (step-through debuggers, co-operative scheduling).
- **Pre-`async/await` asynchronous flow control** — generators (combined with a driver function) were the mechanism libraries used to flatten async callback chains before `async`/`await` existed; `async function`s are, conceptually, generators that automatically resume themselves on each resolved promise.

## Building a custom iterable: a `LinkedList`

A common exercise is making a custom data structure work with `for...of` by implementing `[Symbol.iterator]()`. A typical unfinished version looks like this — note the `Node` class it depends on is never defined:

```js
class LinkedList {
  constructor() {
    this.head = this.tail = null;
    this.size = 0;
  }

  [Symbol.iterator]() {
    // TODO: your code
  }

  append(value) {
    const node = new Node(value); // ReferenceError: Node is not defined — missing class!
    if (!this.head) this.head = this.tail = node;
    else this.tail = this.tail.next = node;
    this.size++;
  }
}
```

Calling `append()` as written throws `ReferenceError: Node is not defined`, because nothing in the file ever declares a `Node` class. Filling in both the missing `Node` class and the iterator gives a complete, working linked list:

```js
class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = this.tail = null;
    this.size = 0;
  }

  append(value) {
    const node = new Node(value);
    if (!this.head) this.head = this.tail = node;
    else this.tail = this.tail.next = node;
    this.size++;
  }

  [Symbol.iterator]() {
    let current = this.head;
    return {
      next() {
        if (!current) return { value: undefined, done: true };
        const value = current.value;
        current = current.next;
        return { value, done: false };
      },
    };
  }
}

const list = new LinkedList();
list.append(1);
list.append(2);
list.append(3);

for (const value of list) {
  console.log(value); // 1, 2, 3
}

console.log([...list]); // [1, 2, 3]
```

Note the iterator object returned from `[Symbol.iterator]()` tracks its own `current` cursor via closure — it's a fresh, independent walk through the list every time you call `[Symbol.iterator]()`, so (unlike a generator object) the same `list` can be iterated multiple times, and even iterated concurrently by two separate `for...of` loops without interfering with each other.

A `function*` would make this even shorter, since a generator handles the `{ value, done }` bookkeeping for you:

```js
class LinkedList {
  constructor() {
    this.head = this.tail = null;
    this.size = 0;
  }

  append(value) {
    const node = new Node(value);
    if (!this.head) this.head = this.tail = node;
    else this.tail = this.tail.next = node;
    this.size++;
  }

  *[Symbol.iterator]() {
    let current = this.head;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}
```

## Typing generators in TypeScript

TypeScript's built-in `Generator<T, TReturn, TNext>` type captures all three "directions" a generator communicates in:

```ts
interface GeneratorFunctions {
  generator(): Generator<number, number, number>;
}

declare const generator: () => Generator<number, number, number>;
```

`Generator<number, number, number>` means:

- **`T` (first param)** — the type of every value produced by `yield` (what `next().value` is while `done` is `false`).
- **`TReturn` (second param)** — the type of the generator's final `return` value (what `next().value` is once `done` becomes `true`).
- **`TNext` (third param)** — the type of the value you may pass into `.next(value)`, which becomes the result of the paused `yield` expression.

There's also an `AsyncGenerator<T, TReturn, TNext>` counterpart for `async function*` generators, used the same way but with each step wrapped in a `Promise`.

## Key takeaways

- An object is iterable if it has `[Symbol.iterator]()`; that method must return an iterator with a `next()` returning `{ value, done }`.
- The `value` paired with the result where `done` is `true` is **discarded** by `for...of`, spread, and destructuring — only earlier, `done: false` values are used.
- Generator functions (`function*`) run lazily: nothing in the body executes until the first `.next()` call, which is why their `console.log`s appear "staggered" across calls rather than all at once.
- The argument to the **first** `.next()` call is always discarded; argument `n+1` becomes the value of `yield` number `n`.
- A generator object is iterable only once; call the generator function again for a fresh run.
- `Generator<T, TReturn, TNext>` in TypeScript types the yielded value, the final return value, and the value you can feed back in via `.next(value)`, respectively.

## Interview questions

**Q: What's the difference between an iterator and an iterable?**
An iterable has a `[Symbol.iterator]()` method that returns an iterator. An iterator has a `next()` method returning `{ value, done }`. Many objects (generator instances, for example) are both at once.

**Q: Why doesn't `for...of` print the value from a generator's `return` statement?**
Because the iterator protocol says a `{ value, done: true }` result's value is only meant to signal "iteration finished, and here's an optional final value" — consumers like `for...of` are specified to ignore it, by design.

**Q: What does the first argument to `.next()` do?**
Nothing observable — it's discarded, because execution hasn't reached any `yield` expression yet to receive it. The first argument that actually matters is the one passed to the *second* `.next()` call, which becomes the value of the *first* `yield` expression.

**Q: Can you iterate the same generator object twice?**
No — a generator's `[Symbol.iterator]()` returns itself, and once it reports `done: true` it stays exhausted. Call the generator function again to get a new, independent generator object.

**Q: Why are generators useful for implementing `[Symbol.iterator]()` on a custom class?**
A `function*` automatically produces the `{ value, done }` objects and tracks the "where am I" state via normal control flow (loops, local variables) — you just `yield` each value, instead of manually writing a closure-based `next()` method.

See also [Loops and Iteration](../01-basics/loops-and-iteration.md) for the `for...of`/`for...in` basics these protocols build on, and [Async/Await Under the Hood](../08-asynchronous-javascript/async-await-under-the-hood.md) for how generators relate to `async`/`await`.
