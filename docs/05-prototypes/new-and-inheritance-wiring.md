---
title: "The `new` Keyword and Wiring Inheritance"
sidebar_position: 3
---

# The `new` Keyword and Wiring Inheritance

[The previous page](./prototype-chain.md) looked at how the chain is *read*. This page looks at how it gets *built*: what `new` actually does under the hood, how to borrow a parent constructor with `call`, the three ways people link a child's prototype to a parent's, why `Object.assign`-based "inheritance" is not real inheritance, and a performance trap around `Object.setPrototypeOf`.

## The 4 steps of `new`

`new Fn(...args)` is not magic — it is four ordinary steps the engine performs for you:

1. **Create** a new, empty, ordinary object.
2. **Link** it — set the new object's `[[Prototype]]` to `Fn.prototype`.
3. **Call** `Fn` with `this` bound to the new object, passing the arguments along.
4. **Return** — if `Fn` explicitly returns an object, that object is the result of the whole `new` expression; otherwise the object built in steps 1–2 (now populated by step 3) is returned.

You can write the exact same steps as a plain function:

```js
function myNew(Fn, ...args) {
  const obj = Object.create(Fn.prototype); // 1 + 2: create and link
  const result = Fn.apply(obj, args);      // 3: call with this = obj
  // 4: spec checks Type(result) is Object, which includes functions -
  // typeof alone would miss a constructor that returns a function.
  const isObjectType = (typeof result === "object" && result !== null) || typeof result === "function";
  return isObjectType ? result : obj;
}

function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function () {
  return `Hi, I am ${this.name}`;
};

const a = new Person("Alice", 25);
const b = myNew(Person, "Alice", 25);

console.log(a.greet()); // "Hi, I am Alice"
console.log(b.greet()); // "Hi, I am Alice"
console.log(Object.getPrototypeOf(b) === Person.prototype); // true
```

:::note Step 4 is why constructors normally don't `return`
If a constructor returns a primitive (`string`, `number`, `undefined`, ...), that return value is **ignored** and the new object wins. If it returns an **object**, that object replaces the new one — this is how factory-style constructors and `Object.create`-based builders can hand back something other than `this`.
:::

## Borrowing a parent constructor with `Person.call(this, ...)`

Classes inherit instance setup through `super(...)`. Constructor functions do it by hand, by invoking the parent constructor with `this` explicitly bound to the object currently being built, so the parent's field assignments run against *this* new instance instead of creating a separate object:

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function () {
  return `Hello, my name is ${this.name} and I am ${this.age} years old.`;
};

function Teacher(name, age, sub) {
  Person.call(this, name, age); // run Person's body with this = the Teacher being built
  this.sub = sub;
}

// Link the prototypes so method lookup continues from Teacher.prototype to Person.prototype
Object.setPrototypeOf(Teacher.prototype, Person.prototype);

const person1 = new Person("human", 34);
console.log(person1.greet()); // "Hello, my name is human and I am 34 years old."

const manish = new Teacher("manish", 12, "maths");
console.log(manish.greet());         // "Hello, my name is manish and I am 12 years old." (inherited)
console.log(manish.sub);             // "maths" (own)
console.log(manish instanceof Person); // true
```

`Person.call(this, name, age)` and `Object.setPrototypeOf(Teacher.prototype, Person.prototype)` are two **separate** jobs and both are needed:

| Job | Line | What it wires up |
|---|---|---|
| Copy the parent's **instance fields** onto the new object | `Person.call(this, name, age)` | `this.name`, `this.age` become own properties of the `Teacher` instance |
| Share the parent's **methods** | `Object.setPrototypeOf(Teacher.prototype, Person.prototype)` | `greet` becomes reachable via the prototype chain, not copied |

Skip the `call` and a `Teacher` instance has `sub` but no `name`/`age`. Skip the `setPrototypeOf` and `teacher.greet()` throws `TypeError: teacher.greet is not a function`, because nothing links `Teacher.prototype` to `Person.prototype`.

## Three ways to link `Child.prototype` to `Parent.prototype`

### 1. `Object.setPrototypeOf` — recommended

```js
function Teacher(name, age, sub) {
  Person.call(this, name, age);
  this.sub = sub;
}
Teacher.prototype.teach = function () {
  return `${this.name} teaches ${this.sub}`;
};

