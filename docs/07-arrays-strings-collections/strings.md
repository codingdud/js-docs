---
title: "Strings: Escapes, Conversion and Methods"
sidebar_position: 3
---

Strings are JavaScript's immutable text type. This page covers escape sequences and template literals, the `String` wrapper object and its gotchas, number/string conversion edge cases, the character/code-point APIs, slicing, reversing (and the emoji caveat), and why strings can't be mutated in place.

## Escape sequences and template literals

Backslash escapes let you embed special characters inside a string literal:

```js
let a = "Hello, \' \" \\World!";
console.log(a); // Hello, ' " \World!

console.log("name\tage\tlocation"); // name <TAB> age <TAB> location
console.log("John\t25\tUSA");
console.log("line1\nline2\nline3");
// line1
// line2
// line3

console.log("hello world\vThis is a vertical tab:\v"); // \v = vertical tab (rarely used)

let strWithNull = "Hello\0World"; // \0 embeds a NUL character — valid but easy to mishandle
console.log(strWithNull);
```

Template literals (backtick strings) support multi-line text and `${...}` interpolation directly, which is far more readable than manual escaping and concatenation:

```js
let a = "Hello, \' \" \\World!";
let b = `multi-line string ${a}
 with formatting options.`;
console.log(b);
// multi-line string Hello, ' " \World!
//  with formatting options.
```

## The `String` wrapper object

`new String(value)` creates a **wrapper object**, not a primitive string, and it behaves differently in ways that catch people out:

```js
let strnum = new String(123);
console.log(strnum);          // [String: '123']
console.log(typeof strnum);   // "object"  <-- not "string"!

console.log(strnum == "123");   // true  — == coerces the wrapper to its primitive value
console.log(strnum === "123");  // false — === compares object identity, not value

console.log(Boolean(new String(""))); // true — an EMPTY string wrapper is still truthy,
                                       // unlike the primitive "" which is falsy!
```

:::warning Never construct strings with `new String(...)`
Primitive string literals (`"text"`, `` `text` ``) are what you almost always want. `new String(...)` only exists for rare interop cases and introduces `typeof` and truthiness surprises that have no benefit in return. Use `String(value)` (without `new`) to convert something to a primitive string instead.
:::

## Number ⇄ string conversion edge cases

Converting between numbers and strings has several non-obvious rules worth memorizing.

```js
let num = "42";
let convertedNum = Number(num);
console.log(convertedNum);        // 42
console.log(typeof convertedNum); // "number"

let floatNum = "3.1234244";
console.log(parseFloat(floatNum)); // 3.1234244 — keeps the decimal part
console.log(parseInt(floatNum));   // 3          — stops at the first non-digit (the '.')
```

`parseInt` reads as many valid digits as it can from the start of the string (after an optional sign) and stops at the first character that isn't part of a number — it does **not** throw or round, it just truncates:

```js
console.log(parseInt("13432.435"));   // 13432   — stops at '.'
console.log(parseInt("+24323424"));   // 24323424
console.log(parseInt("-3422.423"));   // -3422   — sign is honored, decimal part is dropped
console.log(parseInt("08"));          // 8  (modern JS always parses base 10 unless told otherwise)
console.log(parseInt("f", 16));       // 15 — radix 16 reads hex digits
console.log(parseInt("Hello"));       // NaN — no parseable digits at all
```

`Number(...)` is stricter: it tries to convert the **whole** string, and only succeeds if the entire (trimmed) string is a valid numeric literal.

```js
console.log(Number(""));         // 0   — an empty (or whitespace-only) string converts to 0
console.log(Number("   "));      // 0
console.log(Number("42abc"));    // NaN — trailing junk makes the WHOLE conversion fail
console.log(parseInt(""));       // NaN — there is no leading digit to parse at all
```

:::note Number('') is 0, not a bug
`Number("")` returning `0` is correct, specified behavior — the `ToNumber` abstract operation treats an empty or whitespace-only string as `0`. (`Number(null)` is also `0`, but `Number(undefined)` is `NaN` — each of those three has its own rule in the spec.) `parseInt("")`, by contrast, is `NaN` because `parseInt` looks for at least one leading digit to parse and finds none. The two functions use different algorithms, so it's expected that they disagree here — this isn't a JavaScript defect, just a reason to know which one you're calling.
:::

## Character and code point APIs

