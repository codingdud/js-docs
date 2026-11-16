---
title: Tricky Edge Cases and Output Questions
sidebar_position: 1
---

Every JavaScript interview eventually turns into a "what does this log?" quiz. None of the snippets below rely on anything exotic — they all fall out of rules covered elsewhere in this site ([type coercion](../02-types-and-coercion/coercion-overview.md), [hoisting](../03-functions-and-scope/execution-context-and-hoisting.md), [scope](../03-functions-and-scope/scope-chain-and-shadowing.md)) applied in a slightly unusual combination. This page collects the ones that trip people up most often, verified against a real engine rather than copied from memory.

:::tip How to use this page
Don't just read the answers. Cover the comment, predict the output yourself, then check. The value of these questions is in noticing *which rule* you forgot, not in memorizing 40 outputs.
:::

## Number edge cases

Floating point, division by zero, and the string-to-number conversions all have well-defined but surprising behavior.

```js
console.log(0.1 + 0.2 === 0.3);   // false
console.log(0.1 + 0.2);           // 0.30000000000000004

console.log(Math.max());          // -Infinity
console.log(Math.min());          // Infinity

console.log(1 / 0);               // Infinity
console.log(-1 / 0);               // -Infinity
console.log(0 / 0);               // NaN

console.log(parseInt("08"));      // 8
console.log(parseInt("f", 16));   // 15
console.log(parseInt("Hello"));   // NaN

console.log(Number(""));          // 0
console.log(+" ");                 // 0
```

- **`0.1 + 0.2 !== 0.3`** — JavaScript numbers are IEEE‑754 doubles. `0.1` and `0.2` can't be represented exactly in binary, so their sum is `0.30000000000000004`, a different bit pattern than `0.3`. Compare with a tolerance (`Math.abs(a - b) < Number.EPSILON`) instead of `===` when you need exact decimal comparisons.
- **`Math.max()` is `-Infinity`**, and **`Math.min()` is `Infinity`** — with no arguments, `Math.max` starts from the "worst possible" value for a maximum and never finds anything larger, so it returns it unchanged. Same logic in reverse for `Math.min`.
- **`parseInt("08")` is `8`**, not `0`. This trips up people who remember the old (pre-ES5) behavior, where a leading `0` made `parseInt` guess octal and `"08"` parsed as invalid-then-`0`. Since ES5, `parseInt` always defaults to base 10 unless you tell it otherwise (or the string starts with `0x`/`0X`).
- **`Number("")` is `0`**, not `NaN`. An empty (or whitespace-only) string converts to `0` under the `ToNumber` abstract operation — only a string with non-whitespace, non-numeric characters converts to `NaN`.

## Equality madness

`==` ("loose equality") runs type coercion before comparing; `===` ("strict equality") never does. The full [loose equality reference](../02-types-and-coercion/loose-equality.md) covers the formal algorithm — here's the cheat sheet of the classic gotchas:

| Expression | Result | Why |
|---|---|---|
| `null == undefined` | `true` | Special-cased: they're loosely equal to each other and to nothing else |
| `null === undefined` | `false` | Different types, and `===` never coerces |
| `0 == ""` | `true` | `""` converts to `0` |
| `0 == "0"` | `true` | `"0"` converts to `0` |
| `"" == "0"` | `false` | Both are strings already — no coercion happens, and the strings differ |
| `false == "false"` | `false` | `"false"` converts to `NaN`, not `0` |
| `false == "0"` | `true` | `"0"` converts to `0`, which `== false` |
| `false == null` | `false` | `null` and `undefined` are only loosely equal to each other |
| `false == undefined` | `false` | Same reason |
| `[1] > null` | `true` | `[1]` converts to `"1"` then `1`; `null` converts to `0` for relational comparisons |
| `NaN === NaN` | `false` | `NaN` is the one value that is never equal to itself |

:::warning NaN and -0 need their own equality check
`===` can't tell `NaN` from itself, and it says `+0 === -0` is `true`, erasing the sign. **`Object.is()`** fixes both:

```js
console.log(Object.is(NaN, NaN));   // true
console.log(Object.is(+0, -0));     // false
console.log(+0 === -0);              // true
```

Use `Object.is` for `NaN`/`-0`-sensitive checks (e.g. in `Array.prototype.includes`-style logic); use `===` for everything else.
:::

## typeof surprises

```js
console.log(typeof null);              // "object"
console.log(typeof undefined);         // "undefined"
console.log(typeof NaN);               // "number"
console.log(typeof function () {});    // "function"
console.log(typeof class {});          // "function"
console.log(typeof (() => {}));        // "function"
console.log(typeof typeof 1);          // "string"
```

`typeof null` returning `"object"` is a 25-year-old bug baked into the language from JavaScript's very first implementation — `null`'s internal type tag happened to be `0`, the same tag objects used, and it has never been fixed because doing so would break the web. Treat it as a historical fact to memorize, not something to reason about. `typeof typeof 1` is just `typeof` applied twice: `typeof 1` is the string `"number"`, and `typeof "number"` is `"string"`.

