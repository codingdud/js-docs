---
title: Data Types and Operators
sidebar_position: 2
---

# Data Types and Operators

JavaScript has 7 **primitive** types plus one catch-all non-primitive type, the object. This page covers telling them apart, the operators for combining/comparing values, and the main control-flow operators.

## Primitive vs non-primitive types

| Category | Types | Notes |
| --- | --- | --- |
| Primitive | `string`, `number`, `boolean`, `undefined`, `null`, `symbol`, `bigint` | Immutable, compared **by value** |
| Non-primitive | `object` (plain objects, arrays, functions, dates, maps, sets, regexes, classes...) | Mutable, compared **by reference** |

```js
const s = "hi";          // string
const n = 42;             // number
const big = 42n;          // bigint
const b = true;           // boolean
const u = undefined;      // undefined
const nul = null;         // null
const sym = Symbol("id"); // symbol

const arr = [1, 2, 3]; // object (array)
const obj = { a: 1 };  // object
function fn() {}       // object (function is callable)
```

## Pass by value vs pass by reference

Primitives are copied **by value** (independent). Objects/arrays/functions are copied **by reference** (same underlying object).

```js
let x = 5;
let y = x;
y = 10;
console.log(x); // 5 — unaffected

const obj = { a: 1 };
const copy = obj;   // "copy" points to the SAME object
copy.a = 5;
console.log(obj.a); // 5 — mutation visible through both references
```

:::warning
`const copy = obj` copies the *reference*, not the object. For an independent copy use `{ ...obj }`, `Object.assign({}, obj)`, or `structuredClone(obj)` for a deep copy. See [Shallow vs Deep Copy](../04-objects/shallow-vs-deep-copy.md).
:::

## `typeof` and how to check types correctly

```js
typeof "hi";         // "string"
typeof 42;            // "number"
typeof 42n;           // "bigint"
typeof true;          // "boolean"
typeof undefined;     // "undefined"
typeof Symbol();      // "symbol"

typeof null;          // "object"   <- historical bug
typeof {};             // "object"
typeof [];             // "object"  <- arrays are objects too
typeof function(){};  // "function"
typeof class {};       // "function" <- classes are functions under the hood
typeof typeof 1;      // "string"  <- typeof always returns a string
```

:::warning
`typeof null === "object"` is a bug baked into JavaScript since 1995, permanent for compatibility. Never rely on `typeof x === "object"` alone to test for a real object — check `x !== null` too.
:::

`typeof []` and `typeof {}` are both `"object"`, so it can't tell arrays from plain objects — use `Array.isArray()`:

```js
Array.isArray([1, 2, 3]); // true
Array.isArray({});         // false
```

## Symbols

A `Symbol` is a primitive **guaranteed unique**, even with an identical description — used as collision-free object keys.

```js
const id1 = Symbol("id");
const id2 = Symbol("id");
console.log(id1 === id2); // false — always unique

const user = { name: "Alice", [id1]: 12345 }; // invisible to for...in / JSON.stringify
console.log(user[id1]); // 12345
```

## BigInt

Primitive for integers larger than `Number.MAX_SAFE_INTEGER` (2^53 - 1), written with an `n` suffix. Can't mix with `Number` in arithmetic.

```js
const big = 9007199254740993n;
console.log(big + 1n);        // 9007199254740994n
console.log(typeof big);      // "bigint"
// console.log(big + 1); // TypeError: Cannot mix BigInt and other types
console.log(big + BigInt(1)); // 9007199254740994n — convert first
```

## Logical operators return a value, not just `true`/`false`

`&&`/`||` return one of their **actual operands** — useful for defaults and guards.

```js
console.log(false || "JS");   // "JS" — || returns the first truthy operand
console.log(true && "ES6");   // "ES6" — && returns the second operand if the first is truthy
console.log(0 || "fallback"); // "fallback" — 0 is falsy
console.log("hi" && "there"); // "there" — both truthy, && returns the last
```

### Short-circuit evaluation

Both stop evaluating as soon as the result is decided — the untouched side never runs.

```js
function logAndReturn(val) { console.log("evaluated:", val); return val; }

false && logAndReturn("never runs"); // nothing logged — short-circuits on falsy
true || logAndReturn("never runs");  // nothing logged — short-circuits on truthy
```

This is why `user && user.name` is a safe guard: `user.name` is never evaluated if `user` is nullish.

## Ternary operator

A compact `if`/`else` that produces a value:

```js
const age = 20;
const status = age >= 18 ? "adult" : "minor";
console.log(status); // "adult"
```

## `++i` vs `i++`

- `i++` (postfix) — returns the **old** value, then increments.
- `++i` (prefix) — increments first, then returns the **new** value.

