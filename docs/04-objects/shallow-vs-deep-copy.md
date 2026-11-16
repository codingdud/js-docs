---
title: Shallow vs Deep Copy
sidebar_position: 4
---

# Shallow vs Deep Copy

"Copying an object" means three different things in JavaScript, and mixing them up is one of the most common sources of mutation bugs. This page walks from a plain **reference copy**, through a **shallow copy** (spread / `Object.assign`), to hand-rolled **deep copy** functions — including the circular-reference problem and why a WeakMap fixes it — and finishes with the built-in `JSON` and `structuredClone` options and their limits.

## Reference copy: not a copy at all

```js
const obj = { a: 1 };
const copy = obj; // copies the REFERENCE, not the object

copy.a = 5;
console.log(obj.a); // 5 - obj and copy point at the same object in memory
console.log(obj === copy); // true
```

`copy` and `obj` are two variable names for the one object. There is no copying here — any mutation through either name is visible through the other.

## Shallow copy: spread and `Object.assign`

The spread operator and `Object.assign` both create a **new top-level object**, fixing the reference-copy bug for primitive properties:

```js
const obj = { a: 1 };
const copy = { ...obj }; // or: Object.assign({}, obj)

copy.a = 5;
console.log(obj.a); // 1 - unaffected, a is a primitive own property
console.log(obj === copy); // false - genuinely different objects
```

But "shallow" means exactly that: only the **first level** of properties is copied. Any property whose value is itself an object (or array) is copied **by reference**, so both the original and the copy still point at the same nested object.

```js
const original = { name: "Alice", skills: ["JS", "React"] };
const copy = { ...original };

copy.skills.push("Node");
console.log(original.skills); // ["JS", "React", "Node"] - mutated through the copy!
console.log(original.skills === copy.skills); // true - same array, not copied
```

:::warning Spread/`Object.assign` only ever copy one level deep
This is exactly the same shallowness described for `Object.freeze` in [Creating Objects and Object Static Methods](./creating-objects.md) — it affects copying the same way it affects freezing. If any property holds an object, array, `Map`, `Set`, or `Date`, a shallow copy shares that value with the original.
:::

## Deep copy: recursively cloning every level

A deep copy walks into every nested object/array and clones those too, so the result shares **no** mutable reference with the original.

```js
// A straightforward recursive version
function deepCopy(obj) {
  if (obj === null || typeof obj !== "object") return obj; // primitives: return as-is
  const result = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    result[key] = deepCopy(obj[key]);
  }
  return result;
}

const original = [{ name: "Alice" }, { name: "Bob", skills: ["JS", "C++"] }];
const copy = deepCopy(original);

copy[1].skills.push("Rust");
console.log(original[1].skills); // ["JS", "C++"] - untouched
console.log(copy[1].skills);     // ["JS", "C++", "Rust"]
```

:::warning Correction: `for...in` is the wrong loop here
Using `for...in` to walk the object's keys is a real bug, not just a style choice: `for...in` also yields **inherited enumerable** properties (see [Iterating Objects and JSON](./iterating-and-json.md)), so this version can copy properties that live on the prototype as if they were the object's own data. A correct recursive deep copy should use `Object.keys(obj)` or `Object.entries(obj)`, which are own-properties-only:

```js
function deepCopy(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepCopy);

  const clone = {};
  for (const [key, value] of Object.entries(obj)) {
    clone[key] = deepCopy(value);
  }
  return clone;
}
```
:::

### A trap: declaring `deepCopy` twice in the same file

A common mistake is defining two versions of the same function — an initial naive one, and an improved one further down the file — both as `function` declarations:

```js
// First definition (naive)
function deepCopy(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepCopy);
  const clone = {};
  for (const [key, value] of Object.entries(obj)) {
    clone[key] = deepCopy(value);
  }
  return clone;
}

// Second definition (WeakMap version) - same name, same scope
function deepCopy(obj, map = new WeakMap()) {
  // ... shown in full below
}
```

