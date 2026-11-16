---
title: Event Delegation
sidebar_position: 5
---

Event delegation turns the fact that events bubble (see [Bubbling, Capturing and `stopPropagation`](./event-propagation.md)) into a practical pattern: attach **one** listener to a stable ancestor instead of one listener per child, and let bubbling carry every descendant's click up to it.

## The bad pattern, and why it's bad

```js
// ❌ one listener per button — expensive, and breaks for content added later
const buttons = document.querySelectorAll(".delete-btn");
buttons.forEach((button) => {
  button.addEventListener("click", function () {
    console.log("Button clicked");
  });
});
```

This has two concrete problems: with `n` buttons you pay for `n` listeners (more memory, more setup cost), and any button added to the page **after** this code runs has no listener at all — nobody remembered to re-run the `forEach` for it.

## The good pattern

```js
// ✅ one listener, on a stable parent
const container = document.getElementById("container");
container.addEventListener("click", function (event) {
  if (event.target.classList.contains("delete-btn")) {
    console.log("Delete button clicked");
  }
});
```

Because the click on any `.delete-btn` bubbles up through `container`, a single listener there sees every click, including on buttons that don't exist yet at the time the listener was attached — they just need to exist by the time the click happens.

**Benefits:**

- One listener instead of many — better memory and setup cost, especially for long lists.
- Works automatically for dynamically added elements — nothing has to "remember" to wire up new items.
- Simpler teardown — removing a child never leaves a dangling listener behind on it.

## `matches()` and `closest()`

`event.target` is often not the element you care about (a click might land on an icon *inside* a button, not the button itself). Two methods narrow this down:

```js
document.addEventListener("click", (event) => {
  // matches(): is the target ITSELF this selector? (no ancestor search)
  if (event.target.matches(".delete-btn")) {
    console.log("Delete button clicked");
  }

  // closest(): walk UP from target (inclusive) until a match is found, or null
  if (event.target.closest(".card")) {
    console.log("Clicked somewhere inside a card");
  }
});
```

`closest()` is the one you want whenever the clickable "logical" element (a card, a list item, a button) might contain other nested markup (an icon, a span) that is the actual `event.target`.

## Task list: delegated add / edit / delete / toggle

```js
const taskList = document.getElementById("taskList");

taskList.addEventListener("click", function (event) {
  const target = event.target;
  const taskItem = target.closest(".task-item"); // find the enclosing row, whatever was clicked

  if (target.classList.contains("delete-btn")) {
    taskItem.remove();
  }
  if (target.classList.contains("edit-btn")) {
    const taskText = taskItem.querySelector(".task-text");
    const newText = prompt("Edit task:", taskText.textContent);
    if (newText) taskText.textContent = newText; // textContent — never innerHTML with raw user input
  }
  if (target.classList.contains("task-text")) {
    taskItem.classList.toggle("completed");
  }
});
```

Adding a task just needs to append a new `.task-item` — the delegated listener above already covers it, with zero additional wiring:

```js
addTaskBtn.addEventListener("click", function () {
  const taskText = taskInput.value.trim();
  if (!taskText) return;

  const taskItem = document.createElement("li");
  taskItem.className = "task-item";
  taskItem.dataset.id = taskId++;
  taskItem.innerHTML = `
    <span class="task-text">${taskText}</span>
    <button class="edit-btn">Edit</button>
    <button class="delete-btn">Delete</button>
  `;
  taskList.appendChild(taskItem);
  taskInput.value = "";
});
```

:::warning Building a row with `innerHTML` is fine for static button markup, risky for user text
`taskItem.innerHTML = ...` above is acceptable *only* because the task text isn't interpolated into that HTML string directly before being escaped. If `taskText` (raw user input) were spliced straight into the template literal — `` `<span>${taskText}</span>` `` — a task named `<img src=x onerror=alert(1)>` would execute. The Revice version of this pattern (below) sidesteps the issue entirely by building the row with `createElement` and setting `textContent` for the user-supplied piece.
:::

## Delegation with `dataset`: the Revice task list

The Revice practice project wires every task action through a single delegated listener keyed off a `data-action` attribute, and uses `textContent` — never `innerHTML` — for the one piece of the row that comes from user input:

