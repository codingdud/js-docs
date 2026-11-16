---
title: Updating Content, Styles, Classes and Attributes
sidebar_position: 2
---

Once a node exists, most day-to-day DOM work is updating it: changing text, toggling visibility, adding classes, tweaking a style, reading an attribute. This page walks through those APIs using a small "box manager" project as the running example, including the real bugs it shipped with — because seeing *why* something breaks is more memorable than a clean rule.

## Hide, show, toggle

There are three independent ways to make an element disappear, and they are not interchangeable:

| Technique | Element still takes up layout space? | Reversible with CSS alone? |
|---|---|---|
| `element.style.display = "none"` | No — removed from layout entirely | Yes, set back to `"block"`/`"flex"`/etc. |
| `element.style.visibility = "hidden"` | **Yes** — space is reserved, just invisible | Yes, set back to `"visible"` |
| `element.classList.add("hidden")` with `.hidden { display: none; }` | Depends on the class's CSS | Yes, `classList.remove("hidden")` |

```js
const boxes = document.querySelectorAll(".box");

boxes.forEach((box) => { box.style.display = "none"; });   // gone, layout collapses
boxes.forEach((box) => { box.style.visibility = "hidden"; }); // invisible, space kept
boxes.forEach((box) => box.classList.add("hidden"));        // preferred: style stays in CSS

// Toggle
element.classList.toggle("hidden");
```

Prefer the `classList` + CSS-class approach over hand-writing `style.display` in JavaScript: the visual rule lives in one place (your stylesheet) and `classList.toggle` reads as intent ("toggle hidden-ness") rather than a specific CSS property value.

## `textContent` vs `innerHTML` vs `innerText`

| Property | Parses HTML? | Includes hidden text? | Triggers layout/reflow to read? | Safe with untrusted strings? |
|---|---|---|---|---|
| `textContent` | No — sets/returns raw text | Yes | No | **Yes** |
| `innerHTML` | **Yes** — sets/returns markup | Yes | No | **No** — see [DOM Basics](./dom-basics.md) |
| `innerText` | No | **No** — respects CSS visibility | **Yes** (forces a layout) | Yes |

```js
element.textContent = "New text";          // literal text, HTML-escaped automatically
element.innerHTML = "<strong>Bold</strong>"; // parsed as markup — <strong> renders bold
element.textContent += " more text";        // read-modify-write, still just text
```

Use `textContent` as the default. Reach for `innerHTML` only for small, trusted, static markup. Avoid `innerText` unless you specifically need "what the user would see if they selected this with a mouse" — it's slower because reading it forces the browser to compute layout.

## Styles: properties, `cssText`, and why string assignment is dangerous

```js
element.style.color = "red";
element.style.backgroundColor = "blue"; // camelCase for hyphenated CSS properties
element.style.fontSize = "20px";

element.style.cssText = `
  color: red;
  background-color: blue;
  font-size: 20px;
`;
```

`element.style` is a live `CSSStyleDeclaration` object, and it only has a getter — there is no real "setter" for `element.style` as a whole. Browsers special-case a *string* assignment to `.style` by routing it through `cssText`, which is where the next bug comes from.

### The box manager and its bugs

A small UI wires six buttons to a `#result` container full of `.box` divs:

```js
handelEvent("click", "#hidden", Throttling(hide, 4000));
handelEvent("click", "#visible", Throttling(show, 3000));
handelEvent("click", "#addone", Throttling(add, 100));
handelEvent("click", "#removeone", remove);
handelEvent("click", "#removeall", Debouncing(removeall, 1000));
handelEvent("click", "#reverse", reverse);

function hide(e) {
  result.style = "visibility:hidden"; // ⚠️ see below
}
function show(e) {
  result.style.visibility = "visible"; // fine — sets one property
}
function add(e) {
  const id = result.childElementCount + 1; // childElementCount ignores text nodes — correct
  const temp = document.createElement("div");
  temp.id = id;
  temp.innerText = id;
  temp.classList = "box"; // ⚠️ see below
  result.appendChild(temp);
}
function remove(e) {
  result.lastChild.remove(); // ⚠️ see below
}
function removeall(e) {
  result.innerHTML = "";
}
function reverse(e) {
  if (result.style.flexDirection === "row") {
    result.style.flexDirection = "row-reverse";
    result.style.flexWrap = "wrap-reverse";
  } else {
    result.style.flexDirection = "row";
    result.style.flexWrap = "wrap";
  }
}
```

