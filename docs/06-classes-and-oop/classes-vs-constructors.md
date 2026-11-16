---
title: "Classes vs Constructor Functions"
sidebar_position: 1
---

Before `class` existed, every "object-oriented" pattern in JavaScript was built from plain functions, the `new` keyword, and manual work on `.prototype`. ES6 classes did not add a new kind of thing to the language — they added a cleaner **syntax** over the exact same mechanism. This page proves that claim with code, then catalogs the handful of real behavioral differences that *do* exist between a constructor function and a class.

## Classes are syntactic sugar, not a new type

Take a constructor function and its class equivalent:

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function () {
  return `Hello, I am ${this.name}, age ${this.age}`;
};

class PersonClass {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  greet() {
    return `Hello, I am ${this.name}, age ${this.age}`;
  }
}

const p1 = new Person("Aniket", 27);
const p2 = new PersonClass("Animesh", 26);

console.log(p1.greet()); // "Hello, I am Aniket, age 27"
console.log(p2.greet()); // "Hello, I am Animesh, age 26"
```

Everything about their shape is identical:

```js
// Both are plain functions — class is NOT a new "class" type
console.log(typeof Person);      // "function"
console.log(typeof PersonClass); // "function"

// Same prototype shape
console.log(Object.getOwnPropertyNames(Person.prototype));      // ["constructor", "greet"]
console.log(Object.getOwnPropertyNames(PersonClass.prototype)); // ["constructor", "greet"]

// The constructor back-reference is intact in both
console.log(Person.prototype.constructor === Person);           // true
console.log(PersonClass.prototype.constructor === PersonClass); // true
```

`p1.greet` and `p2.greet` are different function objects (they live on two different prototype objects), but they do the same job the same way. `greet` in the class body is just a shorthand for assigning a function onto `PersonClass.prototype`.

:::tip Key idea
`typeof SomeClass === "function"` for every class you write. Under the hood, a class is a constructor function with a special internal flag (`[[IsClassConstructor]]`) that changes a few rules — see below — but reflection-wise it is still a function.
:::

## Real difference #1 — classes enforce `new`

A constructor function is just a function. Nothing stops you from calling it without `new`, which silently reassigns `this` to the global object (or leaves it `undefined` in strict mode) instead of throwing:

```js
function Person(name, age) {
  this.name = name; // non-strict: leaks onto globalThis.name!
  this.age = age;
}
// Person("Bob", 20);  // runs "successfully" and pollutes globalThis in non-strict mode
```

A class constructor refuses to run without `new`:

```js
class PersonClass {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}

try {
  PersonClass("Bob", 20);
} catch (e) {
  console.log(e.message); // "Class constructor PersonClass cannot be invoked without 'new'"
}
```

This is possible because every class body runs in **strict mode** (see below) *and* carries the `[[IsClassConstructor]]` internal flag, which the spec checks before the function body ever runs.

## Real difference #2 — method enumerability

For-in and `Object.keys`-style enumeration behave differently, because of how each method lands on the prototype.

```js
function Animal(type) {
  this.type = type;
}
Animal.prototype.speak = function () {
  return `${this.type} speaks`;
};

class AnimalClass {
  constructor(type) {
    this.type = type;
  }
  speak() {
    return `${this.type} speaks`;
  }
}

const a1 = new Animal("Dog");
const a2 = new AnimalClass("Dog");

for (const key in a1) console.log("Animal for-in:", key);      // "type", "speak"
for (const key in a2) console.log("AnimalClass for-in:", key); // "type" only

console.log(Object.getOwnPropertyDescriptor(Animal.prototype, "speak").enumerable);      // true
console.log(Object.getOwnPropertyDescriptor(AnimalClass.prototype, "speak").enumerable); // false
```

A plain assignment (`Animal.prototype.speak = function () {}`) creates an **enumerable** property, so `speak` leaks into `for...in` loops over instances. Every method defined inside a class body (`speak() {}`) is installed as **non-enumerable, writable, configurable** — matching how built-ins like `Array.prototype.map` behave.

**Fix for the constructor-function version** — redefine the method with `Object.defineProperty` so it matches class behavior:

```js
Object.defineProperty(Animal.prototype, "speak", {
  value: function () { return `${this.type} speaks`; },
  enumerable: false, // now matches the class
  writable: true,
  configurable: true,
});

