---
title: "Critical Rendering Path, BOM and async vs defer"
sidebar_position: 3
---

# Critical Rendering Path, BOM and async vs defer

Before anything is interactive, the browser has to turn HTML, CSS and JavaScript into pixels on screen. This page covers that pipeline (the **Critical Rendering Path**), why some resources block it, how `<script>`, `defer` and `async` change the timing, the **BOM** objects the page can use once it's running, and the basics of garbage collection.

## The Critical Rendering Path (CRP)

The CRP is the sequence of steps the browser takes to convert HTML and CSS into pixels on the screen:

1. **Parse HTML → DOM.** The browser tokenizes the HTML and builds the DOM tree (see [DOM & Events](../09-dom-and-events/dom-basics.md) for the full bytes → tree pipeline).
2. **Parse CSS → CSSOM.** Every stylesheet (external, `<style>`, inline) is parsed into the CSS Object Model: a tree of computed style rules.
3. **Combine DOM + CSSOM → Render Tree.** Only the nodes that will actually be visible are included — elements with `display: none` are left out (`visibility: hidden` elements *are* included, since they still take up layout space).
4. **Layout (a.k.a. reflow).** The browser computes the exact size and position of every node in the render tree.
5. **Paint.** The browser fills in pixels for each node — text, colors, borders, shadows, images — onto one or more layers.
6. **Composite.** The painted layers are combined in the correct order (respecting `z-index`, transforms, etc.) and drawn to the screen, often using the GPU.

### Cost order: layout > paint > composite

```text
Layout   ❌ most expensive  — recalculates geometry for the node and everything affected by it
Paint    ⚠️ moderate        — redraws pixels, but geometry is already known
Composite ✅ cheapest        — just recombines already-painted layers (often GPU-accelerated)
```

Any change that affects an element's size or position (width, height, margin, font-size, adding/removing a node) forces **layout**, which cascades into paint and composite. A change that only affects appearance without moving anything (background-color, visibility) forces **paint** and **composite**, but skips layout. A change handled entirely by the compositor (`transform`, `opacity`) skips both layout *and* paint.

### Reflow vs repaint

| | Reflow (layout) | Repaint |
| --- | --- | --- |
| Triggered by | Changing geometry: `width`, `height`, `margin`, `padding`, `font-size`, adding/removing DOM nodes, reading layout properties like `offsetHeight` | Changing appearance without geometry: `background-color`, `color`, `visibility`, `box-shadow` |
| Cost | High — may recompute layout for the element, its siblings, and ancestors | Lower — geometry is unchanged, only pixels are redrawn |
| Triggers paint too? | Yes, reflow is always followed by paint (and composite) | N/A, repaint is the paint step itself |

:::tip Animate `transform` and `opacity`, not `top`/`left`/`width`
```css
/* ❌ triggers layout on every frame */
.box { transition: left 0.3s, width 0.3s; }

/* ✅ handled by the compositor — no layout, no paint */
.box { transition: transform 0.3s, opacity 0.3s; }
```
Animating `transform: translateX(...)` instead of `left`, or `opacity` instead of `visibility`/display toggles, lets the browser skip layout and paint entirely and run the animation on the compositor thread — which is why it stays smooth even if the main thread is busy.
:::

### CRP optimizations

- **Minify** HTML, CSS and JS to reduce download size.
- **Inline critical CSS** needed for the first paint, and load the rest asynchronously, so the browser doesn't wait on a full stylesheet download before rendering anything.
- **Defer non-critical JavaScript** (see `defer`/`async` below) so it doesn't block parsing.
- **Preload** key resources (`<link rel="preload">`) so the browser fetches them earlier than it would discover them naturally.
- Reduce the number of render-blocking requests and keep the DOM/CSSOM reasonably shallow — deep trees and complex selectors make layout and style recalculation slower.
- Prefer `transform`/`opacity` for animations, as above.

## Render-blocking CSS and parser-blocking JavaScript

**CSS is render-blocking.** The browser cannot be sure what the page should look like until it has the *entire* CSSOM — a rule at the bottom of a stylesheet can still override one near the top. So a `<link rel="stylesheet">` in `<head>` blocks the render tree (and thus the first paint) until that CSS finishes downloading and parsing, even though it doesn't block HTML *parsing* itself.

**A plain `<script>` is parser-blocking.** When the HTML parser reaches `<script src="app.js"></script>` with no `defer`/`async`, it must:

1. Stop parsing the rest of the HTML.
2. Download the script (if external).
3. Execute it immediately.
4. Only then resume parsing.

This happens because a script can call `document.write()` or otherwise query/mutate the DOM built so far, so the browser needs the DOM to be in a known, complete-up-to-this-point state before running it.

### Plain `<script>` vs `defer` vs `async`

| | Plain `<script src="...">` | `<script defer src="...">` | `<script async src="...">` |
| --- | --- | --- | --- |
| Blocks HTML parsing while downloading? | Yes | No — downloads in parallel with parsing | No — downloads in parallel with parsing |
| When does it execute? | Immediately, as soon as it's downloaded (parsing is paused for this) | After parsing finishes, just before `DOMContentLoaded` | As soon as it's downloaded, which **interrupts** parsing at whatever point it has reached |
| Execution order vs other scripts | In document order | In document order, relative to other `defer` scripts | Not guaranteed — whichever finishes downloading first runs first |
| Good for | Scripts with no dependencies that must run before `DOMContentLoaded`, or ones that intentionally use `document.write` | App code that needs the full DOM and a predictable order (most app scripts) | Independent scripts with no DOM dependency and no ordering needs (analytics, ads) |

