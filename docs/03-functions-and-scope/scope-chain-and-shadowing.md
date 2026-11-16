---
title: Lexical Scope, Scope Chain and Shadowing
sidebar_position: 2
---

# Lexical Scope, Scope Chain and Shadowing

**Scope** decides where a variable can be accessed. JavaScript uses **lexical scope**: where a function is *written* determines what it can see.

## Types of scope

| Scope | Created by | Variables that live there |
| --- | --- | --- |
| **Global** | The script/module | Anything outside every function/block |
| **Function** | Every function body | `var`, `let`, `const`, params, inner declarations |
| **Block** | Any `{ ... }` | `let`, `const`, `class` only (`var` ignores blocks) |

```js
let globalVar = "I'm global";

function outer() {
  let functionVar = "I'm function-scoped";
  if (true) {
    let blockVar = "I'm block-scoped";
    var functionVar2 = "I'm function-scoped (var)";
    console.log(blockVar);   // "I'm block-scoped"
  }
  console.log(functionVar2); // "I'm function-scoped (var)" (var ignores the block)
  // console.log(blockVar);  // ReferenceError: blockVar is not defined
}
outer();
```

## Lexical scope: decided at write time

Accessibility is fixed by where code is **physically written**, not where a function is **called** from — decided at parse time.

```js
let x = 1;
function test() { console.log(x); }
function wrapper() {
  let x = 2;
  test();
}
wrapper(); // 1
```

`test` is written in global scope, so it looks up `x` there (`1`), regardless of being called from `wrapper` (irrelevant: `wrapper`'s locals aren't in `test`'s scope chain).

### JavaScript is lexically scoped, not dynamically scoped

A **dynamically scoped** language would resolve free variables via the *caller's* scope (example above would print `2`; some shells/old Lisps work that way). JS variable lookup is always lexical — the only call-site-dependent binding is `this` (see [The this Keyword](./this-keyword.md)), which is why arrow functions (lexical `this`) exist.

## Lexical environment

Internal structure per scope (global, each call, each `let`/`const` block):

1. **Environment record** — local vars/functions.
2. **Reference to outer lexical environment** (`[[Outer]]`); global's outer is `null`.

Chained outer links = the **scope chain**. A function keeps its creation-time environment reachable — that's how closures work (see [Closures](./closures.md)).

## The scope chain

Lookup algorithm:
1. Search current scope.
2. Not found → move to outer via `[[Outer]]`.
3. Repeat until global.
4. Still not found → `ReferenceError: name is not defined`.

Only moves **outward**, never inward.

```js
let a = 10;
function outer() {
  let b = 20;
  return function inner() {
    let c = 30;
    console.log(a, b, c);
  };
}
const fn = outer();
fn(); // 10 20 30
```

`c` found in `inner`; `b` found in `outer` (still reachable via closure); `a` found in global.

## Variable shadowing

An inner-scope variable with the same name as an outer one hides it inside the inner scope — lookup stops at the first match.

```js
let name = "Global";
function outer() {
  let name = "Outer";
  console.log(name);   // "Outer"
  function inner() {
    let name = "Inner";
    console.log(name); // "Inner"
  }
  inner();
  console.log(name);   // "Outer"
}
outer();
console.log(name);     // "Global"
```

Each `let name` is a separate binding in a separate environment record — shadowing never mutates the outer variable.

### Shadowing in nested functions

```js
const num1 = 20, num2 = 3, name = "Chamakh";

function multiply() {
  return num1 * num2; // global num1, num2
}
console.log(multiply()); // 60
console.log(getScore());  // "Chamakh scored 5" (hoisted, callable before its line)

function getScore() {
  const num1 = 2, num2 = 3; // shadow globals
  function add() {
    return `${name} scored ${num1 + num2}`; // num1/num2 local, name from global
  }
  return add();
}
```

### Block-scope shadowing

```js
let b = 100;
var a = 10;
{
  let a = 120; // shadows outer `a`, this block only
  console.log(a); // 120
}
console.log(a); // 10 (block's let a is gone)
console.log(b); // 100
```

:::note Function declarations inside blocks
In strict mode (modules, classes), a function declared inside a block is block-scoped. Sloppy-mode browsers also create a legacy function-scoped binding — don't rely on either; declare outside the block if you need it outside.
:::

## Illegal shadowing

You **cannot** shadow a `let`/`const` with a `var` from a nested block:

```js
let x = 1;
{
  var x = 2; // SyntaxError: Identifier 'x' has already been declared
}
```

`var` ignores block boundaries, so it hoists into the same scope as the existing `let x` — an illegal redeclaration, caught at parse time.

Fix by crossing a function boundary, or using `let` in the inner block:

```js
let x = 1;
function f() {
  var x = 2;      // legal: different scope (f)
}
{
  let x = 3;      // legal: block-scoped shadowing
}
```

| Outer | Inner (nested block) | Result |
| --- | --- | --- |
| `var` | `let`/`const` | Legal |
| `let`/`const` | `let`/`const` | Legal |
| `var` | `var` | Legal, but same variable (overwrite, not shadowing) |
| `let`/`const` | `var` | **SyntaxError** |
| `let`/`const` | `var` inside nested **function** | Legal |

:::warning `var` inside a block does not shadow
`var x = 1; { var x = 2; } console.log(x);` → `2`. One shared function-scoped variable — a reason to prefer `let`/`const`.
:::

## Key takeaways

- **Lexical scope:** visibility decided by where code is written, not called from.
- **Lexical environment** = environment record + outer reference; chained = **scope chain**.
- Lookup: current → outer → global → `ReferenceError`. Never inward.
- **Shadowing:** inner declaration hides outer, inside the inner scope only.
- **Illegal shadowing:** `var` in a nested block vs. outer `let`/`const` → `SyntaxError`.
- JS is lexically scoped; only `this` is call-site dependent.

## Interview questions

1. **What is lexical scope?** Variable access determined by where code is written in source.
2. **What is the scope chain?** The linked lexical environments walked outward to resolve a variable, ending at global.
3. **What is a lexical environment?** An environment record plus a reference to the outer lexical environment.
4. **Does JS support dynamic scoping?** No — only `this` is resolved by call site.
5. **What is illegal shadowing?** A nested-block `var` with the same name as an outer `let`/`const` — throws `SyntaxError`.
