---
title: Set and Array vs Set
sidebar_position: 5
---

`Set` is JavaScript's built-in collection of **unique** values. This page covers the core `Set` API, the classic array-deduplication idiom, the newer (ES2025) set-algebra methods, and when to reach for a `Set` instead of an array.

## `Set` basics

```js
let set = new Set([1, 2, 2, 2, 2, 2, 3, 4, 5, 5, 5, 5]);
console.log(set); // Set(5) { 1, 2, 3, 4, 5 } — duplicates are dropped on construction

set.add(6);
set.add(7);
set.delete(3);
set.delete(3); // deleting again is a safe no-op; delete() just returns false

console.log(set.has(1)); // true
console.log(set);        // Set(6) { 1, 2, 4, 5, 6, 7 }

console.log(set.keys(), set.values());
// Both log the same kind of iterator over { 1, 2, 4, 5, 6, 7 }
```

| Method/property | Purpose |
|---|---|
| `add(value)` | Insert a value (no-op if already present) |
| `has(value)` | Check membership — O(1) |
| `delete(value)` | Remove a value; returns `true`/`false` |
| `size` | Number of elements — **not** `.length` |
| `clear()` | Remove everything |
| `keys()` / `values()` | Identical iterators over the values |
| `entries()` | Iterator of `[value, value]` pairs (kept for API symmetry with `Map`) |

:::note keys() and values() are aliases on Set
A `Set` has no separate "key" concept — every element is both the key and the value. `set.keys()` and `set.values()` return equivalent iterators over the same elements; they exist only so `Set` and `Map` share a consistent iteration API.
:::

### Deduplicating an array

The most common reason to reach for `Set` is removing duplicates from an array, then converting straight back:

```js
const arr = [1, 2, 2, 3];
const unique = [...new Set(arr)];
console.log(unique); // [1, 2, 3]
```

`new Set(iterable)` accepts any iterable (an array, a string, another `Set`, ...), and spreading a `Set` back into `[...set]` gives you an array again, in insertion order.

## Set algebra methods (ES2025)

Newer JavaScript engines add real set-theory operations directly on `Set.prototype`, so you no longer have to hand-roll union/intersection logic with `filter` and `has`:

```js
let A = new Set([1, 2, 3, 4, 5]);
let B = new Set([4, 5, 6, 7, 8]);

console.log(A.union(B));              // Set(8) { 1, 2, 3, 4, 5, 6, 7, 8 }
console.log(A.intersection(B));       // Set(2) { 4, 5 }
console.log(A.difference(B));         // Set(3) { 1, 2, 3 }        — in A but not B
console.log(A.symmetricDifference(B)); // Set(6) { 1, 2, 3, 6, 7, 8 } — in exactly one of A, B

console.log(A.isSubsetOf(B));   // false — A has elements (1,2,3) that aren't in B
console.log(A.isSupersetOf(B)); // false — A doesn't contain all of B's elements
```

`A.isDisjointFrom(B)` (not shown above) is also available, returning `true` only when the two sets share no elements at all.

| Method | Meaning |
|---|---|
| `union(other)` | Every element in either set |
| `intersection(other)` | Only elements present in both |
| `difference(other)` | Elements in this set but not `other` |
| `symmetricDifference(other)` | Elements in exactly one of the two sets |
| `isSubsetOf(other)` | Is every element of this set also in `other`? |
| `isSupersetOf(other)` | Does this set contain every element of `other`? |
| `isDisjointFrom(other)` | Do the two sets share no elements? |

:::warning Runtime support
These set-algebra methods are part of the 2025 edition of ECMAScript and only exist in newer engine releases (Node.js 22+ and current evergreen browsers). If you need to support an older runtime, fall back to manual equivalents, e.g. `new Set([...A].filter(x => B.has(x)))` for `intersection`, or add a small polyfill. Check your actual target runtimes (via a tool like caniuse or MDN's compatibility tables) before relying on these in production.
:::

## Array vs Set

| | Array | Set |
|---|---|---|
| **Duplicates** | Allowed | Not allowed — silently ignored on `add`/construction |
| **Order** | Insertion order, index-based | Insertion order, **no** index access |
| **Access** | `arr[0]` direct index access | No index access — must iterate or spread to an array |
| **Search** | `indexOf`/`includes` — O(n) | `has()` — O(1) |
| **Size** | `.length` | `.size` |
| **Use case** | Ordered list where duplicates and positions matter | Unique values, fast membership checks |

**When to use which:**
- **Array** — you need ordered data, index-based access, or duplicates are meaningful.
- **Set** — you need guaranteed-unique values and/or fast `has()` membership checks, or you're deduplicating an existing array.

## Key takeaways

- `new Set(iterable)` drops duplicates on construction; `[...new Set(arr)]` is the standard array-dedup idiom.
- `keys()` and `values()` on a `Set` are equivalent — there's no separate key from the value.
- `has()` on a `Set` is O(1), versus O(n) for `Array.prototype.includes`/`indexOf` — prefer `Set` for repeated membership checks on larger collections.
- The new `union`/`intersection`/`difference`/`symmetricDifference`/`isSubsetOf`/`isSupersetOf`/`isDisjointFrom` methods (ES2025) replace hand-written set algebra, but check runtime support before relying on them.

## Interview questions

**Q: How do you remove duplicates from an array?**
`[...new Set(arr)]` — construct a `Set` (which drops duplicates automatically) and spread it back into a new array.

**Q: Why doesn't `Set` have an `arr[0]`-style index access?**
A `Set` is not an ordered, indexable list by design — it's defined purely by membership. It preserves insertion order for iteration, but there's no numeric index API; convert to an array first (`[...set]`) if you need indexed access.

**Q: When is `Set` faster than `Array` for lookups?**
When you need repeated membership checks: `Set.prototype.has()` is O(1), while `Array.prototype.includes`/`indexOf` are O(n) because they scan the array each time.

**Q: What does `A.difference(B)` return?**
A new `Set` containing the elements that are in `A` but **not** in `B` — order matters (it's not symmetric), unlike `symmetricDifference`, which returns elements in either set but not both.

See also [Map, WeakMap and Map vs Object](./map-and-weakmap.md) for `Set`'s key-value counterpart, and [Arrays: Creation, Mutation and Higher-Order Methods](./arrays.md) for the array side of this comparison.