```html
<!-- Blocks parsing until app.js downloads AND runs -->
<script src="app.js"></script>

<!-- Downloads in parallel, runs after parsing, in order -->
<script src="app.js" defer></script>

<!-- Downloads in parallel, runs as soon as ready, order not guaranteed -->
<script src="app.js" async></script>
```

:::note
Both `defer` and `async` only change *when a script executes relative to parsing*. Neither one changes how the script itself behaves once it starts running.
:::

## BOM: the Browser Object Model

The BOM is the set of objects the browser exposes beyond the document itself, letting JavaScript interact with the browser window and the device. `window` is the global object; everything else hangs off it (and can be referenced with or without the `window.` prefix).

| Object | What it represents |
| --- | --- |
| `window` | The browser tab/window itself — the global object. All the others are reachable through it. |
| `document` | The current page's DOM (technically part of the DOM, but reached via `window.document`). |
| `history` | The tab's session history — `history.back()`, `history.forward()`, `history.pushState()`. |
| `screen` | Information about the physical display — `screen.width`, `screen.height`, `screen.availHeight`. |
| `navigator` | Information about the browser and device — `navigator.userAgent`, `navigator.geolocation`, `navigator.onLine`. |
| `location` | The current URL — `location.href`, `location.pathname`, `location.reload()`. |

```js
console.log(window.navigator.userAgent); // browser/engine string
console.log(window.location.href);       // current page URL
window.history.back();                   // go to the previous page
console.log(window.screen.width);        // physical screen width in px
```

There is no single "BOM specification" the way there is a DOM standard — these objects are defined piecemeal across the HTML Standard and related specs, but together they're referred to as the BOM.

## Garbage collection basics

JavaScript manages memory automatically. The engine periodically looks for objects that are no longer **reachable** from any root (global scope, the current call stack, or closures still in use) and frees their memory. The dominant algorithm in modern engines is **mark-and-sweep**:

1. Starting from the roots, the engine marks every object it can reach.
2. Anything left unmarked is unreachable, and its memory is swept (freed).

This naturally handles circular references (`a.ref = b; b.ref = a;`) correctly, as long as nothing else reaches `a` or `b` — unlike a naive reference-counting approach, which would consider them reachable forever because they reference each other.

Common sources of memory leaks in JavaScript, because something keeps an otherwise-unused object reachable:

- **Forgotten globals** — an accidental global variable (e.g. assigning to an undeclared name in non-strict mode) lives for the lifetime of the page.
- **Detached DOM nodes** — removing a node from the document but keeping a JS reference to it (e.g. in an array or cache) keeps the whole node, and anything it holds, alive.
- **Forgotten timers/listeners** — a `setInterval` or `addEventListener` that's never cleared keeps its callback (and everything that callback closes over) reachable indefinitely.
- **Closures over large scopes** — a long-lived closure that captures a large object it no longer needs keeps that object alive for as long as the closure exists (see [Closures](../03-functions-and-scope/closures.md)).

## Interview questions

**What is the Critical Rendering Path?**
The sequence HTML/CSS → DOM/CSSOM → render tree → layout → paint → composite that the browser performs to display pixels. Minimizing work at each step, especially layout, is the core of rendering performance.

**Why is layout more expensive than paint, and paint more expensive than composite?**
Layout recomputes geometry and can cascade to siblings/ancestors. Paint redraws pixels once geometry is known. Composite just recombines already-painted layers, often on the GPU, with no recalculation of content.

**Why does changing `transform`/`opacity` animate more smoothly than changing `left`/`width`?**
`transform` and `opacity` can be handled entirely by the compositor, skipping layout and paint. `left`/`width` changes trigger layout on every frame.

**Difference between `defer` and `async`?**
Both download without blocking parsing. `defer` scripts run in document order, after parsing finishes and before `DOMContentLoaded`. `async` scripts run as soon as they're ready, in whatever order that happens to be, and can interrupt parsing to do so.

**Why is a plain `<script>` tag parser-blocking?**
Because the script might synchronously inspect or modify the DOM (even via `document.write`), the browser must pause parsing, fetch and run it immediately, and only then continue.

**How does JavaScript garbage collection work?**
Mark-and-sweep: starting from reachable roots, the engine marks everything still reachable and frees everything else. Leaks happen when something unintentionally keeps a reference alive — forgotten globals, detached DOM nodes, uncanceled timers/listeners, or closures over large data.

## Key takeaways

- CRP: DOM + CSSOM → render tree → layout → paint → composite, with layout the most expensive step and composite the cheapest.
- Prefer animating `transform`/`opacity` over geometry properties to stay on the compositor and skip layout/paint.
- CSS is render-blocking; a plain `<script>` is parser-blocking. Use `defer` for ordered app code and `async` for independent scripts.
- The BOM (`window`, `document`, `history`, `screen`, `navigator`, `location`) is how JavaScript talks to the browser itself, as opposed to the page content (the DOM).
- Garbage collection is mark-and-sweep based on reachability; leaks come from references you forgot to release.