```js
function buildTaskItem(label) {
  taskIndex += 1;
  const listItem = document.createElement("li");
  listItem.className = "task-item";
  listItem.dataset.id = String(taskIndex);
  listItem.innerHTML = `
    <span></span>
    <div class="task-actions">
      <button data-action="complete" type="button">Complete</button>
      <button data-action="remove" type="button">Remove</button>
    </div>
  `;
  listItem.querySelector("span").textContent = label; // user text goes in via textContent, not innerHTML
  return listItem;
}

taskList.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]"); // skip clicks that aren't a button
  if (!actionButton) return;

  const taskItem = actionButton.closest(".task-item");
  const { action } = actionButton.dataset; // "complete" or "remove"

  if (action === "complete") taskItem.classList.toggle("is-complete");
  if (action === "remove") {
    taskItem.remove();
    updateTaskCount();
  }
});
```

Keying delegated dispatch off `data-action` (rather than a class name like `.delete-btn`) scales cleanly to any number of actions: adding a third button just means adding a third `if (action === "...")` branch, with no new listeners anywhere.

## A delegated close button, built on `id` matching

A different practice page attaches a closable "x" to every box, and delegates the close click to the shared `#result` container:

```js
result.addEventListener("click", (e) => {
  if (e.target.id.includes("x_")) {
    e.target.parentNode.remove(); // the "x" span's parent is the box itself
  }
}, true); // registered on the CAPTURE phase here — still works, delegation isn't bubble-only
```

This works, but matching on `e.target.id.includes("x_")` is more fragile than it needs to be — it would also match a hypothetical id like `"box_x_special"`. The `closest()`/`dataset`/class-based patterns above are more robust: they target a specific element shape (`button[data-action]`, `.delete-btn`) rather than pattern-matching an id string.

:::tip Delegation doesn't require the bubble phase
Delegation is really "let the event *reach* an ancestor's listener and inspect `event.target` there" — it works whether that ancestor's listener is registered for capture or bubble, as the example above shows. In practice almost everyone uses the bubble phase (the default), since it's the one that matches how people read event flow.
:::

## Non-bubbling events: `focus`/`blur` → `focusin`/`focusout`

Not every event bubbles. `focus` and `blur` are the ones you'll hit this with most often — they fire only on the exact element that gained/lost focus, with no bubbling, so a delegated listener on a parent using `focus`/`blur` will never see them. The bubbling equivalents are `focusin` and `focusout`:

```js
// ❌ never fires for descendants — focus does not bubble
form.addEventListener("focus", (e) => console.log("focused", e.target));

// ✅ bubbles, so this works for delegation
form.addEventListener("focusin", (e) => console.log("focused", e.target));
form.addEventListener("focusout", (e) => console.log("blurred", e.target));
```

Use `focusin`/`focusout` any time you want one listener on a form (or any container) to react to focus changes on its fields, instead of attaching `focus`/`blur` to every field individually.

## Key takeaways

- Delegation = one listener on a stable ancestor + `event.target` inspection, relying on bubbling.
- It beats per-child listeners on both performance (fewer listeners) and correctness (automatically covers elements added later).
- `closest(selector)` finds the nearest matching ancestor (inclusive of the target); `matches(selector)` tests the target itself.
- Prefer `data-action` + `dataset` or a dedicated class over pattern-matching substrings of an `id`.
- `focus`/`blur` don't bubble — delegate with `focusin`/`focusout` instead.

## Interview questions

1. **Why does event delegation work at all?** Because the event bubbles from the actual clicked element up through every ancestor, so a listener on an ancestor still receives it; `event.target` tells you what was actually clicked.
2. **What's the difference between `element.matches(sel)` and `element.closest(sel)`?** `matches` tests only the element itself; `closest` walks up the ancestor chain (including the element itself) and returns the first match, or `null`.
3. **Why is delegation especially valuable for dynamically generated lists?** New items never need their own listener wired up — the delegated listener on the stable parent already covers them as soon as they exist in the DOM.
4. **Why can't you delegate a `focus` handler the same way you delegate `click`?** `focus`/`blur` don't bubble. Use `focusin`/`focusout`, which are the bubbling equivalents.
5. **What's a cleaner alternative to checking `event.target.id.includes("x_")`?** A dedicated class or a `data-action` attribute read via `.dataset`, matched with `closest()` — it scopes the match to an intentional shape instead of a substring of an id.
