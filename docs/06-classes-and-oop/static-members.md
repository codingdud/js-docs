---
title: "Static Methods, Properties and Factories"
sidebar_position: 2
---

`static` members belong to the **class itself** (the constructor function), not to instances and not to `.prototype`. This page works through where statics actually live, how they are inherited, and three practical patterns built on top of them: factories, logging, and private static state.

## Statics live on the constructor, not the prototype

```js
class MathUtils {
  static add(a, b) { return a + b; }
  static PI = 3.14159;

  square(n) { return n * n; }
}

console.log(MathUtils.add(2, 3)); // 5 — static method works on the class
console.log(MathUtils.PI);        // 3.14159

const mu = new MathUtils();
console.log(mu.square(4)); // 16 — normal instance method

try {
  mu.add(2, 3); // TypeError: mu.add is not a function
} catch (e) {
  console.log(e.message);
}
console.log(mu.PI); // undefined — PI was never put on the instance or its prototype
```

`add` and `PI` never touch `MathUtils.prototype` at all — they are own properties of `MathUtils` itself:

```js
console.log(MathUtils.hasOwnProperty("add"));           // true
console.log(MathUtils.prototype.hasOwnProperty("add"));  // false

console.log(Object.getOwnPropertyNames(MathUtils));           // ["length", "name", "prototype", "add", "PI"]
console.log(Object.getOwnPropertyNames(MathUtils.prototype)); // ["constructor", "square"]
```

:::warning A common documentation mistake
You may see `typeof MathUtils.prototype.constructor.add` written down as the way to "find" a static method. That expression does work (`MathUtils.prototype.constructor` is `MathUtils`, so `.add` resolves to the function and `typeof` reports `"function"`) — but it is a roundabout way to say the obvious: statics live on the **constructor**, not the prototype. `MathUtils.prototype.hasOwnProperty("add")` being `false` is the real proof that `add` was never put on the prototype.
:::

## Statics ARE inherited — correcting a common misconception

A note you'll sometimes find in personal study notes claims "static members aren't inherited like instance ones." That is backwards. Static members **are** inherited through `extends`, exactly the same way instance methods are inherited through `.prototype` — just on a second, parallel chain.

```js
class Base {
  constructor(value) {
    this.value = value;
  }
  static create(value) {
    return new this(value); // `this` here is whichever class called .create()
  }
  static describe() {
    return `I am ${this.name}`; // this.name = the class's name string
  }
}

class Child extends Base {
  double() {
    return this.value * 2;
  }
}

const b  = Base.create(10);
const ch = Child.create(5); // the static method is inherited and still works

console.log(b.value);          // 10
console.log(ch.value);         // 5
console.log(ch.double());      // 10
console.log(Child.describe()); // "I am Child" — `this` is Child, not Base
```

`extends` wires up **two** prototype chains, not one:

```js
console.log(Object.getPrototypeOf(Child) === Base);                     // true  — static/constructor-side chain
console.log(Object.getPrototypeOf(Child.prototype) === Base.prototype); // true  — instance-side chain
```

| Chain | What it links | What it's for |
|---|---|---|
| `Object.getPrototypeOf(Child) === Base` | `Child` itself → `Base` itself | Static method/property inheritance |
| `Object.getPrototypeOf(Child.prototype) === Base.prototype` | instances' lookup chain | Instance method inheritance |

Because `static create(value) { return new this(value); }` uses `this` rather than hard-coding `Base`, calling `Child.create(5)` runs `new Child(5)` — this is exactly how `Array.from`-style static factories stay correct in subclasses.

### Replicating it with plain constructor functions

`class ... extends ...` is convenient precisely because it does **two** `Object.setPrototypeOf` calls for you. Doing it by hand with constructor functions makes the two chains explicit:

