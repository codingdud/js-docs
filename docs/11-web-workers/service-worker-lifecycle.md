---
title: Service Worker Basics and Lifecycle
sidebar_position: 3
---

A **service worker** is a special kind of worker that sits between your pages and the network. Once registered, it can intercept every network request your origin makes and decide whether to serve it from a cache, fetch it fresh, or do something more elaborate — which is what makes offline support, custom caching strategies, background sync, and push notifications possible.

It is still a worker in the same family as [dedicated](./dedicated-workers.md) and [shared](./shared-workers.md) workers: its own global scope, no DOM access, communication by message passing. What's different is *what it's for* — it isn't tied to a single page's lifetime, and it isn't just a helper doing CPU work; it acts as a **network proxy** for your whole origin (or a chosen scope within it).

:::note Correcting a common mislabel
A service worker script is sometimes informally labeled as something that can "access the DOM" because it runs alongside a page. That's not correct — like every worker type, a service worker has **no access to `document` or `window`** at all. It runs in its own global scope (`ServiceWorkerGlobalScope`) and can only affect what appears on screen indirectly, by controlling which network responses a page receives or by posting messages to pages it controls.
:::

## Registering a service worker

```js
// main.js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js")
    .then(() => console.log("Service worker registered"));
}
```

```js
// service-worker.js
self.addEventListener("install", (event) => {
  console.log("[SW] Installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated");
});

self.addEventListener("fetch", (event) => {
  console.log("[SW] Fetching:", event.request.url);
});
```

Feature-detecting with `"serviceWorker" in navigator` before registering is standard practice — the API doesn't exist in every environment, and failing silently (rather than throwing) keeps the rest of the page working.

## Requirements: HTTPS and scope

- **HTTPS is required**, with a single exception for development: `http://localhost` (and `127.0.0.1`) is allowed without TLS, specifically so you can develop without setting up certificates. Any other plain-HTTP origin cannot register a service worker at all.
- **Scope** determines which pages the service worker controls. By default the scope is the directory the SW file lives in and everything below it; you can request a different (but not broader) scope explicitly: `navigator.serviceWorker.register("/sw.js", { scope: "/app/" })` controls only pages under `/app/`. A service worker can never control a page outside the scope it was registered with.

## The lifecycle: states and events

| State | Meaning |
| --- | --- |
| `parsed` | The SW script has been fetched and parsed, but `install` hasn't run yet. |
| `installing` | The `install` event handler is running. |
| `installed` (a.k.a. *waiting*) | Install finished successfully. If an older SW is currently controlling pages, the new one waits here until those pages are gone. |
| `activating` | The `activate` event handler is running. |
| `activated` | The SW is in control and ready to intercept `fetch` events for the pages in its scope. |
| `redundant` | The SW was replaced, failed installation, or was unregistered — it's done. |

The flow, end to end:

1. **Registration** — `navigator.serviceWorker.register()` fetches the SW script and begins the process above.
2. **Install** — fires once, used almost universally to pre-cache the assets your app needs offline:

   ```js
   self.addEventListener("install", (event) => {
     event.waitUntil(
       caches.open("v1").then((cache) => cache.addAll(["/", "/app.js", "/styles.css"]))
     );
   });
   ```

   If install throws or its promise rejects, the service worker is discarded — it never activates.
3. **Activate** — fires once installation succeeds and no older service worker is still controlling a page (or immediately, if `skipWaiting()` was called). Used to clean up old caches:

   ```js
   self.addEventListener("activate", (event) => {
     event.waitUntil(
       caches.keys().then((cacheNames) =>
         Promise.all(
           cacheNames
             .filter((name) => name !== "v1") // drop every cache except the current version
             .map((name) => caches.delete(name))
         )
       )
     );
   });
   ```
4. **Fetch** — fires for every network request within the SW's scope, for as long as the SW is active. This is where a caching strategy lives:

   ```js
   self.addEventListener("fetch", (event) => {
     event.respondWith(
       caches.match(event.request).then((cached) => cached || fetch(event.request))
     );
   });
   ```

   `event.respondWith(promise)` tells the browser "I'll supply the response myself" — without calling it, the browser falls through to its normal network request.
5. **Idle → terminated** — a service worker with no pending work is just an idle thread costing memory, so the browser will terminate it after roughly **30 seconds of inactivity**. It is **not** gone for good: the next matching event (`fetch`, `push`, `message`, `sync`) spins it back up, and any state it held in ordinary variables is lost — which is exactly why persistent state belongs in `caches`/`IndexedDB`, not in module-level variables.

### `event.waitUntil()` — why it matters

Every one of the async operations above is wrapped in `event.waitUntil(promise)`. Without it, the SW lifecycle event is considered "finished" as soon as the handler function returns — even if a `fetch()` or `caches.open()` call it kicked off is still pending. The browser is then free to terminate the worker (or move on to the `activate`/`fetch` phase) before that async work completes. `waitUntil` tells the browser "keep me alive and keep this phase open until this promise settles."

### `skipWaiting()` and `clients.claim()`

These two calls solve two different halves of the same problem: getting a new version of your SW live faster, instead of waiting for every existing tab to close.

