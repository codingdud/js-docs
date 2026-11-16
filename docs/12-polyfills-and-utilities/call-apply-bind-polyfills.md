---
title: "call, apply and bind Polyfills"
sidebar_position: 2
---

# call, apply and bind Polyfills

[`call`, `apply` and `bind`](../03-functions-and-scope/call-apply-bind.md) all exist to answer one question: *what should `this` be when this function runs?* Re-implementing them from scratch is a popular interview exercise because the "obvious" implementation hides several subtle differences from the real thing. This page builds `mycall`, `myapply` and `mybind`, walks through two source files that implement slightly different variants, and lists where each one diverges from the native behaviour.

## The core trick: a unique, temporary key

Every version here uses the same idea to invoke a function "as a method" of an arbitrary object:

```js
Function.prototype.mycall = function (context, ...args) {
  if (!context) context = globalThis;
  const fnKey = Symbol('fn');
  context[fnKey] = this;        // temporarily attach the function to context
  const result = context[fnKey](...args); // call it so `this` === context
  delete context[fnKey];        // clean up
  return result;
};
```

`this` inside `mycall` is the function `mycall` was invoked on (e.g. `Details.mycall(...)`). The function can't just do `this(...args)`, because that would run it with no receiver at all. Instead, it temporarily installs itself as a property of `context` and calls it *through* that property — `context.someMethod()` always sets `this` to `context` inside `someMethod`, which is exactly the mechanism being emulated.

### Why `Symbol('fn')` and not a plain string key?

```js
const fnKey = Symbol('fn'); // not "fn" or "__fn__"
```

A `Symbol()` call always produces a brand-new, globally unique value — no two symbols are ever `===`, even two created with the same description string. That buys three things a string key can't:

- **Guaranteed uniqueness.** `context.fn = this` could silently overwrite a real property named `fn` that the object already has. A fresh `Symbol()` can never collide with an existing key.
- **No clash with user-defined keys.** Even if the caller's object has dozens of properties, none of them can accidentally be *that* symbol, because the symbol was never shared with anyone.
- **Invisible to normal enumeration.** Symbol-keyed properties are skipped by `for...in`, `Object.keys()`, `JSON.stringify()`, and `Object.getOwnPropertyNames()`. So even in the brief window before `delete context[fnKey]` runs, code that loops over `context`'s "normal" properties never notices the temporary method.

:::note A symbol property isn't literally "non-enumerable"
The comment in the source says symbol keys are "not enumerable" — that's a helpful simplification, not the precise mechanism. A property created with `context[fnKey] = this` *does* have `enumerable: true` in its property descriptor, same as any plain assignment. What actually hides it is that `for...in` and `Object.keys()` only ever visit **string** keys — they skip symbol keys regardless of their `enumerable` flag. (`Object.getOwnPropertySymbols(context)` *would* reveal it.) The practical effect — invisible to ordinary object usage — is the same; the reason is "symbol keys are filtered out by key type," not "this particular property is flagged non-enumerable."
:::

## `mycall`, `myapply` and `mybind`

```js
Function.prototype.mycall = function (context, ...args) {
  if (!context) context = globalThis;
  const fnKey = Symbol('fn');
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

Function.prototype.myapply = function (context, args = []) {
  if (!context) context = globalThis;
  const fnKey = Symbol('fn');
  context[fnKey] = this;
  const result = context[fnKey](...args);
  delete context[fnKey];
  return result;
};

Function.prototype.mybind = function (...arg1) {
  return (...arg2) => {
    return this.mycall(...arg1, ...arg2);
  };
};
```

```js
const Person = { fname: 'Animesh', lname: 'kumar' };

function Details(city, state) {
  console.log(`${this.fname} ${this.lname} ${city} ${state}`);
}

Details.call(Person, 'ranchi', 'jharkhand');     // Animesh kumar ranchi jharkhand
Details.mycall(Person, 'ranchi', 'jharkhand');    // Animesh kumar ranchi jharkhand
Details.apply(Person, ['delhi', 'gurugram']);     // Animesh kumar delhi gurugram
Details.myapply(Person, ['delhi', 'gurugram']);   // Animesh kumar delhi gurugram
Details.bind(Person, 'huryna', 'ragisthan')();    // Animesh kumar huryna ragisthan
Details.mybind(null, 'huryna')('ragisthan');      // undefined undefined huryna ragisthan — null falls back to globalThis, not Person (see below)
```

