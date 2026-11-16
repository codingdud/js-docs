---
title: Event Handling Fundamentals
sidebar_position: 3
---

Everything interactive in the browser — a click, a keystroke, a scroll, the page itself finishing loading — arrives as an **event**. This page covers the core `addEventListener` API, the event types you'll use constantly, the shape of the `Event` object itself, and a worked example (a small "Revice" practice page) that exercises most of it together.

## `addEventListener` and a small helper

```js
target.addEventListener(type, listener, options);
```

- `target` — any DOM node, or `window`/`document`.
- `type` — a string like `"click"`, `"input"`, `"scroll"`.
- `listener` — a function (or an object with a `handleEvent` method) called with the `Event` object.
- `options` — a boolean (`true` = capture phase, covered in [Bubbling, Capturing and `stopPropagation`](./event-propagation.md)) or an options object (`{ capture, once, passive, signal }`).

Repeated code across these notes wraps that call in a tiny helper (spelled `handelEvent`/`handelevent` in the source — read it as "handle event"):

```js
function handelEvent(type, selector, handler, capture = false) {
  document.querySelector(selector).addEventListener(type, handler, capture);
}

handelEvent("click", "#btn", (e) => console.log("clicked"));
```

This is a convenience wrapper, nothing more — it still ends up calling the real `addEventListener`. One sharp edge to know: because it re-runs `document.querySelector(selector)` every time it's called, calling `handelEvent` for the *same* selector multiple times attaches multiple independent listeners to the same element (it does not replace a previous one).

## Common event types

```js
// click — fires on a full press+release on an element
btn.addEventListener("click", (e) => console.log(e.target));

// input — fires on every keystroke / value change (more granular than "change")
input.addEventListener("input", (e) => console.log(e.target.value));

// scroll — fires repeatedly while a scrollable element (or the window) scrolls
let count = 0;
box.addEventListener("scroll", () => console.log(count++));

// keydown — fires for every key press, repeats while held
document.addEventListener("keydown", (e) => console.log("key press:", e.key));

// DOMContentLoaded — fires once, when the HTML has been fully parsed
// (does NOT wait for images/stylesheets/subframes — compare with `window.onload`)
document.addEventListener("DOMContentLoaded", () => {
  console.log("completed dom construction");
});
```

:::tip `input` vs `change`
`input` fires on every value change (every keystroke, every character). `change` fires once, when the field loses focus (or, for `<select>`/checkboxes, when the value actually commits). Use `input` for live validation/mirrors; use `change` when you only care about the final, committed value.
:::

## The `Event` object

Every handler receives an `Event` (or a more specific subtype — `MouseEvent`, `KeyboardEvent`, `InputEvent`, ...) describing what happened:

```js
element.addEventListener("click", (event) => {
  console.log(event.target);        // the element that was actually interacted with
  console.log(event.currentTarget); // the element THIS listener is attached to
  console.log(event.type);          // "click"
  console.log(event.eventPhase);    // 1 = CAPTURING_PHASE, 2 = AT_TARGET, 3 = BUBBLING_PHASE
  console.log(event.bubbles);       // does this event type bubble at all? (click: true)
  console.log(event.cancelable);    // can preventDefault() actually stop the default action?
  console.log(event.clientX, event.clientY); // mouse position relative to the viewport
});
```

### `target` vs `currentTarget`

This distinction matters the moment a listener lives on an *ancestor* of the element that was clicked (which is exactly what [event delegation](./event-delegation.md) relies on):

```js
// <ul id="list">
//   <li data-id="1">Item 1</li>
//   <li data-id="2">Item 2</li>
// </ul>
handelEvent("click", "#list", (e) => {
  console.log(e.target.innerHTML);     // the <li> the user actually clicked
  console.log(e.currentTarget.id);     // always "list" — where the listener lives
});
```

| | Meaning |
|---|---|
| `event.target` | The deepest element where the event actually occurred — changes per click. |
| `event.currentTarget` | The element whose listener is currently running — fixed, the same every time for a given listener. |

