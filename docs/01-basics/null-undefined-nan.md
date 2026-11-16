---
title: "undefined, null, NaN and Nullish Operators"
sidebar_position: 3
---

# `undefined`, `null`, `NaN` and Nullish Operators

These three values cause the most interview trick questions in JavaScript. This page covers the comparisons, gotchas, and the operators (`?.`, `??`) built to handle them safely.

## `undefined` vs `null`

| Feature | `undefined` | `null` |
| --- | --- | --- |
| Meaning | Variable declared but not (yet) assigned | Intentional, explicit absence of a value |
| Set by | The JavaScript engine (default) | The developer |
| `typeof` | `"undefined"` | `"object"` (historical bug) |
| Has a default value | Yes — default for an uninitialised binding | No — must be assigned |
| `JSON.stringify` behaviour | Property **omitted** | Property kept, serialised as `null` |

```js
let a;        // undefined — declared, not assigned
let b = null; // null — explicitly "no value"
```

### Why is `typeof null === "object"`?

A bug since JavaScript's first release in 1995 (how values were tagged internally). `null` is a genuine primitive, but fixing `typeof` now would break the web, so it stays permanent:

```js
typeof null;      // "object" — bug, not a design choice
typeof undefined; // "undefined" — correct
```

### `undefined` vs "not defined"

```js
let x;
console.log(x); // undefined — the variable exists, just has no value
console.log(y); // ReferenceError: y is not defined — never declared
```

| Term | Meaning |
| --- | --- |
| `undefined` | The variable/property exists but holds no value |
| "not defined" / `ReferenceError` | The identifier was never declared in any accessible scope |

## Equality: the one pair that's `==` but not `===`

```js
null == undefined;  // true  — the ONLY case where these two are loosely equal
null === undefined; // false — different types

null == 0;      // false — null does NOT coerce to 0 for ==
undefined == 0; // false — same here
```

:::warning
`null == undefined` is a special rule written into the spec — `null` and `undefined` are loosely equal to **each other and nothing else**. Don't assume `null` behaves like `0` or `""` under `==`.
:::

## The 8 falsy values

```js
false
0
-0
0n        // BigInt zero
""
null
undefined
NaN
```

Everything else — including `"0"`, `"false"`, `[]`, and `{}` — is truthy.

```js
Boolean(null);      // false
Boolean(undefined); // false
Boolean("0");        // true — non-empty string
Boolean([]);          // true — an object, even empty, is truthy
```

## `NaN`

`NaN` ("Not a Number") is the result of an invalid numeric operation.

```js
typeof NaN;   // "number" — NaN is still of type number
NaN === NaN;  // false — NaN is the only value never equal to itself
```

Test for it with `Number.isNaN()`, not the misleading global `isNaN()`:

```js
Number.isNaN(NaN);      // true
Number.isNaN("hello");  // false — does NOT coerce first

isNaN("hello"); // true — global isNaN coerces "hello" to a number (NaN) first
isNaN(NaN);      // true
```

:::warning
Prefer `Number.isNaN()`. The global `isNaN()` coerces its argument first, so non-numeric strings like `"hello"` are misleadingly reported as `NaN`.
:::

## Arithmetic with `null` and `undefined`

```js
null + 1;       // 1   — null coerces to 0
undefined + 1;  // NaN — undefined coerces to NaN, which poisons arithmetic
```

## Default parameters only trigger on `undefined`

```js
function test(x = 10) {
  console.log(x);
}

test(undefined); // 10   — undefined triggers the default
test(null);       // null — treated as a deliberate value, no default
test();            // 10   — a missing argument is undefined
```

## Optional chaining (`?.`) and nullish coalescing (`??`)

Both treat only `null`/`undefined` as "nullish" — not other falsy values like `0` or `""`.

```js
const user = { profile: null };
user.profile?.name;     // undefined — stops safely instead of throwing
user.sayHi?.();          // undefined — also works before calling a method

const count = 0;
console.log(count ?? 10); // 0  — 0 is not nullish, so ?? keeps it
console.log(count || 10); // 10 — 0 IS falsy, so || replaces it
```

:::warning
`||` falls back on **any falsy value** (`0`, `""`, `false`, `NaN`, `null`, `undefined`). `??` only falls back on `null`/`undefined`. If a valid value can legitimately be `0`, `""`, or `false`, use `??`, not `||`.
:::

## `Object.is()`: when `===` isn't precise enough

```js
Object.is(NaN, NaN);  // true  — Object.is treats NaN as equal to itself
NaN === NaN;            // false — === does not

Object.is(+0, -0);     // false — distinguishes positive and negative zero
+0 === -0;               // true  — === treats them as equal
```

## Reference types are never equal by value

```js
[] === [];     // false — two different array objects, even both empty
({}) === ({}); // false — same story for object literals
```

:::note
Wrap an object literal in parentheses (`({})`) when it starts a statement — bare `{}` there parses as an empty **block statement**, not an object literal.
:::

Both are `false` because each literal creates a brand-new object; `===`/`==` compare objects by **reference**, never structural content.

## `JSON.stringify` and `undefined`

```js
JSON.stringify({ a: undefined }); // '{}'         — undefined properties dropped
JSON.stringify({ a: null });       // '{"a":null}' — null properties kept
```

JSON has no concept of `undefined`, so it simply omits those keys.

## Lightning round

```js
null == undefined;   // true
null === undefined;  // false
typeof undefined;     // "undefined"
typeof null;           // "object"
NaN === NaN;            // false
Number.isNaN(NaN);      // true
null + 1;                // 1
undefined + 1;           // NaN
0 ?? 10;                  // 0
0 || 10;                  // 10
```

## One-line interview answer

> `undefined` means a variable exists but has no value yet (set by the engine); `null` means an intentional, explicit absence of a value (set by the developer); and because `==` triggers type coercion, always prefer `===` plus `??`/`?.` for safe, predictable checks.

## Key takeaways

- `undefined` and `null` are loosely equal to each other and to nothing else.
- `typeof null === "object"` is a known engine bug, not a reflection of `null`'s real (primitive) type.
- There are exactly 8 falsy values; everything else, including `"0"` and `[]`, is truthy.
- `NaN !== NaN` — always check with `Number.isNaN()`, never `isNaN()` on untyped input.
- `??`/`?.` react only to `null`/`undefined`; `||` reacts to every falsy value — pick the one that matches your intent.

Continue to [Loops and Iteration](./loops-and-iteration.md).
