---
title: Creating Objects and Object Static Methods
sidebar_position: 1
---

# Creating Objects and Object Static Methods

An object is a non-primitive data type that stores a collection of key-value pairs. It is the fundamental structure JavaScript uses to represent real-world entities: a key is always a **string or a symbol**, and a value can be anything — a primitive, another object, an array, or a function.

This page covers the six ways to create an object, the static `Object` methods that build, inspect and lock them down, and the key-coercion rule that trips up a surprising number of interview questions.

## Keys are always strings or symbols

Object property keys are never numbers, booleans, or other objects. Any key that is not already a string or a symbol is **coerced to a string** before it is used.

```js
const obj = {};
obj[42] = "number key";
console.log(Object.keys(obj)); // ["42"]  - the number became the string "42"

const b = { key: "b" };
const c = { key: "c" };
const a = {};

a[b] = 123; // b.toString() -> "[object Object]"
a[c] = 456; // c.toString() -> the SAME string "[object Object]"

console.log(a[b]);          // 456 - both assignments wrote to one key
console.log(Object.keys(a)); // ["[object Object]"] - only one key exists
```

:::warning Objects used as keys collapse into one key
`b` and `c` are different object references, but `a[b]` and `a[c]` both call `b.toString()` / `c.toString()`, and `Object.prototype.toString` returns the literal string `"[object Object]"` for any plain object. So `a[b]` and `a[c]` address the exact same property. If you need object-shaped keys, use a [`Map`](../07-arrays-strings-collections/map-and-weakmap.md) instead — `Map` keys are compared by reference, not by coercion.
:::

## Six ways to create an object

| # | Technique | Example |
|---|---|---|
| 1 | Object literal | `const o = { name: "Animesh" };` |
| 2 | `new Object(...)` | `const o = new Object({ name: "Animesh" });` |
| 3 | Constructor function + `new` | `function Person() { this.name = "name"; } const o = new Person();` |
| 4 | `class` + `new` | `class Person { constructor() { this.name = "name"; } } const o = new Person();` |
| 5 | `Object.create(proto)` | `const o = Object.create(basePrototype);` |
| 6 | `Object.assign(target, ...sources)` | `const o = Object.assign({}, source1, source2);` |

```js
let obj1 = { name: "Animesh" };               // 1. literal
let obj2 = new Object({ 1: 1 });              // 2. new Object

function Person() {                           // 3. constructor + new
  this.name = "name";
}
const obj3Ctor = new Person();

class PersonClass {                           // 4. class + new
  constructor() {
    this.name = "Animesh";
  }
}
const obj4Class = new PersonClass();

let obj3 = Object.create(obj1);               // 5. Object.create
let obj4 = Object.assign(obj1, obj2);         // 6. Object.assign
```

`new Object(...)` is rarely used in real code — it behaves differently depending on what you pass it. Called with no argument (or `undefined`/`null`), it is equivalent to writing the literal `{}`. Called with an **existing object**, it does not copy anything — it returns that exact same reference (`new Object(obj) === obj`). Only a **primitive** argument gets boxed into a wrapper object: `new Object(42)` or `new Object("x")` produce a `Number`/`String` wrapper object, distinct from the primitive itself.

## `Object.create`: linking a new object to a prototype

`Object.create(proto, [propertiesObject])` creates a **new, empty object** and sets its `[[Prototype]]` (the internal link used for property lookup) to `proto`. The new object starts with **no own properties at all** — anything it appears to "have" is actually inherited.

```js
let obj1 = { name: "Animesh" };
let obj3 = Object.create(obj1);

console.log(obj3);                                   // {}  - no own properties
console.log(obj3.name);                               // "Animesh" - inherited from obj1
console.log(obj3.hasOwnProperty("name"));             // false - not an own property
console.log(Object.getPrototypeOf(obj3) === obj1);    // true
```

This is the same linking step `new` performs internally, without running any constructor. See [The Prototype Chain](../05-prototypes/prototype-chain.md) for how property lookup walks this link.

:::warning `Object.create()` with no argument throws
`Object.create` requires its first argument to be an object or `null`. Calling it with nothing passes `undefined`, which fails:

```js
Object.create();
// TypeError: Object prototype may only be an Object or null: undefined
```

To create an object with **no** prototype at all (not even `Object.prototype`, so it has no inherited `toString`, `hasOwnProperty`, etc.), pass `null` explicitly: `Object.create(null)`.
:::

## `Object.assign`: shallow copy that mutates and returns the target

`Object.assign(target, ...sources)` copies the **own enumerable** properties of each source onto `target`, overwriting existing keys, and returns `target` itself — it does not create a new object.

```js
let obj1 = { name: "Animesh" };
let obj2 = new Object({ 1: 1 });

let obj4 = Object.assign(obj1, obj2);

console.log(obj4 === obj1); // true - assign mutated obj1 and handed it straight back
console.log(obj1);          // { '1': 1, name: 'Animesh' } - obj1 itself was changed
```

