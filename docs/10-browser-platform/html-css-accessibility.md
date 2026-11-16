---
title: "Semantic HTML, Accessibility and CSS Fundamentals"
sidebar_position: 4
---

# Semantic HTML, Accessibility and CSS Fundamentals

This page covers the non-JavaScript half of front-end fundamentals that still comes up constantly in interviews and in day-to-day DOM work: web accessibility, semantic HTML, CSS selectors and combinators, pseudo-classes vs pseudo-elements, preprocessors, and the naming methodologies that keep large CSS codebases from fighting themselves.

## Web accessibility

**Accessibility** (often abbreviated **a11y**) means designing and building sites so that everyone can use them effectively, including people with visual, auditory, motor or cognitive disabilities. In practice that means the page works for:

- **Screen reader users**, who rely on the page's structure and labels being announced correctly, not just how it looks.
- **Keyboard-only navigation**, for anyone who can't or doesn't use a mouse — every interactive element must be reachable and operable with `Tab`, `Enter`/`Space`, and arrow keys where relevant.
- **People with color blindness or low vision**, who need sufficient color contrast and cannot rely on color alone to convey meaning.

### ARIA attributes

**ARIA** stands for **Accessible Rich Internet Applications** — a set of attributes that fill the gaps when native HTML semantics aren't enough (for example, a custom widget built out of `div`s). Common ones:

