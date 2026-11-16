---
title: Question Bank by Chapter
sidebar_position: 3
---

This page collects two kinds of practice material from a personal interview-prep archive: a **conceptual question bank** grouped by topic (cleaned up — the source had OCR noise like "Variab\es", "GitF\ow", and "Na N" from a scanned document, all fixed below), and a long run of **predict-the-output scenario questions**, each with a verified answer and explanation. Use the conceptual list to check you can *explain* a topic, and the scenario list to check you can *trace* code — they test different skills.

## Conceptual question bank by chapter

Each group links to the page on this site that answers it in full. Treat this as a self-test: if you can't answer a bullet in a sentence or two, that's your cue to open the linked page.

### Git basics

See [Git fundamentals](../15-tooling/git-fundamentals.md).

- What is Git, and why is it used? How does it differ from GitHub?
- What is a repository? What's the difference between `git clone` and `git init`?
- What are the different states of a file in Git, and what is the staging area?
- What's the difference between `git add .` and `git add -A`? What does `git status` show?
- What's the difference between `git pull` and `git fetch`? What does `git commit` do, and how do you amend the last one?
- What is a detached HEAD? What does `.gitignore` do?
- What's the difference between `git reset` and `git revert`? What are soft, mixed, and hard resets?
- What is `git stash`, and when would you use it?

### Branching strategies and resolving conflicts

See [branching and conflicts](../15-tooling/branching-and-conflicts.md).

- What is branching, and what is GitFlow? What are its main branches (main, develop, feature, release, hotfix), and when do you create a release or hotfix branch?
- How do you merge branches? What's the difference between merge and rebase, and when should you avoid rebasing? What is a fast-forward merge?
- What is a merge conflict, and why do conflicts occur? What are conflict markers, and what are the steps to resolve one? How do you abort a merge? Can conflicts happen during a rebase? What are the best practices to avoid conflicts?

:::note Git scenario questions
The source material also included four open-ended Git debugging scenarios worth practicing out loud: (1) explain what `git reset --hard HEAD~1` does and how to recover the "lost" commit via `git reflog`; (2) walk through safely removing secrets that were already committed and pushed (rewrite history, force-push, and rotate the leaked credential — never just delete the file in a new commit); (3) resolve a `CONFLICT (content)` during a rebase by editing the conflicting file, `git add`-ing it, and running `git rebase --continue`; (4) explain `git pull --rebase` as "fetch, then replay your local commits on top of the updated remote branch" instead of creating a merge commit.
:::

### JavaScript basics — variables, data types, operators, control flow, loops

See [variables](../01-basics/variables-var-let-const.md), [data types and operators](../01-basics/data-types-and-operators.md), and [loops and iteration](../01-basics/loops-and-iteration.md).

- What's the difference between `var`, `let`, and `const`? Can `const` variables be mutated? Why was `let` introduced? What happens if you use a variable without declaring it?
- What are JavaScript's data types? What's the difference between primitive and non-primitive types? What is `typeof null`, and why? What is `NaN`? What's the difference between `undefined` and `null`? What are symbols? What is `BigInt`?
- What's the difference between `==` and `===`? What is type coercion? What are the logical operators, and what is the ternary operator? What's the difference between `++i` and `i++`? What does the spread operator do? What is optional chaining?
- What are conditional statements? What's the difference between `if`/`else` and `switch`, and when should you use `switch`? What is short-circuit evaluation?
- What's the difference between `for`, `while`, and `do...while`? What do `for...in` and `for...of` do? What's the difference between `forEach` and `map`? Can you break out of a `forEach`? How do loop constructs compare on performance?

### Scope and hoisting

See [scope chain and shadowing](../03-functions-and-scope/scope-chain-and-shadowing.md) and [execution context and hoisting](../03-functions-and-scope/execution-context-and-hoisting.md).

- What is scope (global, function, block)? What is lexical scope, and what is the scope chain?
- What is hoisting? Are `let` and `const` hoisted? What is the Temporal Dead Zone?
- What's the difference between variable hoisting and function hoisting? Why do function declarations hoist fully while function expressions don't?

### Functions and closures

