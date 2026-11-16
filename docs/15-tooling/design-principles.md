---
title: "Design Principles: SOLID, KISS, DRY, YAGNI"
sidebar_position: 5
---

# Design Principles: SOLID, KISS, DRY, YAGNI

These are not JavaScript-specific rules — they're general object-oriented and software-design guidelines — but they come up constantly in JS interviews and in real refactoring work, because JavaScript's flexibility makes it just as easy to violate them as to follow them. This page covers SOLID, KISS, DRY, and YAGNI with concrete JS examples, plus the trade-offs that interviewers tend to probe for.

## SOLID

SOLID is an acronym for five principles aimed at making object-oriented code easier to maintain and extend without breaking existing behavior.

### S — Single Responsibility Principle (SRP)

*A module/class/function should have one reason to change.*

```js
// ❌ One function doing validation, persistence, and notification
function registerUser(user) {
  if (!user.email.includes('@')) throw new Error('Invalid email');
  database.save(user);
  emailService.send(user.email, 'Welcome!');
}
```

```js
// ✅ Each responsibility is its own function/module
function validateUser(user) {
  if (!user.email.includes('@')) throw new Error('Invalid email');
}

function saveUser(user) {
  database.save(user);
}

function notifyUser(user) {
  emailService.send(user.email, 'Welcome!');
}

function registerUser(user) {
  validateUser(user);
  saveUser(user);
  notifyUser(user);
}
```

Now a change to *how* emails are sent, or *how* validation rules work, touches only one function instead of risking a regression in the other two concerns.

### O — Open/Closed Principle (OCP)

*Code should be open for extension, but closed for modification* — you should be able to add new behavior without editing existing, already-tested code.

```js
// ❌ Every new shape means editing this function again
function area(shape) {
  if (shape.type === 'circle') return Math.PI * shape.radius ** 2;
  if (shape.type === 'square') return shape.side ** 2;
  // adding a triangle means coming back here and risking the existing branches
}
```

```js
// ✅ New shapes "plug in" without touching existing code
class Circle {
  constructor(radius) { this.radius = radius; }
  area() { return Math.PI * this.radius ** 2; }
}

class Square {
  constructor(side) { this.side = side; }
  area() { return this.side ** 2; }
}

// Adding Triangle later means writing a new class, not editing area()
function totalArea(shapes) {
  return shapes.reduce((sum, shape) => sum + shape.area(), 0);
}
```

### L — Liskov Substitution Principle (LSP)

*A subclass should be usable anywhere its parent class is expected, without breaking the caller's assumptions.*

```js
// ❌ Square "is-a" Rectangle in geometry, but not in behavior here
class Rectangle {
  setWidth(w) { this.width = w; }
  setHeight(h) { this.height = h; }
  area() { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w) { this.width = this.height = w; } // surprise: changes height too!
  setHeight(h) { this.width = this.height = h; }
}

function resizeAndCheck(rect) {
  rect.setWidth(4);
  rect.setHeight(5);
  console.log(rect.area()); // expected 20 for any Rectangle — Square silently gives 25
}
```

`Square` technically extends `Rectangle`, but it breaks a caller's reasonable assumption ("setting width doesn't change height"), so it's not a valid substitute. The fix is usually to stop modeling `Square` as a subclass of `Rectangle` at all, and instead give both a shared, narrower interface (e.g. a `Shape` with just `area()`), or compose rather than inherit.

### I — Interface Segregation Principle (ISP)

*Don't force a class to depend on methods it doesn't use.* JavaScript has no formal `interface` keyword, so this shows up as "don't make objects implement a big bag of methods when they only need a few."

```js
// ❌ One fat "interface" (just a shape every implementer must match)
const workerDuties = {
  work() {},
  eat() {},
  sleep() {},
};

class RobotWorker {
  work() { /* ... */ }
  eat() { throw new Error('Robots do not eat'); }   // forced to implement, meaninglessly
  sleep() { throw new Error('Robots do not sleep'); }
}
```

```js
// ✅ Split into smaller, focused contracts
const Workable = { work() {} };
const Eatable = { eat() {} };
const Sleepable = { sleep() {} };

class RobotWorker {
  work() { /* ... */ } // only implements what it actually needs
}

class HumanWorker {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
}
```

### D — Dependency Inversion Principle (DIP)

*High-level code shouldn't depend directly on low-level, concrete implementations — both should depend on an abstraction.*

