---
title: "Bubbling, Capturing and stopPropagation"
sidebar_position: 4
---

A single click doesn't just happen at the element you clicked — it travels through the entire ancestor chain, in a well-defined order. Understanding that order is what makes [event delegation](./event-delegation.md) possible, and what makes `stopPropagation` dangerous if used carelessly.

## The three phases

```text
1. CAPTURING phase  (top → down):  window → document → html → body → ... → target's parent
2. TARGET phase:                    the event reaches the element it actually happened on
3. BUBBLING phase   (bottom → up):  target → ... → body → html → document → window
```

`addEventListener`'s third argument controls which phase a given listener runs in:

```js
element.addEventListener("click", handler);       // default: bubble phase (capture = false)
element.addEventListener("click", handler, true);  // capture phase
element.addEventListener("click", handler, { capture: true }); // same, options form
```

Most event types that make sense to bubble (`click`, `input`, `submit`, `keydown`, ...) do bubble by default; a few (notably `focus`/`blur`) do not — see the note on `focusin`/`focusout` in [Event Delegation](./event-delegation.md).

## Reading the order: bubble-only, capture-only, mixed

Given `<div id="parent"><div id="child"><button id="button">Click Me</button></div></div>`:

**All bubble-phase listeners (the default):**

```js
button.addEventListener("click", () => console.log("1. Button clicked"));
child.addEventListener("click", () => console.log("2. Child div clicked"));
parent.addEventListener("click", () => console.log("3. Parent div clicked"));

// Click the button → output:
// 1. Button clicked
// 2. Child div clicked
// 3. Parent div clicked
```

**All capture-phase listeners** (`true` as the third argument):

```js
button.addEventListener("click", () => console.log("1. Button clicked"), true);
child.addEventListener("click", () => console.log("2. Child div clicked"), true);
parent.addEventListener("click", () => console.log("3. Parent div clicked"), true);

// Click the button → output (top-down now):
// 3. Parent div clicked
// 2. Child div clicked
// 1. Button clicked
```

**Mixed — one capturing ancestor, bubbling descendants:**

```js
parent.addEventListener("click", () => console.log("1. Parent (capturing)"), true);
child.addEventListener("click", () => console.log("2. Child (bubbling)"));
button.addEventListener("click", () => console.log("3. Button (bubbling)"));

// Click the button → output:
// 1. Parent (capturing)   <- runs on the way DOWN, before the target is reached
// 3. Button (bubbling)    <- target phase
// 2. Child (bubbling)     <- runs on the way UP
```

A six-log grandparent/parent/child demo makes the full round trip (down, then target, then up) explicit:

```js
function registerPropagation(nodeId, label) {
  const node = document.getElementById(nodeId);
  node.addEventListener("click", () => log("capture", label), true);
  node.addEventListener("click", () => log("bubble", label)); // default: bubble
}

registerPropagation("outerBox", "outer box");
registerPropagation("middleBox", "middle box");
registerPropagation("innerBox", "inner box");

// Clicking the innermost box logs, in order:
// capture: outer box
// capture: middle box
// capture: inner box   <- target phase, capture listener
// bubble: inner box    <- target phase, bubble listener
// bubble: middle box
// bubble: outer box
```

:::note Target-phase ordering
At the moment the event reaches its target, the DOM spec runs listeners in the order they were *registered*, regardless of their capture flag — the element is simultaneously "finishing capture" and "starting to bubble", so both of its own listeners run back-to-back, in registration order, not capture-first. Only an element's *ancestors* (and descendants, for capturing listeners on the way down past them) care about capture-vs-bubble ordering; on the target itself, registration order wins. (Browser engines have not always agreed on this edge case historically, so don't be surprised if you see older blog posts claim capturing always runs first on the target too — verify against a current browser rather than relying on the exact version number of any past fix.)
:::

## `stopPropagation`, `stopImmediatePropagation`, `preventDefault`

These three are easy to conflate but solve different problems:

| Method | Stops propagation to other elements? | Stops other listeners *on the same element*? | Stops the browser's default action? |
|---|---|---|---|
| `event.stopPropagation()` | **Yes** — no ancestor (or descendant, depending on phase) listener runs | No — later listeners on the same element still run | No |
| `event.stopImmediatePropagation()` | **Yes** | **Yes** — including other listeners on the same node | No |
| `event.preventDefault()` | No | No | **Yes** — e.g. cancels form submission, link navigation, checkbox toggling |

```js
button.addEventListener("click", (event) => {
  console.log("Button clicked");
  event.stopPropagation(); // nothing above <button> on this path will see this click
});
child.addEventListener("click", () => console.log("This will NOT execute"));
parent.addEventListener("click", () => console.log("This will NOT execute either"));
```

```js
button.addEventListener("click", (event) => {
  console.log("First handler");
  event.stopImmediatePropagation(); // ALL further handlers are skipped, even on <button> itself
});
button.addEventListener("click", () => console.log("This will NOT execute")); // same element!
```

### Modal backdrop example

A classic use of `stopPropagation`: clicking the dark backdrop should close a modal, but clicking *inside* the modal's content (which sits on top of, and therefore inside, the backdrop in the DOM) should not.

```js
modal.addEventListener("click", () => {
  modal.style.display = "none"; // backdrop clicked → close
});

modalContent.addEventListener("click", (event) => {
  event.stopPropagation(); // never let this click reach the backdrop's listener
});
```