Note the last line isn't a like-for-like comparison with the one above it: the native `bind` call uses `Person` as its context, while the `mybind` call deliberately passes `null`. `null` triggers `mycall`'s `if (!context) context = globalThis` fallback, so `this` inside `Details` ends up as `globalThis` — which has no `fname`/`lname` of its own, hence `undefined undefined`, not `Person`'s values.

`mybind` is the simplest of the three once `mycall` exists: it captures the bound `context` and any pre-applied arguments (`arg1`) in a closure, and returns a new function that, when eventually called with more arguments (`arg2`), forwards everything to `mycall`. This is **partial application**: each call to `mybind` can supply some arguments now and let the rest be supplied later.

### A second variant: `mybind` built directly on `.call`

`function/polifill.js` (note: the filename itself has the common typo — it should read **polyfill.js**) shows the same `mybind` idea but reuses the *native* `call` instead of a hand-rolled `mycall`:

```js
Function.prototype.mybind = function (...arg1) {
  return (...arg2) => {
    return this.call(...arg1, ...arg2);
  };
};
```

This is a perfectly reasonable thing to do in real code — `bind` only needs *some* way to invoke the original function with a chosen `this`, and the native `call` already does that correctly. It's worth recognizing as a distinct, equally valid approach from an interview answer: you can build `mybind` on top of `mycall` (to show you understand the whole chain from first principles) or on top of the real `call` (to show you understand that `bind` is "just" `call` with the arguments and context captured ahead of time).

## `binddeep.js`: bound `this` can't be overridden

`binddeep.js` demonstrates one of the most interview-relevant properties of `bind`: once a function is bound to a context, **nothing can change that context again** — not even calling `.call()` or `.apply()` on the bound function with a different object.

```js
const Person = { fname: 'Animesh', lname: 'kumar' };
const Person2 = { fname: 'sachine', lname: 'tendukar' };

function printName(home, town) {
  console.log(this.fname + ' ' + this.lname + ' ' + home + ',' + town);
}

let bindcall = printName.bind(Person, 'ranchi');
bindcall.call(Person2, 'delhi'); // this stays Person, NOT Person2 — but 'delhi' still arrives as the next positional arg (town); only the `this` override is ignored, not the extra argument

let mybindcall = printName.mybind(Person, 'ranchi');
mybindcall.mycall(Person2, 'daradun'); // same result: still Person
```

With the native `bind`, this is explicit in the spec: a bound function wraps the target function and **always** calls it with the context supplied to `bind`, ignoring whatever `this` the bound function was itself invoked with.

The hand-rolled `mybind` gets the same result, but for a slightly different, closure-based reason rather than a spec rule: `mybind` returns an **arrow function**. Arrow functions never have their own `this` — `this.mycall(...)` inside that arrow always refers to the `this` from when `mybind` was defined (the original `printName`), completely independent of how the returned arrow function is later invoked. Calling `.mycall(Person2, ...)` on the returned function changes what `this` is *inside `mycall`'s own body* — but `mycall`'s body only ever operates on `context` (its first argument), and the `this` *inside the arrow* that decides which original function to call was fixed by the closure the moment `mybind` ran. Either way — spec rule or closure capture — the conclusion for both native and custom `bind` is the same: **once bound, a function's `this` cannot be changed, even via `call`/`apply`/another `bind`.**

:::warning Implicit global in `binddeep.js`
`binddeep.js`'s `mycall` writes:

```js
Function.prototype.mycall = function (context, ...args) {
  if (!context) context = {};
  fnkey = Symbol('fn'); // missing let/const!
  context[fnkey] = this;
  let res = context[fnkey](...args);
  delete context[fnkey];
  return res;
};
```

`fnkey = Symbol('fn')` has no `let`, `const` or `var`. In non-strict mode this silently creates (or reassigns) a **global** variable named `fnkey` on every single call. Because `Symbol()` always returns a new value, this particular bug is mostly harmless in practice (the global gets overwritten on each call rather than accumulating), but it still pollutes the global scope and would throw `ReferenceError: fnkey is not defined` outright in strict mode (`'use strict'` or inside an ES module). Always declare temporary variables with `const`.
:::

## Where these polyfills diverge from the native methods

