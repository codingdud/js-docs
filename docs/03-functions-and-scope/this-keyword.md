---
title: "The this Keyword"
sidebar_position: 5
---

# The `this` Keyword

`this` is not lexically scoped like ordinary variables (see [Lexical Scope, Scope Chain and Shadowing](./scope-chain-and-shadowing.md)). Its value is decided at **call time**, by *how* a function is invoked.

> `this` refers to the object executing the current function. Determined by **how it's called**, not where it's defined.

## `this` is a runtime binding by call site

```js
function showThis() {
  console.log(this);
}
const obj = { showThis };

showThis();             // default binding
obj.showThis();         // implicit binding - this = obj
showThis.call({ id: 1 }); // explicit binding - this = { id: 1 }
new showThis();          // new binding - this = the new object
```

Four rules, checked in priority order: `new` > explicit > implicit > default.

## The four rules of `this`

### 1. Default binding (plain function call)

```js
function showThis() { console.log(this); }
showThis();
// Non-strict: global object (window / global / globalThis)
// Strict: undefined
```

Sloppy mode silently falls back to global (dangerous: `this.x = 1` leaks a global). Strict mode (and ES modules/class bodies) leaves `this` as `undefined`, so the same mistake throws loudly instead.

### 2. Implicit binding (method call)

`obj.method()` → `this` is whatever object sits left of the dot at the call site:

```js
const person = {
  name: "Alice",
  greet() { console.log(this.name); },
};
person.greet(); // "Alice" - this = person
```

### 3. Explicit binding (`call`, `apply`, `bind`)

Set `this` yourself regardless of how the function is attached. Full details in [`call`, `apply` and `bind`](./call-apply-bind.md).

```js
function greet() { console.log(`Hello, ${this.name}`); }
const user = { name: "Bob" };

greet.call(user);  // "Hello, Bob"
greet.apply(user); // "Hello, Bob"
const boundGreet = greet.bind(user);
boundGreet();       // "Hello, Bob"
```

### 4. `new` binding (constructor call)

`new Fn()` creates a new object, sets `this` to it, links the prototype, and returns it (unless the function explicitly returns another object):

```js
function Person(name) { this.name = name; }
const person = new Person("Charlie");
console.log(person.name); // "Charlie"
```

### Priority summary

| Rule | Triggered by | `this` becomes |
| --- | --- | --- |
| `new` binding | `new Fn()` | New object (highest priority) |
| Explicit binding | `.call(obj)` / `.apply(obj)` / `.bind(obj)()` | `obj` |
| Implicit binding | `obj.fn()` | `obj` |
| Default binding | `fn()` | Global object (sloppy) or `undefined` (strict) |

## Unbound vs. bound methods: the Car/Bird example

Moving a method onto another object changes what `this` means for it, unless bound first.

```js
class Car {
  constructor() {
    this.sayBye = this.sayBye.bind(this); // sayHi stays unbound
  }
  sayHi() { console.log(`Hello from ${this.name}`); }
  sayBye() { console.log(`Bye from ${this.name}`); }
  get name() { return "Ferrari"; }
}
class Bird {
  get name() { return "Tweety"; }
}

const car = new Car();
const bird = new Bird();

car.sayHi(); // "Hello from Ferrari"
bird.sayHi = car.sayHi;
bird.sayHi(); // "Hello from Tweety" - this = bird (call site decides)

bird.sayBye = car.sayBye;
bird.sayBye(); // "Bye from Ferrari" - this is locked to car
```

`this.sayBye.bind(this)` in the constructor creates a new function with `this` permanently locked to that instance, and assigns it as an **own property** that shadows `Car.prototype.sayBye`.

## Losing `this`: extracting or passing a method

Implicit binding only applies while called as `obj.method()`. Store it in a bare variable or pass it as a callback, and the "`obj.`" part is gone — default binding applies instead.

```js
const obj = {
  name: "JS",
  greet() { console.log(this.name); },
};
setTimeout(obj.greet, 0); // called as a plain function - this is lost
```

### Fixes

```js
setTimeout(obj.greet.bind(obj), 0);     // Fix 1: bind
setTimeout(() => obj.greet(), 0);       // Fix 2: arrow wrapper, captures this lexically

class Widget {                          // Fix 3: bind once, in the constructor
  constructor() { this.greet = this.greet.bind(this); }
  greet() { console.log(this.name); }
}
```

:::warning Class bodies are always strict mode
A detached class method called plainly does **not** fall back to global — `this` is `undefined`:

```js
class Foo {
  greet() { console.log(this.name); } // throws if this is undefined
}
const g = new Foo().greet;
g(); // TypeError: Cannot read properties of undefined (reading 'name')
```

Good thing: the bug surfaces immediately instead of silently touching globals.
:::

## A bound function cannot be rebound

Once bound, `this` is permanently fixed — further `.bind()`/`.call()`/`.apply()` have no effect.

```js
function whoAmI() { console.log(this.id); }
const boundToA = whoAmI.bind({ id: "A" });
const boundToB = boundToA.bind({ id: "B" }); // ignored

boundToB(); // "A" - first bind wins
boundToA.call({ id: "C" }); // "A"
```

Exception: calling a bound function with `new` still creates a fresh object and uses that as `this` (narrow case, bound constructors only).

## Method chaining and the cost of forgetting `new`

```js
function Cal(numm) {
  this.cal = numm;
  return {
    add(num) { this.cal += num; return this; },
    sunb(num) { this.cal -= num; return this; },
    display() { console.log(this.cal); },
  };
}

const calculator = Cal(10); // called WITHOUT `new`
calculator.add(200).sunb(100).display(); // NaN
```

Why `NaN`:

1. No `new` → default binding → `this` is the **global object** in sloppy mode. `this.cal = 10` sets `cal` on the global object, not on anything `calculator` holds.
2. `Cal` returns a plain object (`add`/`sunb`/`display`); since there's no `new`, this is just the normal return value, assigned to `calculator`.
3. `calculator.cal` was never set → `undefined`.
4. `.add(200)`: `this = calculator` (implicit binding). `undefined + 200` = `NaN`, stored on `calculator.cal`.
5. `.sunb(100)`: still `NaN`.
6. `.display()`: logs `NaN`.

Each `return this;` is what makes the chain work — but only if `this` is what you expect. `new Cal(10)` would set `cal` correctly (though the function still returns a different object, since returning an object from a constructor replaces the usual `new` result).

## Key takeaways

- `this` resolves at the call site, every call — not at definition.
- Priority: `new` > explicit (`call`/`apply`/`bind`) > implicit (`obj.method()`) > default (global/sloppy, `undefined`/strict).
- Extracting a method or passing it as a callback strips implicit binding; fix with `.bind()`, an arrow wrapper, or binding once in a constructor.
- Class bodies are always strict mode — a detached class method's `this` is `undefined`, not global.
- A `.bind()`'d function can't be rebound by another `.bind()`/`.call()`/`.apply()` — only `new` overrides it.
- Calling a constructor-style function without `new` uses default binding, silently breaking code expecting a fresh instance.

## Interview questions

1. **Lexical or runtime `this`?** Runtime — decided by the call site.
2. **`this` in a plain call, strict vs. sloppy?** `undefined` strict; global object sloppy.
3. **Why does `setTimeout(obj.greet, 0)` lose `this`?** Passed as a bare reference; called later as a plain function → default binding.
4. **Can `.call()` override a bound function's `this`?** No — only calling it with `new` can.
5. **Detached object method vs. detached class method?** Object method falls back to global (sloppy); class method's `this` is `undefined` (always strict).
