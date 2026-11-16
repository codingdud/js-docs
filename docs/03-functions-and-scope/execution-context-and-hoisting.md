---
title: Execution Context, Hoisting and TDZ
sidebar_position: 1
---

# Execution Context, Hoisting and TDZ

Before running code, the engine scans declarations and reserves memory for them. This explains: calling functions before their line, `var` reading `undefined` early, and `let`/`const` throwing `ReferenceError` early.

## How JavaScript parses and compiles code

Steps per script/function:

1. **Tokenizing** — source split into tokens.
2. **Parsing** — tokens → **AST**; syntax errors caught here, before anything runs.
3. **Scope analysis** — declarations mapped to scopes (global/function/block) → scope is *lexical*. See [Lexical Scope, Scope Chain and Shadowing](./scope-chain-and-shadowing.md).
4. **Bytecode generation** (e.g. V8's Ignition).
5. **Execution** — context created, bytecode runs.
6. **JIT optimisation** — hot functions compiled to machine code (e.g. V8's TurboFan).

Hoisting isn't code being moved — it's the visible effect of step 3 + the **creation phase** below.

## What is an execution context?

A runtime container holding everything needed to run a piece of code. One **Global EC**; every function call creates a **Function EC**.

| Component | Stores |
| --- | --- |
| **Variable Environment** | `var` + function declarations |
| **Lexical Environment** | `let`/`const`/`class`/params + outer environment reference |
| **`this` binding** | Value of `this` (see [The this Keyword](./this-keyword.md)) |

The outer reference forms the scope chain and enables closures (see [Closures](./closures.md)).

### The two phases of every execution context

**1. Creation phase** (before any line runs):
- memory allocated for every var/function in scope
- `var` → initialised to `undefined`
- function declarations → stored whole (name bound to the function object)
- `let`/`const`/`class` → registered but **uninitialised** (TDZ)
- scope and `this` determined

**2. Execution phase** — code runs line by line.

```js
console.log(a);          // undefined  (memory reserved, not yet assigned)
console.log(add(2, 3));  // 5          (function declarations stored whole)
var a = 10;
console.log(a);          // 10

function add(x, y) {
  return x + y;
}
```

### The call stack

LIFO stack of execution contexts: Global EC pushed first; each call pushes a new context; return pops it (unless a closure keeps it alive).

```js
function first() {
  second();
  console.log("first done");
}
function second() {
  console.log("in second");
}
first();
// in second
// first done
```

Unbounded recursion overflows the stack: `RangeError: Maximum call stack size exceeded`.

## What is hoisting?

Declarations are registered during the creation phase, so they're available throughout their scope. **Declarations are hoisted; assignments are not.**

```js
console.log(a); // undefined
var a = 10;
console.log(a); // 10
```

### Hoisting behaviour table

| Declaration | Hoisted? | Initialised at creation | TDZ? | Access before declaration line |
| --- | --- | --- | --- | --- |
| `var` | Yes | `undefined` | No | `undefined` |
| `let` | Yes | No | Yes | `ReferenceError` |
| `const` | Yes | No | Yes | `ReferenceError` |
| Function declaration | Yes | Yes, full function | No | Callable |
| Function expr/arrow with `var` | Only the variable | `undefined` | No | `TypeError: x is not a function` |
| Function expr/arrow with `let`/`const` | Only the variable | No | Yes | `ReferenceError` |
| `class` | Yes | No | Yes | `ReferenceError` |

## The Temporal Dead Zone (TDZ)

Period between entering a scope and the line that initialises a `let`/`const`/`class` binding. Access during that window throws.

```js
{
  // console.log(x); // ReferenceError: Cannot access 'x' before initialization
  let x = 10;
  console.log(x);    // 10
}
```

`"Cannot access 'x' before initialization"` = exists but in TDZ. `"x is not defined"` = name doesn't exist anywhere reachable.

:::note Why TDZ exists
Fixes `var`'s silent `undefined` and makes `const` meaningful by turning early access into a loud error.
:::

TDZ is about *time*, not file position — calling a function after `x` is initialised works fine even if the function is defined earlier:

```js
function show() { console.log(x); } // runs later, after x exists
let x = 5;
show(); // 5
```

### Classes are in the TDZ too

```js
// const p = new Person(); // ReferenceError: Cannot access 'Person' before initialization
class Person {}
const p = new Person();    // works
```

## Function hoisting

### Function declarations are fully hoisted

```js
sayHi(); // "Hi"
function sayHi() {
  console.log("Hi");
}
```

### Function expressions and arrow functions are hoisted as variables

Only the variable hoists, never the body; behaviour before the line depends on the keyword:

```js
bar(); // TypeError: bar is not a function
var bar = function () { console.log("Hi"); };
```

```js
greet(); // ReferenceError: Cannot access 'greet' before initialization
const greet = () => { console.log("Hi!"); };
```

:::warning Common wrong claim
Calling a `const`/`let` function expression early throws **`ReferenceError`** (TDZ), not `TypeError`. Only a **`var`**-held function expression gives `TypeError: ... is not a function` (the var exists and holds `undefined`).
:::

## Hoisting priority: functions vs `var` with the same name

Function declaration wins in the creation phase; a same-name `var` is ignored at creation but its **assignment** still runs at execution.

```js
foo(); // "I'm a function"

var foo = 10;
function foo() {
  console.log("I'm a function");
}

console.log(foo); // 10 (assignment ran during execution)
foo(); // TypeError: foo is not a function
```

:::tip
Never reuse a name for a function and a variable. `let`/`const` would make this a `SyntaxError` instead — safer.
:::

## Predict the output

### 1. `var` vs `let` before declaration

```js
console.log(a); // undefined
var a = 10;
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 20;
```

### 2. Local `var` shadows the global during hoisting

```js
var x = 1;
function test() {
  console.log(x); // undefined (local var x hoisted, shadows global)
  var x = 2;
}
test();
```

### 3. Function declared after use inside a function

```js
function foo() {
  console.log(bar); // ƒ bar() {}  (fully hoisted)
  function bar() {}
}
foo();
```

### 4. IIFE with a local `var`

```js
var a = 10;
(function () {
  console.log(a); // undefined (own var a hoisted, shadows outer)
  var a = 20;
})();
```

### 5. Function declaration vs `const` function expression

```js
sayHi(); // "Hi"
function sayHi() { console.log("Hi"); }

sayHello(); // ReferenceError: Cannot access 'sayHello' before initialization
const sayHello = function () { console.log("Hello"); };
```

### 6. Redeclaring `let` in the same scope

```js
let a = 10;
let a = 20; // SyntaxError: Identifier 'a' has already been declared
```

Caught at **parse time** — nothing in the script runs, not even lines above it.

### 7. Hoisting inside a block

```js
console.log(typeof value); // "undefined" (var hoisted out of the block)
if (true) {
  var value = 1;
}
console.log(value); // 1
```

`var` is function-scoped, hoists to the enclosing function/global. See [var, let and const](../01-basics/variables-var-let-const.md).

## Key takeaways

- Execution context = variable environment + lexical environment (with outer ref) + `this`; managed via the **call stack**.
- **Creation phase** registers declarations; **execution phase** runs code. Hoisting is the creation-phase effect.
- `var` → `undefined`; `let`/`const`/`class` → TDZ, `ReferenceError: Cannot access 'x' before initialization`.
- Function declarations fully hoist; function expressions/arrows follow their variable's rules (`var` → `TypeError`, `let`/`const` → `ReferenceError`).
- Function declaration beats same-name `var` at creation, but the later `var` assignment still overwrites it.

## Interview questions

1. **Are `let`/`const` hoisted?** Yes — registered at creation, uninitialised, so they sit in TDZ until their line runs.
2. **What is the TDZ?** The window between scope entry and initialisation of a `let`/`const`/`class`, where access throws `ReferenceError`.
3. **Variable hoisting vs. function hoisting?** Hoisted `var` = `undefined`; hoisted function declaration = the whole callable function.
4. **Why do declarations hoist but expressions don't?** Declarations are processed in the creation phase; expressions are assignments, which only happen at execution.
5. **What does `typeof` return for a TDZ variable?** Throws `ReferenceError` — it only returns `"undefined"` safely for undeclared names.