See [function types and parameters](../03-functions-and-scope/function-types-and-parameters.md) and [closures](../03-functions-and-scope/closures.md).

- What's the difference between a function declaration and a function expression? What are arrow functions, and how does `this` behave inside them?
- What are return values, and what happens if a function doesn't return anything? What are callback functions, and what is "callback hell"?
- What are default parameters, and what are rest parameters?
- What is a closure? What are its practical use cases? Does JavaScript support dynamic scoping? (No — JavaScript is lexically scoped: a function's free variables resolve based on where it was *written*, never based on who called it.)

### Arrays and objects

See [arrays](../07-arrays-strings-collections/arrays.md), [data transformation](../07-arrays-strings-collections/data-transformation.md), and [shallow vs. deep copy](../04-objects/shallow-vs-deep-copy.md).

- How do you create arrays and access their elements? What's the difference between an array and an object?
- What do `push()` and `unshift()` do, and how do they differ? What's the difference between `pop()` and `shift()`?
- What does `map()` return, and how does it differ from `forEach()`? What is `filter()`? What is `reduce()`, and what are its common use cases?
- How do you loop through arrays vs. objects? What's the difference between `Object.keys()`, `Object.values()`, and `Object.entries()`?
- How do you clone an object? What's the difference between a shallow and a deep copy?

### Asynchronous operations

See [sync vs. async and callbacks](../08-asynchronous-javascript/sync-vs-async-and-callbacks.md), [the event loop](../08-asynchronous-javascript/event-loop.md), [promises](../08-asynchronous-javascript/promises.md), [async/await](../08-asynchronous-javascript/async-await.md), [promise combinators](../08-asynchronous-javascript/promise-combinators.md), and [fetch and error handling](../08-asynchronous-javascript/fetch-and-error-handling.md).

- What's the difference between synchronous and asynchronous programming, and between blocking and non-blocking code? Why does JavaScript need async programming at all?
- What is the event loop? What is the call stack? What are Web APIs, in this context?
- What's the difference between the macrotask queue and the microtask queue? What runs first — a `Promise.then()` callback or a `setTimeout` callback?
- What are callbacks? What are promises, and what are their three states? What is promise chaining?
- What is `async`/`await`, and how do you handle errors with it? What do `.then()` and `.catch()` do?
- What are the promise combinators (`all`, `allSettled`, `race`, `any`), and how do they differ?
- What is the Fetch API? How does `fetch` handle (and *not* handle) errors? How do you cancel a `fetch` request? (`AbortController`.)

### Error handling

See [fetch and error handling](../08-asynchronous-javascript/fetch-and-error-handling.md).

- What is `try`/`catch`/`finally`? Can you catch synchronous errors with it — and what's different about errors thrown inside an asynchronous callback?
- What's the difference between a runtime error and a syntax error? How do you create a custom error class (extend `Error`)?

### ES6+ features

See [ES6 features](../01-basics/es6-features.md).

- What do `let` and `const` add over `var`? What is arrow function syntax, and what are template literals used for?
- What is destructuring, including nested destructuring? What are the spread and rest operators used for? What are default parameters, and what is object property shorthand?
- What new array and object methods did ES6 introduce?

### DOM manipulation and events

See [DOM basics](../09-dom-and-events/dom-basics.md), [event handling](../09-dom-and-events/event-handling.md), [event propagation](../09-dom-and-events/event-propagation.md), and [event delegation](../09-dom-and-events/event-delegation.md).

- What is the DOM, and how does the browser build it? What's the difference between the DOM and the BOM?
- How do you select elements? What's the difference between `querySelector` and `getElementById`?
- How do you modify DOM elements and add/remove classes? How do you handle events?
- What is event bubbling? What is event capturing? What is event delegation, and why is it useful?

### Page rendering and lifecycle

See [rendering and script loading](../10-browser-platform/rendering-and-script-loading.md).

- What is the Critical Rendering Path (CRP), and what are its steps? What blocks rendering?
- What's the difference between `defer` and `async` on a `<script>` tag? What causes reflow and repaint?

### OOP in JavaScript

See [the `this` keyword](../03-functions-and-scope/this-keyword.md), [call, apply, bind](../03-functions-and-scope/call-apply-bind.md), [prototype vs. `__proto__`](../05-prototypes/prototype-vs-proto.md), [the prototype chain](../05-prototypes/prototype-chain.md), and [classes vs. constructors](../06-classes-and-oop/classes-vs-constructors.md).

- What is OOP? What is the `this` keyword, and how does it behave in different calling contexts? What do `call()`, `apply()`, and `bind()` do, and how do they differ?
- What is prototypal inheritance, and how does it differ from classical inheritance? What is the prototype chain?
- What are ES6 classes, and how is inheritance implemented with them?

### Functional programming

See [functional programming](../03-functions-and-scope/functional-programming.md).

- What is a pure function, and what is an impure function? What are higher-order functions, and what are some examples?
- What is function composition? What are the benefits of functional programming, and how does it compare to OOP?

### TypeScript

See the [TypeScript](../13-typescript/basic-types.md) section.

- What is TypeScript, and what are its benefits? What are the basic types? What's the difference between `any` and `unknown`? What is the `never` type?
- How do you type variables and functions in TS, including optional parameters?
- What are interfaces, and what are types? What's the difference between `interface` and `type`, and when do you use one over the other?
- What are access modifiers (`public`/`private`/`protected`)? What are decorators, including method decorators, and what are their use cases?

### Design principles

See [design principles](../15-tooling/design-principles.md).

- What is SOLID? Explain each letter: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- What is KISS? What is DRY, and what is YAGNI? What's a real-world example of a DRY violation, and what trade-offs exist between DRY and readability?
- *Scenario:* Given a function that does validation, API calls, and logging all at once, how would you refactor it to follow SRP? Given a tightly coupled class, how would you refactor it to follow Dependency Inversion?

## Scenario and predict-the-output questions

Every answer below was checked against a real JavaScript engine, not inferred from memory — where a widely-circulated version of a question has a wrong "expected output" comment, this bank gives the corrected one.

**6.**
```js
console.log(a);
var a = 10;
```
**Output:** `undefined`. `var` declarations are hoisted and pre-initialized to `undefined`; the assignment `a = 10` only happens when execution reaches that line.

**7.**
```js
console.log(b);
let b = 20;
```
**Output:** `ReferenceError: Cannot access 'b' before initialization`. `let` is hoisted too, but stays in the Temporal Dead Zone until its declaration line runs.

**8.**
```js
var x = 1;
function test() {
  console.log(x);
  var x = 2;
}
test();
```
**Output:** `undefined`. The `var x` inside `test` is hoisted to the top of the function, shadowing the outer `x` for the whole function body — so the `console.log` sees the *local* `x`, which is still `undefined` at that point.

**9.**
```js
let a = 10;
console.log(a);
let a = 20;
```
**Output:** `SyntaxError: Identifier 'a' has already been declared`. This is a parse-time error for the whole block — the `console.log` never even runs, because `let` forbids re-declaring the same name in the same scope (unlike `var`, which would silently allow it).

**10.**
```js
const obj = { a: 1 };
obj.a = 2;
console.log(obj); // { a: 2 }
```
**Why this works:** `const` freezes the *binding* — you can't reassign `obj` to point at a different value — but it says nothing about the object's contents. Mutating a property on the object `obj` already points to is perfectly legal.

**11.**
```js
console.log(typeof null);        // "object"
console.log(null == undefined);  // true
console.log(null === undefined); // false
```
`typeof null` is a historical bug (see [tricky edge cases](./tricky-edge-cases.md)). `null` and `undefined` are loosely equal to each other by special-case rule, but strictly unequal because they are different types.

**12.**
```js
console.log([] + []); // ""
console.log([] + {}); // "[object Object]"
console.log({} + []); // "[object Object]"
```
All three operands get converted to strings via `ToPrimitive`: `[]` becomes `""`, and `{}` becomes `"[object Object]"`. As arguments to `console.log`, `{}` is always an object-literal *expression*, never a block — so the third line is not the famous "`{}` at the start of a statement is a block" gotcha.

**13.**
```js
console.log(1 + "2" + 3);   // "123"
console.log(1 + +"2" + 3);  // 6
```
Line 1: once a string appears, `+` concatenates left to right: `1 + "2"` → `"12"`, then `"12" + 3` → `"123"`. Line 2: the unary `+` binds tighter and runs first, converting `"2"` to the number `2` *before* any addition happens, so it's plain numeric `1 + 2 + 3`.

**14.**
```js
console.log(NaN === NaN);     // false
console.log(isNaN("hello"));  // true
```
`NaN` is never equal to itself under `===`. `isNaN` coerces its argument to a number first — `"hello"` becomes `NaN`, which *is* `NaN`, so it returns `true`. (This is also why `isNaN` is considered a slightly unreliable check; `Number.isNaN`, which skips the coercion, is usually the better choice.)

**15.**
```js
let a = 0;
if (a) {
  console.log("true");
} else {
  console.log("false");
}
```
**Output:** `"false"`. `0` is falsy.

**16.**
```js
console.log(false || "JS");  // "JS"
console.log(true && "ES6");  // "ES6"
```
`||` returns its first truthy operand (or the last one, if none are truthy); `&&` returns its first falsy operand (or the last one, if all are truthy). Neither operator converts its result to an actual boolean.

**17.**
```js
let x = 5;
console.log(x++ + ++x); // 12
```
`x++` evaluates to `5` (the value *before* incrementing) and then sets `x` to `6`. `++x` then increments `x` to `7` and evaluates to `7`. Sum: `5 + 7 = 12`.

**18.**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// 3
// 3
// 3
```
**Fix to print `0 1 2`:** swap `var` for `let` so each iteration gets its own binding of `i` (see the [full walkthrough](./tricky-edge-cases.md#the-closure--settimeout-loop-classic)).

**19.**
```js
const arr = [1, 2, 3];
arr.forEach((n) => {
  if (n === 2) return;
  console.log(n);
});
// 1
// 3
```
**Why it still prints `3`:** `return` inside a `forEach` callback only exits *that one call* of the callback — it behaves like `continue` in a `for` loop, not `break`. `forEach` has no built-in way to stop early; use a plain `for`/`for...of` loop (or `some`/`every`, which *do* support early exit) if you need that.

**20.**
```js
for (let key in [10, 20, 30]) {
  console.log(key);
}
// "0"
// "1"
// "2"
```
`for...in` iterates over an object's **enumerable property keys as strings** — for an array, that means the string indices, not the values, and not numbers.

**21.**
```js
function outer() {
  let count = 0;
  return function inner() {
    count++;
    console.log(count);
  };
}
const fn = outer();
fn(); // 1
fn(); // 2
```
Each call to `fn` increments the *same* `count` variable, because `inner` closes over it — `count` is never reset between calls.

**22.**
```js
function foo() {
  console.log(bar);
  function bar() {}
}
foo(); // [Function: bar]
```
Function declarations are hoisted completely (not just the name) within their scope, so `bar` already refers to the finished function object by the time `console.log` runs — this logs the function itself, not `undefined` and not an error.

**23.**
```js
var a = 10;
(function () {
  console.log(a); // undefined
  var a = 20;
})();
```
The inner `var a` is hoisted to the top of the IIFE, shadowing the outer `a` throughout the function body — so the log sees the *local*, still-unassigned `a`.

**24.**
```js
let x = 1;
function test() {
  console.log(x);
}
function wrapper() {
  let x = 2;
  test();
}
wrapper(); // 1
```
**Lexical scoping, explained:** `test`'s free variable `x` resolves based on where `test` was *defined* (the top level, where `x` is `1`), not based on who calls it. If JavaScript used dynamic scoping instead, `test()` would see `wrapper`'s `x = 2` — but it doesn't, because JavaScript is lexically scoped.

**25.**
```js
sayHi(); // "Hi"
function sayHi() {
  console.log("Hi");
}
```
Function declarations are hoisted in full, so calling `sayHi` before its declaration line works fine.

**26.**
```js
sayHello(); // ReferenceError: Cannot access 'sayHello' before initialization
const sayHello = function () {
  console.log("Hello");
};
```
Unlike a function *declaration*, this is a `const` holding a function *expression* — the binding follows normal `let`/`const` hoisting, landing in the TDZ until its line executes.

**27.**
```js
function sum(a, b = 5) {
  return a + b;
}
console.log(sum(10, undefined)); // 15
```
Passing `undefined` explicitly still triggers the default value — defaults apply whenever the argument is *missing or `undefined`*, not only when the parameter is omitted entirely.

**28.**
```js
function demo(...args) {
  console.log(args.length);
}
demo(1, 2, 3); // 3
```
`...args` collects every remaining argument into a real array.

**29.**
```js
const fn = () => arguments;
fn(1, 2);
```
**What happens:** arrow functions have no `arguments` object of their own — they look it up like any other free variable, in the lexically enclosing scope. At the top level of a script or module there is no `arguments` at all, so this throws `ReferenceError: arguments is not defined`. If the same arrow were defined *inside* a regular function, it would return *that* function's `arguments`, completely ignoring the `(1, 2)` passed to `fn` itself.

**30.**
```js
const arr = [1, 2, 3];
const newArr = arr.map((n) => n * 2);
console.log(arr, newArr); // [1, 2, 3] [2, 4, 6]
```
`map` always returns a new array and never mutates the original.

**31.**
```js
const arr = [1, 2, 3];
const result = arr.reduce((acc, curr) => acc + curr);
console.log(result); // 6
```
With no initial value supplied, `reduce` uses the array's first element (`1`) as the starting accumulator and begins iterating from the second element.

**32.**
```js
const obj = { a: 1 };
const copy = obj;
copy.a = 5;
console.log(obj.a); // 5
```
`copy` isn't a new object — it's another reference to the *same* object, so mutating through `copy` is visible through `obj` too.

**33.** *(Fix the above to avoid mutation.)*
```js
const copy = { ...obj }; // or Object.assign({}, obj), or structuredClone(obj) for a deep copy
copy.a = 5;
console.log(obj.a); // 1 — unaffected
```
See [shallow vs. deep copy](../04-objects/shallow-vs-deep-copy.md) for when a shallow copy like this isn't enough.

**34.**
```js
const user = {
  name: "A",
  greet() {
    console.log(this.name);
  },
};
const greet = user.greet;
greet(); // undefined (or a TypeError reading `.name` of undefined, in strict mode)
```
Extracting a method into a plain variable detaches it from `user`. Called as a bare function, `this` is no longer `user` — it falls back to `undefined` (strict mode) or the global object (non-strict), so `this.name` is `undefined`.

**35.**
```js
console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");
// start
// end
// promise
// timeout
```

**36. Explain the exact execution order.**
All synchronous code runs first (`"start"`, `"end"`), because the call stack always drains before anything else runs. Then the **microtask queue** (the resolved `.then()`) is fully drained — `"promise"`. Only after microtasks are empty does the event loop pick up the next **macrotask** from the timer queue — `"timeout"`, even though it was scheduled with a `0`ms delay. Microtasks always win a race against macrotasks.

**37.**
```js
async function test() {
  return "JS";
}
console.log(test()); // Promise { 'JS' }
```
An `async` function always returns a Promise, even when the body itself returns a plain value — the value is automatically wrapped. You need `test().then(...)` or `await test()` to get `"JS"` itself.

**38.**
```js
async function demo() {
  throw new Error("Oops");
}
demo().catch((err) => console.log(err.message)); // "Oops"
```
Throwing inside an `async` function rejects the Promise it returns with that error, so `.catch()` on the call catches it just like a normal rejection.

**39.**
```js
Promise.all([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)])
  .then(console.log)
  .catch(console.log); // "err"
