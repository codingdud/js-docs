---
title: The Prototype Chain
sidebar_position: 2
---

# The Prototype Chain

> Prototype chaining is the mechanism by which JavaScript looks up properties and methods on an object. If a property is not found on the object itself, the search continues up the prototype chain (via the `[[Prototype]]` links, exposed as `__proto__`) until the property is found or the chain ends at `null`.

This page shows how that lookup walks, how classes actually have **two** chains, how to tell own properties from inherited ones, and how to build chains without `class` or `new`.

## How lookup walks the chain

```text
object ──▶ Constructor.prototype ──▶ Object.prototype ──▶ null
 (own)      (shared methods)          (toString, hasOwnProperty, ...)
```

For a property read `obj.prop`:

1. Does `obj` have an **own** property `prop`? Return it.
2. Otherwise, move to `Object.getPrototypeOf(obj)` and repeat.
3. If the link is `null`, stop and return `undefined` (no error).

```js
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function () {
  return `${this.name} is eating`;
};

const dog = new Animal("Buddy");

// dog.eat lookup:
// 1. dog itself          -> no "eat"
// 2. Animal.prototype    -> found!
console.log(dog.eat());         // "Buddy is eating"

// dog.toString lookup: dog -> Animal.prototype -> Object.prototype (found)
console.log(dog.toString());    // "[object Object]"

// dog.fly lookup: dog -> Animal.prototype -> Object.prototype -> null
console.log(dog.fly);           // undefined
```

Built-ins work the same way:

```js
const arr = [1, 2, 3];

console.log(arr.__proto__ === Array.prototype);              // true
console.log(Array.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__);                     // null

// arr -> Array.prototype (map, push...) -> Object.prototype (hasOwnProperty...) -> null
console.log(arr.map((x) => x * 2));        // [2, 4, 6]   from Array.prototype
console.log(arr.hasOwnProperty("length")); // true         method from Object.prototype
```

:::note Reads walk the chain, writes do not
Assigning `obj.prop = value` creates or updates an **own** property on `obj` (it "shadows" any inherited `prop`). It does not modify the prototype. The exceptions are inherited setters and inherited non-writable properties; see [Property Descriptors](../04-objects/property-descriptors.md).
:::

## Two chains for every class

A class hierarchy produces two parallel chains:

1. **Instance side**: `instance → Class.prototype → Parent.prototype → Object.prototype → null`
2. **Constructor side**: `Class → Parent → Function.prototype → Object.prototype → null`

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a noise`; }
}

class Dog extends Animal {
  speak() { return `${this.name} barks`; }
}

const dog = new Dog("Rex");

// Instance chain
console.log(Object.getPrototypeOf(dog) === Dog.prototype);                 // true
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype);    // true
console.log(Object.getPrototypeOf(Animal.prototype) === Object.prototype); // true
console.log(Object.getPrototypeOf(Object.prototype));                      // null

// Constructor chain
console.log(Object.getPrototypeOf(Dog) === Animal);                        // true!
console.log(Object.getPrototypeOf(Animal) === Function.prototype);         // true
console.log(Object.getPrototypeOf(Function.prototype) === Object.prototype); // true
```

| Link | Instance side | Constructor side |
|---|---|---|
| Start | `dog` | `Dog` |
| 1 | `Dog.prototype` | `Animal` |
| 2 | `Animal.prototype` | `Function.prototype` |
| 3 | `Object.prototype` | `Object.prototype` |
| 4 | `null` | `null` |

```text
  INSTANCE SIDE                          CONSTRUCTOR SIDE
  dog                                    Dog
   │                                      │
   ▼                                      ▼
  Dog.prototype     (speak - barks)      Animal          (static members inherited here)
   │                                      │
   ▼                                      ▼
  Animal.prototype  (speak - noise)      Function.prototype (call, apply, bind)
   │                                      │
   ▼                                      ▼
  Object.prototype ◀──────────────────────┘
   │
   ▼
  null
```

