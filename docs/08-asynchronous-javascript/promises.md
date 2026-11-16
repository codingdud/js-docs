---
title: "Promises and Chaining"
sidebar_position: 3
---

A **Promise** is an object that represents the eventual completion or failure of an asynchronous operation. It is the direct answer to [callback hell](./sync-vs-async-and-callbacks.md): instead of nesting callback inside callback, you chain `.then()` calls and handle every failure with a single `.catch()`.

## States and creation

A promise is always in exactly one of three states:

| State | Meaning |
|---|---|
| **pending** | The operation hasn't completed yet. |
| **fulfilled** | The operation completed successfully (a value is available). |
| **rejected** | The operation failed (a reason/error is available). |

A promise starts `pending` and can move to `fulfilled` or `rejected` exactly once — after that it is *settled* and its state never changes again.

You create one with the `Promise` constructor, which takes an **executor** function `(resolve, reject) => { ... }`. As covered in [Event Loop, Microtasks and Macrotasks](./event-loop.md), the executor runs **synchronously**, immediately when the constructor is called.

```js
const prom = new Promise((resolve, reject) => {
  const rand = Math.random();
  if (rand < 0.5) {
    resolve(rand);
    console.log("resolved");
  } else {
    console.log("rejected");
    reject(rand);
  }
});

prom.then(console.log).catch(console.log);
```

Either branch logs synchronously (`"resolved"` or `"rejected"`) the moment the promise is created; the `.then`/`.catch` reaction only runs afterward, as a microtask.

## Chaining `.then()`

`.then(onFulfilled, onRejected)` returns a **new promise**, which is what makes chaining possible: each `.then()` in the chain waits for the previous one, and a single `.catch()` at the end catches a rejection from *any* step above it.

### Example: an e-commerce order chain

```js
let cart = ["shoes", "hat", "pajama"];

createOrder(cart)
  .then((id) => {
    console.log(id);
    return id;
  })
  .then((id) => proceedToPayment(id))
  .then((paymentId) => {
    console.log(paymentId);
  })
  .catch((err) => console.log(err));

function createOrder(cart) {
  return new Promise((res, rej) => {
    if (!valid(cart)) {
      rej(new Error("cart is not valid"));
    } else {
      setTimeout(() => res(1101), 5000);
    }
  });
}

function valid(cart) {
  return true;
}

function proceedToPayment(orderId) {
  console.log(orderId);
  return new Promise((resolve) => resolve(123456));
}

// (after ~5s) 1101
// 1101
// 123456
```

If `valid(cart)` returned `false`, `createOrder` would reject with an `Error`, and that rejection would skip every `.then()` in the chain and land directly in the single `.catch()` at the end — exactly the error-handling benefit that callbacks lack.

:::tip
One `.catch()` at the end of a chain handles a rejection from *any* `.then()` above it. You don't need to repeat error handling at every step, unlike nested callbacks.
:::

## Returned value vs returned promise

What you `return` from inside a `.then()` callback controls what the *next* `.then()` receives, and how long the chain waits:

- **Return a plain value** → the next `.then()` receives that value immediately (well, on the next microtask tick).
- **Return a promise** → the chain automatically "unwraps" it: the next `.then()` waits for that promise to settle, and receives its resolved value (not a promise of a promise).
- **Return nothing** (no `return` statement) → the next `.then()` receives `undefined`. This is the single most common chaining bug.

### Example: forgetting to `return` breaks the chain

```js
function step1() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 1 completed");
      resolve(10);
    }, 5000);
  });
}

function step2(value) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 2 completed with:", value);
      resolve(value * 2);
    }, 5000);
  });
}

function step3(value) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 3 completed with:", value);
      resolve(value + 5);
    }, 5000);
  });
}

step1()
  .then(step2)
  .then(step3)
  .then((finalResult) => {
    console.log("Final Result:", finalResult);
  });

// (after ~5s)  Step 1 completed
// (after ~10s) Step 2 completed with: 10
// (after ~15s) Step 3 completed with: 20
// (after ~15s) Final Result: 25
```

Here each step correctly `return`s the promise from the next async function, so the whole pipeline takes about 15 seconds (5s per step, run strictly in sequence) and ends with `10 * 2 + 5 = 25`.

Now suppose `step2` was written to *forget* its `return`:

```js
function step2Broken(value) {
  new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 2 completed with:", value);
      resolve(value * 2);
    }, 5000);
  });
  // no return!
}

step1().then(step2Broken).then(step3);
// step3 immediately receives `undefined`, because .then()
// didn't get a promise to wait on — it moved on right away.
```

Without the `return`, `.then(step2Broken)` resolves with `undefined` almost immediately (it never waits for the inner promise at all), and `step3(undefined)` runs long before "Step 2 completed" is even logged. This is a very common real-world bug — always `return` the promise (or value) you want the next link in the chain to see.

:::warning
Forgetting `return` inside a `.then()` is one of the most common promise bugs. The outer `.then()` has nothing to wait on, so the chain silently moves forward with `undefined` instead of the value you expected.
:::

## Why Promises over callbacks (and what they fix)

Revisiting the comparison from [Sync vs Async and Callbacks](./sync-vs-async-and-callbacks.md), promises solve the concrete pain points of nested callbacks:

- **Flatten nested callbacks** — a chain reads top-to-bottom instead of growing sideways.
- **Centralize error handling** — one `.catch()` instead of a check at every level.
- **Composable** — a promise is a first-class value: you can store it, pass it around, `await` it, or combine several with `Promise.all()`/`Promise.race()`/etc. (see [Promise Combinators](./promise-combinators.md)).
- **Guaranteed callback timing** — a promise's reactions always run as microtasks, never synchronously, even if the promise is already settled when you attach `.then()`. Plain callbacks make no such guarantee, which can cause subtle bugs ("sometimes sync, sometimes async").

## Key takeaways

- A promise has three states: pending, fulfilled, rejected — and settles (fulfills or rejects) at most once.
- The executor passed to `new Promise(...)` runs synchronously and immediately.
- `.then()` returns a new promise, enabling chains; a single trailing `.catch()` handles rejection from anywhere above it.
- What you return from a `.then()` callback matters: a promise is awaited and unwrapped, a plain value passes straight through, and a missing `return` silently passes `undefined`.
- Promises exist specifically to fix the readability, error-handling, and composability problems of nested callbacks.

## Interview questions

**Q: What are the three states of a Promise, and can a promise change state more than once?**
Pending, fulfilled, rejected. Once it settles (fulfills or rejects), its state and value are locked forever — a promise cannot resolve and then later reject, or vice versa.

**Q: What happens if you forget to `return` a promise inside `.then()`?**
The next `.then()` in the chain doesn't wait for it — it resolves immediately with `undefined`, so any inner async work effectively runs detached from the chain.

**Q: Why do promises solve callback hell better than just naming your callbacks?**
Named callbacks improve readability slightly but don't solve error handling (still needs a check at every level) or composability (no built-in way to run several in parallel or race them). Promises address both directly via `.catch()` and the combinator APIs.