const a3 = new Animal("Cat");
for (const key in a3) console.log(key); // only "type" — "speak" no longer shows up
```

| Aspect | Constructor function (`proto.m = fn`) | Class method |
|---|---|---|
| `enumerable` | `true` | `false` |
| `writable` | `true` | `true` |
| `configurable` | `true` | `true` |
| Shows in `for...in` on instance | Yes | No |
| Shows in `Object.keys(instance)` | No (not an own property either way) | No |

## Real difference #3 — losing (and keeping) `.constructor`

A very common inheritance bug: replacing `.prototype` wholesale with an object literal silently breaks the `.constructor` back-reference.

```js
function Vehicle(make) {
  this.make = make;
}

// Common mistake: this REPLACES the whole prototype object
Vehicle.prototype = {
  describe() {
    return `Vehicle: ${this.make}`;
  },
};

const car = new Vehicle("Toyota");

console.log(car instanceof Vehicle);       // true  — instanceof walks the chain, still fine
console.log(car.constructor === Vehicle);  // false — BUG
console.log(car.constructor === Object);   // true  — the object literal's own .constructor
```

`instanceof` only cares whether `Vehicle.prototype` is somewhere in `car`'s prototype chain, so it still reports `true`. But `.constructor` now points to `Object`, because the object literal `{ describe() {...} }` has its own default `.constructor`, inherited from `Object.prototype`.

**Fix A — the old-school way**, manually restore the back-reference after replacing the prototype:

```js
Vehicle.prototype = {
  describe() {
    return `Vehicle: ${this.make}`;
  },
};
Vehicle.prototype.constructor = Vehicle; // restore it by hand

const car = new Vehicle("Toyota");
console.log(car.constructor === Vehicle); // true
```

**Fix B — rewrite as a class**, where this bug cannot occur because the engine wires `.constructor` for you and there is no "replace the whole prototype object" step:

```js
class VehicleClass {
  constructor(make) {
    this.make = make;
  }
  describe() {
    return `Vehicle: ${this.make}`;
  }
}

const car2 = new VehicleClass("Honda");
console.log(car2 instanceof VehicleClass);      // true
console.log(car2.constructor === VehicleClass); // true — automatic, nothing to forget
console.log(VehicleClass.prototype.constructor); // [class VehicleClass]
```

:::warning Prototype replacement is a trap either way
If you ever need to add shared methods in bulk on a constructor function, mutate the existing prototype object (`Object.assign(Vehicle.prototype, {...})` or individual assignments) instead of replacing it with a new object literal. Classes remove the temptation entirely.
:::

## `extends` and `super`

Classes give you a one-line way to wire the two prototype chains (instance-side and constructor-side — more on that split in [Static Methods, Properties and Factories](./static-members.md)) that used to take several manual `Object.setPrototypeOf` calls.

```js
class User {
  constructor(name) {
    this.name = name;
  }
  login() {
    return `${this.name} login in`;
  }
}

// Developer → User → Object
class Developer extends User {
  constructor(name, lang = "js") {
    super(name); // must run before `this` is usable
    this.lang = lang;
  }
  getDetails() {
    return `${this.name} do development in ${this.lang}`;
  }
}

