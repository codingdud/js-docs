---
title: Form Handling and Validation
sidebar_position: 6
---

Forms are the oldest interactive HTML element, and the browser still tries to submit them the old way (a full page navigation) unless you tell it not to. This page covers intercepting that submission, reading the data out with `FormData`, resetting state, and validating input as the user types.

## `submit`, `preventDefault`, and `FormData`

```js
form.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the browser's default full-page POST/navigation

  const formData = new FormData(form);          // snapshot of every named field
  const dataObject = Object.fromEntries(formData);
  console.log(dataObject);
  // { username: "john", email: "john@example.com", age: "25" }
});
```

`new FormData(form)` reads every field that has a `name` attribute (fields without a `name` are skipped entirely — a common source of "why is my field missing from the data?"). Every value comes out as a **string** (or a `File`, for `<input type="file">`), even for `<input type="number">` — you must convert it yourself (`Number(formData.get("age"))`) if you need an actual number.

### `entries()` and `getAll()` — and the duplicate-key trap

```js
for (const [key, value] of formData.entries()) {
  console.log(`${key}: ${value}`);
}
```

`Object.fromEntries(formData)` is convenient, but it builds a plain object, and **plain objects can't have two properties with the same key** — so if the form has more than one field sharing a `name` (checkboxes in a group, or a multi-select built from several same-named inputs), `Object.fromEntries` silently keeps only the **last** value for that key and discards the rest:

```html
<input type="checkbox" name="topic" value="js" checked />
<input type="checkbox" name="topic" value="css" checked />
```

```js
const fd = new FormData(form);
Object.fromEntries(fd); // { topic: "css" } — "js" is silently gone!

fd.getAll("topic");     // ["js", "css"] — the correct way to read every value for one key
```

:::warning Always reach for `getAll(name)`, not `fromEntries`, for any field that can repeat
`Object.fromEntries(formData)` is a lossy shortcut. It's fine for a form where every `name` is unique, but the moment a `name` can appear more than once, use `formData.getAll(name)` for that specific field, or iterate `formData.entries()` yourself and build whatever shape (array-valued object, `Map`, etc.) actually fits the data.
:::

## `form.reset()` and the button `type` trap

```js
form.reset(); // puts every field back to its value at page load / last reset — NOT "blank"
```

`reset()` restores the form's fields to their **initial** HTML-defined values, not to empty strings — a field that had `value="guest"` in the markup goes back to `"guest"`, not `""`.

:::danger Buttons inside a `<form>` default to `type="submit"`
A `<button>` with no explicit `type` attribute, placed inside a `<form>`, defaults to `type="submit"` — clicking it submits the form, even if your intention was just "a button that happens to live near the form." Always be explicit:

```html
<button type="submit">Save profile</button>  <!-- triggers the submit event -->
<button type="reset">Reset</button>          <!-- triggers form.reset() natively -->
<button type="button">Update</button>        <!-- does nothing on its own; wire your own handler -->
```

Forgetting `type="button"` on a "Load" or "Update" button inside a form is one of the most common accidental-submit bugs.
:::

## Real-time email validation

```js
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

emailInput.addEventListener("input", () => {
  if (!emailInput.value.trim()) {
    emailError.textContent = "";
    return; // don't show an error on an empty, untouched field
  }
  emailError.textContent = isValidEmail(emailInput.value)
    ? ""
    : "Enter a valid email address.";
});
```

This regex is a reasonable, practical "good enough" check (something@something.something, no whitespace) — it's intentionally not a fully RFC-5322-compliant email validator, which would be far more complex than any UI actually needs. The real guarantee of a valid, deliverable address only comes from actually sending a confirmation email; client-side regex validation is purely a fast first pass to catch obvious typos.

## The `formhandel` project: a throttled reset

```js
const form = document.getElementById("Myform");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const result = document.getElementById("result");
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    const p = document.createElement("p");
    p.textContent = `${key}: ${value}`;
    result.appendChild(p);
  }
  result.style.visibility = "visible";
  form.reset();
});

const button = document.getElementById("resetBt");
function throttle(fn, sec) {
  let ready = true;
  return (...args) => {
    if (ready) {
      ready = false;
      fn(...args);
      setTimeout(() => { ready = true; }, sec);
    }
  };
}
const cb = (e) => {
  form.reset();
  document.getElementById("result").innerHTML = "";
  document.getElementById("result").style.visibility = "hidden";
};
button.addEventListener("click", throttle(cb, 3000)); // reset button usable at most once per 3s
```

