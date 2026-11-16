---
title: "Implicit Coercion"
sidebar_position: 4
---

Same `ToString`/`ToNumber`/`ToBoolean`/`ToPrimitive` machinery as explicit coercion, triggered as a side effect of an operator instead of a function call. Source of most "JS is weird" trivia — the rules are consistent, just not obvious until seen laid out.

## Binary `+`: the one operator with string preference

`+` is the **only** arithmetic operator sensitive to operand type. `-`, `*`, `/`, `%` **always** call `ToNumber` on both sides.

```js
"3" - 2;   // 1    — minus always numifies
```

`+` runs `ToPrimitive` on both operands first. If **either** result is a string, `ToString` both and concatenate. Otherwise `ToNumber` both and add.

### Expression table

| Expression | Result | Reason |
| --- | --- | --- |
| `"3" + 4` | `"34"` | a string is present → concatenate |
| `4 + "3"` | `"43"` | same rule, operand order doesn't matter |
| `1 + 2 + "3"` | `"33"` | left-to-right: `1+2` is `3` (both numbers), then `3 + "3"` is `"33"` |
| `"1" + 2 + 3` | `"123"` | left-to-right: `"1"+2` is `"12"` (string present), then `"12"+3` is `"123"` |
| `true + false` | `1` | neither side is a string → `ToNumber` both: `1 + 0` |
| `null + 1` | `1` | `ToNumber(null)` is `0`, so `0 + 1` |
| `undefined + 1` | `NaN` | `ToNumber(undefined)` is `NaN`, so `NaN + 1` |
| `[] + []` | `""` | both sides `ToPrimitive` to `""`, concatenate |
| `[] + {}` | `"[object Object]"` | `""` + `"[object Object]"` |
| `{} + []` | `0` | **only** at the start of a statement — see below |
| `({}) + []` | `"[object Object]"` | parens force `{}` to be an object literal |

```js
"3" + 4;        // "34"
"1" + 2 + 3;    // "123"
null + 1;       // 1
undefined + 1;  // NaN
[] + {};        // "[object Object]"
```

### The `{} + []` trap

Grammar ambiguity, not a coercion rule:

```js
{} + [];      // 0            — typed as a bare statement
({}) + [];    // "[object Object]" — {} forced into expression position
```

At statement start, `{` can't begin an object literal — it's parsed as an empty block, so `{} + []` is really two statements: `{}` then `+[]` → `0`. Parentheses force `{}` into expression position → ordinary concat.

:::warning
Parser quirk, not coercion — the leading `{}` is discarded before any coercion happens.
:::

### The `{}+[]+{}+[1]` REPL vs. `console.log(...)` difference

Same ambiguity, different result depending on context:

```js
// Bare statement: empty block, then +[] + {} + [1]
{}+[]+{}+[1];
// => "0[object Object]1"

// Inside console.log(...), {} is always an expression (object literal)
console.log({}+[]+{}+[1]);
// => "[object Object][object Object]1"
```

:::warning
If you've seen `console.log({}+[]+{}+[1])` claimed to print `"0[object Object]1"` — that's the bare-statement result mislabeled. Inside a function call, every `{}` is an object literal, so the real output is `"[object Object][object Object]1"`.
:::

## Booleans → Numbers

`ToNumber` converts `true → 1`, `false → 0`:

```js
let count = 0;
for (const v of [1, -2, 3, -4, 5]) {
  count += v > 0; // true/false coerced to 1/0
}
count; // 3
```

(`count += Number(v > 0)` is equivalent, purely for readability.)

## `||` and `&&`: selector and guard, not boolean logic

Neither returns a boolean. Both test the left operand with `ToBoolean`, then return one of the **original operand values**, unconverted.

| Operator | Rule | Example |
| --- | --- | --- |
| `||` | left truthy → return left; else return right | `a || b` → `a` if truthy, else `b` |
| `&&` | left falsy → return left; else return right | `a && b` → `a` if falsy, else `b` |

```js
undefined || "default";    // "default"   — default-value pattern
0 || "fallback";             // "fallback"  — 0 is falsy, so right side wins

const user = { name: "Ada" };
user && user.name;           // "Ada"       — guard pattern
```

YDKJS framing: `||` is a **"selector"**, `&&` is a **"guard"** — neither coerces its *return value*, only the left operand (to decide which side to hand back).

:::tip
Want an actual boolean? Wrap it: `Boolean(a || b)`. Want "fall back only on `null`/`undefined`, not any falsy value"? Use `??` instead — `0 || "fallback"` above shows `||` also triggers on `0`, `""`, `false`.
:::

## Symbols: coercion mostly refuses to happen

Explicit string conversion works; everything implicit throws:

```js
const sym = Symbol("id");
String(sym);   // "Symbol(id)"   — explicit, allowed
sym + "";       // TypeError: Cannot convert a Symbol value to a string
Number(sym);    // TypeError: Cannot convert a Symbol value to a number
```

Intentional: symbols are unique identifiers, so implicit stringify/numify would usually be a bug.

## Worked examples from real sessions

```js
null + null;            // 0        — ToNumber(null) is 0 on both sides, 0 + 0
undefined + null;       // NaN      — ToNumber(undefined) is NaN; NaN + 0 is NaN
"foo" + +"bar";          // "fooNaN" — unary + runs first: +"bar" is NaN, then string concat
5 + -"3";                 // 2        — unary - runs first: -"3" is -3, then 5 + (-3)
!+[] + [] + ![];            // "truefalse"
//   +[] → 0 → !0 → true → "true" + "" → "true" + ![](=false) → "truefalse"

"null" + null;               // "nullnull"   — "null" already a string, + concatenates
1 - "a";                      // NaN          — minus numifies, ToNumber("a") is NaN
typeof void "ASDFAS";         // "undefined"  — void always evaluates to undefined
```

`void <expr>` runs `<expr>`'s side effects and always returns `undefined` — not coercion, just a way to discard a value.

## Key takeaways

- `+` is the only arithmetic operator with string-preference; `-`, `*`, `/`, `%` always numify.
- `{} + []` depends on **grammar position**, not coercion — leading `{}` at statement-start is a block, not an object literal.
- `||`/`&&` are "selector"/"guard" operators: they return an **operand**, not a computed boolean.
- Symbols refuse implicit coercion by design.
- `void x` always yields `undefined`; unrelated to the four coercion ops.

### Interview questions

1. Why `true + ""` → `"true"` but `true + 1` → `2`? → first has a string operand (string-preference kicks in); second doesn't, so both numify.
2. Why is `{} + []` `0` as a bare statement but `"[object Object]"` in parens/`console.log`? → leading `{}` at statement-start parses as an empty block, not an object literal.
3. Does `a || b` return a boolean? → No, it returns `a` or `b` unconverted.
4. Why does `sym + ""` throw but `String(sym)` work? → implicit coercion of symbols is disallowed by design; explicit conversion is allowed.
5. Trace `!+[]+[]+![]`. → `+[]`→`0` → `!0`→`true` → `"true"+""`→`"true"` → `"true"+![](false)`→`"truefalse"`.

See also: [`null`, `undefined` & `NaN`](../01-basics/null-undefined-nan.md), [Loose Equality](./loose-equality.md).