The constructor chain (`Object.getPrototypeOf(Dog) === Animal`) is why **static** members are inherited by subclasses: `Dog.someStatic` walks to `Animal`. See [Static Members](../06-classes-and-oop/static-members.md).

## Own vs inherited properties

```js
class Vehicle {
  static wheels = 4;          // static: own property of the Vehicle function

  constructor(make, model) {
    this.make = make;         // own property of each instance
    this.model = model;       // own property of each instance
  }

  describe() {                // lives on Vehicle.prototype
    return `${this.make} ${this.model}`;
  }
}

class ElectricVehicle extends Vehicle {
  #batteryKwh;                // private field

  constructor(make, model, batteryKwh) {
    super(make, model);
    this.#batteryKwh = batteryKwh;
    this.type = "electric";   // own property
  }

  range() {                   // lives on ElectricVehicle.prototype
    return this.#batteryKwh * 4;
  }
}

const ev = new ElectricVehicle("Tesla", "Model 3", 75);

console.log(Object.getOwnPropertyNames(ev));              // ["make", "model", "type"]
console.log(Object.getOwnPropertyNames(ElectricVehicle)); // ["length", "name", "prototype"]
console.log(ev.range());                                  // 300
```

| Expression | Result | Where the property lives |
|---|---|---|
| `ev.hasOwnProperty("make")` | `true` | On the instance (set via `super`) |
| `ev.hasOwnProperty("type")` | `true` | On the instance |
| `ev.hasOwnProperty("describe")` | `false` | `Vehicle.prototype` |
| `ev.hasOwnProperty("range")` | `false` | `ElectricVehicle.prototype` |
| `ev.hasOwnProperty("wheels")` | `false` | Not on the instance side at all; it is static |
| `Vehicle.prototype.hasOwnProperty("describe")` | `true` | Its real home |
| `Vehicle.hasOwnProperty("wheels")` | `true` | Static: own property of the constructor |
| `ElectricVehicle.wheels` | `4` | Inherited via the constructor chain |
| `ElectricVehicle.hasOwnProperty("wheels")` | `false` | Found on `Vehicle`, one link up |
| `ev.wheels` | `undefined` | Instances do not see statics |

:::warning Private fields are invisible to reflection
`#batteryKwh` is stored per instance, but it is **not** a property in the normal sense. It never appears in `Object.getOwnPropertyNames`, `Object.keys`, `Reflect.ownKeys`, `for...in` or `JSON.stringify`, and `hasOwnProperty("#batteryKwh")` is `false`. It is not inherited through the prototype chain either; the only way to test for it is `#batteryKwh in obj` from inside the class body. See [Private Fields](../06-classes-and-oop/private-fields.md).
:::

### `for...in` sees own **and** inherited enumerable keys

`for...in` walks the whole chain, but only yields **enumerable** string keys. Class methods are non-enumerable, so they never appear:

```js
const ownKeys = [];
const inheritedKeys = [];

for (const key in ev) {
  if (Object.hasOwn(ev, key)) ownKeys.push(key);
  else inheritedKeys.push(key);
}

console.log("own:", ownKeys);             // own: ["make", "model", "type"]
console.log("inherited:", inheritedKeys); // inherited: [] - class methods are non-enumerable
```

Methods added to a constructor's prototype **by assignment** are enumerable, so they do show up:

```js
function Car(make) { this.make = make; }
Car.prototype.honk = function () { return "beep"; }; // enumerable!

const car = new Car("VW");
for (const key in car) console.log(key, Object.hasOwn(car, key));
// make true
// honk false   <- inherited, but enumerable

console.log(Object.keys(car)); // ["make"] - Object.keys is own-only
```

| API | Own | Inherited | Non-enumerable | Symbols |
|---|---|---|---|---|
| `for...in` | yes | yes | no | no |
| `Object.keys` | yes | no | no | no |
| `Object.getOwnPropertyNames` | yes | no | yes | no |
| `Reflect.ownKeys` | yes | no | yes | yes |
| `key in obj` | yes | yes | yes | yes |
| `Object.hasOwn(obj, key)` | yes | no | yes | yes |

