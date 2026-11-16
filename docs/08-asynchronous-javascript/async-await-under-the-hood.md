---
title: "How async/await Works: Generators + Promise Runner"
sidebar_position: 7
---

[async/await](./async-await.md) feels like a language feature, but it can be built entirely out of two pieces that predate it: **generator functions** and a small "runner" that drives the generator forward with promises. Seeing this pattern — sometimes called the **co pattern**, after the early `co` library that popularized it — demystifies what `await` is actually doing: pausing a function and resuming it once a promise settles.

## Generators that `yield` promises

A generator function (`function*`) can pause at every `yield` and resume later from exactly that point, including keeping all of its local variables alive in between — which sounds a lot like what `await` does.

```js
function getCountries() {
  return new Promise((resolve) => {
    console.log("fetching countries...");
    setTimeout(() => resolve(["India", "USA", "UK"]), 8000);
  });
}

function getProvinces(country) {
  return new Promise((resolve) => {
    console.log("fetching provinces for", country);
    setTimeout(() => resolve([{ id: 101, name: "Province-A" }]), 7000);
  });
}

function getCities(provinceId) {
  return new Promise((resolve) => {
    console.log("fetching cities for", provinceId);
    setTimeout(() => resolve(["City-X", "City-Y"]), 6000);
  });
}

function* generator() {
  const countries = yield getCountries();
  const provinces = yield getProvinces(countries[0]);
  const cities = yield getCities(provinces[0].id);
  return cities;
}
```

This `generator()` reads almost exactly like an `async` function would — except `yield` just hands a promise *out* to whoever is driving the generator, rather than automatically waiting for it. The generator itself does not know how to wait for a promise; something else has to do that and feed the resolved value back in with `.next(value)`.

## The runner: `executer`

That "something else" is a small runner loop. Each time the generator yields a promise, the runner waits for it to resolve and then calls `.next()` again with the resolved value — which is exactly what `await` does automatically for you in real `async`/`await` code.

```js
let it = generator();

function executer(arg) {
  let res = it.next(arg);
  if (res.done) {
    console.log(res);
  } else {
    Promise.resolve(res.value).then(executer);
  }
}

executer();
```

Tracing through it:

1. `executer()` calls `it.next()` with no argument, starting the generator. It runs up to the first `yield getCountries()`, which calls `getCountries()` (logging `"fetching countries..."` and starting an 8-second timer) and pauses there, handing the resulting promise out as `res.value`.
2. `res.done` is `false`, so the runner does `Promise.resolve(res.value).then(executer)` — wrapping `res.value` in `Promise.resolve()` is a safety net in case a `yield`ed value isn't already a promise, and then scheduling `executer` to run again once it resolves.
3. ~8 seconds later, the countries promise resolves with `["India", "USA", "UK"]`. `executer` is called again with that array as `arg`.
4. `it.next(arg)` resumes the generator *inside* the `yield` expression — `countries` becomes `["India", "USA", "UK"]` — and the generator runs forward to the next `yield getProvinces(countries[0])`, logging `"fetching provinces for India"` and starting its own 7-second timer, then pausing again.
5. This repeats for `getCities`, 6 more seconds later.
6. After the generator finally `return`s `cities`, `it.next()` comes back with `res.done === true`, and the runner just logs the final result instead of scheduling another `.then()`.

So `Promise.resolve(res.value).then(executer)` is the whole "event loop" for this mini async system: it's the one line responsible for waiting on each yielded promise and then pushing the generator forward — precisely the job `await` does invisibly inside a real `async` function.

### Total timing: ~21 seconds, strictly sequential

Each step's timer only starts once the *previous* step's promise has resolved and the generator has resumed and called the next function — there's no eager overlap here (contrast with the eager-promise pattern in [async/await](./async-await.md#why-this-example-takes-1s-not-2s)). So the total time is the **sum** of all three delays:

```text
8000ms (countries) + 7000ms (provinces) + 6000ms (cities) = 21000ms ≈ 21 seconds
```

This mirrors exactly how a real `async` function using sequential `await`s would behave:

```js
async function loadLocation() {
  const countries = await getCountries();
  const provinces = await getProvinces(countries[0]);
  const cities = await getCities(provinces[0].id);
  return cities;
}
```

## Bug: the implicit global `res`

Look closely at the runner again:

```js
function executer(arg) {
  res = it.next(arg); // <- no `let`/`const`/`var`!
  ...
}
```

