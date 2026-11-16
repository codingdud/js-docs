---
title: Selecting, Creating and Inserting Nodes
sidebar_position: 1
---

Every interactive web page starts with the same question: how do you get from static HTML into a live, scriptable tree of objects? This page covers what the DOM actually is, how to find nodes in it, how to build new ones, and the gotchas that show up the moment real code (and real typos) get involved.

## What the DOM is

The **DOM** (Document Object Model) is not the HTML file — it's the browser's in-memory, tree-shaped representation of that HTML. When the browser receives an HTML response it:

1. **Tokenizes** the byte stream into tags, text and attributes.
2. **Builds the DOM tree** from those tokens (elements become nodes, nesting becomes parent/child relationships).
3. In parallel, builds the **CSSOM** from stylesheets.
4. Combines DOM + CSSOM into a **render tree**, then **lays out** and **paints** pixels.

`document` is the JavaScript entry point into that tree. It is an object, so you can read it, mutate it, and the browser will re-render the parts that changed.

### DOM vs BOM

These are two different object models that are easy to conflate:

| | DOM | BOM |
|---|---|---|
| What it represents | The document's content (elements, text, attributes) | The browser window itself |
| Root object | `document` | `window` |
| Examples | `document.querySelector`, `document.createElement` | `window.location`, `window.history`, `window.navigator`, `window.localStorage` |
| Standardized by | W3C/WHATWG DOM spec | No single spec — browser-vendor conventions, now largely aligned |

In practice `document` is itself a property of `window` (`window.document === document`), so the two overlap, but "the DOM" specifically means the document tree, not the browser chrome around it.

:::note Missing `<!DOCTYPE html>`
Several of the example pages in this chapter's source material start with a bare `<html lang="en">` and no `<!DOCTYPE html>` on the line above it. Without a doctype, browsers render the page in **quirks mode**: box-model math, inline-element sizing and a handful of CSS behaviors fall back to legacy (pre-standards) rules instead of the modern (“standards mode”) ones. The DOM still builds and your selectors still work, but spacing and sizing can be subtly wrong. Always start a real page with:

```html
<!DOCTYPE html>
<html lang="en">
  ...
</html>
```
:::

## Selecting elements

| Method | Returns | Live? | Notes |
|---|---|---|---|
| `document.getElementById(id)` | a single `Element` or `null` | — | fastest; ids must be unique |
| `document.querySelector(css)` | first matching `Element` or `null` | — | accepts any CSS selector |
| `document.querySelectorAll(css)` | a `NodeList` | **no**, static snapshot | has `.forEach`, safe to mutate the DOM while iterating |
| `element.getElementsByClassName/TagName(...)` | an `HTMLCollection` | **yes**, live | re-queries the DOM on every access |

```js
// querySelector vs getElementById
const byId = document.getElementById("secret"); // no "#" prefix
const byQuery = document.querySelector("#secret"); // CSS selector syntax, needs "#"

// querySelectorAll returns a static NodeList — safe to iterate even
// if the loop body removes matched elements from the DOM
document.querySelectorAll(".box").forEach((box) => box.remove());
```

`querySelector`/`querySelectorAll` are strictly more powerful than `getElementById`/`getElementsByClassName` because they accept any CSS selector (`.box > span:first-child`, `[data-id="3"]`, etc.), at a small performance cost for very hot code paths. `getElementById` is still the fastest lookup when you genuinely just have an id.

:::warning Typo'd selector methods don't exist — and fail loudly
One of the practice notes uses `document.querySelectAll("li")` and `document.querySelect("img")`. Neither method exists on `document`; the real names are `querySelectorAll` and `querySelector`. Calling the misspelled version throws:

```text
Uncaught TypeError: document.querySelectAll is not a function
```

This is a good thing — it fails fast instead of silently doing nothing. Always double-check the `-or-` in `querySelector(All)`.
:::

## Creating nodes

```js
// 1. Create an element and a text node separately
const heading = document.createElement("h1");
const headingText = document.createTextNode("Big Head!");

// 2. Wire them together
heading.appendChild(headingText);

// 3. Attach the new subtree to a live part of the document
document.body.appendChild(heading);
// Result: an otherwise empty page now shows an <h1>Big Head!</h1>
```

