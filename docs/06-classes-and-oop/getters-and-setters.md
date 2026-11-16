---
title: "Getters and Setters in Classes"
sidebar_position: 3
---

Accessor properties (`get`/`set`) let a class expose what *looks* like a plain field while actually running code on every read or write. This page covers where accessors live, how to use them for validation and lazy computation, and a sharp inheritance gotcha around overriding only one half of a pair.

## Validation with a setter

```js
class BankAccount {
  #balance = 0;

  constructor(owner, initialDeposit) {
    this.owner = owner;
    this.deposit(initialDeposit);
  }

  get balance() {
    return this.#balance;
  }

  set balance(amount) {
    if (amount < 0) throw new RangeError(`Balance cannot be negative, got ${amount}`);
    this.#balance = amount;
  }

  deposit(amount) {
    this.balance = this.#balance + amount; // goes through the setter
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error("Insufficient funds");
    this.balance = this.#balance - amount;
  }
}

const acc = new BankAccount("Alice", 1000);
console.log(acc.balance); // 1000

acc.deposit(500);
console.log(acc.balance); // 1500

acc.withdraw(200);
console.log(acc.balance); // 1300

try {
  acc.balance = -50;
} catch (e) {
  console.log(e.message); // "Balance cannot be negative, got -50"
}
```

`deposit` and `withdraw` deliberately go through `this.balance = ...` (the setter) rather than writing `this.#balance` directly, so every mutation path is funneled through the same `RangeError` guard.

### Accessors live on the prototype, not the instance

```js
const descriptors = Object.getOwnPropertyDescriptors(BankAccount.prototype);
console.log(descriptors.balance);
// {
//   get: [Function: get balance],
//   set: [Function: set balance],
//   enumerable: false,
//   configurable: true
// }

console.log(Object.getOwnPropertyNames(acc)); // ["owner", ... ] — no "balance" own property
```

Just like regular class methods, `get`/`set` pairs are installed on `.prototype`, not per instance, and are **non-enumerable** by default. Writing `acc.balance = 500` or `acc["balance"] = 500` both invoke the setter — bracket and dot access are equivalent here.

## Lazy / memoized getters

A getter that re-computes something expensive on every access can be wasteful. The fix: compute once, then shadow the prototype's getter with a plain value property on the instance using `Object.defineProperty`.

```js
class Circle {
  constructor(radius) {
    this.radius = radius;
  }

  get area() {
    const result = Math.PI * this.radius ** 2;
    Object.defineProperty(this, "area", { value: result, writable: false, configurable: false });
    return result;
  }

  get circumference() {
    const result = 2 * Math.PI * this.radius;
    Object.defineProperty(this, "circumference", { value: result, writable: false, configurable: false });
    return result;
  }
}

const c = new Circle(5);
console.log(Object.getOwnPropertyNames(c));   // ["radius"] — no "area" yet

console.log(c.area.toFixed(4));               // "78.5398" — first access runs the computation
console.log(c.circumference.toFixed(4));      // "31.4159"

console.log(Object.getOwnPropertyNames(c));   // ["radius", "area", "circumference"] — now cached

console.log(c.area.toFixed(4));               // "78.5398" — served from the instance, getter body never runs again
```

The pattern:

```js
get expensiveValue() {
  const result = /* expensive computation */;
  Object.defineProperty(this, "expensiveValue", { value: result, writable: false });
  return result;
}
```

Own properties shadow prototype properties with the same name, so once `area` exists directly on the instance, that instance's future `instance.area` reads never reach the prototype getter again. `writable: false` (and `configurable: false` if you want it fully locked) protects the cached value from being overwritten later.

