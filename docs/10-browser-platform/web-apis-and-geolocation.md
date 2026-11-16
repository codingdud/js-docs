---
title: "Web APIs and Geolocation"
sidebar_position: 1
---

# Web APIs and Geolocation

JavaScript the *language* has no idea what a timer, a network request or a GPS sensor is. Those capabilities are **Web APIs**: features the **browser** provides and exposes to JavaScript through global objects such as `window`, `document` and `navigator`. The JavaScript engine (V8, SpiderMonkey, …) only runs your code and understands the language itself — everything asynchronous or system-level is handled by the browser around it.

This matters for the event loop: synchronous code runs on the **call stack**, but anything that takes time (a timer, a request, a sensor reading) is handed off to a Web API. When that Web API finishes its work, it queues a callback on a task queue, and the event loop moves that callback back onto the call stack once it is empty. See [Event Loop](../08-asynchronous-javascript/event-loop.md) for the full callback/microtask/macrotask story.

## What counts as a Web API

| Category | Examples | Where it's covered |
| --- | --- | --- |
| Timers | `setTimeout`, `setInterval` | [Event Loop](../08-asynchronous-javascript/event-loop.md) |
| DOM | `document`, `window`, `querySelector`, `createElement` | [DOM & Events](../09-dom-and-events/dom-basics.md) |
| Networking | `fetch`, `WebSocket` | [Fetch and Error Handling](../08-asynchronous-javascript/fetch-and-error-handling.md) |
| Storage | `localStorage`, `sessionStorage`, `IndexedDB`, cookies | [Web Storage and Cookies](./web-storage-and-cookies.md) |
| Concurrency | Dedicated / Shared / Service Workers | [Web Workers & Service Workers](../11-web-workers/dedicated-workers.md) |
| Device/location | `navigator.geolocation` | This page |

All of these live on `window` (directly, or through `document`/`navigator`), which is why they're sometimes grouped loosely under the **BOM** (Browser Object Model) — see [Critical Rendering Path, BOM and async vs defer](./rendering-and-script-loading.md).

:::note Web APIs are not a JavaScript feature
`fetch`, `localStorage`, `document`, and `navigator.geolocation` are not defined by the ECMAScript specification. Node.js has its own set of host APIs instead (`fs`, `http`, …), which is why browser-only code like `document.querySelector` throws a `ReferenceError` in plain Node.
:::

## The Geolocation API

`navigator.geolocation` lets a page ask the browser for the user's physical location (via GPS, Wi-Fi positioning, or IP-based lookup, depending on the device). It is asynchronous: the browser may need to prompt the user and wait for the hardware, so the result always arrives through a callback rather than a return value.

### `getCurrentPosition(success, error, options)`

```js
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log(position.coords.latitude);
    console.log(position.coords.longitude);
  },
  (error) => {
    console.log("Geolocation error:", error.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  }
);
```

`getCurrentPosition` takes up to three arguments:

1. **`success(position)`** — called once, with a `GeolocationPosition`. The coordinates live under `position.coords` (`latitude`, `longitude`, `accuracy`, and optionally `altitude`, `heading`, `speed`).
2. **`error(error)`** *(optional)* — called once if the location could not be resolved. `error.code` is one of `PERMISSION_DENIED`, `POSITION_UNAVAILABLE` or `TIMEOUT`, and `error.message` is a human-readable string.
3. **`options`** *(optional)* — `enableHighAccuracy`, `timeout` (ms) and `maximumAge` (ms, how old a cached position is acceptable).

:::warning Fixing a common mistake: the error callback must be the second *argument*, not nested inside the first
A frequent typo looks like this:

```js
// ❌ broken: the error callback is written as a second statement
// inside the success callback's body, joined by a comma operator.
// It never gets passed to getCurrentPosition as its own argument,
// so it is simply dead code that never runs.
navigator.geolocation.getCurrentPosition((position) => {
  console.log(position.coords.latitude);
  console.log(position.coords.longitude),
    (error) => {
      console.log("error");
    };
});
```

Here the comma after `position.coords.longitude` is JavaScript's [comma operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comma_Operator): it evaluates both expressions and returns the last one. The `(error) => {...}` arrow function is created and immediately discarded — it is never registered as a callback, and `getCurrentPosition` only ever received **one** argument (the success callback).

The fix is to pass the error callback as its **own**, second argument to `getCurrentPosition`, as shown in the first example above. Also note the correct method name is `getCurrentPosition`, not `getCurrentPosittion`.
:::

### Permissions and secure contexts

- The browser shows a **permission prompt** the first time a page calls `getCurrentPosition` (or `watchPosition`). If the user denies it, the error callback fires with `error.code === error.PERMISSION_DENIED`.
- Modern browsers only allow geolocation on a **secure context** (`https://` or `localhost`). Calling it from a plain `http://` page either fails immediately or is blocked outright.
- Always provide the error callback. Without it, a denied permission or a timeout fails silently and the page just never updates.

### `watchPosition` for continuous updates

```js
const watchId = navigator.geolocation.watchPosition(
  (position) => console.log(position.coords.latitude, position.coords.longitude),
  (error) => console.log(error.message)
);

// later, stop listening for updates
navigator.geolocation.clearWatch(watchId);
```

`watchPosition` keeps calling the success callback as the device moves; `getCurrentPosition` reports once and stops.

### Typical use cases

- **Ride-hailing apps** — pinpointing pickup location.
- **Food delivery** — confirming the delivery address or live courier tracking.
- **Location-based services** — "find a store near me", localized pricing or content.
- **Nearby search** — restaurants, ATMs, or other points of interest sorted by distance.

## Interview questions

**What is a Web API, and is it part of JavaScript?**
No. Web APIs (timers, DOM, `fetch`, storage, geolocation, workers, `WebSocket`, IndexedDB) are provided by the browser's runtime environment, not by the ECMAScript language. The JS engine only executes code; the browser supplies these extra globals and hands results back through callbacks via the event loop.

**Why is `getCurrentPosition` asynchronous?**
Because resolving a location may require a permission prompt and hardware/network lookups that take an unpredictable amount of time. A synchronous API would freeze the page while waiting.

**What happens if you omit the error callback?**
Permission denial, hardware failure or a timeout simply has nowhere to report, so the page appears to do nothing with no visible error. Always pass an error callback.

**Does geolocation work on a plain `http://` page?**
No — browsers require a secure context (`https://` or `localhost`) for the Geolocation API.

## Key takeaways

- Web APIs are browser features (timers, DOM, `fetch`, storage, workers, geolocation, IndexedDB, `WebSocket`), not part of the JavaScript language itself.
- `getCurrentPosition(success, error, options)` takes the error handler as its **second argument** — never nest it inside the success callback.
- Always handle the error case: permission can be denied, and geolocation requires a secure context.
- `watchPosition`/`clearWatch` track location continuously; `getCurrentPosition` reports once.
