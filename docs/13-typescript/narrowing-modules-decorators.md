---
title: "Type Guards, Narrowing, Modules and Decorators"
sidebar_position: 5
---

Narrowing is how TypeScript turns a broad type (a union, `unknown`, an optional value) into a specific one, by watching the checks your code already performs. This page covers every narrowing technique TypeScript recognizes, how modules structure code across files, and how decorators attach behavior to classes and methods at the language level — including the version split between the legacy `experimentalDecorators` flag and the Stage 3 decorators TypeScript 5 shipped.

## Type guards: `typeof`, `instanceof`, `in`, and user-defined predicates

```ts
// typeof guard — primitives
function formatValue(val: string | number) {
  if (typeof val === "string") {
    return val.toUpperCase();
  }
  return val.toFixed(2);
}

// instanceof guard — classes
class NetworkError extends Error {
  constructor(message: string, public endpoint: string) { super(message); }
}
function retry(endpoint: string) { /* ... */ }

function handleError(err: Error) {
  if (err instanceof NetworkError) {
    retry(err.endpoint); // narrowed to NetworkError — .endpoint is visible
  }
}

// in guard — checks property existence on a union of object shapes
type Circle = { kind: "circle"; radius: number };
type Rectangle = { kind: "rectangle"; width: number; height: number };

function area(shape: Circle | Rectangle) {
  if ("radius" in shape) {
    return Math.PI * shape.radius ** 2; // narrowed to Circle
  }
  return shape.width * shape.height;    // narrowed to Rectangle
}

// User-defined type guard — a predicate using the `is` keyword
function isString(val: unknown): val is string {
  return typeof val === "string";
}

function handleInput(input: unknown) {
  if (isString(input)) {
    input.toLowerCase(); // TS knows: input is string, here and nowhere else
  }
}
```

:::tip
A user-defined type guard only narrows **inside the block where you call it directly** — the `is` return type is what carries the narrowing out of the guard function and into the caller's control flow. Without `val is string` (i.e. just returning a plain `boolean`), TypeScript would not narrow `input` after the `if`, even though the runtime check is identical. This matters most when validating `unknown` values from an API response or `JSON.parse` (see [Basic Types, Inference and Assertions](./basic-types.md) for why `unknown` is the right type for those values in the first place).
:::

## Narrowing by equality and discriminant, and exhaustiveness checks

```ts
// Truthiness narrowing
function printName(name?: string) {
  if (name) {
    console.log(name.toUpperCase()); // string here — undefined and "" are excluded
  }
}

// Equality narrowing — comparing two unions can narrow BOTH sides
function compare(a: string | number, b: string | boolean) {
  if (a === b) {
    a.toUpperCase(); // only `string` is common to both unions, so TS narrows a (and b) to string
  }
}

// Discriminant narrowing — a shared literal field decides the branch
type Result = { ok: true; value: number } | { ok: false; error: string };

function handle(r: Result) {
  if (r.ok) { return r.value; }  // narrowed to { ok: true; value: number }
  return r.error;                // narrowed to { ok: false; error: string }
}

// Exhaustiveness check with `never`
type Shape = { kind: "circle"; radius: number } | { kind: "square"; side: number };

function assertNever(x: never): never {
  throw new Error("Unhandled case: " + x);
}

function areaOf(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "square": return s.side ** 2;
    default: return assertNever(s); // if a new Shape variant is added, this line fails to compile
  }
}
```

:::tip
The `assertNever` pattern is the standard way to make a union "safe to evolve." If you later add a third variant to `Shape` (say, `{ kind: "triangle"; ... }`) but forget to add a matching `case` in `areaOf`, the `default` branch's `s` will no longer be of type `never` — it'll still contain the `"triangle"` variant — and the call to `assertNever(s)` fails to compile. This turns a forgotten switch case into a build error instead of a runtime bug.
:::

## Modules: export/import forms, `import type`, dynamic `import()`, namespaces

Any file with a top-level `import` or `export` is treated as its own isolated module scope.

```ts
// math.ts
export const PI = 3.14;
export function add(a: number, b: number) {
  return a + b;
}
export default class Calculator {}
export type { ApiResponseShape };
```

```ts
// consumer.ts
import { PI, add } from "./math";
import Calculator from "./math";          // default export
import * as MathUtils from "./math";      // namespace import — everything under one object
MathUtils.add(1, 2);

import type { ApiResponseShape } from "./math"; // type-only import — zero runtime footprint

const mod = await import("./heavy");       // dynamic import — loaded on demand, enables code-splitting
```

| Form | What it does |
|---|---|
| `export const x = ...` / `export function f() {}` | Named export — importers must use the same name (or alias it with `as`) |
| `export default ...` | One default export per module — imported without braces, any local name |
| `export * as Ns from "./m"` / `import * as Ns from "./m"` | Groups every export of a module under one namespace object |
| `import type { X } from "./m"` | Imports only the type, never the value — guaranteed to be erased, zero runtime cost |
| `const m = await import("./m")` | Dynamic import — loads the module lazily at runtime, used for code-splitting in bundlers like webpack and Vite |

