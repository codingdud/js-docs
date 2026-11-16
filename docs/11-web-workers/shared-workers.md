---
title: Shared Workers
sidebar_position: 2
---

A [dedicated worker](./dedicated-workers.md) belongs to a single page. A **shared worker** belongs to the **origin** — every tab, window, or iframe that opens the same shared worker URL connects to the *same* running worker instance, as long as they're same-origin. That makes shared workers a good fit for anything that should exist exactly once per origin, no matter how many tabs are open.

## Creating a shared worker

```js
// main.js (runs in every tab)
const worker = new SharedWorker("./share-worker.js");
worker.port.start();

const uid = `id_${Math.random().toString(36).slice(2, 8)}`;
worker.port.postMessage(`hello from tab ${uid}`);

worker.port.onmessage = (e) => {
  console.log(e.data);
};
```

```js
// share-worker.js (runs once, shared by every connected tab)
const connections = [];

onconnect = function (event) {
  const port = event.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    connections.forEach((p) => {
      p.postMessage(e.data);
    });
  };
};
```

A couple of details worth calling out:

- `Math.random().toString(36)` produces a string like `"0.4f3k9d2a1"` — a leading `"0."` followed by base-36 digits. `.slice(2, 8)` skips the `"0."` and takes six random characters, giving a short id. (Using a radix other than 36, like 14, is technically legal — `toString()` accepts any radix from 2 to 36 — but it's an unusual choice; base 36 is the conventional one for compact random ids because it packs the most information per character using only digits and lowercase letters.)
- `connections` must be declared with `const`/`let`. Leaving the declaration off creates an accidental global, which happens to still work here but is fragile and will throw outright in strict mode.

Every connecting tab gets its own `MessagePort` into the one running worker. The worker in this example keeps an array of every port it has ever seen and, whenever *any* tab sends a message, **broadcasts** it to *all* of them — including the sender. That broadcast-to-everyone pattern is exactly how a shared worker can keep multiple tabs in sync.

## `onconnect` and `e.ports[0]`

A shared worker fires a single global `connect` event each time a new tab (or window, or iframe) opens it. The event's `ports` array always has exactly one entry for a shared worker — the port that belongs to that particular connection:

```js
onconnect = (event) => {
  const port = event.ports[0]; // this connection's private channel
  // ... save it, listen on it, broadcast through it
};
```

Each tab only ever sees its own port. Broadcasting to "everyone" is something *your* code has to implement, by keeping a list of every port that has connected (as the example above does) and posting to each one.

## `port.start()` is required — but only sometimes

Communication with a shared worker goes through a `MessagePort`, and a port **will not deliver any queued messages until it is started**. There are two ways to attach a listener, and only one of them starts the port for you:

```js
const worker = new SharedWorker("./share-worker.js");

// Setting .onmessage implicitly starts the port — no explicit start() needed.
worker.port.onmessage = (e) => console.log(e.data);
```

```js
const worker = new SharedWorker("./share-worker.js");

// addEventListener does NOT implicitly start the port.
// Without the explicit start() call below, this handler never fires —
// messages just sit queued on the port forever.
worker.port.addEventListener("message", (e) => console.log(e.data));
worker.port.start(); // required here
```

:::warning Silent, not an error
Forgetting `port.start()` when using `addEventListener` doesn't throw anything — it just looks like the worker never responds. This is one of the more common "shared worker is broken" bugs, and it's invisible unless you know to look for it.
:::

Because of this inconsistency, many codebases call `port.start()` unconditionally right after construction (as the corrected example at the top of this page does), regardless of whether they end up using `onmessage` or `addEventListener` — it's a no-op if the port is already started, and it removes the ambiguity.

## Dead ports and the leak they cause

Nothing in the example above ever removes a port from `connections`. When a tab is closed or navigates away, its `MessagePort` doesn't get cleaned up on the worker's side automatically — there's no reliable, universally-supported "this tab disconnected" event fired into the shared worker. The array just keeps growing:

- Posting to a dead port is harmless in the sense that it won't throw, but it's wasted work, and the array holding onto those ports keeps them (and whatever they close over) alive longer than necessary.
- Over a long-lived session with many tabs opened and closed, this is a slow memory leak inside the shared worker's lifetime.

The common workaround is to have each tab explicitly tell the worker it's going away:

```js
// main.js
window.addEventListener("pagehide", () => {
  worker.port.postMessage({ type: "disconnect", uid });
});
```

```js
// share-worker.js
port.onmessage = (e) => {
  if (e.data.type === "disconnect") {
    const index = connections.indexOf(port);
    if (index !== -1) connections.splice(index, 1);
    return;
  }
  connections.forEach((p) => p.postMessage(e.data));
};
```

This isn't bulletproof (a crashed tab or a killed process never gets to fire `pagehide`), but it closes the common case of tabs being closed normally.

## Debugging a shared worker

A shared worker isn't owned by any one tab, so `console.log` calls inside `share-worker.js` **do not show up in a regular tab's DevTools console**. To see them (and to set breakpoints, inspect the worker's own call stack, etc.), open the browser's dedicated worker inspector:

- Chrome/Edge: `chrome://inspect/#workers`
- Firefox: `about:debugging#workers`

## Browser support

Shared workers are supported in Chrome, Edge, and Firefox. Safari's support has historically been inconsistent — notably absent or limited on iOS Safari for a long time. If shared-worker behavior is central to a feature, feature-detect (`"SharedWorker" in window`) and have a fallback (e.g., degrade to a dedicated worker per tab, or coordinate through `localStorage` events / `BroadcastChannel` instead).

## Use cases

- **One shared WebSocket connection** instead of opening a redundant socket per tab — all tabs relay through the shared worker, cutting down on connection count and server load.
- **Multi-tab sync** — broadcasting login/logout, cart changes, or other state so every open tab of the app stays consistent without each tab polling a server independently.

:::tip SharedWorker vs. BroadcastChannel
If all you need is "notify every other tab of this origin that something happened," `BroadcastChannel` is often simpler than a shared worker — no separate script file, no port plumbing. Reach for a shared worker when you need actual background *computation* or a genuinely shared resource (like one socket), not just cross-tab messaging.
:::

## Key takeaways

- A shared worker is one instance per origin, shared by every tab that connects to it; each tab gets its own `MessagePort`.
- `port.onmessage = fn` auto-starts the port; `port.addEventListener("message", fn)` does not — call `port.start()` explicitly in that case.
- Nothing removes dead ports automatically; without manual cleanup on tab close, the worker accumulates stale ports over time.
- Debug shared workers through the browser's dedicated worker inspector, not a regular tab console.
- Browser support (especially Safari/iOS) is less consistent than for dedicated workers — feature-detect before relying on them.

## Interview questions

1. **How is a shared worker different from a dedicated worker?** A dedicated worker belongs to one page; a shared worker is one instance shared by every same-origin tab/window that connects to it, each through its own `MessagePort`.
2. **Why might `worker.port.addEventListener("message", fn)` silently never fire?** Because, unlike setting `.onmessage`, `addEventListener` doesn't implicitly start the port — `port.start()` must be called explicitly.
3. **How does a shared worker broadcast to every connected tab?** It has to track every port itself (e.g., push each one into an array inside its `onconnect` handler) and iterate that list, calling `postMessage` on each port.
4. **What's the "dead port" problem?** Tabs can close without the shared worker being notified, so ports for closed tabs stay in whatever list the worker keeps, accumulating over time unless the app explicitly signals disconnection (e.g., on `pagehide`).
5. **How do you see `console.log` output from inside a shared worker?** Through the browser's dedicated worker inspector (`chrome://inspect/#workers` in Chrome/Edge, `about:debugging#workers` in Firefox) — not the console of any single tab.
6. **When would you choose `BroadcastChannel` over a `SharedWorker`?** When you only need to notify other tabs of an event, with no need for a shared background computation or resource — `BroadcastChannel` is lighter weight for pure messaging.