More on iteration in [Iterating Objects and JSON](../04-objects/iterating-and-json.md).

## Building chains with `Object.create` (no `class`, no `new`)

`Object.create(proto)` creates an empty object whose `[[Prototype]]` **is** `proto`. It is the same linking step that `new` performs internally, without calling any constructor.

```js
const PersonProto = {
  greet() {
    return `Hi, I am ${this.name}, age ${this.age}`;
  },
};

function createPerson(name, age) {
  const obj = Object.create(PersonProto);
  obj.name = name;
  obj.age = age;
  return obj;
}

const TeacherProto = Object.create(PersonProto); // TeacherProto -> PersonProto
TeacherProto.teach = function () {
  return `${this.name} teaches ${this.sub}`;
};

function createTeacher(name, age, sub) {
  const obj = Object.create(TeacherProto);       // obj -> TeacherProto
  obj.name = name;
  obj.age = age;
  obj.sub = sub;
  return obj;
}

const p = createPerson("Asha", 28);
const t = createTeacher("Manish", 30, "Maths");

console.log(p.greet()); // "Hi, I am Asha, age 28"
console.log(t.greet()); // "Hi, I am Manish, age 30"  - from PersonProto
console.log(t.teach()); // "Manish teaches Maths"     - from TeacherProto

console.log(Object.getPrototypeOf(t) === TeacherProto);           // true
console.log(Object.getPrototypeOf(TeacherProto) === PersonProto); // true
```

### `instanceof` does not work here; use `isPrototypeOf`

```js
try {
  t instanceof TeacherProto;
} catch (e) {
  console.log(e.constructor.name, "-", e.message);
  // TypeError - Right-hand side of 'instanceof' is not callable
}

console.log(TeacherProto.isPrototypeOf(t)); // true
console.log(PersonProto.isPrototypeOf(t));  // true - checks the whole chain
console.log(Object.prototype.isPrototypeOf(t)); // true
console.log(TeacherProto.isPrototypeOf(p)); // false
```

`instanceof` needs a **callable** (a constructor function or class) on its right-hand side, because it reads that function's `prototype` property. A plain prototype object is not callable, so it throws a `TypeError`. `proto.isPrototypeOf(obj)` asks the direct question: "is `proto` anywhere in `obj`'s chain?"

## How `instanceof` really works

`obj instanceof C` does **not** look at who constructed `obj`. It walks `obj`'s chain looking for `C.prototype`:

```js
function myInstanceOf(obj, C) {
  if (typeof C !== "function") {
    throw new TypeError("Right-hand side of 'instanceof' is not callable");
  }
  // Primitives are never instances
  if (obj === null || (typeof obj !== "object" && typeof obj !== "function")) {
    return false;
  }
  const target = C.prototype;
  let proto = Object.getPrototypeOf(obj);
  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

class Animal {}
class Dog extends Animal {}
const d = new Dog();

console.log(myInstanceOf(d, Dog));    // true
console.log(myInstanceOf(d, Animal)); // true
console.log(myInstanceOf(d, Object)); // true
console.log(myInstanceOf(d, Array));  // false
console.log(myInstanceOf(5, Number)); // false - same as 5 instanceof Number
```

Consequences worth knowing:

- Reassigning `C.prototype` after creating instances makes `instanceof` return `false` for the old instances.
- Changing an object's prototype changes its `instanceof` answers.
- A class can customise the check with `static [Symbol.hasInstance]` (see [Well-Known Symbols](../06-classes-and-oop/well-known-symbols.md)); the real algorithm checks that first, then falls back to the walk above.
- Objects from another realm (an iframe) fail `instanceof Array` because their `Array.prototype` is a different object. Use `Array.isArray` instead.

## Chains from object literals