JavaScript strings are sequences of UTF-16 **code units**, and most of the character-level API operates at that level — which matters once you leave the Basic Multilingual Plane (emoji, some CJK characters, etc.).

```js
"A".charCodeAt(0);              // 65   — UTF-16 code unit at index 0
String.fromCharCode(65);        // "A"  — build a string from UTF-16 code units
String.fromCodePoint(128512);   // "😀" — fromCodePoint supports full Unicode code points (> 0xFFFF)
"😀".codePointAt(0);            // 128512 — the full code point, combining the surrogate pair
"😀".charCodeAt(0);             // 55357  — only the HIGH SURROGATE half of the pair!
"😀".at(0);                     // "\ud83d" — one UTF-16 code unit, not the whole emoji
"😀".length;                    // 2 — two UTF-16 code units
[..."😀"].length;                // 1 — spreading iterates by code point, giving the real count
```

`String.fromCharCode` can only build characters from 16-bit code units, so it cannot directly produce a character outside the BMP in one call; `String.fromCodePoint` is the version that understands full Unicode code points, including emoji.

```js
let temp = "string";
temp += String.fromCharCode(99, 111, 100, 101); // "code"
console.log(temp); // "stringcode"

console.log(temp.at(0).codePointAt(0)); // 115 — "s" is code point 115
```

A loop combining several of the character APIs:

```js
const sent = "Hello World";
for (let i = 0; i < sent.length; i++) {
  console.log(sent.charCodeAt(i));           // UTF-16 code unit at index i: 72, 101, 108, ...
  console.log(String.fromCodePoint(65 + i)); // unrelated demo: "A", "B", "C", ...
}
```

This loop is really two unrelated demonstrations running side by side (reading code units from `sent`, and building letters starting from `"A"`) rather than two views of the same data — worth separating in real code so the output isn't confusing.

## `slice` vs `substring`, `indexOf`, `split`, and `new Set(str)`

```js
const sent = "Hello World";

console.log(sent.slice(1, 4));     // "ell"
console.log(sent.substring(1, 4)); // "ell" — same result here

console.log(sent.indexOf("o"));    // 4 — index of the first "o"

const words = sent.split(" ");
console.log(words); // ["Hello", "World"]

console.log(new Set(sent));
// Set(8) { 'H', 'e', 'l', 'o', ' ', 'W', 'r', 'd' }
// — a string is iterable, so `new Set(str)` dedups it down to its unique characters
```

`slice` and `substring` agree on positive indices, but they diverge on negative or swapped arguments: `slice` treats a negative index as "count from the end," while `substring` clamps negative/`NaN` arguments to `0` and silently swaps `start`/`end` if `start > end`. Prefer `slice` — its behavior is the more predictable, consistent one.

## Reversing a string — and the emoji/surrogate caveat

The classic one-liner:

```js
let str = "Animesh kumar";
console.log(str.split("").reverse().join("")); // "ramuk hsemina"
```

`split("")` splits the string into an array of **UTF-16 code units**, not "characters" in the human sense. For plain ASCII/Latin text that's the same thing, so the reversal above works fine. But any character made of a surrogate pair (most emoji, and some rarer scripts) gets torn in half:

```js
const emojiStr = "Hi 👍 team";

console.log(emojiStr.split("").reverse().join(""));
// "maet \udc4d\ud83d iH" — garbled: splitting by UTF-16 code unit tears the
// emoji's surrogate pair apart, and reversing swaps their order (low before
// high). That pairing never decodes back to 👍 — most consoles render it as
// replacement glyphs instead of a flipped emoji.

console.log([...emojiStr].reverse().join(""));
// "maet 👍 iH" — correct: the spread operator iterates by Unicode CODE POINT,
// keeping each surrogate pair intact.
```

:::warning split("") is not Unicode-safe
`str.split("")` (and indexing a string with `str[i]`) walks UTF-16 code units. `[...str]`, `Array.from(str)`, and `for...of` walk Unicode code points instead, which correctly keeps surrogate pairs together. Neither approach is perfect for emoji built from *multiple* code points (skin-tone modifiers, flag sequences, ZWJ families) — for fully grapheme-aware text processing, use `Intl.Segmenter`.
:::

## `Number(x).toString(radix)`

Numbers can render themselves in any base from 2 to 36 via `toString(radix)`:

```js
console.log(Number(12).toString(2));  // "1100"  — binary
console.log(Number(255).toString(16)); // "ff"   — hexadecimal
```