Function **declarations** are fully hoisted (see [Execution Context, Hoisting and TDZ](../03-functions-and-scope/execution-context-and-hoisting.md)): the engine processes both `function deepCopy` statements during the creation phase, in source order, and each one simply overwrites the previous binding for the name `deepCopy`. The net effect is that **only the last declaration in the file is ever callable** — the first definition is completely shadowed and dead, even though it appears first and looks like the "main" implementation. There is no error, no warning; it is silently replaced. If you need two versions, give them different names, or you will debug the first one while the second one is actually running.

## Circular references: why plain recursion breaks

Plain recursive `deepCopy` has no memory of objects it has already visited. If a structure refers back to itself, the recursion never terminates:

```js
const a = { name: "a" };
a.self = a; // circular reference

deepCopy(a); // RangeError: Maximum call stack size exceeded
```

### Fix: a `WeakMap` that remembers clones

```js
function deepCopy(obj, seen = new WeakMap()) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (seen.has(obj)) return seen.get(obj); // already cloned - reuse it

  const result = Array.isArray(obj) ? [] : {};
  seen.set(obj, result); // register BEFORE recursing into children

  for (let key in obj) {
    result[key] = deepCopy(obj[key], seen);
  }
  return result;
}
```

A `WeakMap` is used instead of a plain `Map` or object so that the bookkeeping does not keep the original objects alive longer than they would be otherwise — once nothing else references an original object, the garbage collector can still reclaim it even though it was once a `WeakMap` key.

The order matters: `seen.set(obj, result)` happens **before** the loop recurses into `obj`'s own properties. That is what breaks the infinite loop (the self-reference is found already-cloned in `seen` on the way back in), and it has a second, easy-to-miss benefit: it preserves **shared structure**.

```js
const objj = {
  a: [1, 2, 3, 4],
  c: 3,
  g: "grammar",
  h: [1, 2, 3, { q: "query" }],
};
objj.j = objj.h; // j and h point at the SAME array

const copy = deepCopy(objj);

objj.j[0] = 100; // mutating through j also changes h, because they're the same array
console.log(objj.h[0]); // 100
console.log(objj.j[0]); // 100

console.log(copy.h[0]); // 1 - the copy is fully independent
console.log(copy.j[0]); // 1
console.log(copy.h === copy.j); // true - the copy still shares h and j with EACH OTHER
```

Walking through why `copy.h === copy.j`: the `for...in` loop in the `deepCopy` function above visits `h` before `j` (insertion order). When the loop reaches `h`, it clones the array and immediately registers that clone in `seen` against the *original* `h` array. When the loop then reaches `j` — whose value is that same original `h` array — `deepCopy` finds it already in `seen` and returns the **same clone** instead of making a second one. The copy ends up with the identical internal structure as the original: two keys sharing one array, instead of two independent copies of it.

## What a hand-rolled deep copy still cannot do

Even the `WeakMap` version above only really knows how to handle plain objects and arrays. It silently mishandles everything else:

| Type / situation | What `for...in` + `{}`/`[]` cloning does |
|---|---|
| `Date` | Copied as a plain `{}` — loses its internal timestamp and all `Date` methods |
| `Map`, `Set` | Copied as a plain `{}` — their entries are not own enumerable properties, so nothing is copied |
| `RegExp` | Copied as a plain `{}` — loses the pattern and flags |
| Class instances | Result is a plain object, not an instance of the class — its prototype methods are gone |
| Symbol-keyed properties | Never visited — `for...in`, `Object.keys`, `Object.entries` all skip symbol keys |
| Non-enumerable properties | Never visited — same reason |
| Inherited enumerable properties (with `for...in`) | Copied as if they were own data — a correctness bug, not a limitation |