The literal `__proto__` key (see [prototype vs \_\_proto\_\_](./prototype-vs-proto.md)) builds chains without any functions.

### A three-level chain: `p3 → p2 → p1`

```js
const p1 = {
  xp1: "i am xp1",
};
const p2 = {
  xp2: "i am xp2",
  __proto__: p1,
};
const p3 = {
  xp3: "i am xp3",
  __proto__: p2,
};

console.log(p3);     // { xp3: 'i am xp3' } - console shows own properties only
console.log(p3.xp3); // "i am xp3"  own
console.log(p3.xp2); // "i am xp2"  from p2
console.log(p3.xp1); // "i am xp1"  from p1, two links up

console.log(Object.getPrototypeOf(p3) === p2);               // true
console.log(Object.getPrototypeOf(p2) === p1);               // true
console.log(Object.getPrototypeOf(p1) === Object.prototype); // true
// p3 -> p2 -> p1 -> Object.prototype -> null
```

:::tip
`console.log(p3)` printing only `xp3` surprises people. Logging shows own properties; the inherited ones are still reachable. In browser dev tools expand the `[[Prototype]]` entry to see them.
:::

### Siblings sharing a parent: `Teacher` and `Student` from `User`

```js
const User = {
  name: "Alice",
  age: 30,
};

const Teacher = {
  subject: "maths",
  __proto__: User,
};

const Student = {
  class: "XI",
  __proto__: User,
};

console.log(Teacher.name);    // "Alice" - inherited from User
console.log(Student.age);     // 30      - inherited from User
console.log(Teacher.subject); // "maths" - own

// Both siblings read the SAME User object
User.age = 31;
console.log(Teacher.age, Student.age); // 31 31

// A write on a child shadows; the parent is untouched
Student.name = "Bob";
console.log(Student.name, Teacher.name, User.name); // "Bob" "Alice" "Alice"
console.log(Object.hasOwn(Student, "name"));         // true
```

```text
        User { name, age }
          ▲            ▲
          │            │
 Teacher { subject }  Student { class }
```

:::warning Shared mutable data on a prototype
If `User` held an array or object (for example `tags: []`), then `Teacher.tags.push("x")` would **mutate** the one shared array, and `Student.tags` would see it too, because `push` reads `tags` through the chain and modifies it in place. Keep per-object mutable state as own properties.
:::

## Interview questions

**Q: Explain the prototype chain.**
When you access a property, JavaScript checks the object itself, then its `[[Prototype]]` (for an instance, the constructor's `prototype`), then that object's prototype, and so on until it finds the property or reaches `null`, in which case the result is `undefined`.

**Q: What is `Object.getPrototypeOf(Dog)` for `class Dog extends Animal`?**
`Animal`. `extends` links both the prototypes (`Dog.prototype → Animal.prototype`) and the constructors (`Dog → Animal`), which is how static members are inherited.

**Q: How does `instanceof` work?**
It walks the left operand's prototype chain looking for the right operand's `prototype` object (after checking for a `Symbol.hasInstance` method). It throws if the right side is not callable.

**Q: Why doesn't `for...in` list class methods?**
Class methods are defined as non-enumerable. `for...in` does include inherited properties, but only enumerable ones, so methods assigned with `Fn.prototype.x = ...` do appear.

**Q: How do you check inheritance when there is no constructor?**
`proto.isPrototypeOf(obj)` or a loop over `Object.getPrototypeOf`.

## Key takeaways

- Reads walk the chain to `null`; writes create own properties (shadowing).
- Classes have an instance chain and a constructor chain.
- `hasOwnProperty` / `Object.hasOwn` separate own data from inherited methods; statics live on the constructor and private fields are invisible to all reflection APIs.
- `Object.create(proto)` is the bare linking primitive; `isPrototypeOf` is its matching check.
- `instanceof` is a chain walk for `C.prototype`, nothing more.
- Next: [The new Keyword and Wiring Inheritance](./new-and-inheritance-wiring.md).