## Object key coercion

Object (and array) keys are always coerced to strings (or `Symbol`s), even when you use an object as the key:

```js
const a = {};
const b = { key: "b" };
const c = { key: "c" };

a[b] = 123;
a[c] = 456;

console.log(a[b]); // 456
```

Both `b` and `c` get converted to the same string — `"[object Object]"` — by `ToPropertyKey`, so `a[c] = 456` silently overwrites the `a[b] = 123` entry; there's only ever one property on `a`. If you need objects as keys without this collision, reach for a [`Map`](../07-arrays-strings-collections/map-and-weakmap.md), which keys by reference identity.

## Duplicate function parameters

```js
function foo(a, a) {
  console.log(a);
}
foo(1, 2); // 2
```

In non-strict mode, a repeated parameter name is legal, and later arguments simply overwrite earlier ones with the same name — `a` ends up bound to the last matching argument. In `"use strict"` functions (including class bodies and modules), this is a `SyntaxError` at parse time.

## The ASI return trap

Automatic Semicolon Insertion (ASI) inserts a semicolon after `return` if a newline immediately follows it, because `return` is one of the "restricted productions" that can't have a line terminator before its operand:

```js
function test() {
  return
  {
    name: "test"
  };
}

console.log(test()); // undefined
```

JavaScript reads this as `return;` followed by an unreachable block statement, not `return { name: "test" };`. The fix is always the same: start the returned object literal on the same line as `return`, or wrap it in parentheses:

```js
function test() {
  return {
    name: "test",
  };
}
```

## The null-statement for-loop bug

:::warning Correcting a common mistake
A version of this example circulates with the comment `// [5] (not [1,2,3,4,5])`. That's wrong on two counts — run it, and the actual behavior depends entirely on whether the loop variable is `var` or `let`.
:::

```js
var numbers = [];
for (var i = 0; i < 5; i++); // <-- note the semicolon: this is the whole loop body
{
  numbers.push(i + 1);
}
console.log(numbers); // [6]
```

The trailing `;` after the `for (...)` header makes the loop's body an **empty statement**. The `{ numbers.push(i + 1); }` block that follows is not the loop body at all — it's a separate, ordinary block statement that happens to run once, after the loop has already finished. With `var`, `i` is function/global-scoped, so by the time that block runs, the loop has already pushed `i` all the way to `5`; the block then runs exactly once and pushes `5 + 1 = 6`. The real output is `[6]`.

Now swap `var` for `let`:

```js
let moreNumbers = [];
for (let i = 0; i < 5; i++);
{
  moreNumbers.push(i + 1); // ReferenceError: i is not defined
}
```

With `let`, the loop variable is scoped **only to the `for` statement itself** (its header and whatever counts as its body — here, the empty statement). The following block is a sibling scope, not a nested one, so it has no access to that `i` at all. The result isn't a surprising array — it's a `ReferenceError: i is not defined`, thrown the moment the block tries to read `i`.

The real lesson has nothing to do with "off by one" and everything to do with **accidental empty statements**: a stray `;` after a `for`, `while`, or `if` header silently detaches the following block, and `let`'s stricter scoping turns that mistake into a loud, immediate error instead of a quiet, wrong one.

## Truthy, falsy, and nested access surprises

```js
console.log(!![]);        // true  — an empty array is an object, and all objects are truthy
console.log(!!"false");   // true  — any non-empty string is truthy, even the string "false"
console.log(!!"0");       // true  — same: non-empty string
console.log(!!null);      // false
console.log(!!undefined); // false

console.log([] == false);     // true — [] → "" → 0; false → 0
console.log([] == ![]);       // true — ![] is false; [] == false is true (same rule as above)

console.log([[[[[[[42]]]]]]][0][0][0][0][0][0][0]); // 42 — plain repeated index access

const arr = [1, 2, 3, 4, 5];
console.log(arr["length"]); // 5 — bracket notation reaches built-in properties too, not just numeric indices
```

**Falsy values** (there are only eight): `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.

**Everything else is truthy**, including the surprising cases people expect to be falsy: `"0"`, `"false"`, `[]`, `{}`, and any function.

## String concatenation and unary tricks

```js
console.log("foo" + +"bar");       // "fooNaN" — unary + tries to convert "bar" to a number, fails to NaN
console.log(5 + +"3");              // 8
console.log(5 + -"3");              // 2
console.log(1 + "2" + 3);           // "123" — left to right, once a string appears + always concatenates
console.log(1 + +"2" + 3);          // 6     — the unary + runs first, so this is 1 + 2 + 3
console.log([] + []);               // ""
console.log([] + {});               // "[object Object]"
console.log({} + []);               // "[object Object]" (as a function argument, {} is an object literal, not a block)
console.log(!+[] + [] + ![]);       // "truefalse" — !+[] is true, true + [] concatenates to "true", then + false
```

:::warning Correcting a common mistake
One widely-copied snippet claims:

```js
console.log({} + [] + {} + [1]); // "0[object Object]1"  <- wrong comment
```

Run it and the actual output is **`"[object Object][object Object]1"`**. There's no `"0"` anywhere: `{}` always stringifies to `"[object Object]"` when used in concatenation (via `Object.prototype.toString` → `ToPrimitive`), and `[]` stringifies to `""`. So the pieces are `"[object Object]" + "" + "[object Object]" + "1"`, which concatenates to `"[object Object][object Object]1"`. Never trust a comment in a snippet more than the engine — when in doubt, paste it into a console.
:::

## Reference gotchas on arrays and objects

```js
let arr1 = [1, 2, 3];
let arr2 = arr1.reverse();
console.log(arr2 === arr1); // true — reverse() mutates and returns the same array