`res` is assigned without a declaration. In non-strict mode this **creates an implicit global variable** (the same mistake covered in [Sync vs Async and Callbacks](./sync-vs-async-and-callbacks.md#a-classic-implicit-global-bug)) — every call to `executer` overwrites a property on the global object instead of a local variable scoped to the function. It "works" here only because nothing else in the program happens to read or write a global named `res`, but it's fragile: in strict mode (`"use strict";`, or inside any ES module) this would throw `ReferenceError: res is not defined`.

```js
// fixed
function executer(arg) {
  let res = it.next(arg);
  if (res.done) {
    console.log(res);
  } else {
    Promise.resolve(res.value).then(executer);
  }
}
```

## Missing error handling: use `it.throw(err)`

The runner above has no error handling at all. `.then(executer)` only supplies the *fulfillment* handler — if any yielded promise **rejects**, there is no `onRejected` callback and no `.catch()`, so:

- The rejection is simply never observed by the runner.
- `executer` never gets called again, so the generator silently stops advancing forever.
- Depending on the environment, you may additionally see an "unhandled promise rejection" warning, but the generator itself has no chance to react — any `try`/`catch` written *inside* `generator()` around a `yield` would never even get the chance to run.

The fix is for the runner to catch a rejection and push it **back into the generator** using `it.throw(err)`, which makes the error surface at the exact `yield` point inside the generator — exactly where a `try`/`catch` wrapped around that `yield` would expect to catch it:

```js
function executer(arg) {
  let res;
  try {
    res = it.next(arg);
  } catch (err) {
    console.log("Generator threw synchronously:", err);
    return;
  }

  if (res.done) {
    console.log(res);
    return;
  }

  Promise.resolve(res.value).then(
    (value) => executer(value),
    (err) => {
      // Feed the rejection back into the generator at the yield point.
      try {
        const nextRes = it.throw(err);
        if (!nextRes.done) {
          Promise.resolve(nextRes.value).then(executer);
        }
      } catch (unhandled) {
        console.log("Unhandled error inside generator:", unhandled);
      }
    }
  );
}
```

With this fix, the generator itself can wrap its `yield`s in a normal `try`/`catch` and handle failures the same way `async`/`await` lets you handle a rejected `await` with `try`/`catch`:

```js
function* generator() {
  try {
    const countries = yield getCountries();
    const provinces = yield getProvinces(countries[0]);
    const cities = yield getCities(provinces[0].id);
    return cities;
  } catch (err) {
    console.log("Failed inside generator:", err);
    return [];
  }
}
```

`it.throw(err)` is the generator API's way of saying "resume this generator, but make it look like the current `yield` expression threw `err`" — which is *exactly* what a rejected `await` does inside a real `async` function. This is precisely the mechanism the JavaScript engine itself uses internally to implement `async`/`await`: `await expr` is conceptually `yield expr` driven by a runner just like `executer`, where a rejection is delivered back via the equivalent of `it.throw()`.

:::warning
A `.then(onFulfilled)` with no second argument and no trailing `.catch()` silently swallows the "what if this rejects" case. In a hand-rolled generator runner like this one, that doesn't just lose an error — it permanently stalls the whole sequence, since nothing ever calls `.next()` again.
:::

## Key takeaways

- A generator function can `yield` a promise and pause there; a small runner (`executer`) is what actually waits for that promise and resumes the generator with `.next(value)` — this is the mechanism that `async`/`await` is syntactic sugar over.
- `Promise.resolve(res.value).then(executer)` is the "drive it forward" step; `Promise.resolve()` safely normalizes a yielded value that might not already be a promise.
- Sequential `yield`s with no eager overlap mean the total time is the sum of every step's delay — `8s + 7s + 6s ≈ 21s` here, exactly like sequential `await`s on the same three calls.
- Assigning to an undeclared variable (`res = ...` instead of `let res = ...`) creates an implicit global — always declare your locals.
- A runner needs an `onRejected` handler that calls `it.throw(err)` to route a rejection back into the generator at its `yield` point — without it, a rejected yielded promise silently stalls the whole sequence instead of surfacing as a catchable error.

## Interview questions

**Q: How would you implement `await` using only generators and promises?**
Write a generator that `yield`s promises at each async step, and a runner function that calls `.next()` to start it, then on each yielded promise calls `.then()` to wait for it and feeds the resolved value back in with `.next(value)`, repeating until `res.done` is `true`.

**Q: What goes wrong if the runner's `.then()` has no rejection handler?**
A rejected yielded promise is never observed by the runner, so `.next()` is never called again — the generator permanently stalls partway through, with no way for an internal `try`/`catch` around the `yield` to ever run.

**Q: How do you deliver an error into a paused generator, rather than just stopping it?**
Call `it.throw(err)` instead of `it.next(value)`. This resumes the generator but makes the current `yield` expression behave as if it threw `err`, which a `try`/`catch` wrapped around that `yield` inside the generator can catch — mirroring how a rejected `await` is caught by `try`/`catch` in real `async`/`await` code.