## Worked example: the "Revice" counter and live mirror

A small practice page exercises `click`, `input`, `dataset`, `focus()` and a programmatic `click()` together:

```js
const counterBtn = document.getElementById("counterBtn");
const counterOutput = document.getElementById("counterOutput");
let clickCount = 0;

counterBtn.addEventListener("click", () => {
  clickCount += 1;
  counterOutput.textContent = `Button clicked ${clickCount} times.`;
});
```

```js
const liveInput = document.getElementById("liveInput");
const liveOutput = document.getElementById("liveOutput");

liveInput.addEventListener("input", (event) => {
  const value = event.target.value.trim();
  liveOutput.textContent = value ? `Mirror: ${value}` : "Mirror: nothing typed yet.";
});
```

Card creation combines `createElement`, `dataset`, and `.focus()` for a nice UX touch (move the cursor back to the input after submitting):

```js
let cardIndex = 0;

function createCard(title) {
  cardIndex += 1;
  const card = document.createElement("article");
  card.className = "topic-card";
  card.dataset.cardId = String(cardIndex); // sets the data-card-id="<n>" attribute
  card.textContent = title || `DOM Topic ${cardIndex}`;
  cardBoard.append(card);
}

createCardBtn.addEventListener("click", () => {
  createCard(cardTitle.value.trim());
  cardTitle.value = "";
  cardTitle.focus(); // return keyboard focus to the input for the next entry
});
```

And a **programmatic click** — calling `.click()` on an element fires it exactly as if a user had clicked it, including triggering its own `click` listener:

```js
loadProfileBtn.addEventListener("click", () => {
  const savedProfile = localStorage.getItem(STORAGE_KEY);
  renderProfile(savedProfile ? JSON.parse(savedProfile) : null);
});

// ...later, on initial page load:
loadProfileBtn.click(); // triggers the listener above immediately, so the saved
                         // profile (if any) renders without the user lifting a finger
```

`element.dataset` is the ergonomic, camelCase view onto `data-*` attributes: `card.dataset.cardId` reads/writes the `data-card-id` attribute, converting between `cardId` (JS) and `card-id` (HTML) automatically.

## Key takeaways

- `addEventListener(type, listener, options)` is the one API you need; the third argument can be a capture boolean or an options object.
- `event.target` is "what was clicked"; `event.currentTarget` is "whose listener is this" — they're only guaranteed equal when the listener is on the element itself, not an ancestor.
- `input` is per-keystroke; `change` is per-commit. `DOMContentLoaded` fires once the HTML is parsed, independent of images/stylesheets still loading.
- `.dataset` is the clean way to read/write `data-*` attributes; `.focus()` and `.click()` let your code drive the UI exactly the way a user would.
- Calling the same selector-based helper repeatedly attaches *additional* listeners — it does not replace the previous one.

## Interview questions

1. **What's the difference between `event.target` and `event.currentTarget`?** `target` is the element that originated the event (deepest element under the pointer/focus); `currentTarget` is the element the currently-running listener is attached to.
2. **What does `event.eventPhase` tell you, and what are its three values?** Which phase of dispatch is in progress: `1` (capturing), `2` (at target), `3` (bubbling). See [Bubbling, Capturing and `stopPropagation`](./event-propagation.md) for the full picture.
3. **`input` vs `change` — when would each fire for a text field?** `input` fires on every keystroke; `change` fires once the field loses focus with a changed value.
4. **Does `DOMContentLoaded` wait for images to load?** No — it fires once HTML parsing (and synchronous script execution) finishes; `window.onload`/`load` is the one that waits for images, stylesheets and subframes too.
5. **What does calling `element.click()` from JavaScript do?** Dispatches a real, trusted-feeling click event at that element, running any `click` listeners exactly as a real mouse click would (though `event.isTrusted` will be `false` for script-dispatched events).