```js
// ❌ ReportGenerator is tightly coupled to one concrete logger
class ConsoleLogger {
  log(msg) { console.log(msg); }
}

class ReportGenerator {
  constructor() {
    this.logger = new ConsoleLogger(); // hardwired — can't swap or mock it
  }
  generate(report) {
    this.logger.log(`Report: ${report}`);
  }
}
```

```js
// ✅ ReportGenerator depends on an abstraction (any object with a .log method),
// and the concrete implementation is handed in from outside
class ReportGenerator {
  constructor(logger) {
    this.logger = logger; // dependency is injected, not constructed internally
  }
  generate(report) {
    this.logger.log(`Report: ${report}`);
  }
}

const consoleGenerator = new ReportGenerator(new ConsoleLogger());
const fileGenerator = new ReportGenerator(new FileLogger());       // swap freely
const testGenerator = new ReportGenerator({ log: jest.fn() });     // trivially mockable
```

## KISS — Keep It Simple, Stupid

Prefer the simplest design that correctly solves the problem at hand. In JS this usually means resisting the urge to reach for a clever one-liner, a generic abstraction, or an extra layer of indirection when a plain `if` statement or a straightforward loop would be just as correct and far easier for the next person to read.

```js
// Overengineered for a one-off check
const isEven = (n) => !Boolean(n % 2);

// Simple, equally correct, and immediately readable
const isEven = (n) => n % 2 === 0;
```

## DRY — Don't Repeat Yourself

Every piece of knowledge in a system should have a single, unambiguous representation. If three functions each hardcode the same tax rate, a change to that rate means hunting down and updating three places — and missing one is a bug waiting to happen.

```js
// ❌ The 0.08 tax rate is a fact repeated in three places
function priceWithTaxA(price) { return price * 1.08; }
function priceWithTaxB(price) { return price + price * 0.08; }
function invoiceTotal(items) {
  return items.reduce((sum, i) => sum + i.price * 1.08, 0);
}
```

```js
// ✅ One source of truth
const TAX_RATE = 0.08;
function applyTax(price) { return price * (1 + TAX_RATE); }
function invoiceTotal(items) {
  return items.reduce((sum, i) => sum + applyTax(i.price), 0);
}
```

### DRY vs. readability, and the rule of three

DRY is a tool, not a religion — chasing it too aggressively can make code *harder* to understand, not easier.

```js
// "DRY" to the point of obscurity: one function trying to serve
// three unrelated call sites by branching on a flag
function process(data, mode) {
  if (mode === 'sum') return data.reduce((a, b) => a + b, 0);
  if (mode === 'avg') return data.reduce((a, b) => a + b, 0) / data.length;
  if (mode === 'csv') return data.join(',');
  // adding a fourth mode means growing this function again,
  // and every caller has to know what "mode" strings are valid
}
```

Three separate, obviously-named functions (`sum`, `average`, `toCsv`) would duplicate the `reduce((a, b) => a + b, 0)` line once, but each one would be trivially understandable on its own, with no shared branching logic to trace through. That's DRY making code *worse*: a small amount of harmless duplication was traded for a tangled, mode-flag-driven function that's actually harder to read, test, and extend.

A practical guideline for when duplication is worth removing is the **rule of three**: the first time you write something, just write it. The second time you need something similar, notice the duplication but tolerate it — you don't yet know if the two cases will stay in sync or diverge. Only on the **third** occurrence do you have enough evidence that it's a real, stable pattern worth extracting into a shared abstraction. Deduplicating after only two occurrences often guesses wrong about what the "real" shared shape is, and the abstraction ends up needing awkward flags and branches to cover cases it didn't anticipate — exactly the trap in the example above.

## YAGNI — You Aren't Gonna Need It

Don't build functionality before it's actually needed, on the speculation that it might be useful someday. Speculative flexibility has a real cost: more code to maintain, more surface area for bugs, and a design shaped around a guess instead of a real requirement.

```js
// ❌ A "reusable" utility library built for every option you can imagine,
// before any of them are actually requested
function formatDate(date, { locale, timezone, format, calendar, fiscalYearStart } = {}) {
  // handles Gregorian, Julian, fiscal years, five locales, three timezones...
  // but the project only ever calls formatDate(date) with no options at all
}
```

```js
// ✅ Build what's needed now; extend when a real second requirement shows up
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
```