This is the minimal `createElement` + `createTextNode` + `appendChild` pattern: nothing exists in the page until the last line, because `appendChild` is what actually inserts a node into the document that the browser is rendering.

A slightly richer version builds a paragraph and wires up a button that reveals a "secret" code on click:

```js
// Build a <p>hello world!</p> and attach it to <body>
const par = document.createElement("p");
const text = document.createTextNode("hello world!");
par.appendChild(text);
document.querySelector("body").appendChild(par);

// Reveal a random 4-digit code when the button is clicked
const button = document.querySelector(".btn");
button.addEventListener("click", (e) => {
  const span = document.querySelector("#secret");
  span.className = "pass flex-box";
  span.innerHTML = randcode();
});

function randcode() {
  const result = [];
  for (let i = 0; i < 4; i++) result.push(Math.ceil(Math.random() * 9));
  return result.join(" ");
  // e.g. "7 2 9 4"
}
```

:::warning `className =` overwrites, it does not add
`span.className = "pass flex-box"` **replaces** whatever classes `#secret` already had. If that span started with a class like `masked`, it's gone after this line — there is no way to recover it from `className` alone. Use `classList.add(...)` when you want to add a class without destroying the existing ones:

```js
span.classList.add("pass", "flex-box"); // keeps any existing classes
```

The "Updating Content, Styles, Classes and Attributes" page covers `classList` in full.
:::

## Inserting nodes: beyond `appendChild`

`appendChild` always inserts as the **last child**. Modern DOM gives you more direct verbs:

```js
const container = document.getElementById("container");
const newDiv = document.createElement("div");

container.append(newDiv);           // like appendChild, but accepts multiple nodes/strings
container.prepend(newDiv);          // insert as the FIRST child
container.insertBefore(newDiv, container.firstChild); // explicit reference-node API
```

`insertAdjacentElement` is the most precise tool: it takes a position **relative to the element it's called on**, not relative to a parent:

```js
element.insertAdjacentElement("beforebegin", newDiv); // immediately before element, as a sibling
element.insertAdjacentElement("afterbegin", newDiv);  // as element's first child
element.insertAdjacentElement("beforeend", newDiv);   // as element's last child
element.insertAdjacentElement("afterend", newDiv);    // immediately after element, as a sibling
```

```text
<!-- beforebegin -->
<element>
  <!-- afterbegin -->
  ...existing children...
  <!-- beforeend -->
</element>
<!-- afterend -->
```

There's also `insertAdjacentHTML` and `insertAdjacentText`, which take the same four position strings but a markup string / plain string instead of a node.

## Building complex elements: step-by-step vs `innerHTML +=`

There are two common ways to add a "card" made of several nested elements.

**Step-by-step, with `createElement`:**

```js
const card = document.createElement("div");
card.className = "card";

const title = document.createElement("h3");
title.textContent = "Card Title";

const content = document.createElement("p");
content.textContent = "Card content goes here";

card.appendChild(title);
card.appendChild(content);
document.body.appendChild(card);
```

**The shortcut, with `innerHTML +=`:**

```js
const container = document.getElementById("container");
container.innerHTML += `
  <div class="card">
    <h3>Card Title</h3>
    <p>Card content</p>
  </div>
`;
```

The second version looks shorter, but `container.innerHTML += ...` is really `container.innerHTML = container.innerHTML + ...`: it serializes the **entire existing subtree back to an HTML string**, concatenates the new markup, and reparses everything from scratch. Two consequences follow directly from that:

:::danger `innerHTML +=` destroys existing nodes and their listeners
Because the whole subtree is torn down and rebuilt from a string, **every element already inside `container` is destroyed and recreated** — along with any event listeners, focus state, form input values, or `classList`/dataset state attached to them. A button that had a click handler wired up with `addEventListener` becomes a *new*, listener-less button after this line runs. This is one of the most common silent bugs in DOM code.
:::

:::danger `innerHTML` with unsanitized input is an XSS vector
Any string you push into `innerHTML` is parsed as HTML. If any part of that string ever comes from user input — a form field, a URL parameter, a server response you don't fully trust — you can be injecting executable markup:

```js
// NEVER do this with untrusted data:
container.innerHTML += `<div>${userSuppliedName}</div>`;
// if userSuppliedName is `<img src=x onerror="stealCookies()">`, it just ran.
```

