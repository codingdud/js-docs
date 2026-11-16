---
title: "localStorage, sessionStorage, IndexedDB and Cookies"
sidebar_position: 2
---

# localStorage, sessionStorage, IndexedDB and Cookies

The browser gives JavaScript four main ways to keep data around on the client: **`localStorage`**, **`sessionStorage`**, **`IndexedDB`**, and **cookies**. They look similar (all are key-based, all live per-origin) but differ in lifetime, capacity, synchronicity and — for cookies — whether the server gets to see them automatically.

## Comparison table

| Feature | `localStorage` | `sessionStorage` | `IndexedDB` | Cookies |
| --- | --- | --- | --- | --- |
| Scope | Per origin | Per origin **and** per tab | Per origin | Per origin (+ path) |
| Lifetime | Persistent, until explicitly cleared | Until the tab/window is closed | Persistent, until explicitly cleared | Until `expires`/`max-age`, or session-only if omitted |
| Storage type | Key → string | Key → string | Object stores (structured, indexable) | Key → string |
| Data format | Strings only | Strings only | Objects, arrays, blobs, files (structured clone) | Strings only |
| API | Synchronous (blocking) | Synchronous (blocking) | Asynchronous (non-blocking) | Synchronous read via `document.cookie`; sent automatically over HTTP |
| Thread impact | Can block the main thread on large reads/writes | Can block the main thread | Does not block the UI thread | Negligible locally, but adds weight to **every** matching request |
| Capacity | ~5–10MB (browser-dependent) | ~5MB | Large, quota-based (hundreds of MB+) | ~4KB per cookie |
| Sent to server automatically? | No | No | No | **Yes**, on every matching request |
| Typical use case | Small persistent settings (theme, saved form, auth token for client-only use) | Temporary per-tab state (wizard step, draft) | Large/offline datasets, structured records | Session identifiers, auth tokens the server must read, CSRF tokens |

:::note Why localStorage/sessionStorage are "synchronous (blocking)"
`setItem`/`getItem` run on the main thread and return immediately with no callback, so there's nothing to "wait" for in the async sense — but because they're synchronous, a very large read/write still occupies the main thread for its duration, which is why IndexedDB (asynchronous, often backed by a separate thread internally) is preferred for sizeable data.
:::

## `localStorage` and `sessionStorage` basics

Both expose the same simple API; the only difference is lifetime and per-tab scoping.

```js
// localStorage persists after the tab is closed and reopened
localStorage.setItem("key", "value");
console.log(localStorage.getItem("key")); // "value"
localStorage.removeItem("key");
console.log(localStorage.getItem("key")); // null

// sessionStorage is wiped once the tab closes
sessionStorage.setItem("name", "Animesh");
console.log(sessionStorage.getItem("name")); // "Animesh"
```

- `setItem(key, value)` — writes a string. If `value` isn't already a string, it is coerced with `String(value)`.
- `getItem(key)` — returns the stored string, or `null` if the key doesn't exist.
- `removeItem(key)` — deletes one key. `clear()` deletes everything for that storage/origin.

### The `"[object Object]"` pitfall

`localStorage` and `sessionStorage` can only store **strings**. Passing an object directly silently stringifies it the unhelpful way:

```js
const profile = { username: "Animesh", favoriteTopic: "DOM" };

// ❌ wrong: object is coerced with its default toString(), not serialized
localStorage.setItem("profile", profile);
console.log(localStorage.getItem("profile")); // "[object Object]" — data is gone

// ✅ correct: serialize to JSON before storing
localStorage.setItem("profile", JSON.stringify(profile));
console.log(JSON.parse(localStorage.getItem("profile")));
// { username: "Animesh", favoriteTopic: "DOM" }
```

:::warning
`getItem` returns `null` when the key doesn't exist. Passing that straight into `JSON.parse` happens to "work" — `null` is coerced to the string `"null"` first, and `"null"` is valid JSON, so `JSON.parse(null)` evaluates to `null` rather than throwing. Relying on that coincidence is easy to misremember and obscures intent, so guard the key's existence explicitly instead:

```js
const raw = localStorage.getItem("profile");
const profile = raw ? JSON.parse(raw) : null;
```
:::

## Case study: a namespaced profile key

A small "Revice" profile widget saves a form to `localStorage`, reloads it, and clears it, using one dedicated key:

```js
const STORAGE_KEY = "revice-profile";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(profileForm);
  const profile = Object.fromEntries(formData.entries());

  if (!isValidEmail(profile.email)) {
    emailError.textContent = "Enter a valid email address before saving.";
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  renderProfile(profile);
  profileForm.reset();
});

loadProfileBtn.addEventListener("click", () => {
  const savedProfile = localStorage.getItem(STORAGE_KEY);
  renderProfile(savedProfile ? JSON.parse(savedProfile) : null);
});

clearProfileBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderProfile(null);
});
```

Two habits worth keeping from this example:

