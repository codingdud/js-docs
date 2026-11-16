---
title: "Abstract Operations: ToString, ToNumber, ToBoolean, ToPrimitive"
sidebar_position: 2
---

Every coercion bottoms out in one of four internal abstract operations. Tables below are the reference.

## `ToString`

Triggered by `String(x)`, `x.toString()`, binary `+` when either operand is a string, template literals.

### Primitives → String

| Input | Output | Notes |
| --- | --- | --- |
| `null` | `"null"` | literal string |
| `undefined` | `"undefined"` | literal string |
| `true` | `"true"` | |
| `false` | `"false"` | |
| `0` | `"0"` | |
| `-0` | `"0"` | the negative sign is lost |
| `NaN` | `"NaN"` | |
| `Infinity` | `"Infinity"` | |
| `1.07e21` | `"1.07e+21"` | numbers `>= 1e21` switch to exponential notation |

```js
String(-0);      // "0"
String(1.07e21); // "1.07e+21"
```

:::warning
`String(-0)` is `"0"` — sign is lost. To detect `-0`, use `Object.is(x, -0)`.
:::

### Objects/Arrays → String

Objects/arrays first run through `ToPrimitive(hint: 'string')`, which calls `toString()`. Arrays join elements with commas.

| Input | Output | Notes |
| --- | --- | --- |
| `[]` | `""` | `[].toString()` is an empty string |
| `[1, 2, 3]` | `"1,2,3"` | elements joined by commas |
| `[null, undefined]` | `","` | `null`/`undefined` become empty string *inside* an array join |
| `{}` | `"[object Object]"` | default `Object.prototype.toString()` |
| `{ a: 1 }` | `"[object Object]"` | no custom `toString` → same generic result |

```js
String([1, 2, 3]);       // "1,2,3"
String({});               // "[object Object]"
```

:::tip
Want a readable string from an object? Define a custom `toString()` or `[Symbol.toPrimitive]`.
:::

### `JSON.stringify` is not `ToString`

- Object properties: `undefined`, functions, symbols → **omitted**.
- Array elements: same values → kept as `null` (preserves length).
- Circular refs → throws `TypeError`.

```js
JSON.stringify({ a: undefined, b: () => {}, c: Symbol("x"), d: 1 });
// '{"d":1}'   — a, b, c dropped

JSON.stringify([undefined, () => {}, Symbol("x"), 1]);
// '[null,null,null,1]'   — kept as null placeholders
```

## `ToNumber`

Triggered by `-`, `*`, `/`, `%`, unary `+`, relational operators, and some `==` branches. **Not** triggered by binary `+` once either operand is a string.

### Primitives → Number

| Input | Output | Notes |
| --- | --- | --- |
| `true` | `1` | |
| `false` | `0` | |
| `null` | `0` | `null` → `0`, **not** `NaN` |
| `undefined` | `NaN` | `undefined` → `NaN`, **not** `0` |
| `""` | `0` | empty string → `0` |
| `"  "` | `0` | whitespace-only string → `0` |
| `"0"` | `0` | |
| `"3.14"` | `3.14` | |
| `"0x10"` | `16` | hex-prefixed strings are parsed as hex |
| `"42abc"` | `NaN` | any non-numeric trailing characters → `NaN` |
| `"abc"` | `NaN` | |
| `"Infinity"` | `Infinity` | |

```js
Number(null);      // 0
Number(undefined); // NaN
Number("0x10");    // 16
Number("42abc");   // NaN
```

:::warning
`null → 0`, `undefined → NaN` — opposite directions. Don't rely on memory, check it.
:::

### Objects/Arrays → Number

`ToPrimitive(hint: 'number')` → falls back to `toString()` → result run through `ToNumber`.

| Input | Output | Notes |
| --- | --- | --- |
| `[]` | `0` | `[].toString()` is `""`, then `ToNumber("")` is `0` |
| `[""]` | `0` | same path as `[]` |
| `[" "]` | `0` | whitespace → `0` |
| `[0]` | `0` | `[0].toString()` is `"0"` |
| `[1]` | `1` | `[1].toString()` is `"1"` |
| `[1, 2]` | `NaN` | `"1,2"` is not a valid numeric string |
| `{}` | `NaN` | `"[object Object]"` is not numeric |
| `[null]` | `0` | `[null].toString()` is `""` → `0` |
| `[undefined]` | `0` | `[undefined].toString()` is `""` → `0` |

```js
Number([]);      // 0
Number([1, 2]);  // NaN
Number({});      // NaN
```

### `parseInt`/`parseFloat` vs. `ToNumber`

`parseInt`/`parseFloat` parse left-to-right, stop at the first invalid character. `ToNumber` requires the **entire** string to be numeric, or it's `NaN`.

```js
parseInt("42px");  // 42   — stops at "p"
Number("42px");    // NaN  — whole string must be numeric
```

