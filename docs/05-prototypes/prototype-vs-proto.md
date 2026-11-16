---
title: prototype vs __proto__
sidebar_position: 1
---

# `prototype` vs `__proto__`

JavaScript has no copy-based classes under the hood. Objects **delegate** to other objects. When you ask an object for a property it does not have, the engine asks the object it is linked to, then that object's link, and so on. The link and the object it points to go by two confusingly similar names:

- **`prototype`**: a property on (most) **functions**. It holds the object that will become the parent of instances created with `new`.
- **`__proto__`**: an accessor available on (almost) **every object**. It reads or writes the object's hidden internal link, written in the spec as `[[Prototype]]`.

This page separates the two, shows how to inspect them safely, and works through the classic `Foo` / `f` exercise.

## What is a prototype?

> A prototype is JavaScript's built-in mechanism that lets objects inherit properties and methods from other objects. It is the foundation of JavaScript's prototypal inheritance model: it enables code reuse and establishes relationships between objects.

A **prototype object** is just a normal object that other objects link to for shared behaviour. Nothing about it is special apart from the fact that something points at it.

### Why prototypes exist

| Benefit | What it means |
|---|---|
| **Memory efficiency** | Shared methods live **once** on the prototype instead of being copied into every instance. |
| **Code reuse** | Objects **delegate** to the prototype instead of duplicating behaviour. |
| **Extensibility** | Built-ins like `Array` and `Object` gain shared methods that every array or object can use (this is also how polyfills work). |

```js
function Person(name, age) {
  this.name = name; // own, per-instance data
  this.age = age;
}

// Added once, shared by every instance
Person.prototype.greet = function () {
  return `Hello, my name is ${this.name} and I am ${this.age} years old.`;
};

const person1 = new Person("Alice", 25);
const person2 = new Person("Bob", 30);

console.log(person1.greet()); // "Hello, my name is Alice and I am 25 years old."
console.log(person2.greet()); // "Hello, my name is Bob and I am 30 years old."
console.log(person1.greet === person2.greet); // true - the SAME function object
```

### Why `person1.greet === person2.greet` is `true`

Neither `person1` nor `person2` owns a `greet` property. Both lookups fail on the instance and continue to `Person.prototype`, where there is exactly **one** `greet` function. So both expressions resolve to the same reference.

Compare that with defining the method inside the constructor:

```js
function PersonSlow(name) {
  this.name = name;
  this.greet = function () {      // a NEW function per instance
    return `Hi, I am ${this.name}`;
  };
}

const a = new PersonSlow("A");
const b = new PersonSlow("B");

console.log(a.greet === b.greet);        // false - two separate functions
console.log(a.hasOwnProperty("greet"));  // true  - stored on the instance itself
```

With 10,000 instances, `PersonSlow` creates 10,000 identical function objects; `Person` creates one. Data that must be unique per instance (`name`, `age`) belongs on `this`; behaviour that is the same for all instances belongs on the prototype.

## The two terms side by side

### `prototype`: the shared storage

- Exists on **regular functions** (`function` declarations and expressions) and on **classes**.
- When you call `new Fn()`, the new object's `[[Prototype]]` is set to `Fn.prototype`.
- You modify it to add features for **future and existing** instances.

Not every function has one. Only functions that can be used as constructors (plus generator functions, whose `prototype` is used for generator objects) get it:

```js
function regular() {}
const arrow = () => {};
class K { method() {} }
const obj = { shorthand() {} };
async function asyncFn() {}

console.log(typeof regular.prototype);    // "object"
console.log(typeof K.prototype);          // "object"
console.log(arrow.prototype);             // undefined - arrows are not constructors
console.log(new K().method.prototype);    // undefined - class methods are not constructors
console.log(obj.shorthand.prototype);     // undefined - shorthand methods are not constructors
console.log(asyncFn.prototype);           // undefined
console.log(typeof function* () {}.prototype); // "object" (special case: generators)
```

