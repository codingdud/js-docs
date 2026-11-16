---
title: Dedicated Workers
sidebar_position: 1
---

JavaScript on the main thread does one thing at a time. A single expensive loop — resizing an image, parsing a huge JSON payload, running an encryption routine — blocks everything else: clicks, scrolls, paint. **Web Workers** let you run JavaScript on a real background thread, separate from the main thread, so the UI stays responsive while the heavy work happens elsewhere.

This page covers **dedicated workers**, the simplest of the three worker types. The next two pages cover shared workers and service workers.

## The three worker types

The browser gives you three flavors of background thread. They share the same underlying idea (a separate JS environment, no DOM, communication through message passing) but differ in scope and purpose.

| Worker type | Created with | Belongs to | Communication | Typical use |
| --- | --- | --- | --- | --- |
| **Dedicated Worker** | `new Worker(url)` | A single script / single owning page | `worker.postMessage()` and `worker.onmessage` directly on the worker object | CPU-heavy work for one page: image processing, parsing, encryption, data transforms |
| **Shared Worker** | `new SharedWorker(url)` | All tabs/windows of the **same origin** that connect to it | A `MessagePort` per connection (`worker.port`); each tab has its own port into the same worker | Sharing one WebSocket across tabs, syncing state between tabs |
| **Service Worker** | `navigator.serviceWorker.register(url)` | An origin + scope, independent of any single page's lifetime | Lifecycle events (`install`, `activate`, `fetch`), `postMessage`/`MessageChannel` | Offline support, caching, push notifications, background sync |

All three run in their own global scope (not `window`), have **no access to the DOM**, and talk to the main thread only by exchanging messages — never by sharing memory directly (except for the explicit transfer mechanism described below).

:::tip Dedicated, Shared, or Service?
If you need background compute for *one* page, use a **dedicated worker** — it's the simplest option and the subject of this page. If several tabs of your app need to share one piece of background work, reach for a **shared worker**. If you need offline support, caching, or push notifications, you want a **service worker**.
:::

## Creating a dedicated worker

```js
// main.js
const worker = new Worker("./worker.js");

worker.postMessage(10);

worker.onmessage = (e) => {
  console.log(e.data); // 20
};
```

```js
// worker.js
onmessage = (e) => {
  const res = e.data * 2;
  postMessage(res);
};
```

`new Worker("./worker.js")` spins up a new JS environment running `worker.js` on its own thread. Inside a worker script, `self` is the global object (you can usually drop the `self.` prefix for `onmessage`/`postMessage`, exactly like `this` inside a regular function refers to the global object by default), and it exposes its own `postMessage`/`onmessage` pair for talking back to whichever script created it.

Communication is always **asynchronous and message-based**:

- The owning page calls `worker.postMessage(data)` to send data to the worker.
- The worker calls `postMessage(data)` (no receiver object needed — there's only one owner) to send data back.
- Each side listens with `onmessage` (a single handler) or `addEventListener("message", handler)` (any number of handlers).

## A corrected, realistic example

A common pattern is using one worker for more than one kind of job — say, processing an image *and* transforming rows for a table. Here is that idea written correctly (the original notes behind this chapter had several typos and one real bug worth calling out explicitly: `worker.onmessage = ...` was assigned **twice**, so the second assignment silently discarded the first handler and the image branch never ran again).

```js
// main.js
const worker = new Worker("./worker.js");

// addEventListener lets you register more than one listener; it also means
// this single handler can dispatch on a `type` field instead of being
// overwritten by later assignments.
worker.addEventListener("message", (event) => {
  const { type, payload } = event.data;

  if (type === "image") {
    const img = document.createElement("img");
    img.src = payload; // a data URL produced by the worker
    document.getElementById("gallery").appendChild(img);
  }

  if (type === "table") {
    const tbody = document.getElementById("table-body");
    payload.forEach((rowValue) => {
      const tr = document.createElement("tr");
      tr.textContent = rowValue;
      tbody.appendChild(tr);
    });
  }
});

worker.postMessage({ type: "image", payload: rawImageData });
worker.postMessage({ type: "table", payload: rawTableData });
```

```js
// worker.js
onmessage = (event) => {
  const { type, payload } = event.data;

  if (type === "image") {
    const processed = processImage(payload);
    postMessage({ type: "image", payload: processed });
  }

  if (type === "table") {
    const transformed = transformTable(payload);
    postMessage({ type: "table", payload: transformed });
  }
};
```

What changed from the sloppy original, and why it matters:

- `document.createElemet` → `document.createElement`, `getElementbyId` → `getElementById` — plain typos, but they're the kind that only surface at runtime as `TypeError: ... is not a function`.
- `transformdata.foreach(...)` → `transformdata.forEach(...)` — JavaScript's array method is `forEach`, lowercase `f`, capital `E`.
- The `tr` element was created *inside* the `forEach` callback but appended *outside* of it, referencing a variable that didn't exist in that scope. Each row now gets created and appended in the same iteration.
- `worker.onmessage = fn` assigned twice in the original — the second assignment replaced the first. Tagging every message with a `type` field and using a single listener (or `addEventListener` with multiple listeners) avoids that trap entirely.

:::warning `onmessage` is a single slot, `addEventListener` is not
`worker.onmessage = fn1; worker.onmessage = fn2;` leaves only `fn2` attached — `fn1` is gone. If you need more than one independent listener, use `worker.addEventListener("message", fn1)` / `addEventListener("message", fn2)`. If you only ever need one listener, either style works, just don't assign `onmessage` more than once.
:::

## How data travels: structured clone and transferables

By default, whatever you pass to `postMessage` is copied using the **structured clone algorithm**, not `JSON.stringify`/`JSON.parse`. That means it can clone far more than JSON can — `Date`, `Map`, `Set`, `RegExp`, typed arrays, `ArrayBuffer`, `Blob`, `File` — but it still **cannot** clone everything:

- Functions and closures can't be cloned (they're tied to a specific JS engine realm) — passing one throws a `DataCloneError`.
- DOM nodes can't be cloned — pass the data they represent instead, never the node itself.
- `Symbol` values are not cloneable.