```
`Promise.all` rejects as soon as *any* input promise rejects, discarding the others' results — the `.then()` never runs, and `.catch()` logs the rejection reason.

**40. Rewrite the above using `Promise.allSettled`.**
```js
Promise.allSettled([Promise.resolve(1), Promise.reject("err"), Promise.resolve(3)]).then(
  console.log
);
// [
//   { status: "fulfilled", value: 1 },
//   { status: "rejected", reason: "err" },
//   { status: "fulfilled", value: 3 },
// ]
```
`allSettled` never rejects — it waits for every promise and reports each outcome individually, which is usually what you actually want when failures shouldn't cancel the rest of the batch.

**41. Explain when `.catch` will *not* run.**
```js
fetch("/api/data")
  .then((res) => res.json())
  .then(console.log)
  .catch(console.log);
```
`fetch`'s returned promise only rejects on a **network-level failure** (DNS failure, no connectivity, a CORS block, and similar) — it does *not* reject for HTTP error responses like `404` or `500`. A `404` response resolves normally with `res.ok === false`; if your code doesn't check `res.ok` before calling `res.json()`, the `.catch()` here will simply never fire for that case, and you'll silently try to parse whatever error body the server sent as if it were success data.

**42. Why doesn't this work?**
```js
try {
  setTimeout(() => {
    throw new Error("Async error");
  }, 0);
} catch (e) {
  console.log(e); // never runs
}
```
The `try`/`catch` only covers code that runs *synchronously, right now* — by the time the `setTimeout` callback actually executes, the `try` block has long since finished and been popped off the call stack. The thrown error becomes an unhandled exception instead. Contrast with `async`/`await`:

```js
async function risky() {
  throw new Error("boom");
}
async function run() {
  try {
    await risky();
  } catch (e) {
    console.log("caught:", e.message); // caught: boom
  }
}
run();
```
`await` *does* let `try`/`catch` work across an asynchronous boundary, because `await` suspends the `async` function itself and resumes it (including unwinding into the `catch`) when the awaited promise settles — there's no bare, uncaught callback involved the way there is with `setTimeout`.

**43.**
```js
const a = { x: 1 };
const b = { ...a };
b.x = 2;
console.log(a.x); // 1
```
Spread (`{ ...a }`) copies `a`'s own enumerable properties onto a new object — for primitive values like `x: 1`, that's a fully independent copy, so mutating `b.x` doesn't touch `a`. (If a property's value were itself an object, spread would only copy the reference to it — that's the "shallow" part of a shallow copy.)

**44.**
```js
const { x = 10 } = {};
console.log(x); // 10
```
Destructuring supports default values, applied exactly when the property is missing (or `undefined`) on the source object.

**45.**
```js
const arr = [1, 2, 3];
const [a, , c] = arr;
console.log(a, c); // 1 3
```
A blank slot in an array destructuring pattern skips that position entirely.

**46.**
```html
<div id="parent">
  <button id="child">Click</button>
