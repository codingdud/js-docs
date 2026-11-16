---
title: "Arrow Functions and Lexical this"
sidebar_position: 6
---

# Arrow Functions and Lexical `this`

[The `this` Keyword](./this-keyword.md) covered call-site `this`. Arrow functions have **no `this` of their own** — `this` inside one is resolved like any free variable, by walking the **lexical scope chain** to where the arrow was *written*.

> Normal functions: `this` depends on **how you call it**.
> Arrow functions: `this` depends on **where you write it**.

## Scenario 1 — constructor function + arrow function (works)

```js
function Person(name) {
  this.name = name;
  this.sayName = () => { console.log(this.name); };
}

const p1 = new Person("Animesh");
p1.sayName(); // "Animesh"

const fn = p1.sayName;
fn(); // still "Animesh" - NOT undefined!
```

Created while `Person` runs as a constructor, so it permanently captures the new instance's `this` — even detached and called with no receiver.

## Scenario 2 — constructor function + regular function (works, but fragile)

```js
function Person(name) {
  this.name = name;
  this.sayName = function () { console.log(this.name); };
}

const p1 = new Person("Animesh");
p1.sayName(); // "Animesh" - implicit binding

const fn = p1.sayName;
fn(); // undefined (strict) / global's name (sloppy) - this is lost
```

A regular function decides `this` at call time; detaching it loses the connection to `p1`.

## Scenario 3 — object method as an arrow function (the classic trap)

```js
const user = {
  name: "Animesh",
  greet: () => { console.log(this.name); },
};
user.greet(); // undefined
```

The arrow is written where the object literal sits (module/script top level), not inside `user` — arrow methods never bind to the object they're attached to.

```js
// Fix: use a regular method instead
const user = {
  name: "Animesh",
  greet() { console.log(this.name); },
};
user.greet(); // "Animesh"
```

## Scenario 4 — a regular nested function loses the outer `this`

```js
const user = {
  name: "Animesh",
  greet() {
    function inner() { console.log(this.name); }
    inner();
  },
};
user.greet(); // undefined
```

`greet`'s `this` is `user`, but `inner()` is called plainly, getting its own default-bound `this`.

```js
// Fix: arrow reuses greet's this
const user = {
  name: "Animesh",
  greet() {
    const inner = () => { console.log(this.name); };
    inner();
  },
};
user.greet(); // "Animesh"
```

## Scenario 5 — arrow inside arrow (the lexical chain)

```js
const obj = {
  name: "Animesh",
  greet() {
    const a1 = () => {
      const a2 = () => { console.log(this.name); };
      a2();
    };
    a1();
  },
};
obj.greet(); // "Animesh"
```

`greet` is a regular method (`this` = `obj`); `a1` inherits it; `a2` inherits `a1`'s — `this` flows unchanged through any depth of nested arrows.

## Scenario 6 — class field arrow vs. prototype method

```js
class Person {
  constructor(name) { this.name = name; }
  greet = () => { console.log(this.name); };
}
const p = new Person("Animesh");
p.greet(); // "Animesh", stays "Animesh" even if detached
```

A class field initializer runs once per instance, so the arrow permanently captures that instance's `this` — safe to pass as a callback.

### The memory tradeoff

| | Arrow class field (`greet = () => {}`) | Prototype method (`greet() {}`) |
| --- | --- | --- |
| Where it lives | New function per instance | One shared function on the prototype |
| Memory | One extra function per instance | Efficient — shared |
| Detached `this` | Always safe | Lost; needs `.bind()` |
| Best for | Callback methods (event handlers, timers) | Ordinary `instance.method()` calls |

Default to a prototype method; use the arrow field only for callback-bound methods.

## Scenario 7 — arrow function as the best use case: `setTimeout` inside a class method

```js
class Counter {
  count = 0;
  increment() {
    setTimeout(() => {
      this.count++;
      console.log(this.count);
    }, 1000);
  }
}
new Counter().increment(); // after 1s: 1
```

`setTimeout`'s callback is always invoked plainly; a regular function would lose `this`. The arrow captures `this` from `increment`'s scope (the instance), no `.bind()` needed.

## Scenario 8 — plain nested function vs. arrow, and correcting a common claim

```js
function outer() {
  this.name = "Outer";
  function inner() { console.log(this.name); }
  inner();
}
outer();
```

:::warning Correcting a common claim
Some notes claim this prints `undefined` — only true in **strict mode**. In **sloppy mode** (default for a plain script):

1. `outer()` called with no receiver → default binding → `this` = global object.
2. `this.name = "Outer"` sets `name` on the global object.
3. `inner()` also gets default binding → same global object.
4. `this.name` in `inner` reads that same property.