Throttling the reset button is a deliberate UX choice here, not a correctness requirement: it stops a user from spamming reset clicks (each of which clears and hides the result panel) in quick succession. Note this project's own `debouncing` helper is defined but unused and mixes `clearInterval` with a `setTimeout` id — in most browsers `clearInterval`/`clearTimeout` are implemented against the same internal timer-id table and happen to be interchangeable, but that's an implementation detail, not something the spec guarantees, so pair `clearTimeout` with `setTimeout` (and `clearInterval` with `setInterval`) in code you write.

:::warning Direct string assignment to `.style`
The same project also writes `result.style = "visibility:visible"` and `temp.style = "padding:4px; color:green;"` in a couple of places. As covered in [Updating Content, Styles, Classes and Attributes](./updating-content-styles-classes.md), assigning a *string* to `.style` replaces every inline style the element had — safe here only because nothing else sets inline styles on the same elements. Prefer `element.style.visibility = "visible"` or `element.style.cssText = "..."` so the intent (and the risk) is explicit.
:::

## The Revice profile form: validation + `localStorage` + the `innerHTML` trap

```js
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(profileForm);
  const profile = Object.fromEntries(formData.entries()); // fine here — every field name is unique

  if (!isValidEmail(profile.email)) {
    emailError.textContent = "Enter a valid email address before saving.";
    return; // bail out BEFORE saving or resetting — invalid data never reaches storage
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  renderProfile(profile);
  profileForm.reset();
  emailError.textContent = "";
});

function renderProfile(profile) {
  if (!profile) {
    profileOutput.textContent = "No profile saved yet.";
    return;
  }
  profileOutput.innerHTML = `
    <strong>Name:</strong> ${profile.username}<br />
    <strong>Email:</strong> ${profile.email}<br />
    <strong>Favorite topic:</strong> ${profile.favoriteTopic}
  `;
}
```

:::danger `renderProfile` interpolates saved data straight into `innerHTML`
`profile.username` and `profile.email` came from the user's own form submission and are stored verbatim in `localStorage`. Rendering them back with `innerHTML` means a username like `<img src=x onerror=alert(document.cookie)>` becomes live, executing markup the moment the profile is displayed — a persistent, self-inflicted XSS. Because this value round-trips through `localStorage`, it re-executes **every time the page loads** and calls `renderProfile`, not just once. The fix is to build the preview with real nodes and `textContent` for every user-supplied piece:

```js
function renderProfile(profile) {
  if (!profile) {
    profileOutput.textContent = "No profile saved yet.";
    return;
  }
  profileOutput.replaceChildren(); // clear previous content
  const rows = [
    ["Name", profile.username],
    ["Email", profile.email],
    ["Favorite topic", profile.favoriteTopic],
  ];
  for (const [label, value] of rows) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    p.append(strong, document.createTextNode(value)); // value is always plain text, never parsed
    profileOutput.append(p);
  }
}
```
:::

The form also loads any previously saved profile automatically on page load by **calling the load button programmatically**:

```js
loadProfileBtn.addEventListener("click", () => {
  const savedProfile = localStorage.getItem(STORAGE_KEY);
  renderProfile(savedProfile ? JSON.parse(savedProfile) : null);
});

// ...
loadProfileBtn.click(); // runs the same handler immediately, on initial script execution
```

## Key takeaways

- Always call `event.preventDefault()` in a `submit` handler if you're handling the data yourself — otherwise the browser also tries to navigate/POST.
- `FormData` values are always strings (or `File`); `Object.fromEntries(formData)` silently drops all but the last value for any repeated field `name` — use `getAll(name)` when a name can repeat.
- `form.reset()` restores the markup's original values, it does not blank the form.
- A `<button>` inside a `<form>` with no explicit `type` defaults to `type="submit"` — always set `type="button"` for buttons that shouldn't submit.
- Never interpolate user-controlled strings (including anything round-tripped through `localStorage`) into `innerHTML`; use `textContent` or build nodes directly.

## Interview questions

1. **Why does `Object.fromEntries(new FormData(form))` lose data for repeated field names?** `Object.fromEntries` builds a plain object, and an object can't hold two values under the same key — the last entry for a given name silently overwrites all earlier ones. `formData.getAll(name)` returns every value.
2. **What type are the values you get out of `FormData`?** Always strings, except for `<input type="file">`, which yields `File` objects.
3. **What happens if you forget `event.preventDefault()` in a `submit` handler?** The browser performs its default form submission (a navigation / HTTP request) in addition to running your handler, typically reloading or navigating the page.
4. **Why is `<button>` without an explicit `type` risky inside a form?** It defaults to `type="submit"`, so clicking it submits the form even if that wasn't the intent — always set `type="button"` for non-submitting buttons.
5. **Why is rendering a saved profile with `innerHTML` dangerous even if the "attacker" is just the form's own user?** Because the same browser that submits the form later renders the stored value back as markup — any HTML a user types into a field becomes live script the next time the page reads it from storage and injects it via `innerHTML`.
