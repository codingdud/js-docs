---
title: "call, apply and bind"
sidebar_position: 7
---

# `call`, `apply` and `bind`

The explicit-binding tools from [The `this` Keyword](./this-keyword.md#3-explicit-binding-call-apply-bind): set `this` for a call directly, instead of relying on how a function is attached to an object. Live on `Function.prototype`.

## Setup used throughout this page

```js
const Person = { firstname: "Animesh", lastname: "kumar" };

function printName(home, town) {
  console.log(this.firstname + " " + this.lastname + " " + home + "," + town);
}

const Person2 = { firstname: "sachine", lastname: "tendukar" };
```

`printName` belongs to neither object — whoever supplies `this` decides whose name prints.

## `call` — invoke now, arguments comma-separated

```js
printName.call(Person2, "home", "town");
// "sachine tendukar home,town"
```

Invokes immediately; first argument becomes `this`, the rest are passed through individually.

## `apply` — invoke now, arguments as an array

```js
printName.apply(Person, ["home", "town"]);
// "Animesh kumar home,town"
```

Identical to `call`, except remaining arguments are a single array that `apply` spreads out.

## `bind` — don't call it, return a new function

```js
const greetAsPerson2 = printName.bind(Person2);
greetAsPerson2("home1", "town1");
// "sachine tendukar home1,town1"
```

Doesn't call the function — returns a new one with `this` permanently locked, callable later, any number of times. Also supports **partial application**: extra arguments to `bind` are pre-filled.

```js
const greetWithHomeTown = printName.bind(Person2, "home", "town");
greetWithHomeTown();
// "sachine tendukar home,town"
```

### Side-by-side

| Method | Calls now? | `this` | Remaining args | Returns |
| --- | --- | --- | --- | --- |
| `call(thisArg, a, b, ...)` | Yes | `thisArg` | Comma-separated | Return value |
| `apply(thisArg, [a, b, ...])` | Yes | `thisArg` | Single array | Return value |
| `bind(thisArg, a, b, ...)` | No | `thisArg`, permanent | Pre-filled | New bound function |

### Mnemonic

> **A**pply = **A**rray. **C**all = **C**ommas. `bind` doesn't call anything.

## Function borrowing

Any object can be supplied as `this`, so you can "borrow" a method for an unrelated object, as long as it has the properties the method expects:

```js
const user = { firstname: "Grace", lastname: "Hopper" };
printName.call(user, "home", "town"); // "Grace Hopper home,town"
```

Same mechanism as borrowing `Array.prototype` methods for array-likes (`Array.prototype.slice.call(arguments)`, now superseded by `Array.from`/rest params — see [rest parameters vs. arguments](./function-types-and-parameters.md#rest-parameters-vs-the-arguments-object)).

## Arrow functions ignore call, apply and bind

An arrow function has no own `this` (see [Arrow Functions and Lexical `this`](./arrow-functions-and-this.md)) — passing a `thisArg` to `call`/`apply`/`bind` has **no effect** on it; only non-`this` arguments are used.

```js
const arrow = () => console.log(this);
arrow.call({ id: 1 }); // this is still the surrounding scope's this - NOT { id: 1 }
```

## When to use `bind`

- **Passing a method as a callback**: `button.addEventListener("click", obj.method.bind(obj))`.
- **Binding once in a constructor**, giving each instance a ready-to-use bound method (see the `Car`/`sayBye` example in [The `this` Keyword](./this-keyword.md#unbound-vs-bound-methods-the-carbird-example)).
- **Partial application** — pre-fill arguments for repeated calls (`printName.bind(Person2, "home", "town")`).

For a one-off call, `call`/`apply` is simpler.

## Writing your own: `mycall`, `myapply`, `mybind`

Common exercise — forces understanding the mechanism. See [`call`/`apply`/`bind` Polyfills](../12-polyfills-and-utilities/call-apply-bind-polyfills.md) for full, correct implementations.

```js
Function.prototype.mybind = function (...boundArgs) {
  const originalFn = this;
  return (...callArgs) => {
    return originalFn.call(...boundArgs, ...callArgs);
  };
};

printName.mybind(Person2)("home1", "town1");
// "sachine tendukar home1,town1"
```

`mybind` captures `this` (`printName`) and `boundArgs` (`[Person2]`); the returned arrow calls `printName.call(Person2, "home1", "town1")` — same as native `bind`.

:::warning This simple mybind has real limitations
- **No `new` support** — native `bind` detects a `new` call on the result and swaps in the new object as `this`; this version returns an arrow function, which can never be used with `new` (`TypeError: ... is not a constructor`).
- **Always forwards through `.call`**, inheriting its limitations.

See the polyfills chapter for a version handling `new` correctly.
:::

## Key takeaways

- `call`/`apply` invoke immediately with explicit `this`; `bind` returns a new function with `this` locked for later use.
- `call` takes comma-separated args; `apply` takes an array ("Apply = Array, Call = Commas").
- `bind` supports partial application: pre-filled args ahead of the ones supplied at call time.
- Function borrowing works because these methods only care about the supplied `this` object's properties, not its original attachment.
- Arrow functions ignore the `thisArg` passed to `call`/`apply`/`bind` — their `this` is fixed lexically.
- Use `bind` for a stable, reusable reference; `call`/`apply` for one-off invocations.

## Interview questions

1. **Core difference between `call` and `apply`?** Both invoke immediately with explicit `this`; `call` takes args individually, `apply` takes an array.
2. **Core difference between `bind` and the other two?** `bind` doesn't call the function — returns a new function with `this` fixed, called later.
3. **Why doesn't `arrowFn.call(someObject)` change `this` inside it?** Arrow functions resolve `this` lexically; the `thisArg` is ignored.
4. **What is "function borrowing"?** Calling one object's method with a different object as `this`, via `call`/`apply`/`bind`.
5. **Why isn't a naive arrow-based `mybind` a complete polyfill?** It can't support `new` — an arrow function can never be used as a constructor.