### `__proto__`: the link

- Every ordinary object has an internal `[[Prototype]]` slot (its value is an object or `null`).
- `obj.__proto__` is a **getter/setter** that reads or writes that slot.
- Functions are objects too, so functions have a `[[Prototype]]` as well (usually `Function.prototype`).

```js
const arr = [1, 2, 3];

console.log(arr.__proto__ === Array.prototype);              // true
console.log(Array.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__);                     // null (end of chain)
```

### Comparison table

| Aspect | `prototype` | `__proto__` |
|---|---|---|
| **Lives on** | Constructor functions and classes | Every object (instances, prototype objects, functions) |
| **Think of it as** | The **shared storage** | The **link** to that storage |
| **What it is** | A normal data property of the function | An accessor (getter/setter) inherited from `Object.prototype` that exposes `[[Prototype]]` |
| **When it matters** | When **making** objects with `new` | When **using** objects (property lookup) |
| **Example** | `Dog.prototype` is the storage for all dogs | `myDog.__proto__` is the link to Dog's storage |
| **You modify it** | To add shared features for all instances | Rarely; changing it affects only **one** object |
| **Modern API** | (same, use it directly) | `Object.getPrototypeOf` / `Object.setPrototypeOf` |

The relationship in one line:

```js
function Dog() {}
const myDog = new Dog();

console.log(Object.getPrototypeOf(myDog) === Dog.prototype); // true
// "the instance's link points to the constructor's storage"
```

:::note Correcting a common phrasing
A note like "every object has `prototype` and its instance has `__proto__`" mixes the two up. Plain objects (`{}`, arrays, instances) do **not** have a `prototype` property; only functions do. What every object has is a `[[Prototype]]` link, exposed through `__proto__`. Functions have **both**: a `prototype` property (for the objects they construct) and their own `[[Prototype]]` link (to `Function.prototype`).

Similarly, `Array.prototype` is where `push`, `map` and friends live. `length`, by contrast, is an **own** property of each array, not something read through `__proto__`.
:::

## Prefer `Object.getPrototypeOf`

`__proto__` is a legacy feature kept for web compatibility (spec Annex B). Use the standard functions instead:

```js
const proto = { hello() { return "hi"; } };
const obj = Object.create(proto);

// Read the link
console.log(Object.getPrototypeOf(obj) === proto); // true

// Write the link (see the next chapter page for the performance caveat)
const other = { bye() { return "bye"; } };
Object.setPrototypeOf(obj, other);
console.log(obj.bye()); // "bye"

// Check membership anywhere in the chain
console.log(other.isPrototypeOf(obj)); // true
```

| Task | Legacy | Preferred |
|---|---|---|
| Read the prototype | `obj.__proto__` | `Object.getPrototypeOf(obj)` |
| Change the prototype | `obj.__proto__ = p` | `Object.setPrototypeOf(obj, p)` |
| Create with a prototype | `{ __proto__: p }` (fine) | `Object.create(p)` |

`Object.getPrototypeOf` always works, even on objects that do not inherit from `Object.prototype`, as the next section shows.

## `__proto__` is an accessor on `Object.prototype`

`__proto__` is not an own property of your objects. It is a getter/setter pair defined once on `Object.prototype`, and every object reaches it through the chain:

```js
console.log(Object.getOwnPropertyDescriptor({}, "__proto__"));
// undefined - not an own property

console.log(Object.getOwnPropertyDescriptor(Object.prototype, "__proto__"));
// {
//   get: [Function: get __proto__],
//   set: [Function: set __proto__],
//   enumerable: false,
//   configurable: true
// }
```

### `Object.create(null)` has no `__proto__`

An object created with `Object.create(null)` has `[[Prototype]]` set to `null`, so it never reaches `Object.prototype` and therefore never reaches the `__proto__` accessor:

