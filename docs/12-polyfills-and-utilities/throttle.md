---
title: Throttling
sidebar_position: 5
---

# Throttling

Throttling guarantees a function runs **at most once** per fixed time interval, no matter how many times the triggering event fires during that interval. Unlike [debouncing](./debounce.md), which waits for events to *stop* before running anything, throttling lets the function through at a steady, capped rate *while* events keep streaming in.

This page covers three ways to implement throttling (a timestamp-comparison version, a boolean-flag version, and a trailing-call version), the lodash-style "leading/trailing options" variant, and the gotchas each one has around `this` and dropped calls.

## Timestamp throttle

```js
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  console.log('scroll event — throttled');
}, 1000)); // runs at most once per second, however fast the scroll events fire
```

This compares the current time against the last time the function actually ran. If enough time has passed, it runs again and the clock resets; otherwise the call is simply dropped — there's no memory of it at all.

## Flag-based throttle (`Throttling1`)

```js
function Throttling1(fn, sec) {
  let flag = true;
  return (...arg) => {
    if (flag) {
      flag = false;
      fn(...arg);
      setTimeout((_) => { flag = true; }, sec);
    }
  };
}
```

```js
const throttled = Throttling1((msg) => console.log(msg), 1000);
throttled('first');  // runs immediately: "first"
throttled('second'); // dropped — flag is false
throttled('third');  // dropped — flag is false
// after 1000ms, flag resets to true; the *next* call after that runs, but
// 'second' and 'third' never run — they are gone for good
```

This is functionally equivalent to the timestamp version (run immediately, then ignore everything until a `setTimeout` flips a flag back), just expressed with a boolean instead of a timestamp comparison. Both share the same defining trait:

:::warning Leading-edge throttle drops the trailing call entirely
Every call that lands *during* the throttle window is discarded with no trace — there is no mechanism that remembers "someone tried to call this while it was throttled" and runs it later. If the triggering events stop entirely right after a dropped call, that dropped call's data (e.g. the final scroll position, or the final value typed) is simply lost. For a scroll-position logger that's usually fine; for something like "save the final value after a burst of calls," it's a real bug.
:::