:::tip
Always pass a radix: `parseInt(x, 10)`. Without it, `"0x10"` is silently read as hex (`16`).
:::

## `ToBoolean`

Flat lookup against a fixed falsy list — no `ToPrimitive` step. Not on the list → `true`.

### The complete falsy list

| Value | Notes |
| --- | --- |
| `false` | |
| `0` and `-0` | |
| `0n` | `BigInt` zero |
| `NaN` | |
| `""` | empty string |
| `null` | |
| `undefined` | |

Eight falsy values total, across six `typeof` types (`typeof null` is `"object"`). Everything else is truthy.

### Truthy surprises

| Value | Why it surprises people |
| --- | --- |
| `"0"` | a non-empty string — truthy, even though it *looks* falsy |
| `"false"` | same reason — any non-empty string is truthy |
| `[]` | an empty array is still an **object** — truthy |
| `{}` | an empty object — truthy |
| `function(){}` | functions are always truthy |
| `new Boolean(false)` | a **wrapper object** holding `false` — the object itself is truthy; only `.valueOf()` is falsy |

```js
Boolean("0");                // true
Boolean(new Boolean(false)); // true  ⚠️
```

:::warning
`new Boolean(false)`, `new Number(0)`, `new String("")` are **objects** — always truthy regardless of wrapped value. Don't construct primitive wrappers with `new`.
:::

### Where `ToBoolean` is implicitly triggered

| Context | Example |
| --- | --- |
| `if`/`else` test | `if (x) { ... }` |
| `for` loop test (2nd clause) | `for (; x; )` |
| `while` / `do..while` condition | `while (x) { ... }` |
| Ternary's test | `x ? a : b` |
| Left operand of `&&` / `||` | `x && y`, `x || y` |

## `ToPrimitive`

Called on an object/array when a primitive is needed, right before `ToString`/`ToNumber`. Takes a hint: `'string'`, `'number'`, or `'default'`.

| Hint | Method order | Used when |
| --- | --- | --- |
| `'number'` | `valueOf()` then `toString()` | arithmetic ops, `ToNumber`, some `==` branches |
| `'string'` | `toString()` then `valueOf()` | string concat context, `String(x)`, template literals |
| `'default'` | same as `'number'` (**except `Date`**) | `==` fallback, binary `+` |

First method tried; if it returns a primitive, done. If it returns an object, try the second. If neither returns a primitive → `TypeError`.

```js
const obj = {
  valueOf() { return 42; },
  toString() { return "obj"; },
};
obj + "";      // "42"  — hint 'default', valueOf() wins
String(obj);   // "obj" — hint 'string', toString() wins
```

### The `Date` exception

Every object uses `'number'`-style ordering for `'default'` — **except `Date`**, which uses `'string'`-style (`toString()` first).

```js
const d = new Date(2026, 0, 1);
typeof (d + 1);  // "string" — default hint on Date behaves like 'string'
typeof (+d);     // "number" — unary + explicitly requests 'number' (timestamp)
```

### `Symbol.toPrimitive` takes priority over everything

If defined, called first — before `valueOf()`/`toString()` — with the hint string as its argument.

```js
const money = {
  amount: 42,
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.amount;
    if (hint === "string") return `$${this.amount}`;
    return `${this.amount} dollars`; // 'default'
  },
};

+money;        // 42
`${money}`;    // "$42"
money + "";    // "42 dollars"
```

### When neither method returns a primitive

```js
const broken = {
  valueOf() { return {}; },
  toString() { return {}; },
};
broken + ""; // TypeError: Cannot convert object to primitive value
```

## Key takeaways

- `ToString`/`ToNumber`/`ToBoolean` convert to one specific primitive; `ToPrimitive` unwraps an object first.
- `ToBoolean` never chains through `ToPrimitive` — direct falsy-list lookup.
- `Date`'s `'default'` hint behaves like `'string'`, not `'number'`.
- `Symbol.toPrimitive`, when present, always wins.

### Interview questions

1. Why `Number(null)` is `0` but `Number(undefined)` is `NaN`? → `null`→`0` and `undefined`→`NaN` are hardcoded, opposite spec rules.
2. `parseInt("42px")` vs `Number("42px")`? → `parseInt` stops at first invalid char (`42`); `Number` needs the whole string numeric (`NaN`).
3. Name 3 falsy-looking-but-truthy values. → `"0"`, `"false"`, `[]` (also `{}`).
4. What hint does `+someDate` request? → `'number'` — gets the timestamp; `someDate + ""` uses `'default'`, which is `'string'`-like for `Date`.
5. `ToPrimitive` order for `'number'` hint, and failure mode? → `valueOf()` then `toString()`; `TypeError` if neither returns a primitive.

See also: [Explicit Coercion](./explicit-coercion.md), [Implicit Coercion](./implicit-coercion.md).
