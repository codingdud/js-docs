---
title: "Explicit Coercion"
sidebar_position: 3
---

Explicit coercion = conversion written on purpose, obvious at the call site. Covers strings, numbers, booleans, dates, and the bitwise idioms YDKJS still calls "explicit" once you know them.

## To String

### `String(x)` vs. `x.toString()` vs. `x + ""`

| Form | Works on `null`/`undefined`? | Goes through `ToPrimitive` first? |
| --- | --- | --- |
| `String(x)` | ✅ yes — returns `"null"` / `"undefined"` | yes, with hint `'string'` |
| `x.toString()` | ❌ throws `TypeError` | n/a — it *is* the method being called |
| `x + ""` | ✅ yes | yes, with hint `'default'` |

```js
String(null);        // "null"
null.toString();      // TypeError: Cannot read properties of null
null + "";             // "null"
```

Different hints can disagree on objects with both `valueOf()` and `toString()`:

```js
const o = { toString() { return "X"; }, valueOf() { return 42; } };
o + "";     // "42"  — hint 'default' → valueOf() wins
String(o);  // "X"   — hint 'string'  → toString() wins
```

:::warning
`x + ""` ≠ `String(x)` on objects with a custom `valueOf()`. Use `String(x)` when you specifically want the string conversion.
:::

## To Number

| Form | Notes |
| --- | --- |
| `Number(x)` | Calls `ToNumber` directly. Returns `NaN` rather than throwing. |
| `+x` (unary plus) | Identical to `Number(x)`. |
| `parseInt(x, radix)` | Parses left-to-right, stops at first invalid char. **Always pass the radix.** |
| `parseFloat(x)` | Like `parseInt`, but understands decimal points. |

```js
Number("3.14");        // 3.14
parseInt("42px", 10);  // 42
parseFloat("3.14kg");  // 3.14
```

:::tip
Always write `parseInt(x, 10)` — without a radix, `"0x10"` is read as hex (`16`).
:::

### Dates to numbers

| Form | Result |
| --- | --- |
| `Date.now()` | current Unix timestamp in ms — **preferred** |
| `+new Date()` | same, via unary plus (hint `'number'`) |
| `new Date() - 0` | same, via explicit subtraction |

```js
Date.now();      // e.g. 1795000000000
+new Date();      // same value
```

`Date.now()` is clearest by name; `+new Date()` works via the `'number'` hint rule (see [Abstract Operations](./abstract-operations.md#the-date-exception)).

### Bitwise `ToInt32` idioms

`0 | x` and `~~x` coerce to a **32-bit signed integer** via `ToInt32` — not the same as JS's safe-integer range; it wraps at `±2^31`.

```js
0 | 3.9;        // 3   — truncates toward zero, like Math.trunc
~~3.9;          // 3   — same result
0 | NaN;        // 0   — NaN becomes 0
0 | 2 ** 32;    // 0            — wraps at the 32-bit boundary!
0 | (2 ** 31);  // -2147483648  — overflows into negative range
```

:::warning
`0 | x` / `~~x` are **not** safe replacements for `Math.trunc(x)` on large numbers — they wrap at `±2147483647`. Use `Math.trunc` for correctness across the full range.
:::

### `~` (bitwise NOT) idioms

`~x` = `-(x + 1)`. Useful fact: `~x` is `0` (falsy) **only when `x` is `-1`**.

```js
const str = "hello world";
if (~str.indexOf("world")) {
  // found — ~5 is -6 (truthy)
}
if (!~str.indexOf("xyz")) {
  // not found — ~-1 is 0 (falsy)
}
```

:::tip
Modern code prefers `str.includes("world")`. `~indexOf` is worth recognizing in older code/interviews, but trades clarity for cleverness.
:::

## To Boolean

| Form | Notes |
| --- | --- |
| `Boolean(x)` | Calls `ToBoolean` directly. Explicit, self-documenting. |
| `!!x` | Double negation. Identical result to `Boolean(x)`. |

```js
Boolean("hello");  // true
!!0;                // false
```

Both go through the same `ToBoolean` lookup ([Abstract Operations](./abstract-operations.md#toboolean)) — only readability differs. `!!x` is extremely common in real code.

## Key takeaways

- `String(x)` is the only string-cast safe on every input, including `null`/`undefined`.
- `x.toString()` throws on `null`/`undefined` (no methods to call).
- `x + ""` and `String(x)` can disagree on objects with custom `valueOf()`/`toString()` (different `ToPrimitive` hints).
- `0 | x` / `~~x` truncate to **32-bit signed** range — not a `Math.trunc` substitute for large numbers.
- `!!x` and `Boolean(x)` are equivalent.

### Interview questions

1. Why does `null.toString()` throw but `String(null)` doesn't? → `String(x)` doesn't call a method on `null`; `.toString()` does, and `null` has none.
2. `{toString(){return "X"}, valueOf(){return 42}}` → `obj + ""` vs `String(obj)`? → `"42"` (default hint, valueOf wins) vs `"X"` (string hint, toString wins).
3. `0 | x` vs `Math.trunc(x)`? → `0 | x` wraps at 32-bit signed range; `Math.trunc` is correct for any size.
4. Why is `~str.indexOf(x)` falsy exactly on "not found"? → `indexOf` returns `-1` on failure, and `~-1` is `0`.
5. Why always pass a radix to `parseInt`? → avoids `"0x10"`-style strings being silently parsed as hex.
