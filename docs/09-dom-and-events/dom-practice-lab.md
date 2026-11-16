---
title: DOM Practice Lab (Revice)
sidebar_position: 8
---

This page pulls the chapter together through a single practice project ("Revice") that combines selectors, creation, events, delegation, propagation, forms and storage into one page — plus a checklist for practicing the same concepts on your own.

## The five panels

The Revice lab is organized as five self-contained panels on one page, each exercising a different cluster of concepts covered earlier in this chapter:

| Panel | Concepts exercised | See also |
|---|---|---|
| **1. Selector and Element Lab** | `createElement`, `dataset`, `textContent` rename, `classList.toggle` across a whole `NodeList` | [Selecting, Creating and Inserting Nodes](./dom-basics.md) |
| **2. Event Practice** | click counter, live `input` mirror, scroll-progress-with-guard | [Event Handling Fundamentals](./event-handling.md), [Scroll Events](./scroll-events.md) |
| **3. Event Delegation** | one listener on `<ul>`, `closest("button[data-action]")`, `dataset.action` dispatch | [Event Delegation](./event-delegation.md) |
| **4. Bubbling and Capturing** | nested `outerBox`/`middleBox`/`innerBox`, capture + bubble logging side by side | [Bubbling, Capturing and `stopPropagation`](./event-propagation.md) |
| **5. Form and Web Storage** | `FormData`, email regex validation, `localStorage.setItem/getItem/removeItem` | [Form Handling and Validation](./forms.md) |

A representative slice from each panel:

```js
// Panel 1 — create, then rename with textContent (not innerHTML)
function createCard(title) {
  cardIndex += 1;
  const card = document.createElement("article");
  card.className = "topic-card";
  card.dataset.cardId = String(cardIndex);
  card.textContent = title || `DOM Topic ${cardIndex}`;
  cardBoard.append(card);
}

// Panel 4 — capture AND bubble listeners on the same three nested boxes
function registerPropagation(nodeId, label) {
  const node = document.getElementById(nodeId);
  node.addEventListener("click", () => addEventLogEntry("capture", label), true);
  node.addEventListener("click", () => addEventLogEntry("bubble", label));
}
registerPropagation("outerBox", "outer box");
registerPropagation("middleBox", "middle box");
registerPropagation("innerBox", "inner box");

// Panel 5 — validate, then persist
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = Object.fromEntries(new FormData(profileForm).entries());
  if (!isValidEmail(profile.email)) {
    emailError.textContent = "Enter a valid email address before saving.";
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  renderProfile(profile);
  profileForm.reset();
});
```

The page also runs three setup calls immediately on load, outside any listener, so the UI starts in a correct state rather than an empty one:

```js
updateCardCount();
updateTaskCount();
loadProfileBtn.click(); // programmatically "clicks" Load, so a saved profile renders without user action
```

## Practice checklist

The lab ships with its own self-test checklist — working through it top to bottom is a reasonable way to confirm every concept in this chapter actually clicked:

- [ ] Create at least 3 cards in the Selector and Element Lab.
- [ ] Rename the first card and inspect which DOM method changed it (`textContent`, not `innerHTML`).
- [ ] Toggle highlight on all cards and inspect the class change in DevTools.
- [ ] Click the counter button 5 times and verify the text updates correctly.
- [ ] Type inside the live input and confirm the mirror text updates on every keystroke (`input`, not `change`).
- [ ] Scroll the practice box and explain how the progress bar width is calculated — including what happens if the box has nothing to scroll.
- [ ] Add 2 new tasks to the delegated list.
- [ ] Complete one task and remove one task using the delegated buttons.
- [ ] Find the single event listener that handles every task button click — there should be exactly one.
- [ ] Click the inner propagation box and note the capture order and bubble order.
- [ ] Clear the event log and repeat the propagation test.
- [ ] Submit the profile form with a valid email.
- [ ] Try an invalid email and confirm the validation message appears, and that nothing is saved.
- [ ] Reload the page and load the saved profile from `localStorage`.
- [ ] Clear saved data and confirm the preview resets to "No profile saved yet."

### Suggested self-practice extensions

