---
title: "Generics, Enums, Unions and Intersections"
sidebar_position: 4
---

Generics let a function, interface, or class stay reusable across many types without losing type information the way `any` does. Enums give a name to a fixed set of related constants. Unions and intersections let you combine existing types into new ones — "this OR that" and "this AND that" respectively. This page covers all four, plus the discriminated-union pattern that ties narrowing (see [Type Guards, Narrowing, Modules and Decorators](./narrowing-modules-decorators.md)) and unions together.

## Generics: reusable, type-safe code

```ts
// Generic function — T is a type parameter, filled in per call
function identity<T>(arg: T): T {
  return arg;
}
identity<string>("hello"); // T explicitly set to string
identity(42);              // T inferred as number — no annotation needed

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

const res: ApiResponse<{ id: number }> = {
  data: { id: 1 },
  status: 200,
  message: "OK",
};

// Generic constraint — T must have a `.length`
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength("hello");     // 5 — string has .length
getLength([1, 2, 3]);   // 3 — array has .length
// getLength(42);        // Error: number doesn't have a .length property

// Multiple type params + keyof — K is constrained to T's own keys
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: "Ada" };
getProperty(user, "name"); // "Ada", typed as string
// getProperty(user, "age"); // Error: 'age' is not a key of `user`

// Generic class
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}

const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2
```

:::tip
The key difference from `any`: `any` throws away the relationship between what you pass in and what you get out. Generics *preserve* that relationship — `identity<string>("hello")` is known to return a `string`, and `getProperty(user, "name")` is known to return exactly the type of `user.name`, not some generic fallback. The pattern `K extends keyof T` is especially common: it restricts `key` to only the property names that actually exist on `T`, so a typo like `"age"` on an object that has no `age` property is caught at compile time.
:::

## Enums: numeric, string, and const

```ts
// Numeric enum — auto-increments from 0 unless given explicit values
enum Direction { Up, Down, Left, Right }
// Direction.Up === 0, Direction.Down === 1, Direction.Left === 2, Direction.Right === 3

// String enum — explicit values, generally easier to debug
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}

// Const enum — inlined at compile time, no object is emitted to JS at all
const enum Color { Red, Green, Blue }
let c = Color.Red; // compiles down to: let c = 0;

function move(dir: Direction) {
  if (dir === Direction.Up) { /* ... */ }
}

console.log(Direction[0]); // "Up" — numeric enums get a reverse mapping for free
// console.log(Status["ACTIVE"]); // undefined — string enums do NOT get a reverse mapping
```

| Enum kind | Reverse mapping (`Enum[0]` → name) | Emitted as a real JS object | Notes |
|---|---|---|---|
| Numeric | Yes | Yes | Values auto-increment from `0` unless given explicitly |
| String | No | Yes | Clearer when logged/debugged than a numeric value |
| `const enum` | N/A (inlined) | No — fully erased, values are substituted directly | Zero runtime cost, but can't be used across module boundaries under `isolatedModules` (a common bundler/`ts-jest` restriction) |

:::warning
`const enum` is the one TypeScript feature that doesn't survive certain build setups cleanly — bundlers and transpile-only tools that process one file at a time (anything running with `isolatedModules: true`, which includes most `ts-jest`/Babel/esbuild pipelines) can't inline a `const enum` imported from another file, because they never see that file's declaration. Many teams sidestep the whole issue by using an `as const` object instead, which gives similar ergonomics with no cross-file restriction:

```ts
const ColorConst = { Red: 0, Green: 1, Blue: 2 } as const;
type ColorConst = (typeof ColorConst)[keyof typeof ColorConst]; // 0 | 1 | 2
```
:::

## Union and intersection types

```ts
// Basic union — "this OR that"
type StringOrNumber = string | number;

// Literal union — restricts to specific string values
type Direction2 = "north" | "south" | "east" | "west";

// Discriminated union — a shared literal field ("kind") lets TS narrow exhaustively
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":    return Math.PI * s.radius ** 2;
    case "rectangle": return s.width * s.height;
  }
}

area({ kind: "circle", radius: 2 });              // 12.566370614359172
area({ kind: "rectangle", width: 3, height: 4 });  // 12

// Intersection — "this AND that": the value must satisfy every constituent type
type Serializable = { serialize(): string };
type Printable = { print(): void };
type Doc = Serializable & Printable;

const doc: Doc = {
  serialize() { return "{}"; },
  print() { console.log(this.serialize()); },
};

// A common real-world intersection: merging a base type with metadata
type WithId<T> = T & { id: string; createdAt: Date };

type UserWithId = WithId<{ name: string }>;
const u: UserWithId = { name: "Ada", id: "u1", createdAt: new Date() };

// Intersecting two incompatible primitives — no value can satisfy both at once
type Impossible = string & number; // resolves to `never`
```

| | Union (`A \| B`) | Intersection (`A & B`) |
|---|---|---|
| Meaning | "Either A or B" | "Both A and B at once" |
| Member access before narrowing | Only members common to **every** branch | All members of **every** constituent type |
| Composing two incompatible primitives | Valid — `string \| number` is a normal type | `string & number` resolves to `never` — no value can be both at once |

## Key takeaways

- Generics preserve the type relationship between a function's/class's inputs and outputs, unlike `any`, which erases it entirely.
- `K extends keyof T` is the standard pattern for constraining a generic parameter to only the actual property names of another generic parameter.
- Numeric enums get an automatic reverse mapping (`Enum[0]` → name); string enums do not.
- `const enum` is inlined at compile time with zero runtime object, but breaks under `isolatedModules`-style build pipelines when imported across files — many teams use `as const` objects instead.
- Discriminated unions (a shared literal field like `kind`) are the standard pattern for safely modeling "one of several shapes," and pair with exhaustiveness checking (see [Type Guards, Narrowing, Modules and Decorators](./narrowing-modules-decorators.md)).
- Union means "OR," intersection means "AND" — intersecting two incompatible primitive types (like `string & number`) resolves to `never`, since no value can satisfy both simultaneously.

## Interview questions

1. **How do generics differ from using `any` for a reusable function?** `any` discards all type information, so the input and output are each independently untyped; generics keep a named type parameter linked through the function, so the return type (and any other generic parameter) stays tied to whatever type was actually passed in.
2. **What does `K extends keyof T` do, and why is it useful?** It constrains the type parameter `K` to only the literal property-name types that exist on `T`, so a function like `getProperty(obj, key)` rejects any key that isn't actually a property of `obj`, at compile time.
3. **What's the difference between a numeric enum and a string enum regarding reverse mapping?** Numeric enums automatically generate a reverse mapping, so `Direction[0]` returns the member name `"Up"`; string enums do not generate one, so indexing a string enum by its value does not give you the member name back.
4. **Why might a team prefer `as const` objects over `const enum`?** `const enum` members are inlined by the compiler and need the whole enum declaration visible at compile time, which breaks when a build tool processes files in isolation (`isolatedModules`) — common with `ts-jest`, Babel, and esbuild. An `as const` object is a normal runtime value with no such restriction, while still giving a narrow literal-union type via `typeof`.
5. **What type does `string & number` resolve to, and why?** `never` — intersection requires a single value to satisfy every constituent type simultaneously, and no value can be both a `string` and a `number` at once, so the type is empty.
