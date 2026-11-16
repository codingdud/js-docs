---
title: "Basic Types, Inference and Assertions"
sidebar_position: 1
---

TypeScript adds a type system on top of JavaScript. It does not change how the code runs — every type annotation is erased before the code reaches a JS engine — but it catches a large class of bugs while you write the code, instead of after it runs. This page covers the primitive and structural types TypeScript ships with, how it infers types without annotations, how `as` and `!` let you override its checks, and the single most important safety distinction in the language: `any` versus `unknown`.

## The type list

```ts
let isDone: boolean = false;
let age: number = 25;                 // int, float, hex, binary all share the `number` type
let username: string = "Alice";
let list: number[] = [1, 2, 3];       // same as `Array<number>`
let pair: [string, number] = ["hi", 1]; // tuple — fixed length, fixed per-slot types

let notSure: any = 4;        // opts OUT of type checking entirely
let safer: unknown = 4;      // type-safe counterpart to `any`
let n: null = null;
let u: undefined = undefined;
let sym: symbol = Symbol("key");

function log(): void {}                       // returns nothing useful
function fail(): never { throw new Error(); }  // never completes normally
```

| Type | Meaning |
|---|---|
| `boolean`, `number`, `string` | The three JS primitives, typed |
| `T[]` / `Array<T>` | An array of `T` — both spellings are equivalent |
| `[A, B]` (tuple) | A fixed-length array where each position has its own type |
| `any` | Opts out of type checking; anything is assignable to and from it |
| `unknown` | The type-safe counterpart to `any` — assignable *to*, but must be narrowed before you can use it |
| `null`, `undefined` | Their own types; under `strictNullChecks` they are not part of every other type |
| `void` | The return type of a function that returns nothing useful (as opposed to literally returning `undefined` on purpose) |
| `never` | The type of a function that never returns at all — it always throws, loops forever, or calls `process.exit` |
| `symbol` | A unique, immutable primitive value |

:::tip
`void` and `never` are often confused. `void` means "this function does not return a useful value" — it still returns, just with nothing meaningful. `never` means "this function cannot complete normally" at all — every code path throws or loops forever. A function typed `(): never` is a strong signal to callers that control flow stops here.
:::

## Inference, literal types, unions and assertions

TypeScript infers a type from the value you assign, so you rarely need to annotate every variable:

```ts
// Explicit annotation
let score: number = 100;

// Inference — TypeScript infers `string` from the initializer
let message = "hello";

// const narrows further, to a literal type
const userStatus = "active"; // type is the literal "active", not the wider `string`
// let userStatus2 = "active";  // type would be `string` — `let` can be reassigned, so TS widens it

// Union type — the variable can hold either type
let id: string | number = "abc";
id = 42; // also valid

// Type assertion — "I know more than you do here"
let input = getInput() as string;

// Non-null assertion — "I know this isn't null/undefined"
let el = document.getElementById("app")!;
```

The `const`-narrows-to-literal-type behavior matters because it is what makes [discriminated unions](./generics-enums-unions.md) work: a `const kind = "circle"` carries the specific string `"circle"` as its type, not the general `string`, so TypeScript can use it to pick which branch of a union you're in.

:::warning
`as` and `!` both silence the compiler without changing anything at runtime. `as` tells TypeScript "trust me, treat this value as type X" — if you're wrong, you get no error until something explodes later. `!` (non-null assertion) tells TypeScript "this is never `null` or `undefined` here" — if that's false, you get a runtime `TypeError` at the first property access, with no compile-time warning. Both are escape hatches, not proof. Prefer narrowing (see [Type Guards, Narrowing, Modules and Decorators](./narrowing-modules-decorators.md)) wherever you can, and reserve `as`/`!` for the cases where you genuinely have information the compiler can't infer — e.g. you just checked `document.getElementById` returns non-null a line above.
:::

## `any` vs `unknown`: unsafe opt-out vs safe narrowing

This is one of the most commonly asked TypeScript interview questions, usually posed as two back-to-back snippets.

**Why is this unsafe?**