:::note Integer-like keys always display first
Even though `"1"` was added to `obj1` *after* `"name"`, it shows up first. Per the spec, own-property enumeration order is: integer-index keys in ascending numeric order, then all other string keys in insertion order, then symbol keys — this holds for `Object.keys`, `for...in`, `JSON.stringify`, and console output alike, regardless of when each key was actually added.
:::

:::warning `Object.assign` mutates its first argument
Because the target is both modified and returned, `Object.assign(obj1, obj2)` is **not** a safe way to merge two objects into a new one — it corrupts `obj1`. To get a fresh object, pass an empty literal as the target: `Object.assign({}, obj1, obj2)`. The copy is still shallow — see [Shallow vs Deep Copy](./shallow-vs-deep-copy.md).
:::

## `Object.freeze` vs `Object.seal`: two levels of immutability

Both lock down an object's **own** properties, and both are **shallow** — they only affect the object passed in, not any objects referenced by its properties.

| | `Object.freeze()` | `Object.seal()` |
|---|---|---|
| Add new properties | No | No |
| Delete existing properties | No | No |
| Reconfigure (`configurable`) | No | No |
| Modify existing values | No | **Yes**, if the property was already `writable` |
| Depth | Shallow — nested objects are untouched | Shallow — nested objects are untouched |

```js
const frozen = Object.freeze({ a: 1, nested: { b: 2 } });
frozen.a = 99;              // silently ignored (throws in strict mode)
frozen.nested.b = 99;       // WORKS - freeze only touches the top level
console.log(frozen);        // { a: 1, nested: { b: 99 } }

const sealed = Object.seal({ a: 1 });
sealed.a = 99;               // WORKS - existing writable properties can still change
sealed.c = "new";            // silently ignored - can't add new properties
delete sealed.a;             // silently ignored - can't delete
console.log(sealed);         // { a: 99 }

console.log(Object.isFrozen(frozen)); // true
console.log(Object.isSealed(sealed)); // true
```

:::tip Deep-freezing
To freeze every nested level, you have to walk the object yourself and call `Object.freeze` on each nested object recursively — there is no built-in "deep freeze".
:::

## Inspecting and rewiring the prototype

```js
const obj3 = Object.create({ greet() { return "hi"; } });
obj3.own = true;

console.log(Object.keys(obj3));              // ["own"] - own enumerable keys only
console.log(Object.getOwnPropertyNames(obj3)); // ["own"] - own keys, enumerable or not

Object.defineProperty(obj3, "hidden", { value: 1, enumerable: false });
console.log(Object.keys(obj3));                // ["own"] - still excludes hidden
console.log(Object.getOwnPropertyNames(obj3));  // ["own", "hidden"] - includes it

console.log(Object.getPrototypeOf(obj3).greet()); // "hi"

Object.setPrototypeOf(obj3, { x: 2, 1: 33 });
console.log(Object.getPrototypeOf(obj3)); // { '1': 33, x: 2 }
console.log(obj3.greet);                  // undefined - the old prototype link is gone
```

`Object.getOwnPropertyNames` is the superset of `Object.keys`: both return only **own** keys (never inherited ones), but `getOwnPropertyNames` includes non-enumerable ones too. Neither includes symbol keys — use `Object.getOwnPropertySymbols` or `Reflect.ownKeys` for those. More on enumerability in [Property Descriptors](./property-descriptors.md) and on inherited keys in [Iterating Objects and JSON](./iterating-and-json.md).

## Interview questions

**Q: What are the ways to create an object in JavaScript?**
Object literal, `new Object()`, a constructor function with `new`, a `class` with `new`, `Object.create(proto)`, and `Object.assign(target, ...sources)` for merging into a new or existing object.

**Q: What happens when you use an object as a property key?**
It is coerced to a string via its `toString()` method. Every plain object stringifies to `"[object Object]"`, so two different objects used as keys on the same target collide into one property, unless you use a `Map`.

**Q: Does `Object.assign(obj1, obj2)` create a new object?**
No. It copies `obj2`'s own enumerable properties onto `obj1` and returns `obj1`, so the returned value and `obj1` are the same reference (`result === obj1`).

**Q: What is the difference between `freeze` and `seal`?**
Both block adding, deleting and reconfiguring properties. `freeze` also makes existing properties non-writable; `seal` leaves already-writable properties writable. Both are shallow.

**Q: What happens if you call `Object.create()` with no argument?**
It throws `TypeError`, because the prototype argument defaults to `undefined`, which is not a valid prototype value (only an object or `null` is).

## Key takeaways

- Object keys are always strings or symbols; any other key is coerced to a string, which is why different objects used as keys can collide.
- There are six common ways to build an object: literal, `new Object`, constructor + `new`, `class` + `new`, `Object.create`, and `Object.assign`.
- `Object.create(proto)` creates an empty object whose properties are all **inherited**, not own; it throws if called with no argument.
- `Object.assign` mutates and returns its target — it is a merge operation, not a clone operation.
- `freeze` and `seal` are both shallow; `freeze` additionally removes writability.
- Next: [Property Descriptors, Getters and Setters](./property-descriptors.md).