Any production-grade deep clone (your own, or a library's) has to special-case each of these types explicitly; there is no way to reconstruct a `Date` or a class instance generically from a `for...in` walk.

## `JSON` round-trip vs `structuredClone`

`JSON.parse(JSON.stringify(x))` is a common "quick deep copy" trick. It does avoid the stack-overflow crash that a naive circular-reference copy causes (it throws a clear, immediate `TypeError` instead) and the shared-nested-reference bug, but it inherits every limitation of `JSON.stringify` described in [Iterating Objects and JSON](./iterating-and-json.md#jsonstringify-and-jsonparse).

| | Hand-rolled `deepCopy` | `JSON.parse(JSON.stringify(x))` | `structuredClone(x)` |
|---|---|---|---|
| Circular references | Throws `RangeError` (stack overflow), unless using a seen-map | Throws `TypeError` | **Works** |
| `Date` | Becomes `{}` | Becomes an ISO string (not a `Date`) | **Stays a `Date`** |
| `Map` / `Set` | Becomes `{}` | Becomes `{}` | **Preserved** |
| `RegExp` | Becomes `{}` | Becomes `{}` | **Preserved** |
| `undefined` values | Preserved (copied as `undefined`) | Dropped | Preserved |
| Functions | Preserved (copied by reference, not cloned) | Dropped | Throws `DataCloneError` |
| Class instances | Plain object, prototype lost | Plain object, prototype lost | Plain object, prototype lost |
| Symbol keys | Dropped | Dropped | Dropped |
| Speed, for large plain data | Depends on implementation | Slower (serializes to text and back) | Fast (native, structured) |

`structuredClone` (a global function available in modern browsers and Node.js 17+) is the best general-purpose choice today: it is circular-safe, and it correctly clones `Date`, `RegExp`, `Map`, `Set`, typed arrays and several other built-ins that both `JSON` and a naive recursive copy mangle into `{}`. Its real limitations are functions (it throws trying to clone one) and custom class instances (it clones the own data but the result is a plain object, not an instance of the original class — the same loss of prototype that `JSON` and hand-rolled copies share).

## Interview questions

**Q: What is the difference between a reference copy, a shallow copy, and a deep copy?**
A reference copy (`const b = a`) is not a copy at all — both names point at one object. A shallow copy (spread, `Object.assign`) creates a new top-level object but still shares any nested object/array by reference. A deep copy recursively clones every nested level, so nothing is shared.

```js
const obj = { a: 1 };
const copy = obj;
copy.a = 5;
console.log(obj.a); // 5 - fix by copying instead: const copy = { ...obj };
```

**Q: Why does a plain recursive deep copy fail on circular references, and how do you fix it?**
It keeps recursing into the same object forever because it never remembers what it already cloned, eventually throwing a stack-overflow `RangeError`. The fix is to track visited objects, usually in a `WeakMap` of original → clone, and return the already-made clone when an object is seen again.

**Q: What does `JSON.parse(JSON.stringify(x))` lose?**
Functions, `undefined` values and symbol keys are dropped; `NaN`/`Infinity` become `null`; `Date` becomes a string; `Map`/`Set`/`RegExp` become empty objects; and it throws on circular references instead of hanging.

**Q: Why is `structuredClone` usually better than the `JSON` trick for cloning?**
It handles circular references without throwing, and it preserves the actual type of `Date`, `Map`, `Set`, `RegExp` and typed arrays instead of flattening them into plain objects or strings.

## Key takeaways

- `const copy = obj` copies a reference, not an object; use spread, `Object.assign`, or a deep copy to actually detach the copy.
- Spread and `Object.assign` are shallow: nested objects/arrays remain shared between the original and the copy.
- A recursive deep copy should walk own properties with `Object.keys`/`entries`, not `for...in`, to avoid picking up inherited properties.
- Circular references need a `WeakMap` of already-cloned objects; registering the clone **before** recursing both prevents infinite recursion and preserves shared internal structure.
- Declaring the same function name twice in one scope silently replaces the earlier one — only the last declaration ever runs.
- Hand-rolled copies, and `JSON.stringify`, both lose `Date`/`Map`/`Set`/`RegExp` type information, symbol keys, and non-enumerable properties; `structuredClone` fixes most of this but still can't clone functions or preserve a custom class's prototype.