```ts
let value: any = "JS";
value.toUpperCase(); // compiles fine, no error

// But `any` disables checking entirely, so this also "compiles fine":
let value2: any = 42;
value2.toUpperCase(); // compiles — and then throws at runtime:
// TypeError: value2.toUpperCase is not a function
```

`any` is not "the type is unknown and TypeScript will figure it out" — it is "stop type-checking this value altogether." Every property access and method call on an `any` is accepted at compile time, whether or not it would actually exist on the real runtime value. The bug above is invisible until the line actually executes.

**How do you fix it properly?**

```ts
let value: unknown = "JS";
// value.toUpperCase();
// Error: Object is of type 'unknown'.

// unknown forces you to narrow before you can use the value:
if (typeof value === "string") {
  value.toUpperCase(); // OK — TypeScript knows `value` is a string here
}
```

`unknown` accepts any value (just like `any`), but it does not let you *do* anything with that value until you've proven what it is — via `typeof`, `instanceof`, a user-defined type guard, or an assertion. It is the type you should reach for whenever a value's shape genuinely isn't known yet, such as data just parsed from JSON or returned by an external API — see [Type Guards, Narrowing, Modules and Decorators](./narrowing-modules-decorators.md) for the full set of narrowing techniques.

| | `any` | `unknown` |
|---|---|---|
| Accepts any value | Yes | Yes |
| Can call methods / access properties immediately | Yes — unchecked | No — must narrow first |
| Disables type checking for that value | Yes | No — checking stays on, just deferred until narrowed |
| Right choice for | Legacy migration code, deliberate opt-out | Values of genuinely unknown shape (API responses, `JSON.parse`) |

## Worked example: a typed `addTwo`

A minimal but complete example of parameter types and a return type working together:

```ts
function addTwo(a: number, b: number): number {
  return a + b;
}

console.log(addTwo(10, 12)); // 22

// addTwo("10", 12); // Error: Argument of type 'string' is not assignable to parameter of type 'number'.
```

Without the `: number` annotations, calling `addTwo("10", 12)` would silently return the string `"1012"` at runtime (JavaScript's `+` operator concatenates when either operand is a string — see [Implicit Coercion](../02-types-and-coercion/implicit-coercion.md)). With the annotations, that call is rejected before the code ever runs.

## Key takeaways

- TypeScript's basic types cover the JS primitives plus `array`, `tuple`, `any`, `unknown`, `void`, `never`, and `symbol`; all type information is erased at compile time and has zero runtime cost.
- TypeScript infers types from initializers; `let` widens a literal to its general type, while `const` keeps the narrower literal type.
- `as` performs a type assertion and `!` performs a non-null assertion — both override the compiler without any runtime check, so a wrong assertion fails later, at the point of use, not where the assertion is written.
- `any` disables type checking for a value entirely, so unsafe operations compile and only fail at runtime; `unknown` keeps checking on and forces you to narrow the value before using it.

## Interview questions

1. **Why is `let value: any = "JS"; value.toUpperCase();` considered unsafe, even though it compiles?** Because `any` turns off type checking for that value completely — any property or method access on it is accepted at compile time regardless of what the value actually is at runtime, so a mismatch (e.g. the value really being a number) only surfaces as a runtime `TypeError`.
2. **How do you fix `let value: unknown = "JS"; value.toUpperCase();` properly?** Narrow the `unknown` value before using it — e.g. `if (typeof value === "string") { value.toUpperCase(); }` — so TypeScript can prove the value is a string at that point.
3. **What's the difference between `void` and `never` as return types?** `void` means the function returns, just with no meaningful value; `never` means the function cannot complete normally at all (it always throws, loops forever, or never returns control).
4. **Why does `const userStatus = "active"` have a narrower type than `let userStatus = "active"`?** `const` can never be reassigned, so TypeScript keeps the exact literal type `"active"`; `let` could later be assigned any other `string`, so TypeScript widens its inferred type to the general `string`.
5. **What's the risk of the non-null assertion operator (`!`)?** It tells the compiler "this is never `null`/`undefined` here" without any runtime check — if that assumption is wrong, the code compiles cleanly but throws a `TypeError` at runtime the first time the value is actually used.