Without the `stopPropagation()` call, every click inside the modal would bubble up to the backdrop's listener and close the modal immediately — the classic "my modal won't let me click anything inside it" bug.

## A nested-parent propagation simulator

A small deployed demo builds this interactively: clicking "Add Child" nests a new nested `.parent` box inside the deepest existing one, each with its own pair of checkboxes ("stop capturing" / "stop bubbling") and its own capture + bubble listeners:

```js
function add() {
  // ...find the deepest existing `.parent` element, call it `parent`, with index `count`...
  parent.innerHTML = `
    <div class="controls">
      <span class="control">
        <label for="check_capture_${count}">stop capturing</label>
        <input type="checkbox" id="check_capture_${count}" />
      </span>
      <span> parent_${count} </span>
      <span class="control">
        <label for="check_bubble_${count}">stop Bubbling</label>
        <input type="checkbox" id="check_bubble_${count}" />
      </span>
    </div>
    <div class="parent" id="parent_${count}"></div>
  `;

  parent.addEventListener("click", (e) => {
    console.log(`capture parent_${count}`);
    if (document.getElementById(`check_capture_${count}`)?.checked) {
      e.stopPropagation(); // stop on the way DOWN
      console.log(`stopped capture parent_${count}`);
    }
  }, true);

  parent.addEventListener("click", (e) => {
    console.log(`bubbling parent_${count}`);
    if (document.getElementById(`check_bubble_${count}`)?.checked) {
      e.stopPropagation(); // stop on the way UP
      console.log(`stopped bubbling parent_${count}`);
    }
  });
}
```

Checking "stop capturing" on an inner box means outer boxes never even reach the target on the way down; checking "stop bubbling" means the click never reports back up past that box on the way up — the two checkboxes let you *feel* the two separate halves of the round trip independently. This demo is deployed as a static site via GitLab Pages, built with a small CI job:

```yaml
# .gitlab-ci.yml
image: alpine:latest

pages:
  stage: deploy
  script:
    - mkdir .public
    - cp -r * .public
    - mv .public public   # GitLab Pages expects a "public" folder
  artifacts:
    paths:
      - public
  only:
    - main
```

:::tip
This is the whole trick to deploying a static HTML/CSS/JS demo for free: put your built files in a folder literally named `public`, declare it as a job `artifacts` path, and GitLab Pages serves it.
:::

## Worked problem: parent/child click order

```html
<div id="parent">
  <button id="child">Click</button>
</div>
```

```js
document.getElementById("parent").addEventListener("click", () => {
  console.log("parent");
});
document.getElementById("child").addEventListener("click", () => {
  console.log("child");
});
```

**What logs, and in what order, when `#child` is clicked?**

```text
child
parent
```

Both listeners are bubble-phase (no third argument). The click originates at `#child` (the target phase runs its own listener first), then bubbles up to `#parent`.

**Modify it so the click never reaches `#parent`:**

```js
document.getElementById("child").addEventListener("click", (e) => {
  console.log("child");
  e.stopPropagation(); // parent's listener never runs
});
```

**Rewrite using delegation instead of two separate listeners:**

```js
document.getElementById("parent").addEventListener("click", (e) => {
  if (e.target.id === "child") {
    console.log("child (via delegation)");
  }
  console.log("parent"); // still runs — delegation relies on bubbling, it doesn't stop it
});
```

Note the delegated version is a genuinely different design, not just a rewrite of the same two listeners: there is only **one** listener, on the stable ancestor, and it inspects `event.target` to decide what happened. See [Event Delegation](./event-delegation.md) for why this scales better than attaching listeners to every child.

## Key takeaways

- Every event (that bubbles) travels down (capture), hits the target, then travels back up (bubble) — in that fixed order.
- The third `addEventListener` argument (`true`/`{capture: true}`) chooses the capture phase; default is bubble.
- `stopPropagation()` stops *other elements* from seeing the event; `stopImmediatePropagation()` additionally stops sibling listeners on the *same* element; `preventDefault()` is unrelated to propagation — it only cancels the event's default browser action.
- Calling `stopPropagation()` inside a handler that lives *under* a delegated listener will silently break that delegation, since the delegated listener depends on the event reaching it.

## Interview questions

1. **Name the three phases of event dispatch, in order.** Capturing (window → target's parent), target, bubbling (target → window).
2. **What's the difference between `stopPropagation` and `stopImmediatePropagation`?** The former only stops the event from reaching *other elements*; later listeners on the *same* element still run. The latter stops everything, including sibling listeners on that same element.
3. **Does `preventDefault()` stop an event from bubbling?** No — it only cancels the browser's default action for that event (e.g. navigating a link, submitting a form). Use `stopPropagation()` to stop propagation.
4. **Why can `stopPropagation()` break event delegation elsewhere in the app?** Delegation relies on the event bubbling up to a listener on an ancestor. If a descendant's handler calls `stopPropagation()`, the event never reaches that ancestor, and the delegated handler simply never runs.
5. **In the modal-backdrop pattern, why does `stopPropagation()` go on the content, not the backdrop?** The backdrop's handler is what closes the modal on *any* click that reaches it; the content's handler prevents a click *inside* the content from ever reaching (bubbling to) the backdrop.
