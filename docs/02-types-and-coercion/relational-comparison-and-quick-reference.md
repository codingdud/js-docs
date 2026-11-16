---
title: "Relational Comparison and Coercion Quick Reference"
sidebar_position: 6
---

`<`, `>`, `<=`, `>=` use their own algorithm, **Abstract Relational Comparison** — a genuinely separate algorithm from `==`, which is exactly why `null == 0` and `null >= 0` disagree.

## How it works

1. `ToPrimitive(hint: 'number')` runs on **both** operands.
2. **If both results are strings**, compare **lexicographically** — no numeric conversion.
3. **Otherwise**, `ToNumber` on whichever side(s) aren't already numbers, compare numerically.

```js
"abc" < "abd";   // true   — both strings, compared lexicographically
"10" < "9";       // true   — both strings: "1" sorts before "9" character-by-character!
"5" > 4;           // true   — 4 is a number, so ToNumber("5") runs: 5 > 4
```

:::warning
`"10" < "9"` is `true` — string comparisons are **lexicographic**, not numeric. Common cause of "sorting numbers as strings" bugs (e.g. `Array.prototype.sort()` without a comparator).
:::

## `null` and `undefined` under relational comparison

No special bubble here — both run through `ToNumber` like anything else: `ToNumber(null)` is `0`, `ToNumber(undefined)` is `NaN` (see [Abstract Operations](./abstract-operations.md#tonumber)).

```js
null > 0;     // false  — null→0, then 0 > 0 is false
null >= 0;    // true   — null→0, then 0 >= 0 is true
undefined > 0;   // false  — undefined→NaN, any comparison with NaN is false
```

### `==` and relational comparison use *different* algorithms — that's the whole gotcha

```js
null == 0;    // false  — == hits the null/undefined bubble, which never coerces to 0
null >= 0;    // true   — relational comparison has no such bubble; null→0 directly
```

:::danger
`null >= 0` is `true`, `null == 0` is `false` — different algorithms, different special cases. `==` special-cases `null`/`undefined` before any numeric coercion; relational comparison numifies `null` like any other value. Don't assume consistency between them.
:::

## A note on `console.log` and coercion

`console.log` is not just "calling `toString()`." Strings print as-is; most primitives print their `ToString` form. **Objects/arrays**, however, use the console's own *inspection* format — not `toString()`.

```js
console.log([1, 2, 3]);        // [ 1, 2, 3 ]        (console's own inspector format)
console.log(String([1, 2, 3])); // 1,2,3              (actual ToString result)
console.log({ a: 1 });           // { a: 1 }            (inspector format, not "[object Object]")
```

To see the real coercion result for an object/array, call `String(x)` or `JSON.stringify(x)` explicitly.

## Quick reference: operator coercion summary

| Operator(s) | Coercion applied | Notes |
| --- | --- | --- |
| binary `+` | `ToPrimitive` first; if either side is a string, `ToString` both and concatenate; else `ToNumber` both and add | the only operator with string-preference |
| `-`, `*`, `/`, `%` | `ToNumber` on both operands, always | `"3" - 1` numifies automatically |
| unary `+` | `ToNumber` on the operand | common idiom for explicit numeric coercion |
| unary `!` | `ToBoolean` then negate | `!!x` = double negation → clean boolean |
| `==` | special `null`/`undefined` bubble, then boolean→number (R1), string↔number (R2), or object→primitive (R4) | see [Loose Equality](./loose-equality.md) |
| `===` | none | both type and value must match exactly |
| `<`, `>`, `<=`, `>=` | `ToPrimitive(hint:'number')` both; lexicographic if both end up strings, else `ToNumber` both | different algorithm from `==`; no `null`/`undefined` bubble |
| `if` / `while` / `for` (test clause) | `ToBoolean` on the test expression | see the falsy list in [Abstract Operations](./abstract-operations.md#toboolean) |
| `||` | `ToBoolean` on the left only; **returns an operand value**, not a boolean | "selector" operator |
| `&&` | `ToBoolean` on the left only; **returns an operand value**, not a boolean | "guard" operator |
| template literals `${x}` | `ToString` on the expression (via `ToPrimitive(hint:'string')`) | same path as `String(x)` |

## Key takeaways

- Relational comparison is a **separate algorithm** from `==`, even though both can coerce — don't assume they agree.
- Both sides end up as strings → relational comparison is **lexicographic**: `"10" < "9"` is `true`.
- `null` has no special bubble under relational comparison, unlike `==` — it numifies to `0`.
- `console.log`'s object/array formatting is a debugging aid, not the actual `ToString` result.

### Interview questions

1. Why is `"10" < "9"` `true`? → both operands end up as strings, so comparison is lexicographic, not numeric.
2. Explain `null == 0` (`false`) vs. `null >= 0` (`true`). → different algorithms: `==`'s null bubble never coerces to `0`; relational comparison numifies `null` directly.
3. What does `undefined >= 0` evaluate to, and why? → `false` — `undefined`→`NaN`, and any comparison with `NaN` is false.
4. Is `console.log({a: 1})` printing `"[object Object]"` the real `ToString` result? → No — that's the console's inspector format; `String({a:1})` gives the real `"[object Object]"`.
5. Coercion applied for `+`, `==`, `===`, `||`? → `+`: ToPrimitive then ToString/ToNumber; `==`: null bubble + R1/R2/R4; `===`: none; `||`: ToBoolean on left only, returns an operand.

---

That completes this chapter. Return to [Coercion Overview](./coercion-overview.md) for the big picture, or continue to [Functions, Scope & Closures](../03-functions-and-scope/execution-context-and-hoisting.md) for the next chapter.