```js
const bare = Object.create(null);

console.log(bare.__proto__);              // undefined - no accessor in the chain
console.log(Object.getPrototypeOf(bare)); // null - the real answer
console.log("toString" in bare);          // false - no inherited methods at all

bare.__proto__ = { x: 1 };                // NOT a prototype change...
console.log(Object.keys(bare));           // ["__proto__"] - ...just an ordinary own key
console.log(Object.getPrototypeOf(bare)); // still null
```

This is why "dictionary" objects are often created with `Object.create(null)`: a key such as `"__proto__"` or `"toString"` coming from user input cannot collide with inherited behaviour. (A `Map` is usually an even better choice; see [Map and WeakMap](../07-arrays-strings-collections/map-and-weakmap.md).)

:::warning Not every object has a prototype
"Every object has a prototype" is true for almost all objects, but `Object.prototype` itself and anything created with `Object.create(null)` have a `[[Prototype]]` of `null`. Code that calls `obj.hasOwnProperty(...)` will throw on such objects. Use `Object.hasOwn(obj, key)` instead.
:::

## `__proto__` inside object literals

In an object **literal**, a `__proto__: value` entry is special syntax: it sets the new object's prototype at creation time. It does **not** create a property.

```js
const grandparent = { family: "Smith" };
const parent = { __proto__: grandparent, role: "parent" };
const child = {
  __proto__: parent,
  name: "Kid",
  hello() { return `${this.name} ${this.family}`; },
};

console.log(child.hello());                                   // "Kid Smith"
console.log(Object.getPrototypeOf(child) === parent);         // true
console.log(Object.getPrototypeOf(parent) === grandparent);   // true
console.log(Object.keys(child));                              // ["name", "hello"]
```

The rules for the literal form are precise:

| Literal | Effect |
|---|---|
| `{ __proto__: obj }` | Prototype set to `obj`, no own property |
| `{ "__proto__": obj }` | Same: the quoted, non-computed key is still the special form |
| `{ __proto__: null }` | Prototype set to `null` (like `Object.create(null)`) |
| `{ "__proto__": 42 }` | Value is not an object or `null`, so it is **silently ignored**: prototype stays `Object.prototype`, no own property |
| `{ ["__proto__"]: 42 }` | Computed key: creates an **own** property named `"__proto__"` |
| `const __proto__ = 42; ({ __proto__ })` | Shorthand: also creates an own property |

```js
const ignored = { "__proto__": 42 };
console.log(Object.getPrototypeOf(ignored) === Object.prototype); // true
console.log(Object.keys(ignored));                                 // []

const own = { ["__proto__"]: 42 };
console.log(Object.keys(own));                                     // ["__proto__"]
console.log(Object.getPrototypeOf(own) === Object.prototype);     // true

// Other ways to get a real "__proto__" key
const viaDefine = Object.defineProperty({}, "__proto__", {
  value: 42, enumerable: true,
});
console.log(Object.keys(viaDefine)); // ["__proto__"]
```

:::tip
The literal form `{ __proto__: parent }` is standard (not just Annex B legacy) and is a perfectly good way to build small prototype chains. What you should avoid is the `obj.__proto__ = ...` **setter** on existing objects.
:::

## Exercise: `Foo` and `f`

Given:

```js
function Foo() {}
const f = new Foo();
```

Predict each answer before reading the solution.

| Question | Answer | Why |
|---|---|---|
| a) `f.__proto__` | `Foo.prototype` | `new` links the instance to the constructor's `prototype` |
| b) `Foo.prototype` | A plain object `{}` whose only own property is a non-enumerable `constructor` | Created automatically with every regular function |
| c) Are (a) and (b) the same object? | **Yes** | Same reference, so `===` is `true` |
| d) `Foo.__proto__` | `Function.prototype` | `Foo` is itself a function object, created by `Function` |
| e) `f.prototype` | `undefined` | `f` is an instance, not a function; it has a link, not storage |
| f) `Foo.prototype.__proto__` | `Object.prototype` | The prototype object is a plain object |
| g) `Foo.prototype.constructor` | `Foo` | Points back to the function |

