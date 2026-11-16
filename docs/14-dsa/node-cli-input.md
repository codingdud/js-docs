---
title: Reading Input in Node.js
sidebar_position: 4
---

# Reading Input in Node.js

Node has no built-in "read a line and block" function like some other languages — the terminal is a stream, and reading from it is asynchronous. This page covers the three common ways to read command-line input, how to convert the strings they give you into the type you actually need, and the small mistakes that trip people up in interview settings.

## Method 1: `readline` (recommended)

This is the cleanest and most interview-friendly method. It wraps `process.stdin`/`process.stdout` and gives you a `question`-based API.

```js
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
```

### String input

```js
rl.question("Enter name: ", (name) => {
  console.log("String:", name);
  rl.close();
});
```

### Number input

The CLI always hands back a **string**, so numeric input needs an explicit conversion.

```js
rl.question("Enter number: ", (n) => {
  const num = Number(n);
  console.log("Number + 5 =", num + 5);
  rl.close();
});
```

`parseInt(n)` and `parseFloat(n)` are also valid, and are useful when the string has trailing non-numeric text (`parseInt("42px")` is `42`, while `Number("42px")` is `NaN`).

### Boolean input

```js
rl.question("Enter true/false: ", (v) => {
  const bool = v.toLowerCase() === "true";
  console.log("Boolean:", bool);
  rl.close();
});
```

A more forgiving version that accepts a few common spellings:

```js
const bool = ["yes", "true", "1"].includes(v.toLowerCase());
```

### Char input

JavaScript has no dedicated character type — a "char" is just a one-character string, so take the first character of the input.

```js
rl.question("Enter char: ", (c) => {
  console.log("Char:", c[0]);
  rl.close();
});
```

### Multiple inputs, nested callbacks

```js
rl.question("Name: ", (name) => {
  rl.question("Age: ", (age) => {
    console.log(name, Number(age));
    rl.close();
  });
});
```

This works, but nested callbacks get hard to read past two or three questions ("callback pyramid") — see [Sync vs Async & Callbacks](../08-asynchronous-javascript/sync-vs-async-and-callbacks.md).

## Method 2: `readline/promises` (modern, `async`/`await`)

The promise-based variant of the same module avoids the nesting problem entirely.

```js
const readline = require("readline/promises");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const name = await rl.question("Name: ");
  const age = Number(await rl.question("Age: "));
  const active = (await rl.question("Active? ")).toLowerCase() === "true";

  console.log({ name, age, active });
  rl.close();
}

main();
```

Each `await rl.question(...)` pauses `main` until the person presses Enter, then resumes — reading like synchronous code while still being non-blocking under the hood. See [Async/Await](../08-asynchronous-javascript/async-await.md) for how this desugars to promises.

## Method 3: `process.stdin` directly (low-level)

More manual, but worth knowing because some environments (and some interview platforms) don't expose `readline`.

```js
process.stdin.on("data", (data) => {
  const input = data.toString().trim();
  console.log("You typed:", input);
  process.exit();
});
```

`data` arrives as a `Buffer`; `toString()` decodes it to a regular string (UTF-8 by default). Converting types from here is the same idea as with `readline`:

```js
const num = Number(input);
const bool = input === "true";
const char = input[0];
```

## Choosing between them

| Method | Style | Good for |
| --- | --- | --- |
| `readline` (callback) | Callback-based | Quick scripts, one or two prompts |
| `readline/promises` | `async`/`await` | Multiple sequential prompts, cleanest to read |
| `process.stdin` | Event-based, low-level | Competitive-programming style, reading a whole block of piped input at once |
| `readline-sync` (third-party) | Fully synchronous | Simple scripts where blocking the event loop is acceptable |

### A note on `readline-sync`

A practice file (`bubbolesort.js`) uses the third-party `readline-sync` package, which gives a truly **blocking** `question()` call — convenient for small CLI exercises because there is no callback or `await` needed:

```js
const readline = require("readline-sync");
const n = Number(readline.question("Enter number of elements: "));
```

:::warning `required(...)` is not a real function
The source file had `var readline = required('readline-sync');` — note the extra `d`. `required` is not defined anywhere, so this throws `ReferenceError: required is not defined` immediately. The correct call is `require('readline-sync')`. This is covered in more depth, together with the missing sort logic in the same file, in [Searching, Math and Recursion](./searching-math-recursion.md#bubble-sort-and-a-broken-read-array-script).
:::

`readline-sync` blocks the entire event loop while waiting for input, which is fine for a short script but is never appropriate in a server or any code that needs to stay responsive — use `readline` or `readline/promises` there instead.

## Common conversion mistakes

### Forgetting to convert numbers

```js
const input = "5"; // from readline, always a string
console.log(input + 5); // "55" — string concatenation, not addition!
console.log(Number(input) + 5); // 10 — correct
```

`+` concatenates when **either** operand is a string. This is the single most common bug in CLI input handling — see [Implicit Coercion](../02-types-and-coercion/implicit-coercion.md) for the full rule.

### Not trimming whitespace / the trailing newline

`readline`'s callback already strips the trailing newline, but input read from `process.stdin` directly or piped from a file often has one:

```js
process.stdin.on("data", (data) => {
  const input = data.toString().trim(); // remove \n, \r, leading/trailing spaces
});
```

Skipping `trim()` means a comparison like `input === "yes"` silently fails against `"yes\n"`.

### Forgetting to call `rl.close()`

```js
rl.question("Name: ", (name) => {
  console.log(name);
  // missing rl.close() — the process never exits, it just hangs
});
```

An open `readline` interface keeps `process.stdin` in a mode that prevents Node from exiting on its own. Always call `rl.close()` once you are done asking questions.

:::tip Converting types: quick reference
| From string `s` | To | Expression |
| --- | --- | --- |
| `"42"` | number | `Number(s)` or `+s` or `parseInt(s, 10)` |
| `"3.14"` | number | `Number(s)` or `parseFloat(s)` |
| `"true"` | boolean | `s.toLowerCase() === "true"` |
| `"abc"` | first character | `s[0]` |
| `" 42 \n"` | trimmed string | `s.trim()` |
:::

## Interview questions

1. **Why does `rl.question("Enter number: ", (n) => { ... })` need `Number(n)` before doing math?** Everything read from the terminal arrives as a string. `"5" + 5` is `"55"` (concatenation); `Number("5") + 5` is `10` (addition).
2. **What is the difference between `readline` and `readline/promises`?** Same underlying interface; `readline` takes a callback per `question()` call (leading to nested callbacks for multiple prompts), while `readline/promises` returns a promise so you can `await` each question sequentially.
3. **Why might `process.stdin.on("data", ...)` give you input with extra characters compared to `rl.question`?** `readline` strips the trailing newline for you; raw `process.stdin` data includes whatever the terminal sent, including `\n`/`\r`, so you must `trim()` it yourself.
4. **What happens if you forget to call `rl.close()`?** The Node process keeps running indefinitely because an open `readline` interface keeps `stdin` listened to; the script never exits on its own.
5. **Why does `required('readline-sync')` throw instead of silently failing?** `required` was never declared anywhere, so referencing it as a function call throws `ReferenceError: required is not defined` — the typo for `require` is not something JavaScript can guess at.
6. **Is `readline-sync` a good choice for a web server?** No — it blocks the entire event loop while waiting for input, which would stall every other request being handled by that process. It's acceptable only for short-lived scripts and simple CLI exercises.