:::danger Bug 1 — `result.style = "visibility:hidden"` overwrites every inline style
Assigning a *string* to `.style` replaces the element's entire `cssText`. After `hide()` runs once, any inline styling set earlier by `reverse()` (`flexDirection`, `flexWrap`) is gone, replaced by just `visibility:hidden`. Clicking "reverse" again after "hide" silently starts from a blank style instead of the state the user left it in. The fix is to never assign a string to `.style`; set the one property you mean:

```js
function hide(e) {
  result.style.visibility = "hidden"; // only touches `visibility`, leaves other inline styles intact
}
```
:::

:::warning Bug 2 — `temp.classList = "box"` does not add a class
`classList` is a read-only `DOMTokenList` — there is no setter, so this assignment is simply a no-op (silently ignored in non-strict scripts; a `TypeError` in strict mode/modules). The intended class never gets applied. The fix is either the `className` property or the `classList` API:

```js
temp.className = "box";       // works, but overwrites any existing classes
temp.classList.add("box");    // works, and is additive — preferred
```
:::

:::warning Bug 3 — `result.lastChild.remove()` can remove whitespace, not a box
As covered in [DOM Basics](./dom-basics.md), `.lastChild` includes text nodes. If the markup has a newline after the last `.box` element, the first click on "remove one" deletes that invisible whitespace node — nothing visibly changes, and users conclude the button is broken. Use `.lastElementChild`:

```js
function remove(e) {
  result.lastElementChild?.remove(); // skips whitespace/comment nodes
}
```
:::

### A broken debounce, for contrast

The same codebase's email-validation snippet defines a "debounce" like this:

```js
// ❌ broken — this is not a debounce
function Debounce(fn, sec) {
  let temp;
  return (...arg) => {
    clearInterval(temp);           // clears nothing useful — temp was never an interval id
    temp = setInterval(() => {     // setInterval fires repeatedly, forever
      fn(...arg);
    }, sec);
  };
}
emailInput.addEventListener("input", Debounce(cb, 4000));
```

A debounce should run `fn` **once**, a fixed delay after the *last* call, and cancel any pending call if a new one arrives first. Mixing `setInterval` with `clearInterval` does the opposite: once triggered, it calls `fn` over and over, every `sec` milliseconds, forever (nothing ever calls `clearInterval` again after the first set).

:::danger The box manager's own `Debouncing` is *also* broken — a missing assignment
It's tempting to assume the `setTimeout`/`clearTimeout` version used for "remove all" is the correct one, since it pairs the right two functions. But the actual source has a second, subtler bug:

```js
// ❌ as written in eventmanipulation/script.js — still not a real debounce
function Debouncing(fn, sec) {
  let timerf;
  return (...args) => {
    clearTimeout(timerf);          // timerf is always undefined — clears nothing
    setTimeout(() => { fn(...args); }, sec); // return value is never saved anywhere
  };
}
```

`timerf` is declared but **never assigned** the id that `setTimeout` returns, so `clearTimeout(timerf)` is forever clearing `undefined` (a harmless no-op) instead of the previous pending call. Every invocation schedules its own independent timer that nothing can cancel — if "remove all" is clicked three times inside the 1000ms window, `removeall` still runs three separate times, roughly `sec` ms after each click, instead of once. The fix is one missing assignment:

```js
// ✅ correct debounce — capture the timer id so the next call can cancel it
function Debouncing(fn, sec) {
  let timerf;
  return (...args) => {
    clearTimeout(timerf);                              // cancel the previously scheduled call, if any
    timerf = setTimeout(() => { fn(...args); }, sec);  // schedule exactly one new call, and remember its id
  };
}
```
:::

