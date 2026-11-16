---
title: "Class Practice Tracker"
sidebar_position: 8
---

This page is a status snapshot of the `practice-class-js/` exercise set that the rest of this chapter is drawn from — what's done, what's pending, and a couple of bookkeeping mistakes in the original tracker worth flagging so they don't get taken at face value.

## Per-file status

| File | Topic | Status |
|---|---|---|
| `01-class-vs-constructor.js` | Class vs constructor function, enumerability, `.constructor` trap | ✅ Complete (8/8 tasks) |
| `02-inheritance-chain.js` | Deep prototype chain, `__proto__` wiring, comparison table | ❌ All tasks pending — see correction below |
| `03-static-methods.js` | Static methods/properties, static inheritance, factory pattern | ✅ Complete (6/6 tasks) |
| `04-getters-setters.js` | Accessors, lazy getters, inheritance override bug | ✅ Complete (6/6 tasks) |
| `05-private-fields.js` | `#private` fields/methods, brand checks, static private | ✅ Complete (6/6 tasks) |
| `06-prototype-chain-deep.js` | `Object.create`-based inheritance, `hasOwnProperty`, `isPrototypeOf` | ✅ Complete (6/6 tasks) |
| `07-mixins.js` | `Object.assign` mixins, functional mixins, collisions | ❌ 5 of 7 tasks pending — see correction below |
| `08-advanced-patterns.js` | `new.target`, abstract methods, `Symbol.iterator`/`toPrimitive`/`hasInstance` | ⚠️ 3 of 5 tasks pending, and one "done" task has a real bug — see below |

## Original summary table

The tracker file reports this roll-up:

| File | Total Tasks | Done | Pending |
|---|---|---|---|
| 01-class-vs-constructor | 8 | 8 | 0 |
| 02-inheritance-chain | 8 | 5 | 3 |
| 03-static-methods | 6 | 6 | 0 |
| 04-getters-setters | 6 | 6 | 0 |
| 05-private-fields | 6 | 6 | 0 |
| 06-prototype-chain-deep | 6 | 6 | 0 |
| 07-mixins | 7 | 2 | 5 |
| 08-advanced-patterns | 5 | 3 | 2 |
| **Total** | **50** | **32** | **18** |

## Tracker inconsistencies worth flagging

Three things in the tracker don't match what the per-task rows (and the actual source files) say:

1. **`02-inheritance-chain.js` counts are wrong.** The summary row claims "8 total, 5 done, 3 pending." Counting the actual per-task checklist in the tracker: Q1 has 2 items, Q2 has 3, Q3 has 2, Q4 has 3, Q5 has 2, Q6 has 1 — that's **13 tasks total**, and every single one of them is marked ❌ Pending. The correct roll-up for this file is **13 total, 0 done, 13 pending**, not "8 / 5 / 3." The summary table's numbers for this row appear to have been copied from a different file or an earlier draft of the exercise list and never updated.
2. **`07-mixins.js` Q1 is marked pending, but the source file already contains the implementation.** The per-task table marks "Apply `Object.assign(FlyingFish.prototype, Swimmable, Flyable)`" as ❌ Pending. Looking at `07-mixins.js` itself, that line is not a stub or a `YOUR TASK` comment waiting to be filled in — it's live, working code: `Object.assign(FlyingFish.prototype, Swimmable, Flyable);` immediately followed by assertions that pass. This task is actually done; the tracker just wasn't updated after the code was written. (See [Mixins](./mixins.md) for the full walkthrough, plus solutions for the parts that genuinely are still commented-out exercises — `Serializable`, `safeMixin`, `chainedMixin`.)
3. **`08-advanced-patterns.js`'s `Symbol.hasInstance` task is marked ✅ Done, but the shipped implementation has a real bug.** The tracker checks off "`Symbol.hasInstance` brand check on plain objects." The code that's actually there is:

   ```js
   static [Symbol.hasInstance](instance) {
     return instance instanceof Vector ||
       (typeof instance?.x === "number" && typeof instance?.y === "number");
   }
   ```

   `instance instanceof Vector` inside `Vector`'s own `[Symbol.hasInstance]` calls the very method it's inside of, causing unbounded recursion — any `v instanceof Vector` check throws `RangeError: Maximum call stack size exceeded` instead of returning `true`. "Done" should mean "runs correctly," and this doesn't; it's done in the sense of "code was written," not "code is correct." See [Well-known Symbols and Class Customization](./well-known-symbols.md) for the full explanation and the fix (`Vector.prototype.isPrototypeOf(instance)` instead of `instance instanceof Vector`).