If a second caller later genuinely needs a locale option, add `locale` *then* — informed by an actual use case instead of a guess about what "generic" should mean.

## Scenario answers

### Refactoring a function that validates, calls an API, and logs, to follow SRP

Given:

```js
async function submitOrder(order) {
  if (!order.items.length) throw new Error('Empty order');
  const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
  console.log(`Order submitted: ${order.id}`);
  return res.json();
}
```

Split each responsibility into its own unit, and keep `submitOrder` as a thin coordinator:

```js
function validateOrder(order) {
  if (!order.items.length) throw new Error('Empty order');
}

async function postOrder(order) {
  const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
  return res.json();
}

function logOrderSubmission(order) {
  console.log(`Order submitted: ${order.id}`);
}

async function submitOrder(order) {
  validateOrder(order);
  const result = await postOrder(order);
  logOrderSubmission(order);
  return result;
}
```

Each piece can now be tested and changed independently — swapping the logger, or the API call, no longer risks touching validation logic.

### An example where DRY makes code worse

See the `process(data, mode)` example above: merging `sum`, `average`, and `toCsv` into one mode-flag-driven function removes a one-line duplication but introduces a shared function that every caller must understand the *entire* branching logic of, even though they only care about one branch. Keeping three small, named functions — each with a single clear purpose — is more maintainable despite the (harmless) duplication.

### How YAGNI applies when designing a reusable utility library

The instinct when building a "utility library" is to anticipate every consumer it might ever have — locales, formats, plugin hooks, configuration objects — before a single real caller exists. YAGNI says: implement only what the library's *actual, current* consumers need, expose a clean seam (a well-named function, a sensible default) for extending it, and add new options only when a real caller needs them. This keeps the library's surface area small, its tests meaningful (every option is actually exercised by a real use case), and its design driven by evidence instead of speculation.

### Refactoring a tightly coupled class to follow Dependency Inversion

Given:

```js
class OrderService {
  constructor() {
    this.db = new MySqlDatabase(); // concrete, hardcoded dependency
  }
  save(order) {
    this.db.insert('orders', order);
  }
}
```

`OrderService` is married to `MySqlDatabase` — it can't be tested without a real database, and it can't be pointed at a different storage engine. Inverting the dependency means `OrderService` should depend on an abstraction (any object that exposes the operations it needs), not a concrete class:

```js
class OrderService {
  constructor(database) {
    this.db = database; // any object with an `insert` method will do
  }
  save(order) {
    this.db.insert('orders', order);
  }
}

const service = new OrderService(new MySqlDatabase());      // production
const testService = new OrderService({ insert: jest.fn() }); // test, no real DB needed
```

The high-level `OrderService` and the low-level database driver now both depend on the same narrow contract (`insert(table, record)`), and neither one needs to know about the other's concrete implementation.

## Key takeaways

- SOLID is five independent principles — a class can violate one without violating the others, so diagnose and fix them individually.
- KISS and YAGNI are both about resisting unnecessary complexity, just applied at different points: KISS to *how* you solve a problem, YAGNI to *whether* you solve it yet.
- DRY removes duplicated **knowledge**, not duplicated **text** — two pieces of code that happen to look similar but represent different concerns should often stay separate.
- The rule of three is a practical trigger for when to extract a shared abstraction: tolerate the first duplication, be suspicious of the second, extract on the third.

See also [Abstract Classes and Polymorphism](../06-classes-and-oop/abstract-classes-and-polymorphism.md) and [Mixins](../06-classes-and-oop/mixins.md) for more on composing behavior without rigid inheritance, and [Functional Programming](../03-functions-and-scope/functional-programming.md) for a complementary way to keep functions small and single-purpose.

### Interview questions

1. Explain each SOLID principle with a short JavaScript example.
2. What is the practical difference between the Open/Closed Principle and the Single Responsibility Principle?
3. Give an example of a class that technically extends another but violates the Liskov Substitution Principle.
4. What is KISS, and how does it differ from YAGNI?
5. What is DRY, and when can applying it too aggressively make code worse?
6. What is the "rule of three", and why is extracting an abstraction after only two occurrences often premature?
7. Given a function doing validation, an API call, and logging, how would you refactor it to follow SRP?
8. How would YAGNI change the way you design a reusable utility library?
9. Given a class tightly coupled to a concrete dependency, how would you refactor it to follow Dependency Inversion?