Object.setPrototypeOf(Teacher.prototype, Person.prototype);
```

Call it **once, at setup time**, right after declaring the constructor and before any instances exist. It mutates `Teacher.prototype`'s `[[Prototype]]` in place, so `Teacher.prototype.constructor` (automatically set to `Teacher` when the function was declared) is left untouched — there is nothing to restore.

### 2. `Object.create(...)` + restore `constructor` — also recommended

This is the classic pre-ES6 pattern, still common in older codebases:

```js
function Teacher(name, age, sub) {
  Person.call(this, name, age);
  this.sub = sub;
}

Teacher.prototype = Object.create(Person.prototype); // REPLACES the prototype entirely
Teacher.prototype.constructor = Teacher;              // must restore it manually

Teacher.prototype.teach = function () {
  return `${this.name} teaches ${this.sub}`;
};
```

`Object.create(Person.prototype)` returns a brand-new, empty object linked to `Person.prototype` — it has **no** `constructor` property at all, inherited or own, because the one you want (`Teacher`) was thrown away along with the default `Teacher.prototype` it replaced. If you skip the restore line, `teacherInstance.constructor` resolves to `Person` (found further up the chain), which breaks anything that relies on it — `instanceof` still works fine, but code doing `new instance.constructor(...)` to clone an object would construct a `Person`, not a `Teacher`.

### 3. `__proto__` assignment — functionally identical, avoid in source code

```js
Teacher.prototype.__proto__ = Person.prototype;
```

This does **exactly** the same thing as `Object.setPrototypeOf(Teacher.prototype, Person.prototype)` — `__proto__`'s setter calls the same internal `[[SetPrototypeOf]]` operation. Method 1 and Method 3 are not just similar, they are **identical** in effect:

```js
function TeacherA(name, age, sub) { Person.call(this, name, age); this.sub = sub; }
function TeacherB(name, age, sub) { Person.call(this, name, age); this.sub = sub; }

Object.setPrototypeOf(TeacherA.prototype, Person.prototype);
TeacherB.prototype.__proto__ = Person.prototype;

console.log(Object.getPrototypeOf(TeacherA.prototype) === Person.prototype); // true
console.log(Object.getPrototypeOf(TeacherB.prototype) === Person.prototype); // true
console.log(new TeacherA("x", 1, "s").greet() === new TeacherB("x", 1, "s").greet()); // true (same text)
```

The reason to prefer `Object.setPrototypeOf` in code you write is not a behaviour difference — it is that `__proto__` is a legacy, Annex-B accessor kept only for web compatibility, while `Object.setPrototypeOf`/`Object.getPrototypeOf` are the standard, always-available API (see [prototype vs `__proto__`](./prototype-vs-proto.md)).

## `Object.assign` "inheritance" is not inheritance

A tempting fourth option is to copy the parent's prototype methods directly onto the child's:

```js
function TeacherC(name, age, sub) { Person.call(this, name, age); this.sub = sub; }

Object.assign(TeacherC.prototype, Person.prototype);
TeacherC.prototype.teach = function () {
  return `${this.name} teaches ${this.sub}`;
};

const c = new TeacherC("Sam", 40, "Physics");
console.log(c.greet()); // "Hello, my name is Sam and I am 40 years old." — looks fine so far!
```

It looks like it works, but it is a **one-time, shallow copy of properties**, not a chain link, and that causes three distinct problems:

### Problem 1 — `instanceof` breaks

```js
console.log(c instanceof TeacherC); // true
console.log(c instanceof Person);   // false!
```

`Object.assign` never touches `TeacherC.prototype`'s own `[[Prototype]]`; it stays `Object.prototype`. `instanceof` walks the real chain looking for `Person.prototype`, and `Person.prototype` is nowhere in it — `TeacherC.prototype` merely has *copies* of the same function values.

### Problem 2 — later additions to the parent are invisible

```js
Person.prototype.sayBye = function () {
  return `Bye from ${this.name}`;
};