:::warning
Treat a hand-maintained progress tracker like this as a hint, not a source of truth. Before trusting a ✅, skim the actual file — "marked done" and "runs correctly" are not the same claim, as item 3 above shows directly.
:::

## Pending tasks list

Pulled from the per-file tables, the tasks still genuinely outstanding are:

- **`02-inheritance-chain.js`** (all 13 — see correction above):
  - Q1: predict `f.__proto__`, `Foo.prototype`, `Foo.__proto__`, `f.prototype` before coding; then write code proving the answers.
  - Q2: wire inheritance three ways (`setPrototypeOf` / `__proto__=` / `Object.assign`); verify 6 points for each; fill in the comparison of which approach creates a real chain vs a copy.
  - Q3: prove `Object.assign` misses later parent additions while `setPrototypeOf` picks them up; prove the shallow-copy danger with a nested config object.
  - Q4: prove `__proto__` is a getter/setter on `Object.prototype` rather than an own property; create an object with `Object.create(null)` and show its `__proto__` is `undefined`; build a 3-level chain using `__proto__` in an object literal.
  - Q5: call `setPrototypeOf` after construction and observe whether the instance's behavior changes; build a "flying fish" (swims + flies) using only constructor functions and `setPrototypeOf`.
  - Q6: fill in the full comparison table (7 aspects × 3 wiring methods).
- **`07-mixins.js`** (Q2 and Q3's remaining items):
  - Implement the `Serializable` mixin (`toJSON()`, `static fromJSON()`, `serialize()`) — solved in [Mixins](./mixins.md).
  - Write `safeMixin(target, ...mixins)` that throws on a name collision — solved in [Mixins](./mixins.md).
  - Write `chainedMixin(target, ...mixins)` that chains same-named methods instead of overwriting — solved in [Mixins](./mixins.md).
- **`08-advanced-patterns.js`**:
  - Implement `CircleShape.area()` — solved in [Abstract Classes, Polymorphism and Template Method](./abstract-classes-and-polymorphism.md).
  - Implement `class Range` with `Symbol.iterator` and `Symbol.toPrimitive` — solved in [Well-known Symbols and Class Customization](./well-known-symbols.md).
  - **Not in the original pending list, but should be:** fix the recursive `Symbol.hasInstance` bug described above.

## Suggested order to tackle pending work

The original tracker's suggested order, still reasonable advice for picking up where the exercises left off:

1. `02` Q1 — class rewrite (quickest win; you already understand the constructor version).
2. `02` Q2 — `Employee`/`Manager` with a `super`-chained `describe()`.
3. `04` Q1 — `BankAccount` `RangeError` (already done in practice — see [Getters and Setters in Classes](./getters-and-setters.md)).
4. `08` Q1 — `CircleShape.area()` (one line; solved above).
5. `07` Q1 — `Object.assign` mixin (already done in practice — see correction #2 above).
6. `03` Q3 — `Temperature` factory class (already done — see [Static Methods, Properties and Factories](./static-members.md)).
7. `05` Q2 — `Counter` with a private method (already done — see [Private Fields, Encapsulation and Brand Checks](./private-fields.md)).
8. `04` Q2 — lazy getter `Circle` (already done).
9. `04` Q3 — `Circle2` setter override (already done).
10. `03` Q2 — constructor-function static chain (already done).
11. `07` Q2 — `Serializable` mixin (solved above).
12. `07` Q3 — `safeMixin` + `chainedMixin` (solved above).
13. `08` Q2 — `Range` with `Symbol.iterator` (solved above).

Given the corrections above, most of this list (items 3 and 6–10) turns out to already be implemented and working in the source files — the real remaining work is `02-inheritance-chain.js` in full, plus the `Symbol.hasInstance` recursion fix that the original tracker missed entirely.

## Key takeaways

- The tracker's own summary table is unreliable for `02-inheritance-chain.js` (undercounts both total and pending tasks) and for `07-mixins.js` Q1 (marks already-working code as pending).
- "Marked ✅ Done" is not the same guarantee as "verified correct" — the `Symbol.hasInstance` implementation in `08-advanced-patterns.js` is checked off but recurses infinitely in practice.
- Cross-reference a hand-maintained tracker against the actual source file before relying on its status, especially for anything you're about to build on top of.