</div>
```
```js
document.getElementById("parent").addEventListener("click", () => {
  console.log("parent");
});
document.getElementById("child").addEventListener("click", () => {
  console.log("child");
});
```
**Clicking the button logs:**
```text
child
parent
```
Events fire on the exact target first, then **bubble** up through each ancestor in turn — so the child's handler always runs before the parent's.

**47. Modify the above to stop bubbling.**
```js
document.getElementById("child").addEventListener("click", (e) => {
  e.stopPropagation();
  console.log("child");
});
```
Now only `"child"` logs — the event never reaches the parent's listener.

**48. Rewrite this using event delegation.**
```js
document.getElementById("parent").addEventListener("click", (e) => {
  if (e.target.id === "child") {
    console.log("child clicked, via delegation");
  }
});
```
One listener on the ancestor handles clicks on the descendant(s) by inspecting `e.target`, relying on the same bubbling behavior from question 46 instead of fighting it. See [event delegation](../09-dom-and-events/event-delegation.md).

**49. Explain how `<script src="app.js"></script>` affects page rendering.**
A plain `<script>` tag **blocks** HTML parsing: the browser must stop building the DOM, fetch the script (if external), execute it fully, and only then resume parsing the rest of the page. Placing such scripts at the end of `<body>`, or using `defer`, avoids this stall.

**50. Explain the difference with `<script src="app.js" defer></script>`.**
`defer` lets the browser keep parsing the HTML in parallel while the script downloads, and guarantees the script runs only after parsing finishes (and in the order multiple `defer` scripts appear in the document) — never blocking the initial render. `async`, by contrast, also downloads in parallel but executes as soon as it's ready, which can be *before* parsing finishes and in no guaranteed order relative to other scripts.

**51.**
```js
function Person(name) {
  this.name = name;
}
Person.prototype.say = function () {
  console.log(this.name);
};
const p = new Person("JS");
p.say(); // "JS"
```
`say` lives on `Person.prototype`, shared by every instance; `p` finds it via the prototype chain, and `this` inside it is `p` because it was called as `p.say()`.

**52.**
```js
class A {
  greet() {
    console.log("A");
  }
}
class B extends A {
  greet() {
    super.greet();
    console.log("B");
  }
}
new B().greet();
// A
// B
```
`super.greet()` explicitly calls the parent class's version first, then execution continues with the rest of `B`'s own `greet`.

**53. Fix the `this` issue.**
```js
const obj = {
  name: "JS",
  greet() {
    console.log(this.name);
  },
};
setTimeout(obj.greet, 0); // undefined — this is lost, same root cause as question 34
```
**Fix:**
```js
setTimeout(() => obj.greet(), 0);      // arrow wrapper keeps the call as obj.greet()
// or
setTimeout(obj.greet.bind(obj), 0);    // bind locks `this` to obj permanently
```

**54. Why is this not a pure function?**
```js
let count = 0;
function increment() {
  count++;
}
```
A pure function's output depends only on its inputs, and it causes no observable side effects. `increment` takes no input and returns nothing meaningful — its entire purpose is to mutate state (`count`) outside its own scope, which is exactly what purity forbids.

**55. Explain currying.**
```js
const add = (x) => (y) => x + y;
console.log(add(2)(3)); // 5
```
Instead of taking both arguments at once, `add` takes them one at a time, returning a new function after each one until it has everything it needs. `add(2)` returns a function "waiting for `y`"; calling that with `3` finally computes `2 + 3`.

**56. Explain how this works, with an example.**
```js
const compose = (f, g) => (x) => f(g(x));

