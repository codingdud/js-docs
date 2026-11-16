---
title: "Loose Equality (==) vs Strict Equality (===)"
sidebar_position: 5
---

`==` coerces operands before comparing; `===` doesn't. That's the only difference. `==` is **symmetric**: `A == B` means the same as `B == A`.

:::note
"`==` is evil" overstates it. `==`'s coercions are rule-based and learnable — know the rules and the "crazy" results stop being surprising.
:::

## When both sides are the same type

Same type → `==` behaves **exactly** like `===`, no coercion needed.

```js
5 == 5;              // true
NaN == NaN;            // false   — NaN is never equal to anything, including itself
+0 == -0;              // true    — == (and ===) treat +0 and -0 as equal
Object.is(+0, -0);     // false   — the one check that tells them apart
```

## `null` and `undefined`: their own bubble

Bypasses every other rule. Loosely equal only to **each other**:

```js
null == undefined;   // true   — the one and only pair
null == 0;             // false
null == false;         // false
undefined == 0;          // false
```

:::warning
`null`/`undefined` do **not** fall into the number/string/boolean rules below — the spec special-cases this pair first. This is why `x == null` is the idiomatic check for "is `x` null or undefined?"
:::

## The coercion rules, in order

Labeled **R1**, **R2**, **R4** here (R3 skipped — a `BigInt`-vs-string spec step rarely relevant; numbering is a teaching aid, not literal spec clauses):

**R1 — a boolean is involved:** convert it to a number (`true→1`, `false→0`), re-run.

```js
"1" == true;    // true   — true→1, then "1"==1, then "1"→1 (R2), then 1==1
"0" == false;   // true   — false→0, then "0"==0, then "0"→0 (R2), then 0==0
```

:::warning
`false == ""` and `false == "0"` are **both** `true` — both strings coerce to `0` once the boolean converts first. A very common `== false` bug.
:::

**R2 — string vs. number:** convert the string via `ToNumber`, re-run.

```js
"42" == 42;     // true
"" == 0;         // true
```

**R4 — object vs. primitive:** call `ToPrimitive(hint: 'number')`, re-run (usually falls into R1/R2).

```js
"abc" == new String("abc"); // true  — ToPrimitive unwraps the wrapper to "abc"
null == Object(null);         // false — the null bubble does NOT extend to objects
```

Chained examples:

```js
[] == false;        // true   — [].toString() is "", ToNumber("") is 0, false→0, 0==0
[1] == 1;             // true   — [1].toString() is "1", ToNumber("1") is 1, 1==1
[[], []] == ",";          // true   — [[], []].toString() is ",", comparing two strings directly
```

## "The crazy ones" — explained

| Expression | Result | Explanation |
| --- | --- | --- |
| `[] == ![]` | `true` | `![]` is `false` (array is truthy, negated); then `[] == false` resolves via R4/R1 to `0 == 0` |
| `[] == []` | `false` | same type (object) → behaves like `===`, and they're different references |
| `[] == false` | `true` | `[]` → `""` → `0`; `false` → `0` |
| `{} == {}` | `false` | same type, different references |
| `"0" == null` | `false` | the `null` bubble only matches `undefined` |
| `"0" == undefined` | `false` | same reason |
| `"0" == false` | `true` | `false`→`0`, `"0"`→`0` |
| `"0" == NaN` | `false` | `NaN` never equals anything |
| `NaN == NaN` | `false` | `NaN` is the one value that isn't even equal to itself |
| `+0 == -0` | `true` | `==` (and `===`) treat them equal — only `Object.is` distinguishes them |
| `null == undefined` | `true` | the spec-defined special pair |
| `null == 0` | `false` | the null bubble does **not** coerce to `0` |
| `null >= 0` | `true` | relational comparison coerces `null`→`0` — a **different** algorithm from `==`, see below |

## Non-transitive equality

`==` is **not transitive**:

```js
0 == "";    // true  — ""  → 0
0 == "0";   // true  — "0" → 0
"" == "0";  // false — same type (string), compared directly: not equal
```

Strong argument for `===`: reasoning about chains of `==` is unreliable.

## Never compare directly against `true`/`false`

```js
"2" == true;   // false  — true→1, then "2"==1, then "2"→2, then 2==1 is false
```

`==` never runs `ToBoolean` — "truthiness" of `"2"` is irrelevant; it only converts toward number/string.

## The performance myth

Not generally true that `===` is faster:

- Same type on both sides → `==` and `===` do **identical** work.
- `===` only "saves" the coercion `==` would've triggered on a type mismatch — usually negligible.

Prefer `===` for **clarity of intent**, not speed.

## When `==` is actually safe

Checking for `null` or `undefined` together:

```js
function greet(name) {
  if (name == null) { // true for both null and undefined
    name = "friend";
  }
  return `Hi, ${name}!`;
}
```

More concise than `x === null || x === undefined`, without sacrificing correctness.

### YDKJS's rule of thumb for avoiding `==`

1. **Either side can be `true`/`false`** → don't use `==` (booleans numify first; see `false == ""` above).
2. **Either side can be `[]`, `""`, or `0`** → avoid `==` (these coerce into each other and into `false`).
3. **Otherwise** — known-type primitives, or deliberate string/number comparison — `==` is safe.

Danger zones: booleans, empty-ish values, objects. Know those three, and `==` stops being scary.

## Key takeaways

- `==` coerces, `===` doesn't; both are otherwise identical, and `==` is symmetric.
- `null`/`undefined` form their own bubble: equal to each other and **nothing** else under `==`.
- R1 (boolean→number), R2 (string↔number), R4 (object→primitive) explain every `==` result.
- `==` is **not transitive**: `0 == ""` and `0 == "0"` are both true, but `"" == "0"` is false.
- `===` isn't meaningfully faster when types match; prefer it for **clarity**.
- The one genuinely idiomatic use of `==` is `x == null`.

### Interview questions

1. Why `null == 0` is `false` but `null >= 0` is `true`? → different algorithms; `==`'s null/undefined bubble never coerces to `0`, relational comparison does. (See [Relational Comparison](./relational-comparison-and-quick-reference.md).)
2. Why is `[] == false` `true`? → `[]`→`""`(ToPrimitive)→`0`(ToNumber); `false`→`0`; `0==0`.
3. Example proving `==` isn't transitive? → `0 == ""` and `0 == "0"` are true, but `"" == "0"` is false.
4. Why is `"2" == true` `false`? → `true`→`1`, then `"2"`→`2`; `2==1` is false (people expect true via "truthiness," which `==` never checks).
5. When is `==` fine in production? → `x == null` to check null-or-undefined.

See also: [Implicit Coercion](./implicit-coercion.md), [`null`, `undefined` & `NaN`](../01-basics/null-undefined-nan.md).