Structured clone is a **deep copy**: for large objects, that copy itself costs time and memory, which can offset the benefit of moving work off the main thread.

For large binary data, use a **transferable object** instead of letting it be cloned. Transferables (`ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`) can be *moved* rather than copied — ownership transfers from sender to receiver with no copy at all:

```js
const buffer = new ArrayBuffer(1024 * 1024); // 1 MB

worker.postMessage(buffer, [buffer]); // second arg: the transfer list

console.log(buffer.byteLength); // 0 — the main thread no longer owns this buffer
```

After a transfer, the original reference is "neutered" in the sending context — reading from it gives you an empty buffer, which is the engine's way of guaranteeing only one side owns the memory at a time.

## No DOM, same origin, HTTP(S)

A dedicated worker:

- **Has no access to the DOM.** There is no `document`, no `window`. If a worker needs something to appear on screen, it computes the result and posts it back to the main thread, which does the actual DOM manipulation (as in the corrected example above).
- **Must be loaded from the same origin** as the page that creates it (for a classic, non-module worker loaded with a plain URL). Opening a page directly from the filesystem (a `file://` URL) often fails to start a worker at all, because there is no meaningful origin to compare against — serve your page over `http://localhost` or HTTPS during development.
- **Does have access to many other APIs**: `fetch`, `setTimeout`/`setInterval`, `IndexedDB`, `importScripts()` (classic workers), and typed arrays — just not `document`/`window` or `localStorage`/`sessionStorage` (those are tied to a specific window).

## Shutting a worker down

There are two ways to stop a dedicated worker, and they come from opposite sides:

- `worker.terminate()` — called from the **main thread**. It stops the worker immediately, with no chance for the worker to run cleanup code or finish in-flight work.
- `self.close()` — called from **inside the worker**. It lets the worker shut itself down gracefully after finishing whatever it was doing.

After either call, the worker is gone: further `postMessage` calls to it are simply ignored.

## Use cases

- **Image/video processing** — resizing, filters, format conversion.
- **Large data parsing/transformation** — turning a big CSV/JSON payload into UI-ready rows without freezing the page.
- **Encryption/hashing** — CPU-bound cryptographic work.
- **Simulations and heavy math** — physics, procedural generation, anything that would otherwise show up as dropped frames.

:::warning Workers are not free
Spinning up a worker has real overhead (new JS environment, new event loop) and cloning large payloads into/out of it costs time. For small, quick tasks the overhead of messaging can cost more than it saves — workers pay off when the task is genuinely heavy or long-running.
:::

See [the event loop chapter](../08-asynchronous-javascript/event-loop.md) for how the main thread's call stack, microtask queue, and macrotask queue relate to the async, event-driven style every worker also uses internally, and [shallow vs. deep copy](../04-objects/shallow-vs-deep-copy.md) for more on why structured clone's deep-copy behavior matters for performance.

## Key takeaways

- A dedicated worker belongs to exactly one page and talks to it through `postMessage`/`onmessage`.
- Data is **deep-copied** via structured clone by default; use **transferables** (`ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`) to move large binary data without copying it.
- Workers cannot touch the DOM; the main thread applies whatever UI change the worker's result implies.
- Worker scripts load same-origin over HTTP(S) — `file://` is unreliable.
- Stop a worker with `terminate()` (from outside) or `close()` (from inside).

## Interview questions

1. **What problem do Web Workers solve?** JavaScript's main thread is single-threaded; a long-running synchronous task blocks rendering and input handling. Workers move that work to a separate OS-level thread so the main thread stays responsive.
2. **How does data get passed into and out of a worker?** Through `postMessage`, which deep-copies the payload using the structured clone algorithm — not `JSON.stringify`.
3. **What can't structured clone handle?** Functions, DOM nodes, and `Symbol` values; attempting to pass them throws `DataCloneError`.
4. **What's a transferable object, and why use one?** An object (like `ArrayBuffer`) whose ownership can be *moved* into the worker instead of copied, avoiding the cost of cloning large binary data. Pass it as the second argument to `postMessage`.
5. **Can a worker touch the DOM?** No. Workers run in a separate global scope with no `document`/`window`. They compute and message results back; the main thread updates the UI.
6. **How do you stop a worker, and from where?** `worker.terminate()` from the main thread (immediate, no cleanup), or `self.close()` from inside the worker itself (graceful).
