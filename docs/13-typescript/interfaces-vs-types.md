---
title: "Interfaces and Type Aliases"
sidebar_position: 3
---

`interface` and `type` both describe the shape of a value, and for plain object shapes they're often interchangeable. But they're not the same construct: TypeScript uses *structural* typing to decide whether a value matches either one, and `interface` has a capability — declaration merging — that `type` deliberately does not have. This page covers structural typing, `extends`/`implements`, the merging behavior, and the canonical answer to "which one should I use?"

## Structural typing: interfaces describe a shape, not a class

```ts
interface User {
  id: number;
  name: string;
  email?: string;            // optional property
  readonly createdAt: Date;  // cannot be reassigned after construction
  greet(): string;           // method signature
}

// Extending an interface
interface Admin extends User {
  role: string;
}

// A class implementing the interface
class UserImpl implements User {
  id = 1;
  name = "Bob";
  createdAt = new Date();
  greet() { return `Hi, I'm ${this.name}`; }
}

// Structural typing: ANY object with a matching shape satisfies User,
// with no `class` or `implements` keyword involved at all.
const plainUser: User = {
  id: 2,
  name: "Ada",
  createdAt: new Date(),
  greet() { return "Hi, I'm Ada"; },
};
```

TypeScript's type system is structural, not nominal: it never checks *what a value was declared as* — only whether its shape matches. A plain object literal with the right properties and methods satisfies `User` just as well as an instance of a class that explicitly `implements User`.

## Declaration merging (interfaces) vs. duplicate identifiers (type aliases)

A pair of snippets that come up together constantly in interviews, because they look almost identical but behave in opposite ways.

**Why does this work?**

```ts
interface A {
  name: string;
}
interface A {
  age: number;
}

// Both declarations are merged automatically into one interface:
const a: A = { name: "Ada", age: 36 }; // must satisfy BOTH — { name: string; age: number }
```

Two `interface` declarations with the same name, in the same scope, are **merged** by TypeScript into a single interface containing every member from both declarations. This is intentional and is how libraries augment global or third-party types — for example, adding a custom property to `Window` without editing its original declaration.

**Why does this fail?**

```ts
type A = { name: string };
// type A = { age: number }; // Error: Duplicate identifier 'A'.
```

`type` aliases do **not** merge. A `type` is a single, final binding for that identifier in its scope; declaring it twice is treated exactly like redeclaring any other identifier twice (e.g. `const A = 1; const A = 2;`) — a compile error, `Duplicate identifier 'A'`.

| | `interface` | `type` |
|---|---|---|
| Re-declaring the same name in scope | Merges into one combined interface | **Error**: `Duplicate identifier` |
| Used for | Object shapes meant to be extended/augmented | Unions, intersections, tuples, primitives, mapped types, and plain object shapes too |
| Composition keyword | `extends` | `&` (intersection) |
| Can alias a union or primitive | No | Yes — `type ID = string \| number;` |
| Erased at runtime | Yes | Yes |

## `interface` vs `type`, side by side

```ts
// interface
interface Dog {
  name: string;
}
// Declaration merging — adds to the same Dog
interface Dog {
  breed: string;
}
// Extends
interface Poodle extends Dog {}

// type
type DogT = {
  name: string;
};
// Cannot re-declare DogT — would be a Duplicate identifier error.
// More flexible for non-object shapes:
type ID = string | number;
type Pair = [string, number];
type Fn = () => void;
```

- Use **`interface`** when defining object contracts that may need to be extended later or merged with declarations elsewhere — especially for classes and public APIs.
- Use **`type`** for anything that isn't a plain extensible object shape: unions, intersections, tuples, function types, and mapped/utility types.
- Declaration merging works only with `interface`; a repeated `type` with the same name is always a compile error.
- `extends` composes interfaces; `&` (intersection — see [Generics, Enums, Unions and Intersections](./generics-enums-unions.md)) composes types.

:::tip
The canonical interview answer: "Prefer `interface` for object shapes that may be extended or merged later; use `type` for everything else — unions, aliases, utility types, mapped types." Both vanish completely at compile time — neither leaves any trace in the emitted JavaScript.
:::

## Key takeaways

- TypeScript uses structural typing: any object whose shape matches an `interface` or `type` satisfies it, regardless of how (or whether) it was explicitly declared as that type.
- Two `interface` declarations with the same name in the same scope merge into one interface with the combined members — this is intentional and used to augment third-party or global types.
- Two `type` aliases with the same name in the same scope are a compile error (`Duplicate identifier`) — `type` has no merging behavior.
- `interface` composes via `extends`; `type` composes via `&` (intersection).
- Prefer `interface` for extensible object contracts; prefer `type` for unions, tuples, function types, and anything that isn't a plain object shape.

## Interview questions

1. **Why does declaring `interface A { name: string } interface A { age: number }` work, while the equivalent with `type` fails?** Interfaces with the same name in the same scope are merged by TypeScript into one interface with every member combined; `type` aliases are single, final bindings and redeclaring one is a `Duplicate identifier` compile error, the same as redeclaring any other identifier.
2. **What does "structural typing" mean in TypeScript?** A value satisfies a type if its shape matches, regardless of how it was constructed — a plain object literal with the right properties and methods satisfies an interface just as well as a class instance that explicitly `implements` it.
3. **When would you choose `interface` over `type`, and vice versa?** Choose `interface` for object contracts that may be extended or merged later (especially for classes and public APIs); choose `type` for unions, intersections, tuples, function types, and anything that isn't a plain extensible object shape.
4. **How do you compose two interfaces versus two type aliases?** Interfaces compose with `extends` (`interface B extends A {}`); type aliases compose with the intersection operator `&` (`type C = A & B;`).
5. **Are `interface` and `type` declarations present in the compiled JavaScript output?** No — both are purely compile-time constructs and are fully erased; there's no runtime difference between a value typed with an `interface` and one typed with an equivalent `type`.