- [ ] Add a button to delete the last created card (`cardBoard.lastElementChild?.remove()` — not `lastChild`).
- [ ] Add keyboard events such as `keydown`/`keyup` to one of the panels.
- [ ] Store the task list in `localStorage` so tasks persist across reloads.
- [ ] Add a dark-theme toggle using `classList`, not inline `style`.
- [ ] Replace the `innerHTML` call in the profile preview with fully created DOM nodes and `textContent` (see the fix in [Form Handling and Validation](./forms.md)).

## More practice exercises, from the wider "ultimate DOM manipulation" notes

- **Form challenge:** build a multi-step form with validation between steps.
- **Scroll challenge:** build an infinite-scroll loader (pairs well with `IntersectionObserver`, see [Scroll Events](./scroll-events.md)).
- **Manipulation challenge:** build a draggable to-do list.
- **Delegation challenge:** build a dynamic, sortable table using one delegated click listener for the column headers.
- **Events challenge:** build a nested dropdown menu system, exercising bubbling/capturing deliberately.

## DOM best practices: a chapter summary

Pulling together the gotchas from every page in this chapter:

**Selecting and creating**
- Cache DOM queries in a variable instead of re-querying on every event — `document.querySelector` is not free.
- Prefer `createElement` + `textContent`/`append` over `innerHTML` whenever content includes anything from outside your own static markup.
- Remember `.lastChild`/`.firstChild` can be whitespace text nodes; use the `*ElementChild` variants.

**Updating**
- `classList.add/remove/toggle` over direct `className =` or string-assigning `.style` — both of those overwrite instead of adding.
- `textContent` by default; `innerHTML` only for small, trusted, static markup.

**Events**
- One `addEventListener` per concern; delegate to a stable ancestor for lists and dynamic content.
- Know `target` vs `currentTarget`, and which phase (capture/bubble) a listener runs in.
- Throttle/debounce anything tied to `scroll` or `input` that does non-trivial work.

**Forms and storage**
- Always `preventDefault()` on `submit` if you're handling the data yourself.
- Validate before persisting — never let invalid data reach `localStorage` or a server.
- Anything that round-trips through storage and back into the DOM needs the same `innerHTML`/XSS discipline as live user input, because it effectively *is* user input, just delayed.

**Script loading**
- Place `<script>` tags at the end of `<body>`, or use the `defer` attribute, so the DOM exists before your script runs and tries to query it. `defer` additionally keeps scripts executing in document order while still letting the browser fetch them in parallel with parsing — `async` makes no such ordering guarantee, so it's a poor fit for scripts that query specific elements by id.
- Caching a query result (`const list = document.querySelectorAll(...)`) once, right after the DOM is ready, avoids re-walking the DOM on every subsequent access — especially important for anything inside a `scroll` or `input` handler.

## Key takeaways

- A single page can exercise every idea in this chapter at once: creation, updating, events, propagation, delegation, forms and storage are not separate skills, they compose.
- The practice checklist's value is in the *why* behind each step — e.g. "why does `.lastChild` need `.lastElementChild` here" — not just clicking through it.
- The same discipline (prefer `textContent`, delegate instead of re-wiring, guard divide-by-zero, pair `clearTimeout` with `setTimeout`) that fixed every bug in this chapter's source examples is the discipline that prevents them from being written in the first place.

## Interview questions

1. **Why does the lab call `loadProfileBtn.click()` at the bottom of the script instead of just calling `renderProfile` directly?** It reuses the exact same code path a real user click would take, so there's only one implementation of "load and render a profile" to keep correct.
2. **What's the one listener that should exist for the entire delegated task list, and why just one?** A single `click` listener on `taskList` itself, using `closest("button[data-action]")` to figure out which action/row was clicked — one listener handles every current and future task row via bubbling.
3. **Why does `defer` suit a script that queries elements by id, while `async` often doesn't?** `defer` guarantees execution after parsing completes and preserves document order across multiple deferred scripts; `async` scripts run as soon as they're fetched, in whatever order that happens, which can run before the elements they query even exist in a large document.
4. **Why should you cache `document.querySelectorAll(...)` results used inside a scroll or input handler instead of calling it fresh every time?** Re-querying the DOM is comparatively expensive, and a high-frequency handler (scroll, input) can run dozens of times per second — caching once avoids repeating that cost on every single event.
