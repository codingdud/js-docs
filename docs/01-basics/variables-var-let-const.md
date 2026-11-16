---
title: "Variables: var, let and const"
sidebar_position: 1
---

# Variables: `var`, `let` and `const`

Three ways to declare a variable, differing in **scope**, **hoisting**, **re-declaration**, and **re-assignment** rules.

## Quick comparison

| Aspect | `var` | `let` | `const` |
| --- | --- | --- | --- |
| Scope | Function-scoped | Block-scoped | Block-scoped |
| Hoisting | Hoisted, initialised to `undefined` | Hoisted, but left in the **Temporal Dead Zone (TDZ)** | Hoisted, but left in the TDZ |
| Re-declaration (same scope) | Allowed | `SyntaxError` | `SyntaxError` |
| Re-assignment | Allowed | Allowed | `TypeError` |
| Must be initialised at declaration | No | No | **Yes** |
| Attached to `window` (browser global scope) | Yes, as a global property | No | No |

:::note
Hoisting doesn't move code — during the **creation phase**, the engine registers every declaration before running any code. `var` is registered *and* initialised to `undefined`; `let`/`const` are registered but left uninitialised — that gap is the TDZ. See [Execution Context, Hoisting and TDZ](../03-functions-and-scope/execution-context-and-hoisting.md).
:::

## Scope: function-scoped vs block-scoped

`var` is function-scoped and ignores `{}` blocks. `let`/`const` are block-scoped — each pair of braces creates a new scope.

```js
{
  var a = 10; // function/global scoped — the block does NOT contain it
  let b = 20; // block scoped
  const c = 30; // block scoped
  console.log(c); // 30
}

console.log(a); // 10 — "a" leaked out of the block
console.log(b); // ReferenceError: b is not defined
```

### Global, function and block scope together

```js
let globalVar = "I'm global";

function outer() {
  let functionVar = "I'm function-scoped";

  if (true) {
    let blockVar = "I'm block-scoped";
    var functionVar2 = "I'm function-scoped (var)"; // var ignores the block
    console.log(blockVar); // "I'm block-scoped"
  }

  console.log(functionVar2); // "I'm function-scoped (var)" — var escaped the block
}

outer();
console.log(globalVar); // "I'm global"
```

- **Global scope** — outside any function/block; visible everywhere.
- **Function scope** — `var` (or any declaration) inside a function, visible only there.
- **Block scope** — `let`/`const` inside `{ }`, visible only inside that block.

## `const`: must be initialised, cannot be re-assigned

`const` locks the **binding**, not the value.

```js
const c = 30;
c = 130; // TypeError: Assignment to constant variable.

const obj = { a: 1 };
obj.a = 2;        // fine — mutating the object, not reassigning obj
console.log(obj); // { a: 2 }
```

To make an object's own properties genuinely unchangeable, freeze it:

```js
const frozen = Object.freeze({ a: 1 });
frozen.a = 2;          // silently ignored (TypeError in strict mode)
console.log(frozen.a); // 1
```

:::warning
`Object.freeze()` is **shallow** — nested objects stay mutable:

```js
const config = Object.freeze({ db: { host: "localhost" } });
config.db.host = "remote"; // works — "db" itself wasn't frozen
```

For deep immutability, freeze nested objects yourself or use a library. See [Shallow vs Deep Copy](../04-objects/shallow-vs-deep-copy.md).
:::

## Where do these variables actually live?

- Top-level `var` → a property of the **global object** (`window`/`globalThis`).
- Top-level `let`/`const` → the **Global Lexical Environment**, not attached to `window`.

```js
var a = 10;
let b = 20;

console.log(window.a); // 10 — var leaked onto the global object
console.log(window.b); // undefined — let never touches window
console.log(b);        // 20 — still a normal variable
```

This matters for script isolation: two `<script>` tags both declaring `var count` silently clobber each other, while `let count` twice throws a `SyntaxError` immediately — surfacing the bug instead of hiding it.

## Why `let` and `const` were introduced in ES6

`var` problems that `let`/`const` fix:

1. **Not block-scoped** — a loop/`if` helper variable leaks into the whole function.
2. **Loop + closure bug** — every closure in a loop shares the same `var`:

   ```js
   for (var i = 1; i <= 3; i++) {
     setTimeout(() => console.log(i), 100);
   }
   // 4, 4, 4 — all share one "i", which is 4 when the callbacks run

   for (let i = 1; i <= 3; i++) {
     setTimeout(() => console.log(i), 100);
   }
   // 1, 2, 3 — "let" creates a fresh binding per iteration
   ```

   See [Loops and Iteration](./loops-and-iteration.md) and [Closures](../03-functions-and-scope/closures.md).
3. **Silent re-declaration** — `var x` twice just overwrites; `let`/`const` throw `SyntaxError`.
4. **Confusing hoisting** — reading `var` before declaration quietly gives `undefined`.
5. **Global object pollution** — every top-level `var` becomes a `window` property.

`const` also makes intent explicit — "this binding will never be reassigned."

## Undeclared assignment: implicit globals

Assigning to a never-declared name creates an **implicit global** — only in non-strict mode:

```js
function leak() {
  undeclaredVar = "oops"; // no var/let/const
}
leak();
console.log(undeclaredVar); // "oops" — became a global property
```

```js
"use strict";
function leak() {
  undeclaredVar = "oops";
}
leak(); // ReferenceError: undeclaredVar is not defined
```

ES modules and class bodies are strict by default, so this trap mostly bites old, non-module scripts — always declare variables explicitly.

## Best practices

- **`const` by default** — documents intent, catches accidental reassignment.
- **`let`** only when reassignment is needed (loop counters, accumulators).
- **Avoid `var`** in new code — no real upside, causes the bugs above.

## Predict the output

```js
console.log(a);
var a = 10;
// -> undefined (hoisted & initialised to undefined; assignment runs later)
```

```js
console.log(b);
let b = 20;
// -> ReferenceError: Cannot access 'b' before initialization (TDZ)
```

```js
var x = 1;
function test() {
  console.log(x); // undefined, NOT 1 — local "var x" is hoisted, shadowing outer x
  var x = 2;
}
test();
```

```js
{
  console.log(a); // ReferenceError: Cannot access 'a' before initialization
  let a = 10;
}
// "a" is hoisted but stays in the TDZ until its declaration line runs
```

```js
{
  let a = 10;
  console.log(a);
  let a = 20;
}
// SyntaxError: Identifier 'a' has already been declared
// A duplicate "let" in the SAME block is a parse-time error — nothing in
// the block runs at all. (var would have silently allowed this.)
```

## Key takeaways

- `var` is function-scoped and hoisted with `undefined`; `let`/`const` are block-scoped and sit in the TDZ until their declaration line runs.
- `const` locks the **binding**, not the value — object/array contents stay mutable unless you `Object.freeze()` them (and that freeze is shallow).
- Top-level `var` pollutes `window`; top-level `let`/`const` live in the Global Lexical Environment instead.
- `let`/`const` were introduced in ES6 to fix var's block-scope gap, the loop+closure bug, silent redeclaration, and global pollution.
- Prefer `const`, fall back to `let` when you must reassign, and avoid `var`.

Continue with [Data Types and Operators](./data-types-and-operators.md), or jump straight to the trickier [`undefined`, `null`, `NaN`](./null-undefined-nan.md) gotchas.