```js
function BaseFn(value) {
  this.value = value;
}
BaseFn.create = function (value) {
  return new this(value);
};
BaseFn.describe = function () {
  return `I am ${this.name}`;
};

function ChildFn(value) {
  BaseFn.call(this, value); // inherit instance initialization
}

// Instance-side chain: ChildFn instances inherit BaseFn.prototype methods
Object.setPrototypeOf(ChildFn.prototype, BaseFn.prototype);

// Static-side chain: ChildFn itself inherits BaseFn's static methods
// This second call is what `class Child extends Base` does automatically.
Object.setPrototypeOf(ChildFn, BaseFn);

ChildFn.prototype.double = function () { return this.value * 2; };

const chFn = ChildFn.create(5);
console.log(chFn.value);          // 5
console.log(chFn.double());       // 10
console.log(ChildFn.describe());  // "I am ChildFn"
console.log(Object.getPrototypeOf(ChildFn) === BaseFn);                     // true
console.log(Object.getPrototypeOf(ChildFn.prototype) === BaseFn.prototype); // true
```

Miss the second `Object.setPrototypeOf(ChildFn, BaseFn)` call and `ChildFn.create` / `ChildFn.describe` simply won't exist — this is the single step people forget when hand-rolling "classical" inheritance, and the exact thing `extends` buys you for free.

## `User.count` vs `this.count` inside instance methods

A static property belongs to the class, so reading or writing it from an **instance** method must go through the class name (or `this.constructor`), not through the instance's own `this`:

```js
class User {
  ab = 10;
  static role = "Developer";
  static count = 0;

  constructor() {
    User.count++; // correct — statics are reached via the class
  }

  static add(amount) {
    return this.count + amount; // inside a static method, `this` IS the class
  }

  inc() {
    // this.count++;  // WRONG — looks for an instance property called `count`,
                       // creates one at 1 instead of touching the static counter
    User.count++;      // correct
  }

  get() {
    return User.count;
  }
}

const u = new User();
console.log(User.add(1)); // 2 (count is 1 after one construction, + 1)
console.log(u.get());     // 1 — add() only read count, it never mutated it
```

Inside a **static** method, `this` refers to the class itself (or the subclass that called it, as shown above) — so `this.count` is fine there. Inside an **instance** method, `this` refers to the instance, so `this.count` silently creates an unrelated own property on the instance instead of incrementing the shared static counter. This is a frequent source of "my counter doesn't increase" bugs.

## Static initialization blocks (ES2022)

A `static { ... }` block runs exactly once, immediately when the class is defined — useful for computed static initialization that doesn't fit in a single expression:

```js
class Config {
  static #defaults;
  static version;

  static {
    // runs once, right after the class body is evaluated
    Config.#defaults = Object.freeze({ retries: 3, timeout: 5000 });
    Config.version = "1.0.0";
    console.log("Config initialized");
  }

  static get defaults() {
    return Config.#defaults;
  }
}

console.log(Config.version);       // "1.0.0"
console.log(Config.defaults);      // { retries: 3, timeout: 5000 }
```

Rules worth remembering: `this` inside a static block refers to the class; it can `return` nothing (a bare `return;` to exit early is fine, but there's no meaningful return value); and it may read/write private static fields — including ones declared later in the same class, since the whole class body is parsed first.

## Factory pattern with a private field

Combining `static` factory methods with a `#private` field lets you fully control how instances get created — consumers never call `new` directly:

```js
class Temperature {
  #celsius;

  constructor(celsius) {
    this.#celsius = celsius;
  }

  static fromFahrenheit(f) { return new Temperature((f - 32) * 5 / 9); }
  static fromKelvin(k)     { return new Temperature(k - 273.15); }

  get celsius()    { return this.#celsius; }
  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
  get kelvin()     { return this.#celsius + 273.15; }

  toString() {
    return `${this.celsius.toFixed(2)}°C / ${this.fahrenheit.toFixed(2)}°F / ${this.kelvin.toFixed(2)}K`;
  }
}

const t1 = Temperature.fromFahrenheit(98.6);
console.log(t1.celsius.toFixed(2)); // "37.00"
console.log(t1.toString());         // "37.00°C / 98.60°F / 310.15K"

const t2 = Temperature.fromKelvin(0);
console.log(t2.celsius.toFixed(2)); // "-273.15"
```

The `constructor` is still technically public here (nothing stops `new Temperature(20)`), but the intent — "always build me through a named factory" — is communicated clearly through the static methods and the formulas they encapsulate.

## Static private fields and methods

`static #x` fields and `static #method()` methods exist, but — like instance private fields — they belong to the **specific class that declared them**, not to subclasses, even though the static side is otherwise inherited.

```js
class Database {
  static #connections = 0;

  static #connect() {
    return ++Database.#connections;
  }

  static connect() {
    return this.#connect(); // `this` is whichever class called .connect()
  }
}

console.log(Database.connect()); // 1
console.log(Database.connect()); // 2
console.log(Database.connect()); // 3

class ReplicaDatabase extends Database {}

try {
  ReplicaDatabase.connect(); // this = ReplicaDatabase inside connect()
} catch (e) {
  console.log(e.message); // TypeError: Receiver must be class Database
}
```

`ReplicaDatabase.connect()` is inherited and runs fine until it reaches `this.#connect()`. At that point `this` is `ReplicaDatabase` — an object that was never branded with `Database`'s private `#connect` method — so the engine throws a `TypeError` (V8's exact wording is `Receiver must be class Database`; other engines phrase it differently, but all of them throw a `TypeError` at this point). Private static members are **not inherited**, which is the one place where the "statics aren't inherited" intuition from the previous section is actually correct: it's true for *private* statics specifically, not for ordinary (public) ones.