:::tip
This only helps *per instance*. If you need the computed value shared across *all* instances (because it doesn't depend on instance state), a module-level constant or a memoized static getter is more appropriate than an instance-level cache.
:::

## Getters in inheritance — overriding one half breaks the pair

```js
class Shape {
  constructor(color) {
    this.color = color; // goes through the setter: validates + lowercases
  }

  get color() {
    return this.__color;
  }

  set color(value) {
    if (typeof value !== "string") throw new TypeError("Color must be a string");
    this.__color = value.toLowerCase();
  }
}

class Circle2 extends Shape {
  constructor(color, radius) {
    super(color);
    this.radius = radius;
  }

  // Overriding the getter only...
  get color() {
    return `circle-${super.color}`;
  }
  // ...without a matching setter means the parent's setter is gone for this property.
}
```

If `Circle2` defines **only** `get color()` with no paired `set color()`, the accessor property descriptor installed on `Circle2.prototype` for `"color"` has a getter and **no setter at all** — it does not fall back to `Shape.prototype`'s setter. Property lookup for assignment finds the *first* `color` descriptor up the chain (on `Circle2.prototype`), sees it has no setter, and — because class bodies are always strict mode — throws instead of silently failing:

```js
try {
  const c2 = new Circle2("Red", 5); // super(color) tries `this.color = "Red"`
} catch (e) {
  console.log(e.constructor.name); // "TypeError"
  console.log(e.message);          // "Cannot set property color of #<Circle2> which has only a getter"
}
```

:::warning Correcting a common misconception
It is tempting to assume this produces infinite recursion or a stack overflow (since `get color()` calls `super.color`, which sounds self-referential). It does not — `super.color` reads from `Shape.prototype`'s getter exactly once and returns; there's no loop. The actual failure is a **`TypeError` at assignment time**, in strict mode, because the overriding getter silently removed the inherited setter. No loop, no stack overflow — just a missing setter.
:::

**The fix** — re-declare the setter and delegate to the parent's version with `super.color = value`:

```js
class Circle2 extends Shape {
  constructor(color, radius) {
    super(color);
    this.radius = radius;
  }

  get color() {
    return `circle-${super.color}`;
  }

  set color(value) {
    super.color = value; // delegates to Shape's setter (validation + lowercasing)
  }
}

const c2 = new Circle2("Red", 5);
console.log(c2.color); // "circle-red"

c2.color = "blue";
console.log(c2.color); // "circle-blue"
```

**Key rule:** in JavaScript, `get`/`set` are **independent** property attributes of the same descriptor. Defining a getter in a subclass without a setter does not inherit the parent's setter for that property name — you must explicitly re-declare both halves if you want both to work after an override.

## Backing fields and self-assignment recursion

Accessors need somewhere to actually store the value — that's the "backing field." Across these examples you'll see a few different naming conventions for it: `_a` (single underscore, convention-only privacy), `__color` (double underscore, same idea), or `#color` (a true private field). All three work the same way structurally:

```js
class Abc {
  constructor(a) {
    this._a = a;
  }
  get a() {
    return this._a;
  }
  set a(x) {
    this._a = x;
  }
}

const obj = new Abc(10);
console.log(obj.a); // 10
obj.a = 20;
console.log(obj.a); // 20
```

:::danger The one bug to never write
Never name the backing field the *same* as the accessor:

```js
class Broken {
  get value() { return this.value; }   // calls itself -> infinite recursion
  set value(v) { this.value = v; }     // calls itself -> infinite recursion
}
new Broken().value = 1; // RangeError: Maximum call stack size exceeded
```

Here the getter and setter genuinely do call themselves, because `this.value` inside either one re-triggers the same accessor. This is the one place a stack overflow from accessors is real — unlike the `Circle2` case above, where the real failure was a `TypeError`, not recursion. Always use a differently-named backing field (`_value`, `#value`, a `WeakMap`, etc.) so the accessor body never touches its own name.
:::

## Key takeaways

- `get`/`set` pairs are installed on `.prototype`, non-enumerable, exactly like ordinary class methods — never on the instance, unless you deliberately shadow them with `Object.defineProperty`.
- Lazy getters cache their result as an own, instance-level value property, which shadows the prototype getter for all future reads on that instance.
- A getter and its setter are two independent entries of one property descriptor. Overriding only the getter in a subclass **removes** the inherited setter for that property — it does not keep the parent's.
- Assigning to an accessor-only-getter property in strict mode (which class bodies always are) throws a `TypeError`, not a silent no-op and not infinite recursion.
- The only real cause of accessor-recursion stack overflows is naming the backing field the same as the accessor itself.

## Interview questions

1. **Where do class getters/setters live — instance or prototype?** On the prototype, same as regular methods, and non-enumerable by default.
2. **If a subclass overrides only the getter of an inherited accessor property, what happens when you try to write to it?** The setter is not inherited for that property; writing throws a `TypeError` in strict mode ("has only a getter"), because the subclass's own descriptor completely replaces the parent's for that name.
3. **How do you implement a cheap "compute once" getter?** Use `Object.defineProperty(this, propName, { value, writable: false })` inside the getter body itself, so the instance gets an own property that shadows the prototype getter on every subsequent access.
4. **What causes real infinite recursion in an accessor?** Naming the backing field the same as the accessor (`get x() { return this.x }`), so the getter/setter calls itself.
5. **Why are class bodies relevant to the `TypeError` vs stack-overflow distinction?** Because class bodies are always strict mode, a write to a getter-only property throws immediately instead of silently failing — there's no loop to overflow the stack in that scenario.
