---
title: Property Descriptors, Getters and Setters
sidebar_position: 2
---

# Property Descriptors, Getters and Setters

Every property on an object is backed by a **property descriptor** — a small record the engine keeps that says not just the value, but how the property behaves: can it be overwritten, does it show up in loops, can it be redefined or deleted? Object literal syntax hides this record and fills in sensible defaults. `Object.defineProperty` / `Object.defineProperties` expose it directly, and default to the *opposite*, stricter settings.

## Data descriptors vs accessor descriptors

A descriptor is either a **data descriptor** (it stores a value) or an **accessor descriptor** (it computes a value through functions). Every descriptor, of either kind, also carries `enumerable` and `configurable`.

| Attribute | Data descriptor | Accessor descriptor |
|---|---|---|
| `value` | ✓ the stored value | ✗ not allowed |
| `writable` | ✓ can the value be reassigned | ✗ not allowed |
| `get` | ✗ not allowed | ✓ function called on read |
| `set` | ✗ not allowed | ✓ function called on write |
| `enumerable` | ✓ shows up in `for...in` / `Object.keys` | ✓ same |
| `configurable` | ✓ can the descriptor be changed/deleted | ✓ same |

:::danger Mixing the two throws
A descriptor cannot have `value` or `writable` **and** `get` or `set` at the same time. Attempting to define one throws immediately:

```js
Object.defineProperty({}, "x", { value: 1, get() { return 1; } });
// TypeError: Invalid property descriptor.
// Cannot both specify accessors and a value or writable attribute, #<Object>
```
:::

## Getters and setters in an object literal

Object literals can define computed properties directly with the `get` / `set` keywords:

```js
let obj = {
  a: 1,
  c: 2,
  get getc() {
    return this.c * 4;
  },
  set setc(x) {
    this.c = x;
  },
};

console.log(obj.getc); // 8   (this.c * 4 -> 2 * 4)

obj.setc = 20;          // runs the setter: this.c = 20
console.log(obj.getc);  // 80  (this.c * 4 -> 20 * 4)
```

Properties created with `get`/`set` in a literal are **accessor** descriptors: there is no backing `obj.c` storage for `getc` itself — every read re-runs the function. `enumerable` and `configurable` default to `true` for literal syntax, same as any other literal property.

## `defineProperty` / `defineProperties`: descriptors with explicit control

`Object.defineProperties(target, descriptorsMap)` adds or reconfigures several properties at once. Building on the `obj` above:

```js
Object.defineProperties(obj, {
  geta: {
    get() {
      return this.a * 2;
    },
    configurable: true,
    enumerable: true,
  },
  seta: {
    set(x) {
      this.a = x;
    },
  },
  val: {
    value: 10,
    writable: true,
    enumerable: false,
  },
  calculate: {
    value: function () {
      return this.a * this.c;
    },
    // called as obj.calculate(), so 'this' is bound dynamically to obj
  },
});

obj.seta = 10;         // runs the setter: this.a = 10
console.log(obj.geta); // 20   (this.a * 2 -> 10 * 2)

obj.setc = 20;          // runs the literal setter: this.c = 20
console.log(obj.getc); // 80   (this.c * 4 -> 20 * 4)

console.log(obj.val);        // 10   (plain data value)
console.log(obj.calculate()); // 200  (this.a * this.c -> 10 * 20)
```

## `defineProperty` defaults every omitted flag to `false`

This is the single biggest difference from literal syntax, and the most common source of "my property won't update" bugs.

| How the property was created | `writable` | `enumerable` | `configurable` |
|---|---|---|---|
| Literal (`{ x: 1 }`) or direct assignment (`obj.x = 1`) | `true` | `true` | `true` |
| `Object.defineProperty` with only `value` given | `false` | `false` | `false` |

