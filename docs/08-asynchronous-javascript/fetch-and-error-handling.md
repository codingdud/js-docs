---
title: "Fetch and Error Handling"
sidebar_position: 6
---

`fetch()` is the standard way to make network requests, and it comes with a surprising sharp edge: it does **not** reject on HTTP error responses. This page covers that gotcha, request cancellation with `AbortController`, and the general rules for catching errors in async code — including why a plain `try`/`catch` cannot catch an error thrown later, inside a timer.

## A basic sequential fetch

```js
const URL = "https://api.github.com/users/codingdud";

async function githubApi() {
  const user = await fetch(URL);
  const data = await user.json();
  console.log(data);

  const user1 = await fetch(URL);
  const data1 = await user1.json();
  console.log(data1);
}

githubApi();
```

Two things to notice:

- `fetch(URL)` resolves with a `Response` object as soon as the headers arrive — it does **not** wait for the body. You must separately `await response.json()` (or `.text()`, `.blob()`, etc.) to read and parse the body, and that read is itself asynchronous.
- These two `fetch`/`.json()` pairs run **sequentially** here because each `await`s the previous one's full completion before starting. If the two calls were independent, `Promise.all()` would let them run in parallel (see [Sequential vs parallel awaits](./async-await.md#sequential-vs-parallel-awaits)).

## `fetch` rejects only on network failure

This is the single most important thing to know about `fetch`:

> `fetch()`'s returned promise rejects **only** when the request cannot complete at all — a network failure, a DNS error, a CORS block, the request being aborted, and similar. It does **not** reject just because the server responded with an error status like `404` or `500`.

```js
fetch("/api/data")
  .then((res) => res.json())
  .then(console.log)
  .catch(console.log);
```

**When will `.catch()` here *not* run, even though something clearly went wrong?** If `/api/data` responds with, say, a `404 Not Found` or a `500 Internal Server Error`. From `fetch`'s point of view, the request *succeeded* — a real HTTP response came back, just with an error status code. `res.json()` will happily try to parse whatever body the server sent (which may or may not even be valid JSON), and the `.catch()` only fires if that parsing itself throws or if the network truly failed. A `404` with an empty or non-JSON body might make `res.json()` throw and trigger `.catch()`, but a `404` with a valid JSON error payload will **not** trigger it at all — you'll just get that JSON logged as if it were a success.

### Always check `response.ok`

```js
async function getData() {
  const res = await fetch("/api/data");
  if (!res.ok) {
    // res.ok is false for any status outside 200–299
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

getData()
  .then(console.log)
  .catch((err) => console.log("Failed:", err.message));
```

`response.ok` is `true` only for status codes in the `200`–`299` range. Checking it explicitly — and throwing yourself if it's `false` — is what actually turns an HTTP error response into a promise rejection you can catch.

:::warning
`fetch` treats a `404` or `500` as a *successful* network round-trip, not a failure. If you don't check `response.ok` (or `response.status`) yourself, your `.catch()` will silently never run for HTTP-level errors.
:::

## Cancelling a request with `AbortController`

A `fetch` request has no built-in timeout and, once started, keeps running until it finishes. `AbortController` lets you cancel it on demand (a timeout, a component unmounting, a user clicking "cancel", etc.):

```js
const controller = new AbortController();

fetch("/api/data", { signal: controller.signal })
  .then((res) => res.json())
  .then(console.log)
  .catch((err) => {
    if (err.name === "AbortError") {
      console.log("Request was cancelled");
    } else {
      console.log("Request failed:", err);
    }
  });

// cancel it after 3 seconds if it hasn't finished
setTimeout(() => controller.abort(), 3000);
```

Calling `controller.abort()` makes the `fetch` promise reject with an `AbortError` — which is exactly the "network failure" kind of rejection described above, so it's caught by the normal `.catch()`.

## try/catch/finally

`try`/`catch` works the same for `async`/`await` code as it does for plain synchronous code, because `await` makes a rejected promise *throw* at that line, synchronously from the perspective of the surrounding `async` function:

```js
async function loadUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.log("Could not load user:", err.message);
    return null;
  } finally {
    console.log("loadUser finished (success or failure)");
  }
}
```

`finally` always runs, whether the `try` block succeeded or the `catch` block ran — useful for cleanup like hiding a loading spinner regardless of outcome.

## Runtime errors vs syntax errors

| | Syntax error | Runtime error |
|---|---|---|
| **When detected** | Before any code runs — during parsing | While the code is executing |
| **Example** | `function (` (missing name/parens mismatch) | `null.someProperty` |
| **Catchable with try/catch?** | No — the script fails to parse at all | Yes, if it's inside the `try` block's synchronous execution path |

