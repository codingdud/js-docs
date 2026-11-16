---
title: "Private Fields, Encapsulation and Brand Checks"
sidebar_position: 4
---

JavaScript has gone through three generations of "private" state: naming convention, closures (often via `WeakMap`), and true `#private` class fields. This page compares all three head-to-head, then covers private methods, static private state, and the "brand check" pattern that `#private` fields make possible.

## Three approaches, compared

```js
// Approach 1: convention (_name) — NOT actually private
class PersonA {
  constructor(name, ssn) {
    this.name = name;
    this._ssn = ssn; // just a naming convention, fully accessible
  }
  getSSN() { return this._ssn; }
}

// Approach 2: closure via WeakMap — truly private, pre-ES2022 pattern
const _privateB = new WeakMap();
class PersonB {
  constructor(name, ssn) {
    this.name = name;
    _privateB.set(this, { ssn });
  }
  getSSN() { return _privateB.get(this).ssn; }
}

// Approach 3: class private fields — truly private, modern (ES2022)
class PersonC {
  #ssn;
  constructor(name, ssn) {
    this.name = name;
    this.#ssn = ssn;
  }
  getSSN() { return this.#ssn; }
}

const a = new PersonA("Alice", "123-45-6789");
const b = new PersonB("Alice", "123-45-6789");
const c = new PersonC("Alice", "123-45-6789");

console.log(a._ssn);     // "123-45-6789" — exposed, nothing stops external code
console.log(b._ssn);     // undefined — the real data lives in the WeakMap, not on `b`
// c.#ssn;                // SyntaxError — illegal outside class PersonC's body, caught at parse time

console.log(JSON.stringify(a)); // {"name":"Alice","_ssn":"123-45-6789"} — leaks the "private" data!
console.log(JSON.stringify(b)); // {"name":"Alice"} — safe, ssn isn't an own property of b
console.log(JSON.stringify(c)); // {"name":"Alice"} — safe, # fields are never enumerable or serialized
```

| Aspect | `_convention` | `WeakMap` closure | `#private` field |
|---|---|---|---|
| Actually unreachable from outside | No | Yes | Yes |
| Leaks via `JSON.stringify` | **Yes** | No | No |
| Syntax enforcement | None (just a naming habit) | None (anyone disciplined enough not to import the map) | Enforced by the parser (`SyntaxError` for invalid access) |
| Extra memory per instance | None | One `WeakMap` entry per instance | One internal slot per field, allocated with the object |
| Works across files easily | Yes | Only if the `WeakMap` is exported/shared carefully | Yes — scoped to the class body, no extra plumbing |
| Readable while debugging | Yes (plain property) | Harder (value lives in an external map) | Yes in modern devtools (shown as `#ssn`) |

`#private` fields are the right default today: they are enforced by the language itself (a true parse-time restriction, not a convention), they never show up in `JSON.stringify`, `Object.keys`, or `for...in`, and — unlike the `WeakMap` approach — they don't require a second data structure living outside the class.

### Subclasses cannot reach a parent's `#private` field

```js
class EmployeeC extends PersonC {
  greetWithSSN() {
    // return `${this.name}: ${this.#ssn}`; // SyntaxError: Private field '#ssn' must be
                                             // declared in an enclosing class
    return `${this.name}: ${this.getSSN()}`; // must go through a public method the parent exposes
  }
}

const ec = new EmployeeC("Bob", "999-00-1234");
console.log(ec.greetWithSSN()); // "Bob: 999-00-1234"
```

`#ssn` is scoped to the **class body that declares it** — `PersonC` — not to the instance and not to anything that merely extends it. `EmployeeC` must go through `PersonC`'s own public API (`getSSN()`) to read it. Trying to write `this.#ssn` directly inside `EmployeeC` is a **`SyntaxError`**, caught before the code ever runs, because `#ssn` was never declared inside `EmployeeC`'s own class body.

## Private methods and private static state

Private methods (`#method() {}`) follow the same visibility rule as private fields, and can be combined with a private static counter to track instance creation without exposing a mutable public property:

```js
class Counter {
  #count = 0;
  #step;
  static #instances = 0;

  constructor(step = 1) {
    this.#step = step;
    Counter.#instances++;
  }

  #validate(n) {
    if (n < 0) throw new RangeError(`step count must be >= 0, got ${n}`);
  }

  increment(n = 1) {
    this.#validate(n);
    this.#count += n * this.#step;
  }
  decrement(n = 1) {
    this.#validate(n);
    this.#count -= n * this.#step;
  }

  get value() { return this.#count; }

  static instanceCount() { return Counter.#instances; }
}

const c1 = new Counter();
const c2 = new Counter(5);

c1.increment();   // +1*1 = 1
c1.increment(3);  // +3*1 = 4
c2.increment(2);  // +2*5 = 10
c2.decrement(1);  // -1*5 = 5

console.log(c1.value); // 4
console.log(c2.value); // 5
console.log(Counter.instanceCount()); // 2

try {
  c1.increment(-1);
} catch (e) {
  console.log(e.constructor.name); // "RangeError"
  console.log(e.message);          // "step count must be >= 0, got -1"
}
```

Unlike regular (public) class methods, `#validate` is **not** installed on `Counter.prototype` as an enumerable-free but publicly reachable function — it's a genuinely private per-class member, invisible and uncallable from outside `Counter`'s own methods, the same way `#count` and `#step` are.

## Private fields are per-class, not per-instance-pair — the brand check pattern

A subtlety that surprises people: a private field declared in class `X` can be read from **any** instance of `X`, as long as the code doing the reading is a method defined inside `X`'s own body — even when comparing two *different* instances.

```js
class Entity {
  #id;

  constructor(id) {
    this.#id = id;
  }

  equals(other) {
    // `other` is some other Entity instance. Reading other.#id is legal
    // here because this code is defined inside Entity itself.
    return this.#id === other.#id;
  }

  static isSameEntity(a, b) {
    // Still inside Entity, even though it's a static method — #id is reachable.
    return a.#id === b.#id;
  }

  // Brand check: is `obj` genuinely an Entity (does it carry the #id slot)?
  static isEntity(obj) {
    try {
      obj.#id; // throws if `obj` was never constructed by Entity (or a subclass that shares the field)
      return true;
    } catch {
      return false;
    }
  }
}

const e1 = new Entity(1);
const e2 = new Entity(1);
const e3 = new Entity(2);

console.log(e1.equals(e2));               // true
console.log(e1.equals(e3));               // false
console.log(Entity.isSameEntity(e1, e2)); // true
console.log(Entity.isEntity(e1));         // true
console.log(Entity.isEntity({ id: 1 }));  // false — plain object, no #id slot at all
```

This is the "brand check" pattern: `obj.#id` inside `Entity`'s own code is not a privacy violation, because the private field is scoped to the **class**, not to a single instance. Using it to test "is this object really one of mine" is a common, intentional use of that scoping rule.

### The ergonomic brand check: `#id in obj`

The `try`/`catch` form above works, but ES2022 added a dedicated operator for exactly this check: `#fieldName in obj`. It is still only legal syntax inside the declaring class's body (same scoping rule as everywhere else), but it returns a plain `true`/`false` instead of throwing — no `try`/`catch` needed:

```js
class Entity {
  #id;
  constructor(id) { this.#id = id; }

  static isEntity(obj) {
    return #id in obj; // true/false, never throws for ordinary objects
  }
}

console.log(Entity.isEntity(new Entity(1))); // true
console.log(Entity.isEntity({}));            // false — no #id slot
```

One sharp edge: `in` still requires its right-hand side to be an object. Call it with a primitive and `#id in obj` throws a `TypeError` ("Cannot use 'in' operator to search for '#id' in 5"), so a brand check that must also tolerate non-object input (`null`, numbers, strings) still needs the `try`/`catch` form, or an explicit `typeof obj === "object" && obj !== null` guard before the `in` check.

## `SyntaxError` vs runtime `TypeError` — know which failure you'll get

Two very different failures are easy to confuse:

```js
class Secret {
  #value = 42;
}

// 1) Referencing #value syntax OUTSIDE any class body at all —
//    this is caught by the PARSER, before any code runs:
// console.log(someVar.#value); // SyntaxError: Private field '#value' must be
                                 // declared in an enclosing class

// 2) Referencing #value syntax INSIDE Secret's own code, but on an
//    object that was never branded with that field — this is a RUNTIME TypeError:
class Secret2 {
  #value = 42;
  static read(obj) {
    return obj.#value; // valid syntax (we're inside Secret2) — fails at runtime for the wrong object
  }
}

try {
  Secret2.read({});
} catch (e) {
  console.log(e.constructor.name); // "TypeError"
  console.log(e.message); // "Cannot read private member #value from an object whose class did not declare it"
}
```

| Failure | When it happens | Error type |
|---|---|---|
| `obj.#x` written outside any class that declares `#x` | Parse time, before execution | `SyntaxError` |
| `obj.#x` written inside a class that declares `#x`, called on an object without that private slot | Runtime, when that line actually executes | `TypeError` |

The `Entity.isEntity` brand check above relies specifically on the **second** row: the syntax is legal (we're inside `Entity`), so it doesn't blow up at parse time; it only fails for the *specific object* passed in, at the moment that line runs — which is exactly the behavior a `try`/`catch` brand check needs.

## Closure-based privacy — the legacy pattern, for context

Before private fields, the only way to get genuine privacy was a closure capturing local variables, with no `this.something` involved at all:

```js
function Counter() {
  let count = 0; // lives only in this closure, no property on the instance
  this.inc = () => ++count;
}

const legacy = new Counter();
console.log(legacy.inc()); // 1
console.log(legacy.inc()); // 2
console.log(legacy);       // Counter { inc: [Function (anonymous)] } — `count` is nowhere visible
```

This still works and is genuinely private (there is no property named `count` anywhere to find), but every instance gets its **own** copy of `inc` (since it's created fresh per call to `Counter()`, unlike a method on `.prototype`), which costs more memory per instance than either the `WeakMap` or `#private` approaches. It's covered in depth, alongside static/public counters, in [Static Methods, Properties and Factories](./static-members.md).

## Key takeaways

- `_convention` fields are not private at all — they are fully readable and leak through `JSON.stringify`.
- `WeakMap`-backed closures are genuinely private and don't leak through `JSON.stringify`, but need an external map and more ceremony.
- `#private` fields are enforced by the parser, never enumerable, never serialized, and are the right modern default.
- A subclass cannot read a parent's `#private` field directly — that's a `SyntaxError`, caught before the code runs, because the field was never declared in the subclass's own body.
- A private field is scoped to the declaring **class**, not to one instance — any method inside that class can read the private field of *any* instance of that class, which is what makes the brand-check pattern (`try { obj.#x } catch { return false }`) possible.
- Referencing invalid private-field syntax outside any declaring class is a `SyntaxError`; referencing valid private-field syntax on the *wrong object* at runtime is a `TypeError`.

## Interview questions

1. **Which of `_convention`, `WeakMap`, and `#private` actually prevents external access, and which leaks through `JSON.stringify`?** Only `_convention` leaks through `JSON.stringify` (it's a regular enumerable own property); both `WeakMap` and `#private` are safe. Both `WeakMap` and `#private` genuinely block external access; `_convention` does not block anything, it's just a naming habit.
2. **Why can't a subclass read its parent's `#private` field directly?** Private fields are scoped to the exact class body that declares them; a subclass's methods are not inside that body, so the reference is a `SyntaxError`, not a runtime permission failure.
3. **What is a "brand check" and how do you implement one with `#private`?** A way to test whether an object genuinely was constructed by a given class, by trying to read one of that class's private fields on it inside a `try`/`catch` — success means the object has the right internal slot, failure (`TypeError`) means it doesn't.
4. **When is referencing a private field a `SyntaxError`, and when is it a `TypeError`?** `SyntaxError` when the `#name` syntax appears outside any class that declares that field (caught at parse time); `TypeError` when the syntax is valid (you're inside the declaring class) but the specific object at runtime was never branded with that field.
5. **Why might you still see `WeakMap`-based privacy in real codebases?** It predates `#private` fields (pre-ES2022 environments), and some codebases kept the pattern for consistency or because it was already battle-tested before `#private` had broad support.
