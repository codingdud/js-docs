---
title: "Abstract Classes, Polymorphism and Template Method"
sidebar_position: 6
---

JavaScript has no `abstract` keyword. This page covers the two idiomatic ways people simulate an abstract base class (`new.target` and `this.constructor`), the "throw in the base method" trick for abstract methods, the template method pattern built on top of it, and polymorphic method overriding across a small hierarchy of subclasses.

## Guarding direct instantiation: `new.target`

`new.target` inside a constructor tells you exactly **which class** was invoked with `new` — not which constructor body happens to be running, but the actual class named after `new`.

```js
class Shape {
  constructor(color) {
    if (new.target === Shape) {
      throw new Error("Shape is abstract — cannot instantiate directly");
    }
    this.color = color;
  }

  // Abstract method simulation — concrete subclasses must override this
  area() {
    throw new Error(`${this.constructor.name} must implement area()`);
  }

  // Template method — depends on the (abstract) area() being implemented
  describe() {
    return `A ${this.color} ${this.constructor.name} with area ${this.area().toFixed(2)}`;
  }
}

try {
  new Shape("red");
} catch (e) {
  console.log(e.message); // "Shape is abstract — cannot instantiate directly"
}
```

Crucially, `new Rectangle(...)` where `Rectangle extends Shape` runs `Shape`'s constructor via `super(color)`, but at that point `new.target` is still `Rectangle` (the class the caller actually `new`-ed), not `Shape` — so the guard only fires for a *direct* `new Shape(...)` call, exactly as intended.

## Guarding direct instantiation: `this.constructor`