console.log(typeof new TeacherA("x", 1, "s").sayBye); // "function" — setPrototypeOf: live link, sees it
console.log(typeof c.sayBye);                          // "undefined" — Object.assign: copied before this existed
```

`setPrototypeOf` creates a **live** link: the lookup happens at call time, so it sees whatever is on `Person.prototype` *now*. `Object.assign` ran once, at a fixed moment, and copied only what existed then.

### Problem 3 — shallow copy shares nested mutable state

Reassigning a copied property on the child does **not** touch the parent (each own slot is independent):

```js
Person.prototype.title = "Teacher"; // enumerable own prop
Object.assign(TeacherC.prototype, Person.prototype);

TeacherC.prototype.title = "Overridden";
console.log(Person.prototype.title); // "Teacher" — untouched, this was a full reassignment
```

But `Object.assign` only copies the top-level reference for **objects**, so mutating *inside* a shared nested object affects both sides:

```js
Person.prototype.config = { maxStudents: 30 };
Object.assign(TeacherC.prototype, Person.prototype); // config is copied BY REFERENCE

TeacherC.prototype.config.maxStudents = 99; // mutates the object in place, doesn't reassign the slot
console.log(Person.prototype.config.maxStudents); // 99 — the "parent" changed too!
console.log(TeacherC.prototype.config === Person.prototype.config); // true — literally the same object
```

:::warning Object.assign copies references, not graphs
`Object.assign` is a **shallow** copy: primitives are duplicated, but objects, arrays and functions are copied by reference. Two "unrelated" prototypes end up quietly sharing the same `config` object, so a bug in one shows up in the other.
:::

A small note on `constructor`: the pattern sometimes seen alongside `Object.assign` —

```js
Object.assign(TeacherC.prototype, Person.prototype);
TeacherC.prototype.constructor = TeacherC; // often copied from Method 2 "just in case"
```

— is usually unnecessary here. `Object.assign` only copies **enumerable** own properties, and the `constructor` property that JavaScript auto-creates on every function's `prototype` is **non-enumerable** by default, so it is never touched by the `assign` call; `TeacherC.prototype.constructor` already correctly points at `TeacherC`. The restore line matters for Method 2 (`Object.create`), which *replaces* the prototype object and loses `constructor` entirely — it is not needed for Method 3 unless something upstream deliberately made `constructor` enumerable.

| | Real chain (`setPrototypeOf` / `__proto__` link) | `Object.assign` copy |
|---|---|---|
| `instanceof Parent` | ✅ true | ❌ false |
| Sees methods added to parent **later** | ✅ yes | ❌ no |
| Memory | One shared function per method | A copied reference per method (same functions, extra slots) |
| Nested object properties | Shared on purpose, one owner | Shared **by accident**, no owner |
| `constructor` needs manual reset | No (prototype object untouched) | No, in this exact case (see above) |

**`Object.assign` copies properties. Only a `[[Prototype]]` link is inheritance.** Use it for one-off mixins where you deliberately want a snapshot, never as a substitute for `extends`/`setPrototypeOf`/`Object.create`.

## `setPrototypeOf` on live instances hurts performance

`Object.setPrototypeOf` is cheap and safe on a `.prototype` object **before any instances exist** — that is exactly what every example above does. It is a different story on an object that has already been constructed and used:

```js
function Dog(name) { this.name = name; }
Dog.prototype.speak = function () { return `${this.name} barks`; };

function Cat(name) { this.name = name; }
Cat.prototype.speak = function () { return `${this.name} meows`; };