```js
let x = 5;
console.log(x++ + ++x);
// x++ -> 5 (old value), x becomes 6
// ++x -> x becomes 7, evaluates to 7
// 5 + 7 = 12
// -> 12
console.log(x); // 7
```

## Optional chaining (`?.`)

Short-circuits to `undefined` instead of throwing when a property/method along the chain is `null`/`undefined`:

```js
const user = { profile: null };

console.log(user.profile.name);   // TypeError: Cannot read properties of null
console.log(user.profile?.name);  // undefined — short-circuits safely
console.log(user.greet?.());      // undefined — also works for optional calls
```

See [`undefined`, `null`, `NaN` and Nullish Operators](./null-undefined-nan.md) for how `?.` combines with `??`.

## Spread operator

`...` expands an iterable (array, string, or object's own properties) into individual elements:

```js
const nums = [1, 2, 3];
const more = [...nums, 4, 5]; // [1, 2, 3, 4, 5]

const base = { a: 1, b: 2 };
const extended = { ...base, c: 3 }; // { a: 1, b: 2, c: 3 }

function sum(a, b, c) { return a + b + c; }
console.log(sum(...nums)); // 6
```

## `if-else` vs `switch`

| | `if-else` | `switch` |
| --- | --- | --- |
| Best for | Ranges, complex boolean expressions, few conditions | Many branches comparing **one value** against exact options |
| Comparison | Any expression (`<`, `>`, `&&`, calls...) | Strict equality (`===`) against `case` values |
| Fall-through | N/A | Falls through unless you `break` |
| Readability | Clear for 1-3 conditions | Clearer than a long `if-else` chain for many cases |

```js
function describe(day) {
  switch (day) {
    case "Sat":
    case "Sun":
      return "Weekend";
    case "Mon":
    case "Tue":
    case "Wed":
    case "Thu":
    case "Fri":
      return "Weekday";
    default:
      return "Unknown";
  }
}
console.log(describe("Sat")); // "Weekend"
```

## Question bank: answers

**What are JavaScript data types?** 7 primitives (`string`, `number`, `boolean`, `undefined`, `null`, `symbol`, `bigint`) plus the non-primitive `object`.

**Difference between primitive and non-primitive types?** Primitives are immutable, compared by value; objects are mutable, compared by reference.

**What is `typeof null` and why?** `"object"` — a long-standing engine bug from JavaScript's first release, kept for compatibility.

**What is `NaN`?** "Not a Number" — result of an invalid numeric operation; `typeof` is `"number"`; it's the only value not equal to itself. Full details: [`undefined`, `null`, `NaN`](./null-undefined-nan.md).

**Difference between `undefined` and `null`?** `undefined` = declared but never assigned (engine-set); `null` = intentional absence of value (developer-set).

**What are symbols?** Unique, immutable primitives, typically used as collision-free object keys.

**What is `BigInt`?** A primitive for arbitrary-precision integers beyond `Number.MAX_SAFE_INTEGER`, written with an `n` suffix.

**Difference between `==` and `===`?** `===` compares value and type with no conversion; `==` converts operands to a common type first.

**What is type coercion?** Automatic conversion from one type to another when an operator/context needs it — e.g. `1 + "2"` → `"12"`.

**What are logical operators?** `&&` (AND), `||` (OR), `!` (NOT) — `&&`/`||` return an operand, not a strict boolean.

**What is the ternary operator?** `condition ? valueIfTrue : valueIfFalse`.

**Difference between `++i` and `i++`?** `++i` increments then returns the new value; `i++` returns the old value then increments.

**What is the spread operator?** `...` expands an array/object/string into individual elements or properties.

**What is optional chaining?** `?.` — accesses/calls only if the preceding chain isn't `null`/`undefined`, else short-circuits to `undefined`.

**What are conditional statements?** `if`/`else if`/`else` and `switch`.

**Difference between `if-else` and `switch`? / When should you use switch?** See the comparison table above.

**What is short-circuit evaluation?** `&&`/`||` stop evaluating once the overall result is known.

## Key takeaways

- JavaScript has 7 primitive types and one non-primitive type (`object`), which covers arrays, functions, and class instances too.
- Primitives copy by value; objects copy by reference — `copy = obj` shares the same object, it doesn't clone it.
- `typeof null` is `"object"` (a bug); use `Array.isArray()` instead of `typeof` to detect arrays.
- `&&`/`||` return operand values and short-circuit; this is the backbone of default-value and guard patterns.
- `switch` shines when comparing one value against many exact cases; `if-else` is better for ranges and compound conditions.

Next: the trickiest primitives in the language — [`undefined`, `null`, `NaN` and Nullish Operators](./null-undefined-nan.md).