| Attribute | Purpose |
| --- | --- |
| `role` | Declares what kind of widget an element behaves as, e.g. `role="button"`, `role="dialog"`, `role="alert"`. |
| `aria-label` | Provides an accessible name for an element when there's no visible text to use (e.g. an icon-only button). |
| `tabindex` | Controls keyboard focus order: `0` makes an otherwise non-focusable element (like a `div`) part of the page's natural tab order, at the position it appears in the DOM — natively focusable elements (`button`, `a href`, `input`) already behave this way without it. `-1` makes an element focusable only via script (`element.focus()`), removing it from the natural tab order. A positive value forces a specific, explicit tab order and is generally discouraged because it's easy to get out of sync with the visual layout. |
| `alt` | Not technically ARIA (it's a plain HTML attribute on `img`), but it serves the same purpose: a text alternative for an image, read aloud by screen readers. |

```html
<button aria-label="Close dialog" onclick="closeDialog()">
  <!-- icon only, no visible text -->
  ✕
</button>
```

:::tip
The first rule of ARIA is to use native HTML semantics instead of it whenever possible. A real `<button>` already has the correct role, is keyboard-focusable, and responds to `Enter`/`Space` for free. ARIA is for filling gaps, not a replacement for semantic markup.
:::

### Semantic HTML — and why `<div>` isn't semantic

A **semantic element** clearly describes its own meaning to the browser, to assistive technology, and to search engines. `<div>` and `<span>` describe *nothing* about their content — they're generic containers that exist purely for styling/scripting hooks, which is exactly why they are **not** semantic.

| Element | Meaning |
| --- | --- |
| `<header>` | Introductory content or navigation for its nearest section, or for the page. |
| `<nav>` | A block of navigation links. |
| `<main>` | The main content of the document — only one per page. |
| `<article>` | Self-contained, independently distributable content (a blog post, a news story). |
| `<section>` | A thematic grouping of content, usually with its own heading. |
| `<aside>` | Content tangentially related to the main content (sidebars, pull quotes, callouts). |
| `<footer>` | Footer information for its nearest section, or for the page. |

```html
<!-- ❌ no semantic meaning: a screen reader has no idea what this block is -->
<div class="header">
  <div class="nav">...</div>
</div>

<!-- ✅ semantic: announced as "banner" / "navigation" to assistive tech -->
<header>
  <nav>...</nav>
</header>
```

Using the right element is "free" accessibility: a screen reader announces `<nav>` as a navigation landmark and `<main>` as the main content region without any extra ARIA at all. Reach for a `<div>` only when none of the semantic elements fit.

## CSS selectors and combinators

### Basic selectors

```css
p { }               /* element/type selector: every <p> */
#id { }              /* id selector: the element with id="id" */
.class { }           /* class selector: every element with class="class" */
tag.class { }        /* combined: every <tag> that also has class="class" */
```

### Combinators

Combinators describe the *relationship* between two selectors, and work with any selector type above.

| Combinator | Syntax | Selects |
| --- | --- | --- |
| Descendant | `A B` (space) | Every `B` anywhere inside `A`, at any depth |
| Child | `A > B` | Only `B` elements that are **direct** children of `A` |
| Adjacent sibling | `A + B` | The single `B` that immediately follows `A` (same parent) |
| General sibling | `A ~ B` | Every `B` that comes after `A` and shares the same parent |

```css
.card p { }       /* any <p> anywhere inside .card */
.card > p { }     /* only <p> elements that are direct children of .card */
h2 + p { }        /* only the <p> immediately after an <h2> */
h2 ~ p { }        /* every <p> sibling that comes after an <h2> */
```

## Pseudo-classes vs pseudo-elements

A **pseudo-class** selects an element based on a **state** or **position** it's currently in — it doesn't need any extra markup:

| Pseudo-class | Matches |
| --- | --- |
| `:hover` | While the pointer is over the element |
| `:focus` | While the element has keyboard focus |
| `:active` | While the element is being activated (e.g. mouse button held down) |
| `:link` / `:visited` | Unvisited / visited links |
| `:nth-child(n)` | The *n*-th child of its parent |

A **pseudo-element** represents a specific, generated **sub-part** of an element that doesn't exist as a real DOM node:

| Pseudo-element | Represents |
| --- | --- |
| `::before` / `::after` | Generated content inserted before/after the element's actual content (needs a `content` property to show anything) |
| `::marker` | The marker box of a list item (the bullet or number) |
| `::selection` | The portion of text currently selected by the user |
| `::backdrop` | The backdrop rendered behind a `<dialog>` or fullscreen element |

:::warning `:nth-child` is 1-based, not 0-based
```css
li:nth-child(0) { }  /* matches NOTHING — there is no "0th" child */
li:nth-child(1) { }  /* matches the FIRST child */
li:nth-child(2) { }  /* matches the second child */
```
CSS counts `:nth-child()` from `1`. `:nth-child(0)` (and any formula that evaluates to `0` or a negative number, like `:nth-child(-1)`) never matches anything. To select the first child, use `:nth-child(1)` or `:first-child`.
:::

```css
li::before {
  content: "→ ";
}
```

## CSS preprocessors: Sass and Less

Preprocessors are scripting languages that extend CSS with programming features — variables, nesting, functions, reusable blocks — and then **compile down to plain CSS** that the browser actually runs.

**Sass** (Syntactically Awesome Style Sheets):

```scss
$primary-color: #3498db;

.card {
  color: $primary-color;

  .title {        // nesting: compiles to ".card .title { ... }"
    font-weight: bold;
  }

  &:hover {       // "&" refers to the parent selector: ".card:hover"
    border-color: darken($primary-color, 10%);
  }
}

@mixin rounded($radius: 4px) {  // reusable block of declarations
  border-radius: $radius;
}

.button {
  @include rounded(8px);
}
```

**Less** (Leaner Style Sheets) offers the same ideas — variables (`@primary-color: #3498db;`), nesting, and mixins — with slightly different syntax, and also compiles to plain CSS before it reaches the browser.

## CSS methodologies: avoiding naming conflicts

Even split across many files, **all CSS on a page is global by default** — a `.title` rule in one file can silently override a `.title` rule in another. CSS methodologies are structured conventions for naming and organizing styles to avoid exactly that: naming conflicts, unclear structure, and styles whose reach is hard to predict.

### BEM (Block, Element, Modifier)

```css
.card { }              /* Block: an independent component */
.card__title { }       /* Element: a part of the block, double underscore */
.card--large { }       /* Modifier: a variation of the block, double dash */
.card__title--highlighted { }
```

```html
<div class="card card--large">
  <h3 class="card__title card__title--highlighted">Title</h3>
</div>
```

Because every class is prefixed with its block name, two unrelated components can both have a `__title` element without colliding (`.card__title` vs `.menu__title`).

### OOCSS (Object-Oriented CSS)

OOCSS separates **structure** from **skin**:

- **Structure** — layout properties: `width`, `height`, `padding`, `margin`.
- **Skin** — visual appearance: `color`, `font`, `border`, `background`.

```css
.media-block { display: flex; padding: 1rem; }   /* structure, reusable */
.skin-dark { background: #222; color: #eee; }     /* skin, reusable separately */
```

The same structural class can be paired with different skins, so you compose rather than duplicate rules.

### Atomic CSS / utility-first

Instead of component classes at all, every class does exactly **one** thing, and elements compose many of them:

```html
<div class="flex items-center p-4 bg-gray-800 text-white rounded">
  ...
</div>
```

This avoids naming conflicts almost entirely, since utility classes are tiny, numerous, and intentionally reused everywhere rather than scoped to one component.

## Interview questions

**Why isn't `<div>` considered a semantic element?**
It carries no inherent meaning about its content — it's a generic box used purely for grouping, styling, or scripting hooks. `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>` and `<footer>` each describe what kind of content they contain, which assistive technology and search engines can use directly.

**What's the difference between a pseudo-class and a pseudo-element?**
A pseudo-class (`:hover`, `:nth-child`) targets an element in a particular state or structural position. A pseudo-element (`::before`, `::after`) targets a generated sub-part of an element that isn't a real node in the DOM.

**Why does `li:nth-child(0)` select nothing?**
`:nth-child()` is 1-indexed. `0` (and any negative result) is outside the valid range, so it matches no elements; use `:nth-child(1)` for the first child.

**Why would a team adopt BEM or a utility-first approach instead of plain class names?**
Because all CSS is global by default — a short, generic class name (`.title`, `.active`) from one component can accidentally override another's. BEM namespaces every class under its block; utility-first avoids component-level classes almost entirely, both specifically to prevent that collision.

**What do Sass and Less actually run in the browser?**
Neither runs directly — both compile to plain CSS ahead of time (at build time), and the browser only ever sees the compiled output.

## Key takeaways

- Accessibility means the page works for screen readers, keyboard-only users, and people with visual/other impairments — not just how it looks.
- ARIA (`role`, `aria-label`, `tabindex`) fills gaps; prefer real semantic elements first, since they come with built-in behavior.
- `<div>`/`<span>` are intentionally non-semantic containers; `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>` each have real meaning.
- Combinators: `A B` descendant, `A > B` child, `A + B` adjacent sibling, `A ~ B` general sibling.
- Pseudo-classes are states/positions (`:hover`, `:nth-child`, 1-based); pseudo-elements are generated sub-parts (`::before`, `::after`).
- Sass/Less add variables, nesting and mixins but compile to plain CSS before the browser ever sees them.
- BEM, OOCSS and utility-first/atomic CSS all exist to tame the fact that CSS has no scoping by default.