const double = (n) => n * 2;
const increment = (n) => n + 1;

const doubleThenIncrement = compose(increment, double);
console.log(doubleThenIncrement(5)); // 11 — double(5) = 10, then increment(10) = 11
```
`compose(f, g)` returns a new function that runs `g` first, then feeds its result into `f` — composition applies right to left, matching standard mathematical notation `f(g(x))`.

**57. Why is this unsafe?**
```ts
let value: any = "JS";
value.toUpperCase();
```
`any` turns off type checking entirely for that value — the compiler will let you call *any* method on it, correct or not, and only a runtime error (if the method doesn't actually exist) will catch the mistake. It defeats the entire point of using TypeScript.

**58. Fix the error properly.**
```ts
let value: unknown = "JS";
// value.toUpperCase(); // Error: Object is of type 'unknown'

if (typeof value === "string") {
  value.toUpperCase(); // OK — narrowed to string inside this branch
}
```
`unknown` is the type-safe counterpart to `any`: you can assign anything to it, but you must **narrow** it (with a `typeof` check, an `instanceof` check, or a type assertion) before the compiler will let you call methods on it.

**59. Explain why this works.**
```ts
interface A {
  name: string;
}
interface A {
  age: number;
}
// A is now effectively { name: string; age: number }
```
TypeScript `interface` declarations support **declaration merging** — multiple `interface` blocks with the same name combine into a single interface with all their members. This is intentional, and is how libraries let consumers extend built-in interfaces.

**60. Why does this fail?**
```ts
type A = { name: string };
type A = { age: number }; // Error: Duplicate identifier 'A'
```
Unlike `interface`, a `type` alias is a one-time binding to a specific type shape — it cannot be redeclared or merged. Reusing the same name is simply a duplicate-identifier error.

**61. Design principles, scenario-based:** given a function that handles validation, API calls, and logging all in one place, how would you refactor it to follow the Single Responsibility Principle?
Split it into three focused functions or modules — a validator, an API client, and a logger — each with exactly one reason to change, and have the original function (or a small orchestrator) call all three in sequence. See [design principles](../15-tooling/design-principles.md) for the full SOLID write-up, including when strict separation like this can be taken too far.