const dog = new Dog("Rex");
console.log(dog.speak()); // "Rex barks"

Object.setPrototypeOf(dog, Cat.prototype); // mutating an EXISTING instance

console.log(dog.speak());            // "Rex meows" — now resolves through Cat.prototype
console.log(dog instanceof Dog);     // false
console.log(dog instanceof Cat);     // true
```

It still works correctly — `dog` really does respond with `Cat`'s method afterward — but engines like V8 and SpiderMonkey build an internal "hidden class" / "shape" for each object shape to make property access fast, and that shape assumes an object's prototype never changes after creation. Calling `Object.setPrototypeOf` on an **already-constructed, already-used** object invalidates that assumption, pushes the object onto a slower "dictionary mode" path, and can deoptimize code that touches it.

:::warning Set the prototype once, at setup time
Safe: calling `Object.setPrototypeOf` on a `.prototype` object (or any object) **before** any instances are created from it or any hot code has read its properties. Unsafe: calling it on instances that are already alive and in use, especially inside loops or hot paths. If you find yourself reassigning an instance's prototype at runtime, reach for composition (hold the other behaviour as a property) or a real class hierarchy instead.
:::

## Exercise: `flyingFish` — composing two prototypes by hand

Build `fish → swims` and `bird → flies`, then make a `flyingFish` that responds to **both** `swim()` and `fly()` — no `class`, no `extends`, only constructor functions, `Object.setPrototypeOf`, and a manually assembled prototype object:

```js
function Fish(name) { this.name = name; }
const swims = {
  swim() { return `${this.name} swims`; },
};
Object.setPrototypeOf(Fish.prototype, swims); // Fish.prototype -> swims -> Object.prototype -> null

function Bird(name) { this.name = name; }
const flies = {
  fly() { return `${this.name} flies`; },
};
Object.setPrototypeOf(Bird.prototype, flies); // Bird.prototype -> flies -> Object.prototype -> null

function FlyingFish(name) { this.name = name; }

// Build a dedicated two-level proto for FlyingFish ONLY, so Bird's chain is untouched:
const canFly = Object.create(swims);      // canFly -> swims  (so swim() is reachable via the chain)
canFly.fly = flies.fly;                   // lend the one method FlyingFish additionally needs
Object.setPrototypeOf(FlyingFish.prototype, canFly); // FlyingFish.prototype -> canFly -> swims -> Object.prototype -> null

const fish = new Fish("Cod");
const bird = new Bird("Robin");
const flyingFish = new FlyingFish("Nemo");

console.log(fish.swim());        // "Cod swims"
console.log(bird.fly());         // "Robin flies"
console.log(flyingFish.swim());  // "Nemo swims"  - found on `swims`, two links up
console.log(flyingFish.fly());   // "Nemo flies"  - found as an own property of `canFly`

console.log(flyingFish instanceof FlyingFish); // true
console.log(flyingFish instanceof Fish);       // false - canFly is not Fish.prototype itself
console.log(flyingFish instanceof Bird);       // false - same reason