The rule of thumb: a working debounce needs **both** halves — `clearTimeout(timerVar)` paired with `timerVar = setTimeout(...)`, on the *same* variable captured in the closure. Dropping the assignment (as in the real `Debouncing`) or mixing timer kinds (`setInterval`/`clearTimeout`, as in the email validator's `Debounce`) are two different ways to end up with something that *looks* debounced but either never cancels or never fires once.

## `classList`, attributes and properties

```js
element.classList.add("highlight");
element.classList.remove("active");
element.classList.toggle("selected");
element.classList.contains("active");          // boolean
element.classList.replace("old-class", "new-class");
```

Attributes and properties often *look* the same but are not:

```js
element.setAttribute("data-id", "123");
element.getAttribute("data-id");                // "123" — always a string
element.removeAttribute("disabled");
element.hasAttribute("data-id");                // boolean

element.id = "newId";       // property — reflects to the id attribute
element.disabled = true;    // property — reflects to the disabled attribute (as a boolean)
```

The attribute API (`get/set/removeAttribute`) always deals in strings and reflects the markup. The property API gives you the type the browser decided is natural for that attribute (`disabled` as a real boolean, `value` as a live string that can diverge from the `value` *attribute* once the user types). For most standard HTML attributes they stay in sync; for custom `data-*` attributes, `dataset` (e.g. `element.dataset.id`) is the ergonomic property-style view onto `data-id`.

## The "add intractivity" examples — and their typos

A short practice note walks through making a static page interactive, but contains two real typos and one logic bug worth fixing explicitly, since all three fail in ways a beginner will actually hit.

```js
// ❌ as written — document.querySelectAll does not exist (should be querySelectorAll)
const itemArr = document.querySelectAll("li");
const toggle = (e) => {
  if (e.target.className) {
    e.target.className = "done";
  } else {
    e.target.className = "";
  }
  itemArr.forEach((item) => {
    item.addEventListener("click", toggle); // ❌ wiring is nested inside the handler itself
  });
};
```

:::warning Typo: `querySelectAll` / `querySelect`
The real methods are `querySelectorAll` and `querySelector`. The misspelled versions don't exist on `document` and throw `TypeError: document.querySelectAll is not a function` immediately.
:::

:::warning Inverted toggle logic
`if (e.target.className)` is true for **any** non-empty class name, not specifically for `"done"`. Starting from an item with no class at all (`className === ""`, falsy), the first click goes to the `else` branch and sets `className = ""` again — nothing visibly changes, so the very first click appears to do nothing. Once an item *does* have some class, every further click re-enters the `if` branch and keeps setting `"done"` — it can never toggle back off. A toggle needs to check for the specific class it manages, not "is there any class at all":

```js
const toggle = (e) => {
  e.target.classList.toggle("done"); // adds "done" if absent, removes it if present
};

document.querySelectorAll("li").forEach((item) => {
  item.addEventListener("click", toggle); // wired ONCE, outside any handler
});
```
:::

:::warning Listener wiring must run once, at setup time — not inside the handler
In the original snippet, `itemArr.forEach(...).addEventListener(...)` is written **inside** `toggle` itself. Since nothing outside `toggle` ever attaches the first listener, `toggle` can never run in the first place — there is nothing to click that would trigger it. Listener registration belongs at top-level script scope (or inside a setup function called once on load), never inside the handler it's attaching.
:::

## Live `HTMLCollection` vs static `NodeList`

```js
const child = result.children; // HTMLCollection — LIVE
console.log(child.length);     // reflects whatever is in #result *right now*, every time you read it

result.appendChild(document.createElement("div"));
console.log(child.length);     // already incremented — same `child` reference, no re-query needed
```

`element.children` (and `getElementsByClassName`/`getElementsByTagName`) return a **live** `HTMLCollection`: it is a view *into* the DOM, not a snapshot, so it updates automatically as elements are added or removed — even if you never re-call the method. By contrast, `document.querySelectorAll(...)` returns a **static** `NodeList`: a one-time snapshot that does not change even if the DOM does afterward.

:::tip Rule of thumb
If you need the current count after a DOM mutation, a live `HTMLCollection` is convenient (`result.children.length`). If you're about to iterate and possibly remove matched elements inside the loop, a static `NodeList` (from `querySelectorAll`) is safer, since it won't shift under you mid-iteration.
:::

## Key takeaways

- `display`, `visibility`, and a CSS class each hide an element differently — know which one your use case needs (removed from layout vs. invisible-but-reserved vs. CSS-driven).
- `textContent` is the safe default; `innerHTML` parses markup (and is an XSS risk with untrusted input); `innerText` is layout-aware and slower.
- Never assign a string to `.style` or `.classList` — both have no real setter semantics for that; use `style.cssText`/individual properties, and `classList.add/remove/toggle` or `className`.
- `.lastChild` can be a whitespace text node; `.lastElementChild` is usually what "last box" means.
- A correct debounce pairs `clearTimeout` with `setTimeout` on the same captured timer variable — mixing in `setInterval`/`clearInterval` produces a function that either fires forever or never cancels.
- `element.children` is a **live** `HTMLCollection`; `querySelectorAll(...)` is a **static** `NodeList`.
