---
title: "Mixins"
sidebar_position: 5
---

JavaScript only allows single inheritance — a class can `extends` exactly one other class. Mixins are a pattern for composing behavior from multiple sources without needing (or faking) multiple inheritance. This page covers the two common mixin styles, their failure modes, and correct solutions for the collision problem.

## `Object.assign` mixins — the simple style

The idea: plain objects hold reusable methods, and `Object.assign` copies them onto a target prototype.

```js
const Swimmable = {
  swim() {
    return `${this.name} is swimming`;
  },
  diveDepth(meters) {
    return `${this.name} dives ${meters}m deep`;
  },
};

const Flyable = {
  fly() {
    return `${this.name} is flying`;
  },
  soar(altitude) {
    return `${this.name} soars at ${altitude}m`;
  },
};

class Animal {
  constructor(name) {
    this.name = name;
  }
}

class FlyingFish extends Animal {}

Object.assign(FlyingFish.prototype, Swimmable, Flyable);

const ff = new FlyingFish("Nemo");
console.log(ff.swim());            // "Nemo is swimming"
console.log(ff.fly());             // "Nemo is flying"
console.log(ff instanceof Animal); // true — the real inheritance chain is untouched
```

The mixin methods land on `FlyingFish.prototype` (not on the instance), and — unlike methods written directly inside a `class` body — they are **enumerable**, because `Object.assign` performs an ordinary property copy, which defaults to `enumerable: true`:

```js
console.log(Object.getOwnPropertyDescriptor(FlyingFish.prototype, "swim").enumerable); // true

class Plain {
  method() {}
}
console.log(Object.getOwnPropertyDescriptor(Plain.prototype, "method").enumerable); // false
```

:::warning Shared, mutable mixin objects
`Swimmable` and `Flyable` are plain objects shared by reference. If two unrelated classes mix in the same object and one of them later does `Swimmable.swim = function () { ... }` to "patch" it, **every** class that ever mixed in `Swimmable` is affected, because `Object.assign` copies *references* to the functions, and mutating the source object after the fact changes what future (and even already-copied, if you reassign through the shared object rather than the copy) consumers see. Treat mixin source objects as immutable, read-only templates — never mutate them after writing them.
:::

## Functional mixins — the composable style

`Object.assign` mixins have two real limits: the shared-object mutation risk above, and no support for calling `super` inside a mixin's methods. **Functional mixins** fix both by being a function that takes a base class and returns a brand-new `extends`-ed class:

```js
const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args);
    this.createdAt = new Date().toISOString();
  }
  age() {
    return `Created at ${this.createdAt}`;
  }
};

const Activatable = (Base) => class extends Base {
  #active = false;
  activate()   { this.#active = true; }
  deactivate() { this.#active = false; }
  get isActive() { return this.#active; }
};

class User {
  constructor(name) { this.name = name; }
  toString() { return `User(${this.name})`; }
}

// Compose: User + Timestamped + Activatable
const TimestampedActivatableUser = Activatable(Timestamped(User));

const u = new TimestampedActivatableUser("Alice");
u.activate();

console.log(u.toString());      // "User(Alice)"
console.log(u.isActive);        // true
console.log(u.age());           // "Created at 2024-...T...Z"
console.log(u instanceof User); // true
```

Each call to `Timestamped(User)` or `Activatable(Timestamped(User))` produces a brand-new anonymous class with a real prototype chain — so `super(...)` works normally inside the mixin, and nothing is shared between unrelated compositions the way a plain mixin object is. This is the pattern to prefer whenever a mixin needs to call into the class below it, carry its own private state, or participate in constructor chaining.

### `Serializable` — a worked functional mixin

```js
const Serializable = (Base) => class extends Base {
  toJSON() {
    return { ...this }; // shallow copy of all own enumerable properties
  }
  static fromJSON(data, ...constructorArgs) {
    const instance = new this(...constructorArgs); // `this` = the composed class, not Base
    Object.assign(instance, data);
    return instance;
  }
  serialize() {
    return JSON.stringify(this.toJSON());
  }
};

class Product extends Serializable(class {
  constructor(id) { this.id = id; }
}) {
  constructor(id, name, price) {
    super(id);
    this.name = name;
    this.price = price;
  }
}

const p = new Product(1, "Laptop", 999);
console.log(p.serialize());
// '{"id":1,"name":"Laptop","price":999}'

const p2 = Product.fromJSON({ id: 2, name: "Mouse", price: 25 }, 2);
console.log(p2.serialize());
// '{"id":2,"name":"Mouse","price":25}'
```

`static fromJSON` uses `new this(...)` rather than `new Product(...)` for the same reason static factories do elsewhere in this chapter (see [Static Methods, Properties and Factories](./static-members.md)) — it keeps the mixin correct if it's ever composed onto a different subclass.

## Collisions — the silent danger of `Object.assign` mixins

When two mixin objects define a method with the same name, `Object.assign` applies them left-to-right, so the **last** one silently wins — with no warning:

```js
const LoggerA = {
  log(msg) { console.log(`[A] ${msg}`); },
  id: "A",
};

const LoggerB = {
  log(msg) { console.log(`[B] ${msg}`); }, // collides with LoggerA.log
  id: "B",
};

class Service {}

Object.assign(Service.prototype, LoggerA, LoggerB);

const svc = new Service();
svc.log("hello"); // only "[B] hello" — LoggerA's log is silently gone
```