## Why strings are immutable

Strings in JavaScript cannot be changed in place — every "modification" (`toUpperCase()`, concatenation, `replace()`, ...) returns a **brand-new** string, leaving the original untouched:

```js
let s = "hello";
s.toUpperCase();
console.log(s); // "hello" — unchanged; toUpperCase() returned a new string that was discarded
s = s.toUpperCase();
console.log(s); // "HELLO" — now s itself was reassigned
```

Immutability is a deliberate design choice, not a limitation:

- **Safety by default** — passing a string into a function is guaranteed not to mutate it from under you, unlike arrays/objects.
- **Interning / sharing** — because a string value can never change, the engine can safely reuse (intern) the same underlying memory for identical string literals instead of copying them.
- **Hashability** — immutable values make safe, cacheable object/`Map` keys, since their hash can't change after insertion.

## Implicit global variables — a gotcha hiding in plain scripts

A line like `temp = '';` with no `let`/`const`/`var` doesn't error in a non-strict, non-module script — it silently creates a **global** variable (a property on the global object) the first time it's assigned:

```js
// top-level script, no "use strict", no import/export
temp = '';
console.log(typeof temp); // "string" — a global was created without any declaration
```

This is easy to trip over in loose scratch files, because the mistake produces no warning at all. Two ways to catch it:

- Add `"use strict";` at the top of the file (or write an ES module, which is strict by default) — then the same line throws `ReferenceError: temp is not defined`.
- Always declare variables explicitly with `let` or `const` before assigning to them.

:::warning
Non-strict mode lets any undeclared assignment silently become a global variable. In real projects this is almost always a typo (a missing `let`/`const`, or a misspelled variable name) rather than something intentional — enable strict mode / use modules so the engine catches it for you.
:::

## Key takeaways

- Template literals beat manual escaping + concatenation for anything multi-line or interpolated.
- `new String(...)` makes an object wrapper with `typeof` `"object"` and surprising truthiness — use the bare `String(value)` function instead.
- `Number("")` is `0` by specification; `parseInt("")` is `NaN` because it has nothing to parse — they are different algorithms, not a bug.
- `parseInt` parses leading digits and stops at the first invalid character; `Number` requires the whole string to be numeric.
- `charCodeAt`/`fromCharCode` operate on UTF-16 code units; `codePointAt`/`fromCodePoint` and spread (`[...str]`) operate on full Unicode code points — use the code-point versions for emoji and other astral-plane characters.
- `slice` is the safer, more predictable choice over `substring` for ranges.
- `str.split("").reverse().join("")` is not Unicode-safe for surrogate pairs; `[...str].reverse().join("")` is.
- Strings are immutable: every string method returns a new string rather than changing the original.
- An assignment to an undeclared variable in non-strict code silently creates a global — use strict mode/modules to catch it.

## Interview questions

**Q: Why is `new String("x") === "x"` false, but `new String("x") == "x"` true?**
`new String("x")` is an object wrapper, not a primitive. `===` compares object identity (an object is never `===` to a primitive), while `==` first coerces the wrapper to its primitive value via `ToPrimitive`, after which the comparison succeeds.

**Q: Is `Number("")` returning `0` a bug?**
No — it's specified behavior: `ToNumber` treats an empty or whitespace-only string as `0`. `parseInt("")` returning `NaN` isn't inconsistent with that; `parseInt` simply requires at least one leading digit to parse, and finds none.

**Q: Why does reversing a string with emoji sometimes produce garbage?**
`split("")` operates on UTF-16 code units. Characters outside the Basic Multilingual Plane (most emoji) are stored as a *pair* of code units (a surrogate pair). Splitting and reversing by code unit tears that pair apart. Iterating by code point instead — `[...str]`, `Array.from(str)`, `for...of` — keeps each surrogate pair intact.

**Q: Why are strings immutable in JavaScript?**
So that string values can be safely shared (interned) across variables and used as reliable, hashable keys, and so that passing a string into a function can never let that function silently mutate the caller's data.

**Q: What happens if you assign to a variable you never declared?**
In non-strict code, it silently creates a global variable. In strict mode (or inside an ES module, which is strict by default), it throws `ReferenceError`.

See also [Implicit Coercion](../02-types-and-coercion/implicit-coercion.md) for more on `Number`/string coercion, and [Data Types and Operators](../01-basics/data-types-and-operators.md) for the primitive type overview.