So sloppy mode logs **`"Outer"`**, not `undefined`. In **strict mode**, default binding gives `this = undefined`, so step 2 throws `TypeError: Cannot set properties of undefined (setting 'name')` immediately.
:::

### Fix: make `inner` an arrow function

```js
function outer() {
  this.name = "Outer";
  const inner = () => { console.log(this.name); };
  inner();
}
outer.call({ name: "Animesh" }); // logs "Outer", not "Animesh"
```

1. `outer.call({ name: "Animesh" })` sets `this` to that object for the call.
2. `this.name = "Outer"` mutates that same object's `name`.
3. `inner` (arrow) reuses `outer`'s `this`, already `"Outer"` by the time it reads it.

## Rapid interview traps

| Case | Arrow function | Regular function |
| --- | --- | --- |
| Object method | Wrong | Correct |
| Constructor-assigned method (`this.x = () => {}`) | Correct (binds to instance) | Correct (but loses `this` once detached) |
| Callback (`setTimeout`, promise handler) | Correct (keeps outer `this`) | Wrong |
| Prototype method | Wrong | Correct |
| DOM event handler | Wrong | Correct (`this` = the element) |
| Nested helper inside a method | Correct (inherits method's `this`) | Wrong |

## Golden rules

- Arrow functions capture `this` lexically, once, at definition — never at the call site.
- Don't use them as object/prototype methods — they can never be "the object's own" `this`.
- Best for callbacks, closures, async code — where a regular function would need `.bind()` or `const self = this`.
- Regular functions remain right for methods/prototype methods.

## `this` at the top level of a module: `arrobj.js`

```js
const obj = {
  val: 10,
  show: () => console.log(this.val),
};
obj.show(); // undefined
```

`show` captures top-level `this`, which depends on environment:

- **Browser script**: global object (`window`); `window.val` is `undefined`.
- **Node CommonJS**: `module.exports` (empty object by default), not global.
- **ES module**: `undefined`.

All three give `this.val === undefined`, but for different reasons — know which `this` you're looking at.

## Chainable methods with constructor-bound arrows: `constructor.js`

```js
function Calculator(val) {
  this.cal = val;
  this.add = (num) => { this.cal += num; return this; };
  this.display = (num) => { console.log(this.cal); };
}

console.log(new Calculator(10).add(100).display());
```

Both methods are arrows created inside the constructor, permanently capturing that instance's `this` — safe to detach or chain (unlike scenario 2).

Trace: `new Calculator(10)` → `cal = 10`; `.add(100)` → `cal = 110`, returns `this`; `.display()` logs `110`, returns `undefined` (no `return` — see [Functions without a `return` give `undefined`](./function-types-and-parameters.md#functions-without-a-return-give-undefined)); outer `console.log` prints that `undefined`.

```text
110
undefined
```

## Another object-literal arrow trap: `edge.md`

```js
const obj = {
  name: "Claude",
  greet: () => { console.log(this.name); },
};
obj.greet(); // undefined - arrow doesn't bind this to obj
```

Same root cause as Scenario 3: arrow captures `this` from the surrounding scope at the point the literal was written, not from `obj`.

## Key takeaways

- An arrow function resolves `this` through the normal scope chain from where it was **written**, never the call site.
- Wrong for object/prototype methods; ideal for callbacks and nested helpers that should keep the enclosing `this`.
- `this.x = () => {}` in a constructor, or a class field arrow, permanently binds to the instance — safe even detached.
- Top-level `this`: global object (browser script), `module.exports` (Node CommonJS), `undefined` (ES module).
- Arrow functions ignore `call`/`apply`/`bind`'s `this` argument entirely (see [`call`, `apply` and `bind`](./call-apply-bind.md#arrow-functions-ignore-call-apply-and-bind)).

## Interview questions

1. **Why does `user.greet()` print `undefined` for an arrow property?** The arrow was defined outside `user`, so it never captures `user` as `this`.
2. **Why is a constructor arrow (`this.sayName = () => {}`) safe to detach, but a regular function isn't?** The arrow permanently captures the instance's `this` at creation; the regular function decides `this` fresh per call, so detaching loses the binding.
3. **What problem does an arrow `setTimeout` callback solve?** Avoids losing `this` — a regular callback gets default binding, the arrow keeps the scheduling method's `this`.
4. **Memory tradeoff of class field arrows vs. prototype methods?** Arrow fields: one function per instance, permanently bound `this`. Prototype methods: shared, memory-efficient, but lose `this` if detached.
5. **Top-level `this` in Node CommonJS?** `module.exports` — not global, not `undefined`.