:::warning `this` is lost in `Throttling1`
`return (...arg) => { ... fn(...arg) ... }` is an arrow function that calls `fn(...arg)` directly, with no `.call`/`.apply`. If `fn` relies on `this` (e.g. it's a DOM event handler expecting `this === event.currentTarget`), that binding is silently dropped — `fn`'s `this` inside the callback will be whatever `this` was in the scope where `Throttling1` was defined, not the caller's. Compare this with `ThrottlingTrailling` below, which fixes it with `fn.apply(this, arg)`.
:::

## Trailing-call throttle (`ThrottlingTrailling`)

```js
function ThrottlingTrailling(fn, sec) {
  let lastran = false;
  let trailingArg = null;
  return function (...arg) {
    if (!lastran) {
      lastran = true;
      fn.apply(this, arg);
      setTimeout(() => {
        if (trailingArg) {
          fn.apply(this, trailingArg);
          trailingArg = null;
        }
        lastran = false;
      }, sec);
    } else {
      trailingArg = arg;
    }
  };
}
```

This fixes both problems above: the outer function is a regular `function` (so `this` is whatever the caller used, and `fn.apply(this, arg)` forwards it correctly), and every call that arrives during the throttle window overwrites `trailingArg` instead of being silently dropped — so once the window ends, the **most recent** set of arguments gets one final run.

```js
const throttled = ThrottlingTrailling((msg) => console.log(msg), 1000);
throttled('first');  // runs immediately: "first"
throttled('second'); // saved as trailingArg, not run yet
throttled('third');  // overwrites trailingArg — 'second' is discarded, 'third' is kept
// 1000ms later: "third" runs — the trailing call uses the *latest* arguments, not the first dropped ones
```

:::note Back-to-back execution at cycle boundaries
Because the trailing call and the next cycle's leading call are two independent `setTimeout`/flag mechanisms, if a new call lands right as the trailing timeout fires, you can get the trailing call from the previous window and the leading call of the next window executing in very quick succession — two real executions close together, rather than evenly spaced ones. This is expected behaviour for leading+trailing throttling (it's also how lodash's `throttle` behaves by default), but it's worth knowing it's not perfectly evenly spaced in every scenario.
:::

## Lodash-style throttle with `leading`/`trailing` options

A more general version accepts options for whether to fire on the leading edge, the trailing edge, or both, and computes exactly how much time remains in the current window:

```js
function throttle(fn, delay, { leading = true, trailing = true } = {}) {
  let lastCallTime = 0;
  let timer = null;
  let lastArgs, lastThis;

  return function (...args) {
    const now = Date.now();
    if (!lastCallTime && leading === false) {
      lastCallTime = now; // pretend the window already started, so the first call is delayed
    }
    const remaining = delay - (now - lastCallTime);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > delay) {
      // either the window has fully elapsed, or this is the very first call ever
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCallTime = now;
      fn.apply(lastThis, lastArgs);
    } else if (trailing && !timer) {
      timer = setTimeout(() => {
        lastCallTime = leading === false ? 0 : Date.now();
        timer = null;
        fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  };
}
```

```js
const throttled = throttle(() => console.log('tick'), 1000, { leading: false, trailing: true });
// with leading:false, the very first call doesn't run immediately — it's scheduled for `delay` ms later
```

`remaining = delay - (now - lastCallTime)` is the number of milliseconds left in the current throttle window:

- `remaining <= 0` means the window has fully elapsed — run immediately and start a fresh window. This branch is also what actually fires on the very first call: with `lastCallTime` still `0`, `remaining` works out to `delay - now`, and since `now` (a real `Date.now()` timestamp) is astronomically larger than any reasonable `delay`, `remaining` is deeply negative — well under `0`, not over `delay`.
- `remaining > delay` is a defensive guard for a different situation: the system clock being set *backwards* after `lastCallTime` was recorded. If `now` ends up earlier than `lastCallTime`, `now - lastCallTime` is negative, which pushes `remaining` above `delay` — a value it could never reach through normal forward-moving time. Treating that the same as "run immediately" stops the throttle from getting stuck waiting out a window that, from the clock's new perspective, already looks like it's in the future.
- Otherwise, there's still time left in the window: if `trailing` is enabled and no trailing timer is already scheduled, schedule one for exactly the `remaining` time, so the trailing call lands precisely when the window ends — not a full `delay` after the *last* call, which would effectively reset the throttle.

`{ leading = false }` is handled by seeding `lastCallTime = now` on the very first call *before* computing `remaining`, which makes the first call land inside the "still time left" branch instead of the "run immediately" branch — deferring it to the trailing edge, exactly as lodash does.

## Jest fake-timer tests and edge cases

The accompanying test suite uses `jest.useFakeTimers()` / `jest.advanceTimersByTime(...)` to assert on throttle behaviour without real delays:

| Scenario | Expected result |
| --- | --- |
| First call | Runs immediately |
| Calls within the window | Ignored (`Throttling1`) / saved and replayed once (`ThrottlingTrailling`) |
| Call right after the window expires | Runs, with its own new window starting |
| Multiple back-to-back windows | Each window independently allows exactly one leading call |
| `delay = 0` | Still runs on the first call (a zero-length throttle window never blocks anything) |
| Very long delay (e.g. `10000`) | A call 1ms before the window ends is still dropped; 1ms later (right at the boundary) it runs |
| Throttled function throws | The error propagates out of the throttled call — it is **not** swallowed, and the throttle's internal flag still updates correctly |

## Use cases

| Use case | Why throttle fits |
| --- | --- |
| Scroll position / infinite-scroll trigger | You want regular updates during continuous scrolling, not a single update after it stops |
| Window resize — live preview | Recalculate on a steady cadence while the user drags, rather than only once at the very end |
| Rate-limiting outgoing API calls | Cap requests to, say, one per 500ms, regardless of how fast the caller tries to fire them |
| Game loop / animation tick bounding | Ensure expensive per-frame work never runs more often than a target frame interval |

## Key takeaways

- A leading-edge-only throttle (`Throttling1`, the timestamp version) drops every call made during the window with no trace — fine for "sample the latest state periodically," wrong for "never lose the final value."
- Forward `this` explicitly with `.apply(this, args)` (or keep the outer wrapper a regular `function`, not an arrow function) whenever the throttled function depends on its caller's `this`.
- A trailing-call throttle always re-schedules the trailing timeout for the *remaining* time in the current window, not a fresh full `delay` — otherwise back-to-back calls would keep pushing the trailing execution further and further away, degrading into a debounce.
- `{ leading: false }` is implemented by pretending the window already started on the very first call, so that call falls into the "schedule a trailing timer" branch instead of running immediately.

## Interview questions

1. What's the core behavioural difference between throttling and debouncing?
2. Why does `Throttling1`'s returned wrapper need to be careful about `this`, and how does `ThrottlingTrailling` fix it?
3. In the lodash-style `throttle`, what does the `remaining > delay` branch actually detect, and why is that condition correct?
4. Why does the trailing timeout get scheduled for `remaining` milliseconds rather than the full `delay`?
5. Give a real use case where losing the "final" call during a throttle window (as `Throttling1` does) would actually be a problem.

See also: [Debouncing](./debounce.md) for the complementary technique and the full debounce-vs-throttle comparison table, and [Scroll Events](../09-dom-and-events/scroll-events.md) for the DOM events throttling is most commonly applied to.