A syntax error prevents the whole script (or module) from running in the first place, so there's no `try`/`catch` that could ever catch it — fix it at the source. A runtime error (`TypeError`, `ReferenceError`, a thrown `Error`, etc.) happens while code is executing and can be caught, provided the `catch` is actually watching the right piece of code.

## Custom `Error` subclasses

Plain `Error` objects are often not descriptive enough for an application with several distinct failure modes. Subclassing `Error` lets calling code distinguish error *types*, not just messages:

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

async function getUser(id) {
  if (!id) throw new ValidationError("id is required", "id");
  const res = await fetch(`/api/users/${id}`);
  if (res.status === 404) throw new NotFoundError(`User ${id} not found`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

getUser(null).catch((err) => {
  if (err instanceof ValidationError) {
    console.log(`Invalid field "${err.field}": ${err.message}`);
  } else if (err instanceof NotFoundError) {
    console.log("Not found:", err.message);
  } else {
    console.log("Unexpected error:", err.message);
  }
});
```

Always call `super(message)` first so `Error`'s own setup (including `.message` and the stack trace) runs correctly, and set `this.name` so logs and `instanceof` checks are both meaningful.

## Why `try`/`catch` cannot catch a `throw` inside `setTimeout`

```js
try {
  setTimeout(() => {
    throw new Error("Async error");
  }, 0);
} catch (e) {
  console.log(e); // never runs
}
```

This does **not** work, and the reason is pure event-loop mechanics, not a special rule about `setTimeout`:

1. `try { setTimeout(...) }` only wraps the **synchronous** act of *registering* the timer. `setTimeout` itself returns immediately (with a timer ID) — it does not run the callback inside the `try` block.
2. By the time the timer actually fires (even with a `0ms` delay), the `try`/`catch` statement has already finished executing and is off the call stack entirely.
3. The callback runs later as a brand-new macrotask, with its own fresh call stack. There is no `try`/`catch` anywhere on *that* call stack, so the thrown error propagates all the way up and becomes an unhandled exception (logged to the console, or crashing a Node process without a global handler).

The fix is to put the `try`/`catch` **inside** the callback itself, where it will actually be live on the stack when the throw happens:

```js
setTimeout(() => {
  try {
    throw new Error("Async error");
  } catch (e) {
    console.log(e.message); // Async error
  }
}, 0);
```

The general rule: a `try`/`catch` only catches errors thrown **synchronously within its own block's execution**. For a Promise, that "execution" conceptually continues into `.then()`/`.catch()` or the code after an `await` (because the promise machinery routes a rejection into the right handler) — but a raw callback scheduled via `setTimeout`, a DOM event, or similar has no such wiring, so a `try`/`catch` wrapped only around the *scheduling* call is useless.

## Key takeaways

- `fetch()` rejects only on network-level failure (no connection, DNS failure, CORS block, abort) — not on HTTP error status codes. Always check `response.ok` yourself.
- `response.json()` (and `.text()`, etc.) is itself asynchronous and must be awaited separately from the initial `fetch()`.
- `AbortController` lets you cancel an in-flight `fetch`; the aborted request's promise rejects with an `AbortError`.
- `try`/`catch`/`finally` works naturally with `async`/`await`, since `await` turns a rejection into a synchronous-looking throw at that line.
- Syntax errors are caught before anything runs and can never be handled with `try`/`catch`; runtime errors can be, as long as the `catch` is actually on the stack when the error happens.
- Custom `Error` subclasses (calling `super(message)` and setting `this.name`) let you distinguish error types with `instanceof`.
- `try`/`catch` around a `setTimeout(...)` call only guards the *scheduling* of the timer, not the callback that runs later on a fresh call stack — put the `try`/`catch` inside the callback instead.

## Interview questions

**Q: Does `fetch()` reject when the server returns a 404?**
No. `fetch()` only rejects on true network failures. A `404` is a successful HTTP exchange from `fetch`'s perspective; you must check `response.ok` (or `response.status`) and throw yourself if you want it treated as an error.

**Q: Why doesn't wrapping `setTimeout(() => { throw ... })` in `try`/`catch` catch the error?**
The `try` block only covers the synchronous call that schedules the timer. The thrown error happens later, inside a callback running on a completely new call stack, where the original `try`/`catch` is no longer active.

**Q: How do you cancel a `fetch` request?**
Create an `AbortController`, pass its `.signal` in the `fetch` options, and call `controller.abort()` when you want to cancel — the fetch promise then rejects with an `AbortError`.

**Q: What's the difference between a syntax error and a runtime error, with respect to `try`/`catch`?**
A syntax error stops the script from parsing at all, before any code (including a `try` block) can run, so it's never catchable. A runtime error happens during execution and is catchable, provided the error is thrown synchronously inside the `try` block's own execution (directly, or via an awaited promise rejection).