Prefer `textContent` for untrusted text, or build nodes with `createElement`/`createTextNode`, which never interpret their input as markup. If you must insert trusted HTML, consider `element.setHTML()` (where supported) or a sanitizer.
:::

So: `createElement` is more verbose but safe and listener-preserving; `innerHTML +=` is terse but rebuilds the world and is unsafe with untrusted strings. Reach for `append`/`insertAdjacentElement` with real nodes when the content is dynamic or user-influenced, and reserve `innerHTML` for small, trusted, static snippets.

## Removing nodes

```js
const element = document.getElementById("myElement");

element.remove();                       // modern, direct
element.parentNode.removeChild(element); // older, still correct — needs the parent

// Clearing every child of a container
container.innerHTML = "";                       // fast, but see the innerHTML caveats above
while (container.firstChild) {
  container.removeChild(container.firstChild);  // listener-safe, no reparsing
}

document.querySelectorAll(".box").forEach((box) => box.remove());
```

:::warning Whitespace text nodes count as children too
HTML source formatting creates real text nodes. Given:

```html
<div id="result">
  <div class="box">1</div>
</div>
```

`result.lastChild` is **not** `.box` — it's the whitespace/newline text node *after* `.box` and before the closing `</div>`. Calling `result.lastChild.remove()` the first time removes that invisible text node and nothing appears to change, which looks like the remove button is broken. `result.lastElementChild` (or `childElementCount`/`children`, which only count elements) skips text nodes and is almost always what you actually want when "remove the last box" is the goal.
:::

## Cloning nodes

```js
const original = document.getElementById("original");
const clone = original.cloneNode(true); // true = deep clone, includes all descendants

clone.id = "cloned";          // ids must stay unique — always change a cloned id
clone.textContent = "I am a clone";
document.body.appendChild(clone);
```

`cloneNode(true)` copies attributes and descendant nodes, but it does **not** copy event listeners that were attached with `addEventListener` (they live in the browser's internal listener table, not on the node's serialized state) and it does not copy `id` uniqueness — you are responsible for giving the clone a new id if the original had one. `cloneNode(false)` (or no argument) clones only the node itself, with no children.

:::warning A typo'd `<script src>` filename fails silently
The `Dommanipulation/index.html` source page loads two scripts:

```html
<script src="./script.js" defer></script>
<script src="./westorage.js" defer></script>
```

The actual file on disk is `webstorage.js`, not `westorage.js`. A missing/misnamed script `src` is **not** a JavaScript error — there's no stack trace in your code, because your code never ran. The browser just logs a `404 (Not Found)` network error in the console and moves on. The `localStorage`/`sessionStorage` calls inside `webstorage.js` silently never execute. Whenever code "does nothing" with no thrown error, check the Network tab for 404s on your own `<script>` tags before suspecting the JS logic itself.
:::

## Interview questions

1. **What is the DOM, and how is it different from the HTML source and the BOM?**
   The DOM is the browser's live, in-memory tree built by parsing HTML; it's an object representation, not the file itself. The BOM is the browser-window API surface (`window`, `location`, `history`, `navigator`) that has nothing to do with document content.

2. **`document.querySelector("#id")` vs `document.getElementById("id")` — when would you prefer one?**
   `getElementById` is marginally faster and reads clearly for simple id lookups. `querySelector` is necessary whenever the selection logic needs real CSS selector power (combinators, attribute selectors, `:not()`, etc.).

3. **Why can `container.innerHTML += newMarkup` break a page that "worked a second ago"?**
   It reparses the entire subtree, destroying existing nodes (and their listeners/focus/state) and recreating equivalent-looking but entirely new nodes in their place.

4. **Why might `.lastChild` not be the element you expect?**
   Whitespace in the HTML source between tags becomes real text nodes. `.lastChild` can be one of those text nodes rather than the last *element*. Use `.lastElementChild` to skip text/comment nodes.

5. **Does `cloneNode(true)` copy event listeners?**
   No. Listeners attached via `addEventListener` are not part of a node's cloneable state. You must re-attach them (ideally via delegation on a stable ancestor, covered in [Event Delegation](./event-delegation.md), so clones don't need their own listeners at all).

6. **What does a missing `<!DOCTYPE html>` actually change?**
   It drops the page into quirks mode, which changes box-sizing and other legacy layout rules — the DOM tree itself still builds normally.