| Behaviour | Native `call`/`apply`/`bind` | `mycall`/`myapply`/`mybind` |
| --- | --- | --- |
| **`null`/`undefined` context** | In non-strict functions, `this` becomes `globalThis`; in strict-mode functions, `this` stays exactly `null`/`undefined` | Always falls back to `globalThis` — there is no way to opt out, even for a strict-mode function that wants `this === null` |
| **Falsy-but-real context** (`0`, `''`, `false`) | Boxed into a `Number`/`String`/`Boolean` wrapper object in non-strict mode | `if (!context) context = globalThis` treats *every* falsy value the same as `null`/`undefined` — passing `0` as the context incorrectly becomes `globalThis`, not a boxed `Number(0)` |
| **Primitive context in general** (`5`, `"abc"`) | Boxed into a wrapper object so property lookups and `this` work as expected | `context[fnKey] = this` on a primitive silently does nothing in non-strict mode (the engine boxes it, assigns to the throwaway wrapper, then discards it) — so `context[fnKey]` is `undefined` and calling it throws `TypeError: context[fnKey] is not a function` |
| **`new` with the result** | `boundFn = fn.bind(obj); new boundFn()` works — the bound `this` is overridden by the newly created object, and the bound args are prepended | `mybind` returns an **arrow function**, and arrow functions can never be used as constructors — `new mybindcall()` throws `TypeError: mybindcall is not a constructor` |
| **`.length`, `.name` of the result** | A real bound function reports a sensible `name` (`"bound originalName"`) and adjusted `.length` | The returned arrow function has `.name === ''` and a `.length` that doesn't account for the pre-applied arguments |

:::warning Primitive boxing is the sharpest edge
This is the gap most likely to bite in practice: `someFn.mycall(42, ...)` throws, while `someFn.call(42, ...)` quietly boxes `42` into a `Number` object and runs fine (in non-strict code). If you need full parity, the fix is to check the *type* of `context`, not just its truthiness — and to wrap primitives with `Object(context)` before attaching the symbol key.
:::

## Test coverage notes

`callbindapply.test.ts` checks `mycall`, `myapply` and `mybind` against expectations like:

- correct context binding across two different objects
- passing zero, one, or several arguments
- `null` context (always routed to a function that doesn't dereference `this`, so the `globalThis` fallback never actually gets exercised as a bug)
- partial application: binding some arguments now, supplying the rest at call time
- calling a bound function repeatedly still uses the original context
- a direct 1:1 comparison against the native `call`/`apply`/`bind` for the same inputs

The suite explicitly flags one gap in its own comments: chaining `mybind` twice (`fn.mybind(null, 1).mybind(null, 2)`) is called out as something that "might not work perfectly" — which lines up with the `.name`/constructability gaps above. A fully spec-compliant `bind` polyfill needs to preserve enough function-ness (constructability, `.name`, `.length`) that it can itself be bound again and behave like any other function; the arrow-function-based implementation here deliberately trades that completeness for simplicity.

## Key takeaways

- The symbol-key trick lets you invoke a function "as a method" of any object without risking a property-name collision, and without the temporary property showing up in `for...in`/`Object.keys()`.
- `mybind` is just `mycall` (or the native `call`) with the context and some arguments captured in a closure — that's the entire idea behind partial application.
- A bound function's `this` can never be changed again, by `call`, `apply`, or re-binding — this is true both by spec (native `bind`) and by closure semantics (an arrow-function-based custom `bind`).
- Hand-rolled `call`/`apply` implementations typically miss primitive boxing and the `null`/falsy-context distinction — both real, spec-mandated behaviours.
- An arrow-function-based `bind` polyfill can never support `new`.
- Never assign to an undeclared identifier (`fnkey = ...` with no `let`/`const`/`var`) — it creates an implicit global in non-strict code and throws in strict mode.

## Interview questions

1. Why use `Symbol()` instead of a string like `"__fn__"` as the temporary property key?
2. What happens, under the hood, when you call `someFn.call(42, ...)` in non-strict mode versus strict mode?
3. Why can't `new` work on a function produced by an arrow-function-based `bind` polyfill?
4. Once you've called `fn.bind(obj)`, can you ever make the result run with a different `this`? Why or why not?
5. What's wrong with `fnkey = Symbol('fn')` (no declaration keyword), and where would that bug actually surface?

See also: [Array Method Polyfills](./array-polyfills.md) for the same from-scratch exercise applied to `Array.prototype`, and [The `this` Keyword](../03-functions-and-scope/this-keyword.md) for how `this` is determined for ordinary function calls.
