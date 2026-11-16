---
title: "Functions, Classes and Access Modifiers"
sidebar_position: 2
---

TypeScript lets you describe a function's contract — its parameters and return value — as precisely as an object's shape. The same discipline extends to classes: access modifiers (`public`, `private`, `protected`, `readonly`) let you declare, at compile time, exactly which parts of an object the outside world is allowed to touch. This page works through both, then covers the one modifier that is also enforced at *runtime*: the native `#private` field.

## Function typing: optional, default and rest parameters, overloads

```ts
// Typed parameters + return type
function add(a: number, b: number): number {
  return a + b;
}

// Optional parameter (?) — may be omitted, type becomes `string | undefined`
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name;
}

// Default parameter — supplies a fallback, so the caller may omit it
function connect(host: string, port: number = 3000): void {}

// Rest parameters — collects the remaining arguments into a typed array
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

// A function type alias — describes the shape of a function value
type StringTransformer = (input: string) => string;

const shout: StringTransformer = (input) => input.toUpperCase();

// Overloads — multiple call signatures for one implementation
function parse(x: string): number;
function parse(x: number): string;
function parse(x: any): any {
  return typeof x === "string" ? Number(x) : String(x);
}

parse("42"); // typed as number
parse(42);   // typed as string
```

| | Optional (`name?: T`) | Default (`name: T = v`) |
|---|---|---|
| Can the caller omit it? | Yes | Yes |
| Value when omitted | `undefined` | The default expression's value |
| Type inside the function | `T \| undefined` | `T` |

:::tip
With overloads, every signature above the implementation is a contract the *caller* sees; the final, implementation signature is never visible outside the function and must be broad enough (often `any`) to satisfy every overload it implements. Calling `parse` with anything other than `string` or `number` is a compile error, even though the implementation itself would technically run for other inputs.
:::

## Classes: modifiers, constructor shorthand, inheritance

```ts
class BankAccount {
  public owner: string;            // accessible everywhere (the default if omitted)
  private balance: number;         // only inside BankAccount
  protected txHistory: string[];   // BankAccount and its subclasses
  readonly accountId: string;      // assignable once, then locked

  constructor(owner: string, accountId: string) {
    this.owner = owner;
    this.accountId = accountId;
    this.balance = 0;
    this.txHistory = [];
  }

  deposit(amount: number): void {
    this.balance += amount;        // OK — inside the declaring class
    this.txHistory.push(`deposit:${amount}`);
  }

  getBalance(): number {
    return this.balance;
  }
}

class SavingsAccount extends BankAccount {
  constructor(owner: string, accountId: string, public interestRate: number) {
    super(owner, accountId);
  }

  history(): string[] {
    return this.txHistory; // OK — protected is visible to subclasses
  }

  // this.balance;  // Error: Property 'balance' is private and only accessible within class 'BankAccount'.
}

const acc = new SavingsAccount("Priya", "ACC-01", 0.02);
acc.deposit(500);
console.log(acc.getBalance());   // 500
console.log(acc.history());      // ["deposit:500"]
```

`SavingsAccount`'s constructor shows **constructor-parameter shorthand**: writing an access modifier directly in front of a constructor parameter (`public interestRate: number`) both declares the property on the class *and* assigns it from the argument, in one line — no separate `this.interestRate = interestRate;` needed.

## TypeScript `private` is compile-time only — `#private` is enforced at runtime

This is one of the most frequently asked distinctions in TypeScript interviews, and it's worth stating precisely:

```ts
class LegacyVault {
  private secret = "hidden";
}

const v = new LegacyVault();
// v.secret;              // Error (TypeScript): Property 'secret' is private...
console.log((v as any).secret); // "hidden" — TypeScript's `private` does NOT exist at runtime;
                                  // it compiles away, so a cast around it reaches the real value.

// ES2022 `#private` fields — enforced by the JavaScript engine itself
class Vault {
  #secret = "hidden";
  reveal() { return this.#secret; }
}

const v2 = new Vault();
// v2.#secret;             // SyntaxError — illegal outside Vault's own class body, caught before the code runs
console.log((v2 as any).secret); // undefined — there's no property named `secret`, # fields don't exist as normal properties at all
console.log(v2.reveal());        // "hidden" — only Vault's own methods can reach it
```

| | TypeScript `private` | JS native `#private` |
|---|---|---|
| Enforced by | The TypeScript compiler, at compile time only | The JavaScript engine, at parse and run time |
| Exists on the compiled object at runtime | Yes — it's a normal property, just not visible to the *type checker* | No — it's a separate internal slot, not an enumerable property |
| Bypassable | Yes — a type assertion (`as any`) or plain JS consumer of the compiled output reaches it | No — not even `as any`, `JSON.stringify`, or `Object.keys` can reach it |
| Shows up in `JSON.stringify` | Yes | No |

:::warning
Compiled TypeScript `private` members are ordinary JavaScript properties once the type annotations are stripped away — the `.js` output has no privacy at all. If you need privacy that survives being consumed as plain JavaScript (by untyped callers, `JSON.stringify`, or a different language's FFI), use `#private` fields, not the `private` keyword. See [Private Fields, Encapsulation and Brand Checks](../06-classes-and-oop/private-fields.md) for the full breakdown of `#private`, including brand checks and why subclasses can't reach a parent's private field.
:::

## Abstract classes vs. interfaces

```ts
abstract class Shape {
  abstract area(): number;              // no body — subclasses MUST implement it
  describe(): string {                  // concrete method — shared implementation
    return `I am a shape with area ${this.area()}`;
  }
}

class Circle extends Shape {
  constructor(private radius: number) { super(); }
  area(): number { return Math.PI * this.radius ** 2; }
}

// const s = new Shape(); // Error: Cannot create an instance of an abstract class.
console.log(new Circle(2).describe()); // "I am a shape with area 12.566370614359172"
```

| | `abstract class` | `interface` |
|---|---|---|
| Can hold implementation (method bodies) | Yes | No — only signatures |
| Can hold constructor logic / state | Yes | No |
| Can be `extend`ed vs `implement`ed | `extends` (single) | `implements` (multiple interfaces allowed) |
| Exists at runtime | Yes — compiles to a real JS class | No — fully erased, zero runtime trace |
| Use when | You want to share real logic across subclasses | You only want to describe a shape/contract, with no shared code |

## Key takeaways

- Optional parameters (`?`) widen the parameter's type to include `undefined`; default parameters keep the narrower type and supply a fallback value instead.
- Function overloads declare several call signatures for callers, backed by one broader implementation signature that is never visible outside the function.
- Constructor-parameter shorthand (`constructor(public x: T)`) declares and assigns a property in a single step.
- TypeScript's `public`/`private`/`protected`/`readonly` are compile-time-only checks — they vanish from the emitted JavaScript, so anything that bypasses the type checker (an `as any` cast, or plain-JS consumers of the compiled output) can still read or write a "private" member.
- `#private` class fields are enforced by the JavaScript engine itself, at both parse time (invalid syntax outside the class is a `SyntaxError`) and runtime, and never show up in `JSON.stringify` or `Object.keys`.
- Abstract classes can hold real implementation and shared state; interfaces are pure contracts, erased entirely at compile time.

## Interview questions

1. **Is TypeScript's `private` keyword enforced at runtime?** No. It's a compile-time-only check — the emitted JavaScript has no concept of it, so the member is a normal, readable property once compiled; a type assertion or plain-JS caller can bypass the restriction entirely.
2. **How is `#private` different from TypeScript's `private`?** `#private` is a JavaScript language feature enforced by the engine: referencing `#x` outside the declaring class is a `SyntaxError` caught before the code runs, and the field never appears via `JSON.stringify`, `Object.keys`, or any other reflection that a compiled-away `private` property would still expose.
3. **What does constructor-parameter shorthand do?** Writing `constructor(public name: string)` both declares `name` as a property on the class and assigns it from the constructor argument, replacing a separate declaration plus a `this.name = name;` assignment.
4. **When would you use an abstract class instead of an interface?** When subclasses should share real implementation or state, not just a contract — abstract classes can hold concrete methods and constructor logic; interfaces are erased entirely and can only describe a shape.
5. **What's the difference between optional and default parameters?** An optional parameter (`name?: T`) may be omitted and becomes `undefined` if it is; a default parameter (`name: T = v`) may also be omitted, but the function body always sees a concrete `T` value, filled in from the default expression.
