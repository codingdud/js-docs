---
title: "Function Declarations, Expressions, IIFE, Arrow Functions and Parameters"
sidebar_position: 4
---

# Function Declarations, Expressions, IIFE, Arrow Functions and Parameters

Different ways to write a function, each with different hoisting, `this` behaviour and typical use. Plus parameter features (default, rest, `arguments`) that interact with them.

## Functions are first-class values

Functions are ordinary values in JS — they can be assigned to variables, passed as arguments, returned, stored in arrays/objects, or created anonymously. This is what makes [higher-order functions](./functional-programming.md), callbacks and the module pattern possible.

## Function declaration vs. function expression

### Function declaration

```js
function greet(name) {
  return `Hello, ${name}`;
}
```

A standalone `function name() {}` statement. **Fully hoisted** — see [Execution Context, Hoisting and TDZ](./execution-context-and-hoisting.md#function-hoisting) — so callable before its line:

```js
sayHi(); // "Hi"
function sayHi() {
  console.log("Hi");
}
```

Best for: recursive logic, top-level utilities.

### Function expression

```js
const greet = function (name) {
  return `Hello, ${name}`;
};

// Named function expression - name only visible inside its own body
const greet2 = function innerGreet(name) {
  return `Hello, ${name}`;
};
```

Assigns a function value to a variable; can be anonymous or named (name useful for stack traces/self-recursion, not accessible outside). Only the **variable** hoists, not the body:

| Declared with | Calling before the line runs |
| --- | --- |
| `var` | `TypeError: greet is not a function` |
| `let`/`const` | `ReferenceError: Cannot access 'greet' before initialization` (TDZ) |

See [Execution Context, Hoisting and TDZ](./execution-context-and-hoisting.md#function-expressions-and-arrow-functions-are-hoisted-as-variables).

Best for: values assigned once (React components), callbacks, conditional definitions.

### Declaration vs. expression at a glance

| | Function declaration | Function expression |
| --- | --- | --- |
| Starts a statement | Yes | No — it's a value |
| Hoisting | Fully hoisted | Only the variable, with its own rules |
| Name required | Yes | No |
| Typical use | Recursive/utility functions | Callbacks, `const` values, conditional definitions |

## IIFE — Immediately Invoked Function Expression

A function expression called the instant it's defined:

```js
const sum = (function add() {
  return 1 + 4;
})();

console.log(sum); // 5
```

Runs once; its scope disappears right after (unless closed over — see [Closures](./closures.md)); only the return value escapes. Used to create a **private scope** without leaking names — the classic way to avoid global pollution before ES modules/block scoping.

```js
(function () {
  const privateConfig = { apiKey: "secret" };
})();
// console.log(privateConfig); // ReferenceError - never existed out here
```

Best for: library encapsulation, one-time bootstrap code, immediately-computed constants.

## IIFE with a local `var`

Its own execution context means a local `var` shadows an outer same-named `var` for the call's duration:

```js
var a = 10;
(function () {
  console.log(a); // undefined - IIFE's own var a, hoisted
  var a = 20;
})();
```

## Arrow functions

Deliberately different semantics, not just shorter syntax. An arrow function:

- **has no own `this`** — uses `this` from its enclosing lexical scope at the point written. See [Arrow Functions and Lexical `this`](./arrow-functions-and-this.md).
- **has no own `arguments`** — looks it up in the enclosing non-arrow scope, or throws.
- **has no own `prototype`** — `typeof (() => {}).prototype` is `"undefined"`; can't be a constructor.
- **cannot be used with `new`** — `TypeError: ... is not a constructor`.
- **ignores `call`/`apply`/`bind`'s `this` argument** — see [`call`, `apply` and `bind`](./call-apply-bind.md#arrow-functions-ignore-call-apply-and-bind).

Best for: callbacks keeping outer `this`, array method callbacks, timer callbacks, short transformations.

## Default parameters, rest parameters and `arguments`

```js
function fun(one = 10, two = 20, ...args) {
  console.log(one, two, args);
}

fun(1);                              // 1 20 []
fun(1, 2, 3, 4, 5, 6, 7);            // 1 2 [ 3, 4, 5, 6, 7 ]
fun(null, undefined, 3, 4, 5, 6, 7); // null 20 [ 3, 4, 5, 6, 7 ]

arr = [1, 2, 3, 4, 5]; // see gotcha below!
fun(...arr);                         // 1 2 [ 3, 4, 5 ]
```

- `fun(1)` — `two` not supplied → default `20`; `args` empty.
- Middle call — rest `...args` collects everything after the named params.
- **Key gotcha**: defaults trigger only for `undefined`, not other falsy values — `null` is a real value (`one` becomes `null`); explicit `undefined` for `two` still gets the default.
- `fun(...arr)` — spread expands array elements into individual arguments.

:::warning Implicit global variable
`arr = [1, 2, 3, 4, 5];` has no `var`/`let`/`const`. In sloppy mode this silently creates a global property instead of throwing. In **strict mode** (and ES modules/class bodies), it throws `ReferenceError: arr is not defined`. Always declare variables explicitly.
:::

### Rest parameters must be last

```js
// function broken(...args, last) {} // SyntaxError: Rest parameter must be last formal parameter
function ok(first, ...rest) {}
```

A rest parameter collects everything remaining, so nothing can follow it — rejected at parse time.

### Default parameters treat an explicit `undefined` as "missing"

```js
function sum(a, b = 5) {
  return a + b;
}

console.log(sum(10, undefined)); // 15 - same as omitting it
console.log(sum(10));             // 15
console.log(sum(10, null));       // NaN - null is a real value, 10 + null coerces to 10
```

### Rest parameters vs. the `arguments` object

```js
function demo(...args) {
  console.log(args.length);
}
demo(1, 2, 3); // 3
```

`args` is a real `Array` (`.map`, `.filter`, etc. all work) — the modern replacement for the legacy **`arguments` object** (array-*like*, auto-available in every regular `function`).

```js
function legacy() {
  console.log(arguments.length, arguments[0]);
}
legacy(1, 2, 3); // 3 1
```

### Arrow functions and `arguments`

```js
const fn = () => arguments;
fn(1, 2); // ReferenceError: arguments is not defined
```

No own `arguments`, so the lookup goes to the enclosing scope; at top level there is none, hence `ReferenceError` (name never declared), not `undefined`. Inside a regular function it correctly sees *that* function's `arguments`:

```js
function outer() {
  const fn = () => arguments; // looks up outer's arguments
  return fn(1, 2);
}
console.log(outer(9, 9)); // Arguments [9, 9] - outer's own, unaffected by fn's call
```

## Functions without a `return` give `undefined`

Falling off the end, or a bare `return;`, always evaluates to `undefined` — never the last computed expression.

```js
function noop() {
  1 + 1; // discarded
}
console.log(noop()); // undefined
```

:::tip
Pairs with an ASI trap: `return` on its own line followed by an object literal on the next is parsed as `return;` (undefined), because ASI inserts a semicolon right after `return`.
:::

## Key takeaways

- Function **declarations** fully hoist; **expressions** hoist only as a variable, with TDZ rules applying.
- An **IIFE** runs once immediately to create a private scope; only its return value escapes.
- **Arrow functions** have no own `this`, `arguments`, or `prototype`, and can't be used with `new`.
- **Default parameters** apply only for `undefined` (omitted or explicit) — not for `null` or other falsy values.
- **Rest parameters** must be last and produce a real array; `arguments` is array-*like* and unavailable in arrow functions.
- No `return` (or bare `return;`) always yields `undefined`.

## Interview questions

1. **Why call a function declaration before its line, but not a `const` expression?** Declaration is hoisted whole; expression's `const` binding stays in TDZ until its line runs.
2. **What is an IIFE used for?** Running code once in its own scope so declared variables don't leak out.
3. **Three things an arrow function lacks?** Own `this`, own `arguments`, a `prototype` (and can't be used with `new`).
4. **What does `fun(undefined, null)` do for `fun(one = 10, two = 20)`?** `one` → `10` (default applies to `undefined`); `two` → `null` (default skipped, `null` is a real value).
5. **Why must a rest parameter be last?** It collects all remaining arguments; nothing could be assigned to a parameter after it.
6. **What does a function return with no `return` statement?** `undefined`, always.