```js
function Foo() {}
const f = new Foo();

console.log(f.__proto__ === Foo.prototype);                      // true  (a, c)
console.log(Object.getPrototypeOf(f) === Foo.prototype);         // true  (same, preferred API)
console.log(Object.getOwnPropertyNames(Foo.prototype));          // ["constructor"] (b)
console.log(Foo.__proto__ === Function.prototype);               // true  (d)
console.log(f.prototype);                                        // undefined (e)
console.log(Foo.prototype.__proto__ === Object.prototype);       // true  (f)
console.log(Foo.prototype.constructor === Foo);                  // true  (g)
console.log(f.constructor === Foo);                              // true  - inherited via the chain
console.log(f.hasOwnProperty("constructor"));                    // false
```

The picture:

```text
         Foo (function)                         Function.prototype
        ┌──────────────┐   [[Prototype]]       ┌────────────────────┐
        │ prototype ───┼──┐  ───────────────▶  │ call, apply, bind  │
        └──────────────┘  │                    └────────────────────┘
                          ▼
                 Foo.prototype                       Object.prototype
              ┌──────────────────┐  [[Prototype]]  ┌──────────────────┐  [[Prototype]]
              │ constructor: Foo │ ──────────────▶ │ toString, ...    │ ─────────────▶ null
              └──────────────────┘                 └──────────────────┘
                          ▲
                          │ [[Prototype]]
                    ┌───────────┐
                    │ f         │   (f.prototype is undefined)
                    └───────────┘
```

:::note Classes add one more link
For a class hierarchy `class Teacher extends Person`, the constructors are linked too: `Object.getPrototypeOf(Teacher) === Person`. That link is created by `extends`. Plain constructor functions wired by hand (see [The new Keyword and Wiring Inheritance](./new-and-inheritance-wiring.md)) do **not** get it unless you add it with `Object.setPrototypeOf(Teacher, Person)`. The [next page](./prototype-chain.md) covers both chains.
:::

## Interview questions

**Q: What is the difference between `prototype` and `__proto__`?**
`prototype` is a property on constructor functions and classes; it is the object that becomes the `[[Prototype]]` of instances created with `new`. `__proto__` is an accessor, inherited from `Object.prototype`, that reads or writes any object's own `[[Prototype]]` link. Example: `arr.__proto__ === Array.prototype`.

**Q: Do arrow functions have a `prototype`?**
No. Arrow functions, class methods, object shorthand methods and async functions are not constructors, so they have no `prototype` property, and calling them with `new` throws a `TypeError`.

**Q: Why put methods on the prototype instead of inside the constructor?**
Memory and consistency: one shared function instead of one per instance. Changes to the prototype also reach every existing instance.

**Q: How should you read an object's prototype in production code?**
`Object.getPrototypeOf(obj)`. It works on every object, including those created with `Object.create(null)`, where `__proto__` is `undefined`.

**Q: What does `{ "__proto__": 42 }` produce?**
An ordinary empty object whose prototype is `Object.prototype`. The non-computed `__proto__` key is the prototype-setting syntax, and a non-object value is ignored. Only the computed form `{ ["__proto__"]: 42 }` creates an own property.

## Key takeaways

- `prototype` is **storage** on functions; `__proto__` / `[[Prototype]]` is the **link** on objects.
- `Object.getPrototypeOf(instance) === Constructor.prototype`.
- Functions have both: their own link (to `Function.prototype`) and a `prototype` for their instances.
- `__proto__` is a getter/setter on `Object.prototype`. Objects that do not inherit from it (`Object.create(null)`) do not have it.
- Shared methods on the prototype mean `person1.greet === person2.greet`.
- Related reading: [Creating Objects](../04-objects/creating-objects.md), [Classes vs Constructors](../06-classes-and-oop/classes-vs-constructors.md).