console.log(Object.getPrototypeOf(FlyingFish.prototype) === canFly); // true
console.log(Object.getPrototypeOf(canFly) === swims);                // true
```

Setting this up once, before `flyingFish` (or any `FlyingFish` instance) is created, keeps it on the safe side of the performance warning above. `flyingFish instanceof Fish` is `false` because `instanceof` checks for `Fish.prototype` specifically in the chain — `canFly` merely *delegates to* `swims`, the same object `Fish.prototype` delegates to, but it is not `Fish.prototype`. That is expected here: the goal was composing behaviour, not claiming a "is-a Fish" relationship.

## Filled-in comparison table

Completing the comparison from the practice notes, across the three real wiring techniques plus the `Object.assign` copy:

| Aspect | `Object.setPrototypeOf` | `__proto__` assignment | `Object.assign` |
|---|---|---|---|
| Creates a real prototype chain? | Yes | Yes (identical mechanism to `setPrototypeOf`) | No — flat property copy |
| `instanceof` works? | Yes | Yes | No |
| Picks up **later** additions to the parent? | Yes (live link) | Yes (live link) | No (snapshot at copy time) |
| Shallow-copy risk? | No (nothing is copied) | No | Yes — nested objects/arrays are shared by reference |
| `constructor` needs manual reset? | No (`.prototype` object kept, never replaced) | No | No, as long as `constructor` stays non-enumerable (true by default) |
| Safe to call post-construction (on live instances)? | No — hurts JIT optimization; fine pre-construction | No — same underlying operation, same caveat | N/A — not a prototype operation at all |
| Preferred use case | Wiring a child's `.prototype` to a parent's, at setup time | Avoid in written code; behaves the same as `setPrototypeOf` | One-off mixins/snapshots where you explicitly do **not** want a live link |

(For completeness, `Object.create(Person.prototype)` **plus** restoring `constructor` — the pattern from Method 2 above — belongs in the same "real chain" column as `setPrototypeOf`: it is a different way to reach the same linked state, just by replacing `.prototype` outright instead of mutating it.)

## Interview questions

**Q: What four things does `new Fn()` do?**
Create a new plain object, set its `[[Prototype]]` to `Fn.prototype`, run `Fn` with `this` bound to that object, and return the object the constructor built — unless the constructor explicitly returns a different object, in which case that object is returned instead.

**Q: Why do you need both `Person.call(this, ...)` and a prototype link when wiring inheritance by hand?**
`call` runs the parent's field-initialization logic against the current instance (copies own properties like `name`/`age`). It does nothing for methods. The prototype link (`setPrototypeOf`, `Object.create`, or `extends` under the hood) is what makes inherited *methods* reachable through lookup instead of being duplicated.

**Q: Why is `Object.assign(Child.prototype, Parent.prototype)` not real inheritance?**
It copies today's enumerable own properties once. There is no `[[Prototype]]` link, so `instanceof Parent` is `false`, methods added to `Parent.prototype` afterward never appear on `Child`, and any property whose value is itself an object or array is shared by reference between parent and child, so mutating it from one side leaks into the other.

**Q: Are `Object.setPrototypeOf(a, b)` and `a.__proto__ = b` different?**
No — same internal `[[SetPrototypeOf]]` operation, same resulting chain. Prefer the method form in code because `__proto__` is a legacy (Annex B) accessor; use the literal `{ __proto__: b }` form freely when *creating* an object, since that one is standard.

**Q: Why shouldn't you call `Object.setPrototypeOf` on an object after it's already in use?**
JS engines optimize property access by assuming an object's shape, including its prototype, is stable after creation. Changing the prototype of a live, already-accessed object invalidates that assumption and can push the object (and code that touches it) onto a slower path. Do it once, at setup time, on the `.prototype` object itself — before any instances exist.

## Key takeaways

- `new` = create → link `[[Prototype]]` → call with `this` bound → return (object from the constructor wins if it returns one).
- `Parent.call(this, ...args)` copies the parent's **instance fields**; it never touches methods.
- `Object.setPrototypeOf(Child.prototype, Parent.prototype)` and `Child.prototype.__proto__ = Parent.prototype` are functionally identical; prefer the method form and avoid the legacy accessor in source.
- `Object.create(Parent.prototype)` replaces `.prototype` outright and loses `constructor`, so restore it manually; mutating in place with `setPrototypeOf` never loses it.
- `Object.assign`-based "inheritance" is a one-time, shallow property copy: no `instanceof`, no visibility into later additions, and shared nested objects.
- Set prototypes once, at setup time; never on a live, already-constructed instance.
- See also: [`prototype` vs `__proto__`](./prototype-vs-proto.md) and [The Prototype Chain](./prototype-chain.md) for the reading side of this same machinery, and [Classes vs Constructors](../06-classes-and-oop/classes-vs-constructors.md) for how `class`/`extends`/`super` wrap exactly these steps.