The alternative check compares `this.constructor` (which resolves through the prototype chain to whichever class's `.prototype.constructor` the instance actually points to) against the abstract class:

```js
class Payment {
  constructor() {
    if (this.constructor === Payment) {
      throw new Error("Abstract class can't create object from abstract class!");
    }
  }
  pay() {
    throw new Error("Method must be implemented");
  }
}

class PayPal extends Payment {
  constructor() {
    super(); // safe — this.constructor is PayPal here, not Payment
  }
  pay(amount) {
    console.log(`payed ${amount} through paypal`);
  }
}

class Upi extends Payment {
  constructor() {
    super(); // safe — this.constructor is Upi here, not Payment
  }
  pay(amount) {
    console.log(`payed ${amount} through Upi`);
  }
}

class Card extends Payment {
  constructor() {
    super(); // safe — this.constructor is Card here, not Payment
  }
  pay(amount) {
    console.log(`payed ${amount} through Card`);
  }
}

new PayPal().pay(100); // "payed 100 through paypal"
new Upi().pay(200);    // "payed 200 through Upi"
new Card().pay(300);   // "payed 300 through Card"

try {
  new Payment();
} catch (e) {
  console.log(e.message); // "Abstract class can't create object from abstract class!"
}
```

Each concrete subclass (`PayPal`, `Upi`, `Card`) overrides `pay()` with its own implementation while inheriting the exact same `this.constructor === Payment` abstract guard from the base — none of them can accidentally re-trigger it, because `this.constructor` resolves to the subclass, not `Payment`, inside any of their constructors.

### `new.target` vs `this.constructor` — which to prefer

Both checks produce the same observable result for this simple case, but they are not equivalent in general:

| | `new.target === Shape` | `this.constructor === Payment` |
|---|---|---|
| What it reflects | The exact class named after the `new` keyword at the call site | Whatever `.constructor` the instance's prototype chain currently resolves to |
| Can be spoofed | Effectively no — it's an engine-level signal of the actual `new` invocation | Yes, in principle — `.constructor` is an ordinary, writable, reassignable property (see the prototype-replacement bug in [Classes vs Constructor Functions](./classes-vs-constructors.md)) |
| Works before any assignment inside the constructor | Yes | Yes, because `this.constructor` is resolved via the prototype, not an own property, before the constructor body sets anything |

`new.target` is the more robust check because it reflects the actual invocation, independent of anything that could have tampered with `.constructor`. `this.constructor` is slightly more readable and works fine as long as nobody has broken the prototype's `.constructor` back-reference — which, per the earlier chapter, is an easy thing to accidentally do with plain constructor functions, though effectively never with classes.

## Abstract methods via "throw in the base"

JavaScript can't declare a method signature without a body, so the idiomatic stand-in for an abstract method is: define it in the base class, and have it throw unconditionally.

```js
area() {
  throw new Error(`${this.constructor.name} must implement area()`);
}
```

Any subclass that forgets to override `area()` will find out immediately and loudly — the very first time `area()` (or anything that calls it, like `describe()`) runs — rather than silently returning `undefined` or `NaN`.

## Template method pattern

`describe()` on `Shape` is a **template method**: it defines a fixed algorithm ("build this sentence") but delegates one step (`this.area()`) to whatever the concrete subclass provides. The base class controls the *shape* of the computation; subclasses control one *step* of it.

```js
class Rectangle extends Shape {
  constructor(color, width, height) {
    super(color);
    this.width = width;
    this.height = height;
  }
  area() { return this.width * this.height; }
}

const rect = new Rectangle("blue", 4, 5);
console.log(rect.describe()); // "A blue Rectangle with area 20.00"
```

### Completing `CircleShape`

The source left `CircleShape.area()` as an exercise; the correct implementation is the standard circle-area formula:

```js
class CircleShape extends Shape {
  constructor(color, radius) {
    super(color);
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius ** 2;
  }
}

const circ = new CircleShape("green", 7);
console.log(circ.describe()); // "A green CircleShape with area 153.94"
```

### Polymorphism — same call, different behavior per subclass

Because every `Shape` subclass implements `area()` with the same signature, code that only knows about `Shape` can call `describe()` on a mixed array of subclass instances without any `if`/`instanceof` branching — each instance's *own* `area()` runs:

```js
const shapes = [
  new Rectangle("red", 3, 4),
  new CircleShape("blue", 5),
];

shapes.forEach((s) => console.log(s.describe()));
// "A red Rectangle with area 12.00"
// "A blue CircleShape with area 78.54"
```

This is polymorphism in the classic OOP sense: one interface (`describe()`/`area()`), many implementations, selected automatically at runtime based on the actual object's class.

## A second worked example — and a real bug to fix

```js
class Emp {
  constructor(name, salary = 3000) {
    this.name = name;
    this.salary = salary;
  }
  getSalary() {
    return 3000; // ⚠️ hard-coded — ignores this.salary entirely
  }
}

class Manager extends Emp {
  constructor(name, salary = 4000) {
    super(name, salary);
  }
  getSalary() {
    return `${this.name} Manager get salary:${this.salary * 10}`;
  }
}

class Inter extends Emp {
  constructor(name, salary = 1500) {
    super(name, salary);
  }
  getSalary() {
    return `${this.name} Intern get salary:${this.salary * 2}`;
  }
}

const ram = new Manager("ram");
const aniket = new Inter("Aniket");
console.log(ram.getSalary());    // "ram Manager get salary:40000"
console.log(aniket.getSalary()); // "Aniket Intern get salary:3000"
```

Both `Manager` and `Inter` correctly override `getSalary()` to compute a value from `this.salary` — a good example of polymorphism, same as the `Shape` hierarchy above. But `Emp.getSalary()` itself has a bug: it returns the **literal number `3000`**, ignoring `this.salary` completely. For any plain `Emp` instance (or any future subclass that doesn't override `getSalary()`), the constructor-provided salary is silently discarded:

```js
const plainEmp = new Emp("Priya", 5000);
console.log(plainEmp.getSalary()); // 3000 — wrong! should reflect the 5000 that was set
```

**Correct implementation:**

```js
class Emp {
  constructor(name, salary = 3000) {
    this.name = name;
    this.salary = salary;
  }
  getSalary() {
    return this.salary; // reflects whatever salary this instance actually has
  }
}

const fixedEmp = new Emp("Priya", 5000);
console.log(fixedEmp.getSalary()); // 5000 — correct
```

:::warning
A base-class method that returns a hard-coded value "because that was the default when I wrote it" is a classic source of bugs the moment any instance is constructed with a different value. If a method's whole job is to report on instance state, make sure it actually reads that state (`this.salary`), not a constant that happened to match the default at the time.
:::

## Key takeaways

- JavaScript has no native `abstract` keyword; the idiomatic simulation is `if (new.target === BaseClass) throw ...` (or the slightly less robust `this.constructor === BaseClass` check) inside the base constructor.
- `new.target` reflects the actual class named after `new` at the call site and can't be tampered with by reassigning `.constructor`; prefer it over `this.constructor` for abstract-class guards when you want the stronger guarantee.
- Abstract *methods* are simulated by defining them in the base class with a body that unconditionally throws, so a missing override fails loudly the first time it's used.
- A template method defines a fixed algorithm in the base class that calls one or more "abstract" steps, letting subclasses customize only those steps — `describe()` calling `this.area()` is the textbook example.
- Polymorphism means calling the same method name (`getSalary()`, `area()`) on different subclass instances runs each instance's own override automatically — no `instanceof` branching required.
- Always double-check that a base method which exists "to be overridden" doesn't also accidentally return a hard-coded value for the non-overridden case — it should read from instance state (`this.salary`) instead.

## Interview questions

1. **How do you simulate an abstract class in JavaScript?** Check `new.target === TheAbstractClass` (or `this.constructor === TheAbstractClass`) in the base constructor and throw if it matches, since that only happens when the abstract class itself was `new`-ed directly.
2. **Why is `new.target` generally considered more robust than `this.constructor` for this guard?** `new.target` reflects the actual class used at the `new` call site and can't be altered after the fact; `this.constructor` is an ordinary property resolved through the prototype chain and could, in principle, be reassigned or broken (e.g. by replacing a prototype object).
3. **How do you simulate an abstract method?** Define it in the base class with a body that always throws (e.g. `"X must implement area()"`), so any subclass that forgets to override it fails immediately when the method is called.
4. **What is the template method pattern?** A base-class method that implements a fixed sequence of steps, delegating one or more of those steps to methods that subclasses are expected to override — the base controls the algorithm's shape, subclasses control specific steps.
5. **Spot the bug:** a base class's `getSalary()` always returns `3000` regardless of `this.salary`. What's wrong, and how do you fix it? It ignores instance state; fix it by returning `this.salary` instead of a literal constant.