1. **Namespace the key.** `"revice-profile"` is unlikely to collide with any other script running on the same origin. A bare key like `"name"` or `"data"` is much more likely to be overwritten by unrelated code sharing the same origin (`localStorage` has no built-in isolation between scripts — everything on one origin shares the same storage).
2. **Always round-trip through `JSON.stringify`/`JSON.parse`.** The form data is an object (`Object.fromEntries(...)`), so it must be serialized before `setItem` and parsed back after `getItem`.

A simpler version of the same idea, from an earlier practice script, stores a single name directly (no object, so no `JSON.stringify` is needed — it's already a string):

```js
function setName() {
  const myName = prompt("Enter a name");
  localStorage.setItem("name", myName);
  myHeading.textContent = `Hello, ${myName}`;
}
```

This still has the namespacing problem above: `"name"` is a very generic key. Prefer something like `"app-username"`.

## IndexedDB, briefly

For data too large or too structured for `localStorage` (records, blobs, offline caches), the browser provides `IndexedDB` — a transactional, asynchronous, object-store–based database, built into the browser.

```js
const request = indexedDB.open("notes-db", 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  db.createObjectStore("notes", { keyPath: "id" });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  const tx = db.transaction("notes", "readwrite");
  tx.objectStore("notes").put({ id: 1, text: "Buy milk" });
};
```

Unlike `localStorage`, every operation is asynchronous (it returns a request object that fires `onsuccess`/`onerror`), so large reads/writes never block the UI thread.

## Cookies

Cookies are small key-value pairs that the browser stores **and automatically attaches to every matching HTTP request's headers** — unlike `localStorage`/`sessionStorage`/`IndexedDB`, which never leave the browser unless your JavaScript explicitly sends them.

```js
// Reading/writing cookies from JavaScript (only works for non-HttpOnly cookies)
document.cookie = "theme=dark; path=/; max-age=86400";
console.log(document.cookie); // "theme=dark" (plus any other readable cookies)
```

Key facts:

- Each cookie is capped at roughly **4KB**, and a browser also limits the number of cookies per domain. Because cookies ride along on every request to a matching domain/path, bloated cookies slow down **every** request, not just the page load.
- Cookies can be scoped by `domain`, `path`, and given an `expires` date or `max-age` (in seconds). With neither, a cookie is a **session cookie** — it disappears when the browser closes.

### Security attributes

| Attribute | What it does |
| --- | --- |
| `HttpOnly` | Hides the cookie from JavaScript entirely — `document.cookie` cannot read or write it. Set it from the server's `Set-Cookie` header. This is the main defense against an XSS attack stealing a session cookie. |
| `Secure` | The browser only sends the cookie over **HTTPS**, never over plain HTTP. |
| `SameSite` | Controls whether the cookie is sent on **cross-site** requests. `Strict` never sends it cross-site; `Lax` (the modern default in most browsers) sends it on top-level navigations but not on cross-site subrequests/forms; `None` sends it on all cross-site requests but *requires* `Secure`. This is the main defense against CSRF. |

```text
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/
```

:::warning
A cookie set without `HttpOnly` is readable by **any** JavaScript running on the page — including an attacker's script injected through an XSS hole (see the `innerHTML` warning in [DOM & Events](../09-dom-and-events/dom-basics.md)). Session and auth cookies should always be `HttpOnly; Secure; SameSite=Lax` (or `Strict`) at minimum.
:::

## Interview questions

**Why does `localStorage.setItem("profile", someObject)` store `"[object Object]"`?**
`setItem` only accepts strings. A non-string value is coerced with its default `toString()`, and a plain object's `toString()` produces the literal string `"[object Object]"`. Serialize with `JSON.stringify` first, and `JSON.parse` on the way out.

**`localStorage` vs `sessionStorage` vs cookies — when do you use which?**
`localStorage` for data the client needs across sessions but the server never needs to see. `sessionStorage` for short-lived, per-tab state. Cookies for anything the **server** must read on each request (session ids, CSRF tokens), since only cookies are attached to HTTP requests automatically.

**Why is IndexedDB asynchronous while `localStorage` is not?**
`localStorage`'s synchronous API is simple but can block the main thread on large operations. IndexedDB is designed for larger, structured datasets, so every operation is asynchronous (event-based) to avoid blocking the UI.

**How do you defend a cookie against XSS and CSRF?**
`HttpOnly` stops JavaScript (including injected attacker scripts) from reading it, defending against XSS-based theft. `SameSite=Strict`/`Lax` stops it from being sent on cross-site requests, defending against CSRF.

## Key takeaways

- `localStorage`/`sessionStorage` store strings only, synchronously, per origin (`sessionStorage` is also per-tab). `IndexedDB` stores structured data asynchronously, with a much larger quota.
- Cookies are the odd one out: capped at ~4KB and sent automatically with every matching HTTP request, which is exactly what makes them right for session identifiers and wrong for large or purely client-side data.
- Always `JSON.stringify` before `setItem` and `JSON.parse` after `getItem` for anything that isn't already a string.
- Namespace your storage keys (e.g. `"revice-profile"`) to avoid collisions with other scripts on the same origin.
- Secure session cookies with `HttpOnly`, `Secure`, and an appropriate `SameSite` value.