arr2.push(4);
console.log(arr1); // [3, 2, 1, 4] — arr1 was mutated too, because arr1 and arr2 are the same array
```

Many array methods (`reverse`, `sort`, `splice`, `push`, `pop`, `shift`, `unshift`, `fill`, `copyWithin`) mutate the array **in place** and return a reference to that same array — not a copy. If you hand that reference to another variable and mutate through it, both variables see the change, because they were always pointing at one object. See [shallow vs. deep copy](../04-objects/shallow-vs-deep-copy.md) for how to avoid this when you actually want an independent copy.

## The closure + `setTimeout` loop classic

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 3
// 3
// 3
```

All three arrow functions close over the *same* `i`, because `var` is function/global-scoped: there is only one `i` binding for the whole loop, and by the time any `setTimeout` callback fires (after the loop has already finished), `i` is `3`.

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 0
// 1
// 2
```

`let` creates a **fresh binding of `i` for every iteration**, so each closure captures its own copy. Before `let` existed, the fix was to force a new scope manually with an IIFE:

```js
for (var i = 0; i < 3; i++) {
  (function (x) {
    setTimeout(() => console.log(x), 100);
  })(i);
}
// 0
// 1
// 2
```

See [closures](../03-functions-and-scope/closures.md) for the full mechanics of why this works.

## Arrow functions and lost `this`

```js
const obj = {
  name: "Ada",
  greet: () => {
    console.log(this.name);
  },
};
obj.greet(); // undefined
```

Arrow functions never have their own `this` — they capture `this` lexically from the scope where they were *defined*, not from how they're called. Here `greet` is defined at the top level of a module/script, where `this` is not `obj`, so `this.name` is `undefined` (or throws in strict-mode code where top-level `this` is `undefined` rather than the global object). See [arrow functions and `this`](../03-functions-and-scope/arrow-functions-and-this.md) for the complete rule set.

## Pro tips

- **Default to `===`.** Only reach for `==` deliberately, and really only for the `x == null` idiom (which matches both `null` and `undefined` at once).
- **Prefer `let`/`const` over `var`** so that scoping bugs like the loop examples above turn into clear errors instead of silent wrong answers.
- **Be explicit about conversions** — `Number(x)`, `String(x)`, `Boolean(x)` — rather than relying on implicit coercion inside `+`, `==`, or `if`.
- **Use `Array.isArray(x)`**, never `typeof x === "object"`, to check for arrays.
- **Don't trust floating point for money or exact decimals** — use integer cents, a fixed-point library, or `BigInt` where applicable.
- **Treat a stray semicolon as a syntax error waiting to happen.** Lint rules like `no-extra-semi` and `no-unexpected-multiline` exist specifically to catch the null-statement loop bug above.

## Interview questions

1. **Why does `0.1 + 0.2 === 0.3` return `false`?** Because both operands are IEEE‑754 doubles that can't represent `0.1` or `0.2` exactly; their sum has a tiny rounding error that doesn't match the double closest to `0.3`.
2. **What does `Object.is` give you that `===` doesn't?** Correct handling of `NaN` (equal to itself) and `-0`/`+0` (treated as distinct), which `===` gets "wrong" relative to mathematical equality.
3. **Why is `typeof null === "object"`?** A long-standing historical bug in the first JS implementation that can never be fixed without breaking the web.
4. **What happens when you use an object as a property key?** It's coerced to a string via `ToPropertyKey`, almost always becoming the literal string `"[object Object]"`, which causes silent key collisions between different objects. Use a `Map` instead.
5. **What does ASI do to a bare `return` followed by a newline and a `{`?** It inserts a semicolon right after `return`, turning `return { ... }` into `return;` plus an unreachable block — the function returns `undefined`.
6. **Why does `for (let i = 0; ...);  { ... }` throw instead of logging a wrong array?** The trailing `;` detaches the block from the loop, and `let`'s per-statement scoping means the detached block has no visibility into the loop's `i` at all — accessing it is a `ReferenceError`, not silently `undefined`.
7. **Why does the classic `var` + `setTimeout` loop print the final value three times, and how does `let` fix it?** `var` has one shared binding across all iterations; `let` creates a new binding per iteration, so each closure captures a different value.