```ts
// Namespaces — mostly legacy / ambient-declaration use today
namespace Validation {
  export interface StringValidator {
    isValid(s: string): boolean;
  }
  export class EmailValidator implements StringValidator {
    isValid(s: string) { return s.includes("@"); }
  }
}

const v = new Validation.EmailValidator();
console.log(v.isValid("a@b.com")); // true
```

:::note
In modern TypeScript, prefer ES modules (`import`/`export`) over `namespace`. Namespaces predate ES modules and are mostly relevant today for legacy codebases and ambient declaration files (`.d.ts`) that describe globals which aren't modules at all. `import type` is worth using deliberately whenever you only need a type, not a value — it guarantees the import is stripped entirely from the compiled output.
:::

## Decorators: method decorators, class decorators, and the two decorator systems

```ts
// tsconfig.json: "experimentalDecorators": true  (legacy decorators, Stage 2 proposal)

function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${key} with`, args);
    const result = original.apply(this, args);
    console.log("Result:", result);
    return result;
  };
  return descriptor;
}

class Calculator {
  @Log
  add(a: number, b: number): number {
    return a + b;
  }
}

new Calculator().add(2, 3);
// Calling add with [2, 3]
// Result: 5

// Class decorator
function Sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@Sealed
class Config {
  value = 1;
}
```

| Decorator kind | Target | Common use |
|---|---|---|
| Class decorator | The constructor function | Freezing/sealing a class, dependency-injection registration (`@Injectable`) |
| Method decorator | A method's property descriptor | Logging, memoization, authorization checks |
| Property decorator | A property declaration | Validation, default-value injection |
| Parameter decorator | A single constructor/method parameter | Dependency injection (marking *which* parameter to inject) |
| Accessor decorator | A getter/setter pair | Wrapping get/set behavior |

:::warning
There are **two different decorator systems** in TypeScript, and they are not source-compatible:

- **Legacy "experimental" decorators** (`experimentalDecorators: true` in `tsconfig.json`) — based on an older, Stage 2 TC39 proposal. This is what the `@Log`/`@Sealed` examples above use, and it's what Angular and NestJS are both built on.
- **TypeScript 5.0+ "Stage 3" decorators** — based on the TC39 proposal that actually reached Stage 3 and is on track to become standard JavaScript. These use a different call signature for decorator functions and do **not** require `experimentalDecorators`.

A decorator function written for one system will not work correctly under the other — the function receives different arguments in each. Framework code (Angular's `@Component`/`@Injectable`, NestJS's `@Controller`/`@Get`) is currently written against the legacy system, so most real-world codebases still set `experimentalDecorators: true` rather than opting into the newer standard.
:::

## Key takeaways

- TypeScript recognizes four built-in narrowing techniques — `typeof`, `instanceof`, `in` — plus user-defined predicates written with the `is` keyword; only the `is` return type carries narrowing out of a helper function into the caller.
- Equality narrowing can narrow both sides of a comparison to whatever types they have in common; discriminant narrowing uses a shared literal field (like `kind` or `ok`) to pick a branch of a union.
- The `assertNever` pattern turns "I forgot to handle a new union variant" into a compile error, by requiring the unhandled branch's value to be assignable to `never`.
- `import type` and dynamic `import()` exist for different reasons: `import type` guarantees zero runtime cost for a type-only import, while dynamic `import()` is a runtime, lazy-loading mechanism used for code-splitting.
- Namespaces predate ES modules and are mostly reserved today for legacy code and ambient `.d.ts` declarations.
- There are two incompatible decorator systems in TypeScript: legacy `experimentalDecorators` (what Angular and NestJS use today) and the newer Stage 3 decorators shipped in TypeScript 5 — a decorator written for one does not work under the other.

## Interview questions

1. **Why doesn't a plain boolean-returning helper narrow a union the way `isString(val): val is string` does?** Only the `is Type` return-type annotation tells TypeScript "if this function returns `true`, the argument is actually of this narrower type" — a plain `boolean` return gives TypeScript no way to connect the function's result back to the parameter's type in the caller's control flow.
2. **What does the `assertNever` pattern protect against?** It makes a `switch`/`if` chain over a union exhaustive at compile time: the `default`/`else` branch's value is typed `never` only if every variant was already handled, so adding a new variant to the union without adding a matching case fails to compile at the `assertNever(x)` call.
3. **What's the practical difference between `import type { X }` and a regular `import { X }`?** `import type` is guaranteed to be fully erased from the compiled output since it can only ever refer to a type, never a value; a regular import may or may not be erased depending on whether `X` turns out to be used as a value anywhere.
4. **When would you use dynamic `import()` instead of a static `import` statement?** When you want to load a module lazily, at runtime, typically to split a bundle into smaller chunks — e.g. loading a heavy library only when a specific route or feature is actually used.
5. **Why can't you mix legacy `experimentalDecorators` decorator functions with TypeScript 5's Stage 3 decorators?** The two systems pass different arguments to a decorator function under the hood (different call signatures), so a decorator written for one proposal receives the wrong shape of arguments under the other and will not behave correctly; this is also why frameworks like Angular and NestJS, built against the legacy system, still require `experimentalDecorators: true`.