:::warning
This is a real gotcha when you build a base class with private static helpers and expect subclasses to reuse them through inherited public static methods. If a subclass needs the same private logic, either re-declare it in the subclass, or keep the logic in a shared module-level function instead of a private static method.
:::

## Static accessors (getter/setter)

Just like instances, the class itself can have `static get`/`static set` pairs:

```js
class Logger {
  static logs = [];

  static set log(message) {
    this.logs.push(message);
  }

  static get getlog() {
    return this.logs;
  }
}

Logger.log = "hello world";
Logger.log = "admin login";
Logger.log = "admin login";

console.log(Logger.getlog); // ["hello world", "admin login", "admin login"]
```

`Logger.log = "..."` looks like a plain property assignment but actually invokes the static setter, which is a convenient way to give a "fire and forget" API (`Logger.log = msg`) backed by real validation or side effects, without consumers needing to call a method.

## Legacy private static counter (closures)

Before private fields existed, "private" instance state was built with a closure instead — each instance gets its own hidden variable via the constructor's closure, with no `#` syntax involved:

```js
function Counter() {
  let count = 0;
  this.inc = () => ++count;
}

const legacyCounter = new Counter();
console.log(legacyCounter.inc()); // 1
console.log(legacyCounter.inc()); // 2
console.log(legacyCounter); // Counter { inc: [Function (anonymous)] } — `count` is nowhere to be seen
```

This pattern still works today, but every instance pays for its own copy of the `inc` function (since it's created fresh inside the constructor instead of shared on a prototype) — see [Private Fields, Encapsulation and Brand Checks](./private-fields.md) for the modern, memory-efficient `#private` alternative and a full three-way comparison.

## Key takeaways

- Static methods/properties are own properties of the **constructor**, never of `.prototype` — `Ctor.prototype.hasOwnProperty("staticMember")` is always `false`.
- Public statics **are** inherited through `extends`, via a second prototype chain between the constructors themselves (`Object.getPrototypeOf(Child) === Base`).
- `static #private` fields/methods are **not** inherited — calling an inherited public static method that touches `this.#privateStatic` throws a `TypeError` when `this` is a subclass that never declared that private member.
- Inside an instance method, always reach static state through the class name (`ClassName.x`) or `this.constructor.x`, never `this.x` — the latter silently creates an unrelated instance property.
- `static { ... }` blocks (ES2022) run once, immediately, with `this` bound to the class, and can initialize private static state.

## Interview questions

1. **Where do static methods live?** On the constructor function itself, not on `.prototype`, so instances never see them through the prototype chain.
2. **Are static members inherited?** Public ones yes, via a constructor-to-constructor prototype chain set up by `extends`. Private static members are not — they throw a `TypeError` if accessed through `this` when `this` is a subclass.
3. **What's wrong with `this.count++` inside an instance method when `count` is a static field?** It creates a new own property called `count` on the instance instead of updating the shared static value; use `ClassName.count++` instead.
4. **What does a `static { ... }` block run, and when?** Arbitrary initialization code, run exactly once when the class definition is evaluated, with `this` bound to the class.
5. **Why does `new this(value)` inside a static factory matter for subclassing?** Using `this` instead of hard-coding the class name makes `Subclass.create(...)` correctly return a `Subclass` instance rather than a `Base` instance.