```js
const obj = {};
obj.direct = 1;
Object.defineProperty(obj, "defined", { value: 1 });

console.log(Object.getOwnPropertyDescriptor(obj, "direct"));
// { value: 1, writable: true, enumerable: true, configurable: true }

console.log(Object.getOwnPropertyDescriptor(obj, "defined"));
// { value: 1, writable: false, enumerable: false, configurable: false }

obj.defined = 2;            // silently ignored (not writable)
console.log(obj.defined);   // 1
console.log(Object.keys(obj)); // ["direct"] - "defined" is not enumerable
```

`val` in the example above explicitly set `writable: true`, so it can be reassigned even though it still defaults to non-enumerable and non-configurable.

## Setter-only (and getter-only) properties

A descriptor is not required to provide both halves of an accessor. `seta` above defines only a `set`, with no `get`:

```js
obj.seta = 5;          // works - runs the setter, sets this.a = 5
console.log(obj.seta); // undefined - there is no getter, so reading returns undefined
```

Reading a write-only accessor never throws; it simply has no getter to call, so the read behaves like reading any other missing property.

:::warning Correction
Treat a setter-only property as **write-only in effect**, not as something that "forwards" to its own value. `obj.seta` and `obj.a` are different keys here — reading `seta` back will always be `undefined`, even though writing to it changed `a`.
:::

## Gotcha: a non-writable property can break its own setter

In practice, people build "private-ish" properties by pairing a getter/setter named `a` with a conventionally-private `_a`, and `defineProperties` makes it easy to accidentally leave `_a` non-writable:

```js
let obj3 = Object.create(null);

Object.defineProperties(obj3, {
  _a: {
    value: 3,
    enumerable: true,
    // writable and configurable both default to false!
  },
  a: {
    get() {
      return this._a + 1;
    },
    set(x) {
      this._a = x; // plain assignment to a NON-WRITABLE property
    },
  },
});

console.log(obj3.a); // 4

obj3.a = 100;         // runs the setter, which tries this._a = 100
console.log(obj3.a);  // 4  - unchanged! the assignment to _a was silently dropped
```

:::warning Silent failure in sloppy mode, loud failure in strict mode
Because `_a` was defined with `defineProperties` and `writable` was left out, it defaults to `false`. The setter's `this._a = x` is a plain assignment to a non-writable property:

- In **non-strict ("sloppy") mode** — the default for a plain script, like the source this example was adapted from — the assignment is **silently ignored**. No error, no update, `_a` simply never changes.
- In **strict mode** (`"use strict"`, or automatically inside ES modules and classes), the exact same assignment throws `TypeError: Cannot assign to read only property '_a' of object`.

Always add `'use strict'`, or write modules/classes (which are strict by default), so bugs like this surface immediately instead of failing silently.
:::

## Interview questions

**Q: What are the possible attributes of a property descriptor?**
Data descriptors have `value` and `writable`; accessor descriptors have `get` and `set`. Both kinds also have `enumerable` and `configurable`. A descriptor cannot mix a data attribute with an accessor attribute.

**Q: What do `writable`, `enumerable` and `configurable` default to?**
For object literals and direct assignment, all three default to `true`. For `Object.defineProperty`/`defineProperties`, any attribute you don't specify defaults to `false`.

**Q: What happens if you read a property that only has a setter?**
It returns `undefined` — there is no getter to run, and reading a property with no getter never throws.

**Q: Why might a setter appear to "do nothing"?**
It usually assigns to a backing property that is non-writable (often because it was created with `defineProperty` without `writable: true`). In sloppy mode the failed assignment is silent; in strict mode it throws a `TypeError`.

## Key takeaways

- A property is either a data descriptor (`value`/`writable`) or an accessor descriptor (`get`/`set`); mixing the two throws `TypeError`.
- Literal/assignment properties default to fully open (`true`/`true`/`true`); `defineProperty`/`defineProperties` default to fully locked (`false`/`false`/`false`) for anything you omit.
- A setter-only property reads as `undefined`; a getter-only property throws on write only in strict mode, otherwise silently does nothing.
- A non-writable backing property silently swallows writes from its own setter in sloppy mode, and throws in strict mode — always prefer strict mode for this reason.
- Next: [Iterating Objects and JSON](./iterating-and-json.md).
