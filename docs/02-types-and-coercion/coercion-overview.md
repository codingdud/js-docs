---
title: "Coercion Overview"
sidebar_position: 1
---

JS is dynamically typed — values, not variables, have types. **Coercion** = converting a value from one type to another, explicitly or implicitly.

Based on *You Don't Know JS: Types & Grammar*, Ch. 4 (Kyle Simpson / `getify`).

## What coercion actually produces

Coercion always ends in one of three primitives:

- **string**
- **number**
- **boolean**

:::note
Coercion never produces an object. Objects are only ever coerced **away from** (via `ToPrimitive`), never into.
:::

Objects/arrays go through `ToPrimitive` first — see [Abstract Operations](./abstract-operations.md).

## Coercion vs. conversion

Not a real spec distinction — just how obvious the intent is:

| Term | Who triggers it | Example |
| --- | --- | --- |
| **Explicit coercion** ("casting") | You, on purpose | `Number("42")`, `String(99)`, `Boolean(0)` |
| **Implicit coercion** | The language, as a side effect | `"42" * 1`, `if (x)`, `1 + "2"` |

Both route through the same abstract operations. The useful question isn't "coercion or conversion?" — it's "is this implicit coercion safe here?"

## The operations that do the actual work

| Abstract operation | Produces | Typically triggered by |
| --- | --- | --- |
| `ToString` | string | `String(x)`, `x.toString()`, binary `+` w/ a string operand, template literals |
| `ToNumber` | number | `Number(x)`, unary `+x`, `-`, `*`, `/`, `%`, relational ops, some `==` branches |
| `ToBoolean` | boolean | `Boolean(x)`, `!!x`, `if`, `while`, `for`, ternary test, `&&`/`||` left side |
| `ToPrimitive` | string/number/boolean | Runs first on any object/array before `ToString`/`ToNumber` |

Next: [Abstract Operations](./abstract-operations.md) (the four ops in detail), [Explicit Coercion](./explicit-coercion.md), [Implicit Coercion](./implicit-coercion.md), [Loose Equality](./loose-equality.md), [Relational Comparison and Quick Reference](./relational-comparison-and-quick-reference.md).

Prereqs: [Data Types and Operators](../01-basics/data-types-and-operators.md), [`null`, `undefined` & `NaN`](../01-basics/null-undefined-nan.md).

## Why this matters

Memes like `[] + [] + {}` aren't representative of real code. Real implicit coercion looks like:

```js
if (userInput) { /* ... */ }           // ToBoolean
const total = "" + price + " USD";     // ToString
const count = inputValue * 1;          // ToNumber
```

Goal: know the small rule set, not memorize tricks.

## Key takeaways

- Coercion always resolves to **string, number, or boolean** — never an object.
- Explicit vs. implicit = how obvious it is at the call site, not a different mechanism.
- Four abstract operations — `ToString`, `ToNumber`, `ToBoolean`, `ToPrimitive` — explain every coercion.
- Source: *YDKJS: Types & Grammar*, Ch. 4, Kyle Simpson.

### Interview questions

1. Explicit vs. implicit coercion? → Same mechanism, differs only in how obvious the intent is at the call site.
2. Three possible coercion results, and why never an object? → string/number/boolean; objects are only coerced from, via `ToPrimitive`.
3. Which op runs first in `[1,2] + 3`? → `ToPrimitive` on the array, since `+` needs primitives before deciding string vs. number.