- **`self.skipWaiting()`** (called during `install`) — skips the normal "wait until no page is using the old SW" step and moves the new worker straight to activating. Without it, a new SW sits in the `installed`/waiting state until every tab using the old version has navigated away or closed.
- **`self.clients.claim()`** (called during `activate`) — makes the newly activated SW take control of pages that are *already open*, which would otherwise keep being served by whichever SW controlled them when they loaded, until their next navigation.

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
```

:::warning Using both together has a tradeoff
Forcing an immediate takeover means a page that's already running can suddenly start getting responses from a different SW version mid-session — fine for a cache-busting fix, risky if the new SW expects an incompatible app shell. Many production setups prefer to prompt the user ("update available — refresh?") instead of forcing it silently.
:::

## The update flow

When a page registers a service worker (or simply reloads, since the browser periodically re-checks), the browser fetches the SW script again and does a **byte-for-byte comparison** against the currently installed version.

- **Identical bytes** → nothing happens.
- **Different bytes** → a new service worker starts installing, in parallel with the currently active one. It reaches the `installed` (waiting) state and sits there — the old SW keeps controlling existing pages — until every page controlled by the old SW has been closed or navigated away from, at which point the new one activates and takes over. `skipWaiting()` is the way to bypass that wait, as above.

## `cache.addAll()` is all-or-nothing

```js
caches.open("v1").then((cache) =>
  cache.addAll(["/", "/index.html", "/main.js", "/offline.html"])
);
```

`addAll()` fetches every URL in the list and only commits them to the cache **if every single one succeeds**. If even one request 404s or fails for any reason, the whole `addAll()` call rejects, nothing from that call is cached, and — since this almost always runs inside `install`'s `event.waitUntil()` — the install itself fails and the service worker is discarded. This is intentional: a half-cached app shell (some assets present, some missing) is worse than no cache at all, so the API refuses to leave you in that state.

:::danger Double-check every URL in `addAll`
Because the failure is all-or-nothing, one typo'd or missing path in the list silently kills the entire install step — the SW never activates, and (depending on how your fallback logic works) you may not get an obvious error pointing at which URL was the problem. Verify every path actually resolves before shipping it in `addAll()`.
:::

## Real-world uses

- **Offline-capable editing** — apps like Google Docs cache the app shell and queue edits so the UI keeps working without a connection.
- **Caching feeds/timelines** — social apps cache the last-seen timeline so re-opening the app shows something instantly instead of a blank screen.
- **Offline queues** — media/PWA apps (e.g., offline menus, offline playback queues) keep working with no network and sync once it's back.
- **Push notifications and background sync** — covered in depth in [the next page](./service-worker-caching-strategies.md), which also builds out full caching strategies on top of everything introduced here.

See [fetch and error handling](../08-asynchronous-javascript/fetch-and-error-handling.md) for how `fetch()` behaves as a Promise-based API, which is exactly what a service worker's `fetch` handler is built around.

## Key takeaways

- Lifecycle order: `install` → (`waiting`) → `activate` → `fetch` (repeating) → idle → terminated → woken by the next event.
- `event.waitUntil(promise)` keeps a lifecycle phase open until async work finishes; skipping it risks the browser moving on (or killing the worker) before your caching work completes.
- `skipWaiting()` fast-forwards past the waiting state; `clients.claim()` makes the new SW take over pages that are already open. Neither is required, and forcing both has real tradeoffs for in-flight sessions.
- A service worker is terminated after roughly 30 seconds idle and restarted on the next event — don't rely on in-memory state surviving between events.
- `caches.addAll()` is atomic: one bad URL fails the whole call (and usually the whole install).
- Service workers require HTTPS (localhost excepted) and only control pages within their registered scope.
- Like every worker type, a service worker has no DOM access whatsoever.

## Interview questions

1. **What are the lifecycle stages of a service worker?** Register → Install (typically pre-caches assets) → (waiting, if an old SW is active) → Activate (typically cleans up old caches, can claim existing pages) → Fetch (intercepts requests, repeatedly, while active) → Idle → Terminate → woken again by the next matching event.
2. **What's the difference between `install` and `activate`?** `install` is where you pre-cache the assets a new version needs; `activate` is where you clean up caches from previous versions and optionally claim already-open pages. `install` runs once per new SW version; `activate` runs once that version takes over.
3. **How do you force a new service worker into control immediately instead of waiting for old tabs to close?** `self.skipWaiting()` in `install` to skip the waiting state, plus `self.clients.claim()` in `activate` to also take over pages that are already open.
4. **What's a simple offline caching strategy, in one line?** Cache-first: `caches.match(request).then(cached => cached || fetch(request))`.
5. **Why does `cache.addAll()` fail entirely if one URL 404s?** It's intentionally all-or-nothing — a partially cached app shell could leave the app in a worse, inconsistent state than having no cache, so any single failure rejects the whole call.
6. **Can a service worker read or modify the DOM?** No — like all workers, it has no access to `document`/`window`. It can only influence the page indirectly, through the responses it serves or messages it posts to pages it controls.
7. **Why would a service worker "wake up" after being idle?** Browsers terminate idle service workers (roughly 30s of inactivity) to save resources. The next `fetch`, `push`, `message`, or `sync` event restarts it — any in-memory state from before is gone, so persistent data belongs in `caches`/`IndexedDB`.
