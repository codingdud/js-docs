---
title: "Well-known Symbols and Class Customization"
sidebar_position: 7
---

JavaScript lets a class hook into core language behaviors — `for...of`, template-literal interpolation, arithmetic operators, `console.log` formatting, and even `instanceof` itself — by implementing methods keyed by **well-known symbols** like `Symbol.iterator`, `Symbol.toPrimitive`, and `Symbol.hasInstance`. This page works through all of them with a `Range` class, a `Vector` class, and one real bug worth understanding deeply.

## `Symbol.iterator` and `Symbol.toPrimitive` — making `Range` iterable and numeric

```js
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  get length() {
    return Math.floor((this.end - this.start) / this.step) + 1;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const { end, step } = this;
    return {
      next() {
        if (current > end) return { value: undefined, done: true };
        const value = current;
        current += step;
        return { value, done: false };
      },
    };
  }

  [Symbol.toPrimitive](hint) {
    if (hint === "string") return `Range(${this.start}..${this.end})`;
    return this.end - this.start; // used for both "number" and "default"
  }
}
```

`[Symbol.iterator]()` must return an **iterator** — any object with a `next()` method that returns `{ value, done }` pairs. Defining it is what makes spread (`...range`), `for...of`, `Array.from`, and destructuring all work on a `Range` instance automatically:

```js
const r = new Range(1, 5);
console.log([...r]); // [1, 2, 3, 4, 5]

for (const n of r) process.stdout.write(n + " "); // "1 2 3 4 5 "

const r2 = new Range(0, 10, 2);
console.log([...r2]);   // [0, 2, 4, 6, 8, 10]
console.log(r2.length); // 6
```

`[Symbol.toPrimitive](hint)` is called whenever the engine needs to convert an object to a primitive, and it receives a `hint` telling you *why*:

```js
console.log(`${r}`);  // "Range(1..5)"   — hint: "string" (template literal interpolation)
console.log(r + 10);  // 14              — hint: "default" → 5 - 1 = 4, then 4 + 10 = 14
console.log(r > 3);   // true            — hint: "number"  → span 4 > 3
```

| Hint | When it's used | `Range`'s behavior |
|---|---|---|
| `"string"` | Template literals, `String(obj)`, `` `${obj}` `` | `"Range(start..end)"` |
| `"number"` | Relational operators (`<`, `>`), explicit `Number(obj)` | `end - start` |
| `"default"` | `+`, `==`, most other coercions | same as `"number"` here |

Implementing `[Symbol.toPrimitive]` entirely replaces the normal `valueOf`/`toString` fallback chain for that object — once it's defined, the engine always asks it first and uses whatever it returns, for every hint.

## `toString` vs `valueOf` — and a subtlety with `+`

A class can also customize coercion the older way, with separate `toString()` and `valueOf()` methods, instead of one `[Symbol.toPrimitive]`:

```js
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  magnitude() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  toString() {
    return `Vector(${this.x}, ${this.y})`;
  }

  valueOf() {
    return this.magnitude(); // lets Vector participate in numeric contexts
  }
}

const v1 = new Vector(3, 4); // magnitude 5
const v2 = new Vector(1, 2); // magnitude ≈ 2.236

console.log(v1.toString());        // "Vector(3, 4)"
console.log(`position: ${v1}`);    // "position: Vector(3, 4)" — template literal prefers toString
console.log(v1.add(v2).toString()); // "Vector(4, 6)" — real vector addition via .add()
```

:::warning `v1 + v2` does NOT do vector addition
```js
console.log(v1 + v2); // 7.236... — NOT a new Vector!
```
Without `[Symbol.toPrimitive]`, the `+` operator's default algorithm asks both operands for a primitive with hint `"default"`, which tries `valueOf()` first. `v1.valueOf()` returns `5` (its magnitude) and `v2.valueOf()` returns `≈2.236` (its magnitude) — so `v1 + v2` is really `5 + 2.236...`, a scalar sum of magnitudes, **not** a call to `.add()`. If you want `+` to perform real vector addition, you would need `[Symbol.toPrimitive]` to somehow encode both components into a single primitive (not realistic for a 2D vector) — in practice, operator overloading for structured addition isn't something `valueOf`/`toPrimitive` can cleanly express; keep using an explicit `.add()` method for that, and treat `valueOf`-driven `+` only as "coerce to this one meaningful number" (here, magnitude).
:::

Template literals specifically prefer `"string"`-hinted conversion, which falls back to `toString()` when there's no `[Symbol.toPrimitive]`; that's why `` `${v1}` `` uses the readable `"Vector(3, 4)"` form while `v1 + v2` uses the numeric `valueOf()` form — two different hints routing to two different methods.

## The Node.js inspect hook — controlling `console.log` output

Node's REPL/`console.log` normally prints class instances as `ClassName { field: value, ... }`. You can override that with the well-known `Symbol.for("nodejs.util.inspect.custom")` hook:

```js
class Vector {
  // ...toString()/valueOf() as above...

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}

console.log(new Vector(3, 4)); // Vector(3, 4)   — instead of Vector { x: 3, y: 4 }
```

