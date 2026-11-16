---
title: Scroll Events
sidebar_position: 7
---

Scroll handlers are some of the highest-frequency events in the browser — a single scroll gesture can fire dozens of `scroll` events per second. This page covers reading scroll position, the common UI patterns built on it, and why you almost always need to rate-limit the handler itself.

## Reading scroll position

```js
window.addEventListener("scroll", function () {
  const scrollTop = window.scrollY;                     // vertical scroll of the whole page
  const scrollTop2 = document.documentElement.scrollTop; // older, equivalent way to read it
  const scrollLeft = window.scrollX;                      // horizontal scroll of the whole page

  console.log("Vertical scroll:", scrollTop);
  console.log("Horizontal scroll:", scrollLeft);
});
```

For a scrollable *element* (not the whole page), the equivalent properties are `element.scrollTop`/`scrollLeft`.

## Page progress bar

```js
const progressBar = document.getElementById("progressBar");

window.addEventListener("scroll", function () {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight; // total scrollable distance
  const scrollPercent = (scrollTop / docHeight) * 100;
  progressBar.style.width = scrollPercent + "%";
});
```

`document.documentElement.scrollHeight - window.innerHeight` is the formula for "how far can the page actually scroll" — the full content height minus the height of the visible viewport. Dividing the current `scrollY` by that gives a 0–100 progress percentage.

### Element-level progress, with a divide-by-zero guard

The same formula applies to a scrollable *element*, but a short element whose content doesn't overflow has `scrollHeight === clientHeight`, making the denominator `0` — and `x / 0` in JavaScript is `Infinity` (or `NaN` if `x` is also `0`), not a thrown error, but still a value you don't want written into a CSS `width`. The Revice practice project guards against it explicitly:

```js
scrollBox.addEventListener("scroll", () => {
  const maxScroll = scrollBox.scrollHeight - scrollBox.clientHeight;
  const scrollPercent = maxScroll === 0 ? 0 : (scrollBox.scrollTop / maxScroll) * 100;
  scrollProgress.style.width = `${scrollPercent}%`;
});
```

:::tip
Any time you divide by a "distance remaining to scroll" value, check for zero first. It's an easy case to miss in testing, because it only shows up once content happens to be short enough to fit without scrolling.
:::

## Sticky nav, back-to-top, and direction detection

```js
// Add a "sticky" class once the user has scrolled past a threshold
const nav = document.getElementById("navbar");
window.addEventListener("scroll", function () {
  if (window.scrollY > 200) nav.classList.add("sticky");
  else nav.classList.remove("sticky");
});

// Show a "back to top" button only once scrolled far enough to need it
const backToTopBtn = document.getElementById("backToTop");
window.addEventListener("scroll", function () {
  backToTopBtn.style.display = window.scrollY > 500 ? "block" : "none";
});

// Detect scroll direction by comparing against the last known position
let lastScrollTop = 0;
window.addEventListener("scroll", function () {
  const scrollTop = window.scrollY;
  if (scrollTop > lastScrollTop) {
    nav.style.top = "-80px"; // scrolling down — hide the nav
  } else {
    nav.style.top = "0";     // scrolling up — reveal the nav
  }
  lastScrollTop = scrollTop; // must update every time, or direction detection breaks after one flip
});
```

:::warning Don't let a variable name drift between snippets
The source material's direction-detection example uses a bare `navbar` here instead of the `nav` constant declared above — if you copy these two snippets independently, that's a `ReferenceError: navbar is not defined` the moment the scroll fires, since nothing ever declared a `navbar` variable in scope. Whichever name you pick for the element reference, use that *same* name in every handler that touches it.
:::

## Smooth scrolling

```js
const scrollBtn = document.getElementById("scrollBtn");
scrollBtn.addEventListener("click", function () {
  document.getElementById("section2").scrollIntoView({ behavior: "smooth", block: "start" });
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

`scrollIntoView({ behavior: "smooth" })` is the modern, one-line way to animate scrolling to any element; `window.scrollTo({ top, behavior: "smooth" })` is the equivalent for an absolute position.

## Scroll only fires on *scrollable* elements

The `scroll` event only fires when the thing it's attached to actually has overflow to scroll. A demo box set up with `overflow: auto` and a tall inner child makes this concrete:

```html
<div id="box" style="overflow: auto; height: 100px; background-color: rgb(0,0,0)">
  <div style="height: 500px; background-color: rgb(49,60,60)"></div>