const devUser = new Developer("Animesh kumar");
console.log(devUser.getDetails()); // "Animesh kumar do development in js"
console.log(devUser instanceof Developer); // true
console.log(devUser instanceof User);      // true
```

### `super` before `this` throws

In a subclass constructor, `this` does not exist yet when the constructor starts running — the parent constructor (via `super()`) is what actually allocates and initializes the instance. Touching `this` before calling `super()` throws a `ReferenceError`:

```js
class Developer extends User {
  constructor(name, lang = "js") {
    console.log(this); // ReferenceError: Must call super constructor
                        // in derived class before accessing 'this' or
                        // returning from derived constructor
    super(name);
    this.lang = lang;
  }
}
```

The rule: in any class with `extends`, `super(...)` must run **before** the first use of `this` (or before `return`ing an object) inside the constructor. A base class with no `extends` has no such restriction, because it has no parent to delegate construction to.

### `super.method()` calls the parent's implementation

`super.method()` lets a subclass call an overridden method's parent implementation explicitly, without needing a reference to the parent class by name:

```js
class Developer extends User {
  login() {
    const base = super.login(); // call User.prototype.login with this = devUser
    return `${base} as a developer`;
  }
}
```

## Class bodies are strict mode — always

Every class declaration or expression runs its entire body — constructor and methods — in strict mode, **even if the surrounding script is not**. This is why `PersonClass("Bob")` without `new` throws instead of silently assigning globals, why using an undeclared variable inside a method throws a `ReferenceError`, and why `this` is `undefined` (not the global object) when a class method is called without a receiver.

```js
class Foo {
  bareThis() {
    return this; // undefined when called as Foo.prototype.bareThis()
  }
}
const { bareThis } = new Foo();
console.log(bareThis()); // undefined — proof the method body is strict
```

## Quick reference

| Feature | Constructor function | Class |
|---|---|---|
| `typeof` | `"function"` | `"function"` |
| Callable without `new` | Yes (buggy — pollutes `this`) | No — `TypeError` |
| Methods on prototype enumerable | Yes (by default) | No |
| `.constructor` safety | Easy to break (prototype replacement) | Protected automatically |
| Body strictness | Inherits from file/module | Always strict |
| Static inheritance (`extends`) | Manual (`Object.setPrototypeOf(Child, Base)`) | Automatic |
| Hoisting | Full (function declarations) | In the Temporal Dead Zone until evaluated |

## OOP, briefly — and its real tradeoffs

A class is just the vehicle; object-oriented programming (OOP) is the style of bundling data and behavior together inside objects that mutate over time, using inheritance and `#private` state for encapsulation. It is extremely common in JavaScript, but it is worth knowing its well-documented drawbacks so you reach for it deliberately rather than by default:

- **Shared mutable state causes bugs** — when several parts of a program hold references to the same object and mutate it, tracing *why* a value changed becomes hard.
- **Deep inheritance becomes messy** — long `extends` chains couple unrelated classes together and make a single change ripple unpredictably (see [Mixins](./mixins.md) for a way to avoid this).
- **Tightly coupled objects are harder to test** — a method that depends on five other instance fields needs all five set up correctly before you can test it in isolation.
- **Side effects spread** — mutation inside a method can be invisible to the caller, unlike a pure function's return value.
- **Over-engineering simple problems** — reaching for a three-class hierarchy to solve something a single function could do.

Functional programming addresses these with pure functions, immutability, and composition instead — at the cost of feeling more abstract and sometimes paying a performance tax for copying instead of mutating. Most real codebases, including the rest of this chapter, mix both styles pragmatically.

## Interview questions

1. **Is a JavaScript class a new runtime type?** No. `typeof MyClass === "function"`; it is a constructor function with stricter invocation rules.
2. **Why does calling a class without `new` throw, but calling a constructor function without `new` doesn't?** Classes carry the internal `[[IsClassConstructor]]` flag and the engine checks `new.target` before running the body; plain functions have no such check.
3. **Why would `for...in` show a method defined with `Ctor.prototype.m = fn` but not one defined inside a `class` body?** Plain assignment creates an enumerable property; class methods are installed as non-enumerable.
4. **What breaks when you do `Ctor.prototype = { ... }` and how do you detect it?** You lose the automatic `.constructor` back-reference (it now points to `Object`); detect it with `instance.constructor === Ctor`, fix it with `Ctor.prototype.constructor = Ctor` or by switching to `class`.
5. **Why does accessing `this` before `super()` throw in a subclass constructor?** `this` is not initialized until the parent constructor (reached via `super()`) finishes allocating the instance; touching it earlier is a `ReferenceError`, not `undefined`.
6. **Are class bodies always strict mode?** Yes, regardless of the enclosing file's mode.