`Symbol.for(key)` looks up (or creates) a symbol in the **global symbol registry** — using it rather than a plain `Symbol()` is what lets Node's own `util.inspect` machinery find this exact method on arbitrary objects, including ones defined in your own code with no import from `util` required.

## `Symbol.hasInstance` — customizing `instanceof`, and a real infinite-recursion bug

`static [Symbol.hasInstance](instance) { ... }` lets a class decide for itself what `instanceof` means against it — for example, accepting any "duck-typed" object that merely *looks* like the class, without actually being constructed by it.

Here is the **buggy** version, written the way it's tempting to write it:

```js
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  static [Symbol.hasInstance](instance) {
    return instance instanceof Vector || // 🐛 BUG — see below
      (typeof instance?.x === "number" && typeof instance?.y === "number");
  }
}
```

It looks reasonable — "either it's a real `Vector`, or it merely has numeric `x`/`y`" — but `instance instanceof Vector` **inside** `Vector`'s own `[Symbol.hasInstance]` implementation calls the exact same method again. Every `instanceof Vector` check in the entire program — including this one — is routed through `Vector[Symbol.hasInstance]`, because that's precisely what defining it means. The result is unbounded recursion:

```js
const v1 = new Vector(3, 4);
v1 instanceof Vector; // RangeError: Maximum call stack size exceeded
```

:::danger
Any claim that `v1 instanceof Vector` simply logs `true` here is wrong — with this implementation, it crashes with a stack overflow, because `instanceof` inside a `Symbol.hasInstance` method targeting the *same* class recurses into itself with no base case.
:::

**The fix** — check the real prototype chain with `isPrototypeOf`, which does **not** go through `Symbol.hasInstance` and therefore can't recurse:

```js
class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return `Vector(${this.x}, ${this.y})`;
  }

  static [Symbol.hasInstance](instance) {
    return Vector.prototype.isPrototypeOf(instance) ||
      (typeof instance?.x === "number" && typeof instance?.y === "number");
  }
}

const v1 = new Vector(3, 4);
const v2 = new Vector(1, 2);

console.log(v1 instanceof Vector);             // true — real instance, caught by isPrototypeOf
console.log({ x: 1, y: 2 } instanceof Vector); // true — duck-typed, caught by the numeric check
console.log({ x: 1, z: 2 } instanceof Vector); // false — missing numeric y
```

`Object.prototype.isPrototypeOf` walks the real prototype chain directly and is completely unrelated to the `instanceof` operator's symbol dispatch — it's the correct tool any time you need to ask "is X genuinely in Y's prototype chain" from *inside* a custom `Symbol.hasInstance` implementation for Y.

## Key takeaways

- `[Symbol.iterator]()` must return an object with `next()` returning `{ value, done }` — implementing it unlocks `for...of`, spread, destructuring, and `Array.from` for free.
- `[Symbol.toPrimitive](hint)` fully replaces the `valueOf`/`toString` fallback chain and lets you return a different primitive depending on whether the hint is `"string"`, `"number"`, or `"default"`.
- Without `[Symbol.toPrimitive]`, `+` falls back to `valueOf()`, while template-literal interpolation prefers `toString()` — so a class with both can behave very differently under `` `${x}` `` versus `x + y`.
- `valueOf`-driven arithmetic operators compute on whatever scalar `valueOf()` returns (e.g. magnitude) — this is not the same as a semantically meaningful `.add()`, and conflating the two is a common misunderstanding.
- `Symbol.for("nodejs.util.inspect.custom")` controls how Node's `console.log`/REPL renders an instance.
- Never call `instance instanceof SameClass` from inside that class's own `static [Symbol.hasInstance]` — it recurses forever. Use `SameClass.prototype.isPrototypeOf(instance)` instead, which bypasses the symbol dispatch entirely.

## Interview questions

1. **What must `[Symbol.iterator]()` return, and what does that unlock?** An iterator object (something with a `next()` method returning `{ value, done }`); implementing it enables `for...of`, the spread operator, destructuring, and `Array.from` on your class.
2. **What are the three hints passed to `[Symbol.toPrimitive]`, and when does each occur?** `"string"` (template literals, explicit string conversion), `"number"` (relational/arithmetic operators expecting a number, explicit `Number()`), and `"default"` (most other implicit coercions, including `+`).
3. **Without `[Symbol.toPrimitive]`, why might `` `${obj}` `` and `obj + 1` use different methods on the same object?** Template-literal interpolation hints `"string"` and prefers `toString()`; `+` hints `"default"` and prefers `valueOf()` — two different fallback paths on the same object.
4. **Why does `instance instanceof SameClass` inside that class's own `static [Symbol.hasInstance]` cause infinite recursion?** Because every `instanceof SameClass` check anywhere, including the one inside the method itself, is routed through that exact method — there's no base case, so it calls itself forever.
5. **How do you check "is this really in Y's prototype chain" from inside `Y`'s custom `Symbol.hasInstance` without recursing?** `Y.prototype.isPrototypeOf(instance)` — it inspects the chain directly and never invokes `Symbol.hasInstance`.