</div>
```

```js
const box = document.getElementById("box");
let count = 0;
box.addEventListener("scroll", () => console.log(count++)); // fires per scroll tick INSIDE box
```

If `overflow` were `visible` (the default) instead of `auto`/`scroll`, the inner 500px child would simply overflow `box` visually without ever producing a scrollbar, and this listener would never fire — nothing is actually "scrolling" in the DOM sense, the content is just overflowing. Attaching a scroll listener to a non-scrollable element isn't an error, it just silently never runs.

## Rate-limiting: throttle, debounce, `requestAnimationFrame`, and `IntersectionObserver`

A naive scroll listener runs its full body on every single `scroll` event — which, during an active scroll gesture, can be dozens of times per second. Four tools exist specifically to control that:

| Technique | What it does | Good for |
|---|---|---|
| **Throttle** | Runs at most once per fixed interval, ignoring extra calls in between | Direction detection, sticky-nav class toggling — anything that needs *regular* updates during the scroll |
| **Debounce** | Waits until calls *stop* for a fixed delay, then runs once | "Did the user finish scrolling?" style logic |
| **`requestAnimationFrame`** | Runs at most once per animation frame (~60fps), synced to the browser's paint cycle | Visual updates (progress bars, parallax) — avoids layout thrashing from running faster than the screen can paint |
| **`IntersectionObserver`** | Not scroll-driven at all — the browser tells you when an element enters/leaves the viewport | Lazy-loading images, infinite scroll triggers, "is this section visible" logic — avoids the scroll handler entirely |

### Debounced "Scroll stopped!"

```js
let scrollTimeout;
window.addEventListener("scroll", function () {
  clearTimeout(scrollTimeout);                    // cancel the previous pending call
  scrollTimeout = setTimeout(function () {
    console.log("Scroll stopped!");                 // runs 150ms after the LAST scroll event
  }, 150);
});
```

Because `clearTimeout` runs on every scroll event, the `console.log` only ever fires once the stream of scroll events actually stops for 150ms — exactly the "debounce" shape covered in [Updating Content, Styles, Classes and Attributes](./updating-content-styles-classes.md) (pair `clearTimeout` with `setTimeout`, on the same captured variable).

### `IntersectionObserver`, briefly

```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible"); // e.g. trigger a fade-in once visible
    }
  }
});
document.querySelectorAll(".lazy-section").forEach((el) => observer.observe(el));
```

`IntersectionObserver` is the right tool whenever the real question is "has this element become visible", rather than "where is the scroll position right now" — it's asynchronous, runs off the main thread's scroll handling, and needs no throttling at all.

## Key takeaways

- `window.scrollY`/`scrollX` for the page; `element.scrollTop`/`scrollLeft` for a scrollable element.
- Scroll progress = `currentScroll / maxScroll * 100`; always guard `maxScroll === 0` to avoid `Infinity`/`NaN`.
- `scroll` only fires on elements that actually overflow (`overflow: auto`/`scroll` with content taller than the box) — it silently never fires otherwise.
- Throttle for steady updates during the scroll, debounce for "scrolling has stopped," `requestAnimationFrame` for paint-synced visual updates, and `IntersectionObserver` when the real need is visibility detection rather than a position number.

## Interview questions

1. **Why is it almost always wrong to run expensive work directly inside a raw `scroll` listener?** `scroll` can fire dozens of times per second during a single gesture; unthrottled/undebounced work in the handler causes jank and can visibly lag the scroll itself.
2. **What's the difference between throttling and debouncing a scroll handler?** Throttling guarantees the handler runs at a steady maximum rate throughout the scroll; debouncing waits for the scroll to *stop* and runs the handler once, after the fact.
3. **How do you compute scroll progress as a percentage, and what edge case must you guard against?** `(scrollTop / (scrollHeight - clientHeight)) * 100`; guard the case where `scrollHeight === clientHeight` (nothing to scroll), which otherwise divides by zero.
4. **Why would a `scroll` listener on an element with `overflow: visible` never fire?** Because the element itself never scrolls — content that overflows a non-scrollable box is just rendered outside its bounds, with no scroll position to change.
5. **When would you reach for `IntersectionObserver` instead of a scroll listener?** Whenever the actual question is "has this element entered/left the viewport" rather than "what is the exact scroll offset" — it's more efficient and doesn't need manual throttling.
