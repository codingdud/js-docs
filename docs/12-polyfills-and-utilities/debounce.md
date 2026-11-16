---
title: Debouncing
sidebar_position: 4
---

# Debouncing

Debouncing delays running a function until a specified quiet period has passed since the *last* time it was triggered. Every time the event fires again before that quiet period elapses, the pending call is cancelled and the clock restarts. The net effect: no matter how many times the event fires in a burst, the function runs (at most) once, after the burst stops.

This page walks through four progressively more complete debounce implementations, the real-world bugs each one fixes or introduces, and how debouncing compares to its close cousin, [throttling](./throttle.md).

## The basic version

```js
function Debouncing(fn, sec) {
  let timerf;
  return (...arg) => {
    clearTimeout(timerf);
    timerf = setTimeout(() => fn(...arg), sec);
  };
}
```

```js
const log = Debouncing((value) => console.log('searching for:', value), 500);
log('r');
log('re');
log('rea'); // only this call survives — the first two were cancelled before they fired
// after 500ms of silence: "searching for: rea"
```

Storing the timer handle (`timerf`) in a variable *outside* the returned function — but inside `Debouncing`'s own scope — is what makes this work. Every call to the returned function can see and cancel the *same* pending timer, because both the `clearTimeout` and the `setTimeout` close over the identical `timerf` binding.

:::warning The timer must live in the enclosing closure, not inside the returned function
If `let timerf` were declared *inside* the returned arrow function instead of inside `Debouncing`, each call would create a fresh, local `timerf` that starts as `undefined` every time — `clearTimeout(undefined)` is a harmless no-op, so nothing would ever actually get cancelled, and every single call would eventually fire its own `setTimeout`, completely defeating the point of debouncing. The timer variable has to be declared **once**, outside the function that runs on every event.
:::

### Why the basic version loses `this`

```js
return (...arg) => { ... }
```

This returns an **arrow function**. Arrow functions never bind their own `this` — if you attach this debounced wrapper as a DOM event handler, `this` inside the wrapper is whatever `this` was where `Debouncing(...)` was *defined* (often the module scope, or `undefined` in strict mode), not the element the listener fired on. Native DOM listeners normally set `this` to the element the handler is attached to.

## This-aware version

```js
function Debouncingtrailing(fn, sec) {
  let timerf;
  return function (...arg) {
    clearTimeout(timerf);
    timerf = setTimeout(() => fn.call(this, ...arg), sec);
  };
}
```

Switching the *outer* returned function from an arrow function to a regular `function` restores the normal DOM-listener `this` binding — `this` inside that `function` is whatever called it (the element, for `addEventListener`). The inner `setTimeout` callback is still an arrow function on purpose: it needs to inherit `this` from the surrounding `function`, not get its own `this` from however `setTimeout` happens to invoke its callback (which would otherwise be `undefined`/`globalThis`). `fn.call(this, ...arg)` then explicitly forwards that captured `this` to the real handler.

## Leading-edge version

Sometimes you want the function to fire *immediately* on the first event in a burst (the "leading edge"), and only suppress the subsequent repeats:

```js
function Debouncingleading(fn, sec) {
  let timerf;
  let isCalled = false;
  return function (...arg) {
    if (!isCalled) {
      isCalled = true;
      fn.call(this, ...arg);
    }
    clearTimeout(timerf);
    timerf = setTimeout(() => {
      fn.call(this, ...arg);
    }, sec);
  };
}
```

:::danger `isCalled` never resets — leading-edge fires exactly once, ever
`isCalled` starts `false`, flips to `true` on the very first call, and is **never set back to `false`** anywhere in this function. That means the "fire immediately" branch runs on the *first call this debounced function ever receives in its entire lifetime*, and never again — not even after a long pause with no events, which is when a user would expect leading-edge behaviour to kick in again. Worse, the `setTimeout` branch at the bottom runs unconditionally on every call, so after the quiet period it fires `fn` *again* anyway — meaning, after the very first burst, this degrades into a plain trailing-edge debounce that happens to have fired one extra, "leading" call at the very start of the program's lifetime.

A correct leading-edge debounce resets the flag once the quiet period elapses:

```js
function debounceLeading(fn, sec) {
  let timerf;
  let isCalled = false;
  return function (...arg) {
    if (!isCalled) {
      isCalled = true;
      fn.call(this, ...arg);
    }
    clearTimeout(timerf);
    timerf = setTimeout(() => {
      isCalled = false; // ready to fire on the leading edge of the *next* burst
    }, sec);
  };
}
```
:::

## Leading + trailing version

```js
function Debouncingleadingandtrail(fn, sec) {
  let timerf;
  let isCalled = false;
  return function (...arg) {
    if (!isCalled) {
      isCalled = true;
      fn.call(this, ...arg);
    }
    clearTimeout(timerf);
    timerf = setTimeout(() => {
      isCalled = false;
      fn.call(this, ...arg);
    }, sec);
  };
}
```

This does correctly reset `isCalled` — but introduces a different bug:

:::warning Double call for a single, isolated event
Trigger this debounced function **exactly once**, then wait: the leading branch fires `fn` immediately, and because nothing else happens before the timer elapses, the trailing `setTimeout` callback *also* fires `fn` again with the same arguments — two calls for one logical event. Libraries like lodash avoid this by tracking whether any event arrived *after* the leading call; the trailing call should only fire if the function was invoked again during the window, not unconditionally. A correct version needs a separate "was there another call since the leading edge?" flag:

```js
function debounceLeadingAndTrailing(fn, sec) {
  let timerf;
  let isCalled = false;
  let calledAgain = false;
  return function (...arg) {
    if (!isCalled) {
      isCalled = true;
      fn.call(this, ...arg);
    } else {
      calledAgain = true;
    }
    clearTimeout(timerf);
    timerf = setTimeout(() => {
      if (calledAgain) fn.call(this, ...arg); // only fire trailing if there was a repeat call
      isCalled = false;
      calledAgain = false;
    }, sec);
  };
}
```
:::

## Real usage: a debounced text input

```html
<input type="text" id="input" placeholder="Enter text" />
<script>
  const input = document.querySelector('input');
  const inputevent = (e) => console.log(e.target.value);
  input.addEventListener('input', Debouncingleadingandtrail(inputevent, 2000));
</script>
```

## Common bugs seen "in the wild"

A survey of the same codebase's other debounce call sites turns up a few more mistakes worth recognizing:

:::danger A README example debounces with `setInterval` instead of `setTimeout`
One of the project's own notes (a real-time email-validation example) defines debounce like this:

```js
// BUGGY — do not copy this
function Debounce(fn, sec) {
  let temp;
  return (...arg) => {
    clearInterval(temp);
    temp = setInterval(() => {
      fn(...arg);
    }, sec);
  };
}
emailInput.addEventListener('input', Debounce(cb, 4000));
```

`setInterval` repeats forever until explicitly cleared — it does **not** fire once and stop like `setTimeout` does. If the user stops typing, `clearInterval` never runs again, so this fires the validation callback **every 4 seconds, indefinitely**, instead of once, 4 seconds after the user stops typing. The fix is a one-word swap: `setInterval` → `setTimeout`.
:::

:::warning Mixing `clearInterval` with a `setTimeout` handle
A related form, seen in a form-handling script, declares a `setTimeout`-based debounce but clears it with `clearInterval`:

```js
function debouncing(fn, sec) {
  let temp;
  return (...arg) => {
    clearInterval(temp); // should be clearTimeout(temp)
    temp = setTimeout(() => {
      fn(...arg);
    }, sec);
  };
}
```

In browsers, `setTimeout` and `setInterval` happen to share the same global ID counter, so `clearInterval(temp)` *accidentally* succeeds at cancelling a timeout handle — this "works" only because of an implementation detail, not because it's correct. It is **not** portable: in Node.js, `setTimeout`/`setInterval` return distinct `Timeout` objects rather than plain numeric IDs, and passing one to the other's clear function is not guaranteed to behave the same way. Always pair `clearTimeout` with `setTimeout`, and `clearInterval` with `setInterval`.
:::

## Use cases

| Use case | Why debounce fits |
| --- | --- |
| Search-as-you-type / autosuggest | Avoid firing a network request on every keystroke — wait until the user pauses |
| Form field validation | Don't show "invalid email" while the user is still mid-keystroke |
| Window resize — final layout recalculation | Expensive layout work should run once resizing *stops*, not on every intermediate frame |
| Autosave / "save draft" | Write to storage once editing pauses, not on every character typed |

## Debounce vs. throttle

| Aspect | Debounce | Throttle |
| --- | --- | --- |
| **When it runs** | Once, after a quiet period following the last event | At most once per fixed interval, *during* a stream of events |
| **Typical use** | Search input, form validation, autosave, resize "settle" | Scroll position tracking, mousemove, rate-limited API calls |
| **Mental model** | "Run N ms after the last event" | "Run at most every N ms" |
| **Mnemonic** | **De-bounce** = remove the *bounce* (repeat noise); wait for things to settle | **Throttle** = a valve limiting *flow rate*, not stopping it |

:::tip Mnemonic
*Debounce* waits for the dust to settle before acting once. *Throttle* keeps letting the function through at a steady, capped rate while the events keep coming. See [Throttling](./throttle.md) for the full comparison from the other side.
:::

## Key takeaways

- The timer handle must be stored in a variable that lives in the *outer* closure (created once), not re-declared inside the function that runs on every event.
- Switch the returned wrapper from an arrow function to a regular `function` whenever the debounced call needs to see the caller's `this` (e.g. DOM event handlers).
- A leading-edge flag that's set but never reset degrades a "leading" debounce into "fires once ever, then behaves like trailing."
- Naive leading+trailing debounce can double-fire for a single isolated event unless you track whether a repeat call actually happened during the window.
- Debounce with `setTimeout`, not `setInterval` — and always pair `clearTimeout`/`setTimeout` and `clearInterval`/`setInterval` consistently.

## Interview questions

1. Why does the timer variable need to be declared outside the function that's returned, rather than inside it?
2. What's the practical difference between a leading-edge debounce and a trailing-edge debounce, and when would you want each?
3. Why would a leading+trailing debounce without a "called again" flag double-fire for a single event?
4. What goes wrong if you build a debounce with `setInterval` instead of `setTimeout`?
5. Give two real use cases for debounce and explain, for each, what would go wrong if the function ran on *every* event instead of being debounced.

See also: [Throttling](./throttle.md) for the complementary rate-limiting technique, and [Event Handling](../09-dom-and-events/event-handling.md) / [Scroll Events](../09-dom-and-events/scroll-events.md) for more on the DOM events debounce and throttle are typically applied to.