This is exactly the kind of bug that's invisible until it causes wrong behavior in production — nothing throws, nothing warns, the earlier implementation simply never runs.

### `safeMixin` — fail loudly on collision

```js
function safeMixin(target, ...mixins) {
  for (const mixin of mixins) {
    for (const key of Object.keys(mixin)) {
      if (key in target) {
        throw new Error(`Mixin collision: "${key}" already exists on target`);
      }
    }
    Object.assign(target, mixin);
  }
  return target;
}

class SafeService {}

try {
  safeMixin(SafeService.prototype, LoggerA, LoggerB);
} catch (e) {
  console.log(e.message); // 'Mixin collision: "log" already exists on target'
}
```

`safeMixin` applies each mixin one at a time and checks every key against what's already on the target (using `in`, so it also catches collisions with inherited members, not just own ones) before copying — the first colliding key stops the whole operation with a clear error instead of a silent overwrite.

### `chainedMixin` — run every colliding implementation, in order

Sometimes silently picking a winner is wrong, but so is throwing — you actually want **both** implementations to run. `chainedMixin` wraps colliding methods so each call runs every version in the order the mixins were applied:

```js
function chainedMixin(target, ...mixins) {
  for (const mixin of mixins) {
    for (const [key, value] of Object.entries(mixin)) {
      const existing = target[key];
      if (typeof value === "function" && typeof existing === "function") {
        target[key] = function (...args) {
          existing.apply(this, args);
          return value.apply(this, args);
        };
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}

class ChainedService {}
chainedMixin(ChainedService.prototype, LoggerA, LoggerB);

const chained = new ChainedService();
chained.log("hello");
// [A] hello
// [B] hello
```

Non-function properties (like `id` in the example mixins) are still just overwritten last-wins by `chainedMixin`, since there's no sensible way to "chain" a plain value — only function collisions get wrapped.

| Strategy | Behavior on name collision | When to use |
|---|---|---|
| Plain `Object.assign(target, ...mixins)` | Last mixin silently wins | Only when you're certain the mixins never share method names |
| `safeMixin` | Throws immediately | Development/CI safety net, or any time silent overwrites would be a real bug |
| `chainedMixin` | Runs every implementation, in order | Cross-cutting concerns like logging, auditing, or multiple independent "on event" hooks that should all fire |

## `Object.assign` and getters — a related gotcha

`Object.assign` reads source properties by **getting** them (triggering any getters on the source) and writes plain values onto the target — it does not copy getter/setter *descriptors*, and it's a shallow copy:

```js
const WithComputed = {
  get randomId() {
    return Math.random();
  },
};

const target = {};
Object.assign(target, WithComputed);

console.log(Object.getOwnPropertyDescriptor(target, "randomId"));
// { value: 0.1942..., writable: true, enumerable: true, configurable: true }
// — a plain frozen-at-copy-time VALUE, not a live getter anymore
```

If a mixin relies on a getter re-computing a value on every access, `Object.assign` will instead "bake in" whatever the getter returned at copy time. Functional mixins (which copy *behavior* by extending a class, not by evaluating and copying property values) don't have this problem — another reason to prefer them for anything beyond trivial, stateless method mixing.

## Key takeaways

- `Object.assign(Target.prototype, ...mixins)` is the simplest mixin style, but copies are enumerable (unlike class methods) and the source objects are shared and mutable across every class that ever mixed them in.
- Functional mixins (`const Mixin = (Base) => class extends Base { ... }`) compose correctly with `super`, support private fields, and don't share mutable state between unrelated compositions — prefer them for anything non-trivial.
- `Object.assign` collisions are silent and last-wins; use `safeMixin` to fail loudly or `chainedMixin` to run every colliding implementation in order, depending on whether a collision is a bug or an intentional cross-cutting concern.
- `Object.assign` invokes getters on the source and copies the resulting value, not the getter itself — it's a shallow, one-time snapshot, not a live binding.

## Interview questions

1. **Why does JavaScript need mixins at all?** Classes only support single inheritance (`extends` takes one class); mixins let you compose behavior from multiple independent sources without a multi-inheritance diamond problem.
2. **What's the practical difference between an `Object.assign` mixin and a functional mixin?** The former copies method references onto an existing prototype (enumerable, shared mutable source objects, no `super` support); the latter returns a new subclass with the behavior baked in via real inheritance (supports `super`, private fields, no shared mutable state).
3. **What happens when two `Object.assign` mixins define the same method name, and how do you detect or prevent it?** The last one applied silently wins; detect it by checking for existing keys before assigning (`safeMixin`), or intentionally compose both behaviors with a wrapper (`chainedMixin`).
4. **Does `Object.assign` copy a getter as a getter?** No — it reads the getter's current value and copies that value as a plain, static property on the target.
5. **How would you implement a `toJSON`/`fromJSON` mixin that works correctly even when composed onto different base classes?** Use `new this(...)` inside the static factory rather than hard-coding a specific class name, so it always constructs whichever class actually called it.
