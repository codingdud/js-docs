// Question data for the interactive `this` & function-binding quizzes
// (docs/03-functions-and-scope/mcq-this-fundamentals.md and mcq-this-advanced.md).

export const fundamentalsQuestions = [
  {
    code: `const obj = {
  val: 23,
  add: function (num) { return this.val + num; }
};
console.log(obj.add(12));`,
    options: ['12', 'TypeError', '35', '23'],
    correctIndex: 2,
    explanation: '`obj.add()` is called through `obj`, so `this = obj`.',
  },
  {
    code: `const obj1 = { val: 23, add: function (num) { return this.val + num; } };
const obj2 = { val: 321 };
obj2.add = obj1.add;
console.log(obj1.add(12));
console.log(obj2.add(23));`,
    options: ['35 then 344', '35 then 35', '344 then 344', 'TypeError then 344'],
    correctIndex: 0,
    explanation: 'Same function, different receiver each call — `this` is whichever object calls it.',
  },
  {
    code: `"use strict";

const obj = {
  val: 20,
  show: function () { return this.val; }
};

const fn = obj.show;

console.log(fn());`,
    options: ['20', 'undefined', 'ReferenceError', 'TypeError'],
    correctIndex: 3,
    explanation: '`fn()` is a standalone call; strict mode leaves `this` as `undefined`, so `.val` throws.',
  },
  {
    code: `const parent = { val: 10, show() { return this.val; } };
const child = Object.create(parent);
child.val = 100;
console.log(child.show());
console.log(parent.show());`,
    options: ['undefined then 10', '100 then 10', '10 then 10', '100 then 100'],
    correctIndex: 1,
    explanation: 'The method is inherited, but `this` is always the object that made the call.',
  },
  {
    code: `"use strict";
const obj = {
  val: 10,
  outer: function () {
    function inner() { return this; }
    return inner();
  }
};
console.log(obj.outer());`,
    options: ['undefined', '10', 'TypeError', 'obj'],
    correctIndex: 0,
    explanation: 'A nested normal function call does not inherit the outer `this`.',
  },
  {
    code: `const obj = {
  val: 10,
  outer: function () {
    const inner = () => this.val;
    return inner();
  }
};
console.log(obj.outer());`,
    options: ['undefined', 'obj', 'TypeError', '10'],
    correctIndex: 3,
    explanation: 'Arrow functions inherit `this` lexically from the enclosing function.',
  },
  {
    code: `const obj = {
  val: 20,
  outer() {
    function inner() { return this.val; }
    return inner.call(this);
  }
};
console.log(obj.outer());`,
    options: ['TypeError', '20', 'undefined', 'NaN'],
    correctIndex: 1,
    explanation: '`inner.call(this)` explicitly forwards `outer`\'s `this`.',
  },
  {
    code: `const obj = {
  val: 10,
  outer() {
    function inner() {
      const arrow = () => this.val;
      return arrow();
    }
    return inner.call({ val: 50 });
  }
};
console.log(obj.outer());`,
    options: ['undefined', 'NaN', '50', '10'],
    correctIndex: 2,
    explanation: '`inner`\'s `this` becomes a new object with `val: 50`, and the arrow inherits that.',
  },
  {
    code: `const obj1 = { val: 10, add(num) { return this.val + num; } };
const obj2 = { val: 50 };
console.log(obj1.add.call(obj2, 20));`,
    options: ['30', '50', '90', '70'],
    correctIndex: 3,
    explanation: '`call(obj2, 20)` runs `add` with `this = obj2` (50 + 20).',
  },
  {
    code: `function add(a, b) { return this.val + a + b; }
const obj = { val: 100 };
console.log(add.apply(obj, [10, 20]));`,
    options: ['130', '30', '100', '120'],
    correctIndex: 0,
    explanation: '`apply()` sets `this = obj` and spreads the array as arguments (100+10+20).',
  },
  {
    code: `function show() { return this.val; }
const obj1 = { val: 10 }, obj2 = { val: 100 };
const fn = show.bind(obj1);
console.log(fn());
console.log(fn.call(obj2));`,
    options: ['100 then 100', 'TypeError then 10', '10 then 100', '10 then 10'],
    correctIndex: 3,
    explanation: 'Once bound, a later `.call()` cannot override `this` for an ordinary call.',
  },
  {
    prompt: 'Predict the output (runs as an ES module):',
    code: `const obj = {
  val: 10,
  normal: function () { return this.val; },
  arrow: () => this?.val
};
console.log(obj.normal());
console.log(obj.arrow());`,
    options: ['10 then TypeError', '10 then undefined', '10 then 10', 'undefined then undefined'],
    correctIndex: 1,
    explanation: 'The arrow is defined at the top level, so it captures module `this` (`undefined`), not `obj`.',
  },
  {
    code: `function create() {
  return { val: 100, arrow: () => this.val, normal() { return this.val; } };
}
const obj = create.call({ val: 50 });
console.log(obj.arrow());
console.log(obj.normal());`,
    options: ['100 then 50', '50 then 50', '100 then 100', '50 then 100'],
    correctIndex: 3,
    explanation: '`arrow` captured `create()`\'s `this` (`val: 50`); `normal()` uses the returned object (`val: 100`) as receiver.',
  },
  {
    code: `function makeArrow() { return () => this.val; }
const arrow = makeArrow.call({ val: 40 });
console.log(arrow.call({ val: 90 }));
console.log(arrow.bind({ val: 200 })());`,
    options: ['40 then 40', '90 then 200', '40 then 200', '90 then 40'],
    correctIndex: 0,
    explanation: 'An arrow\'s `this` is fixed lexically; `call()`/`bind()` can never change it.',
  },
  {
    code: `function show() { "use strict"; return this; }
console.log(show() === undefined);`,
    options: ['TypeError', 'comparison is invalid', 'true', 'false'],
    correctIndex: 2,
    explanation: 'A standalone strict-mode call gets `this = undefined`.',
  },
  {
    prompt: 'Predict the output (run as a non-strict classic script, not a module):',
    code: `function show() { return this === globalThis; }
console.log(show());`,
    options: ['ReferenceError', 'true', 'false', 'TypeError'],
    correctIndex: 1,
    explanation: 'In a non-strict standalone call, `this` defaults to the global object.',
  },
  {
    code: `function outer() {
  "use strict";
  const arrow = () => this?.val;
  return arrow();
}
console.log(outer.call({ val: 30 }));
console.log(outer());`,
    options: ['30 then 30', 'undefined then undefined', '30 then TypeError', '30 then undefined'],
    correctIndex: 3,
    explanation: 'The arrow inherits whatever `this` `outer()` was called with; strict mode governs the `outer()` call itself, not the arrow\'s lexical rule.',
  },
  {
    code: `class User {
  constructor(name) { this.name = name; }
  show() { return this.name; }
}
const user = new User("Alex");
const fn = user.show;
console.log(fn());`,
    options: ['TypeError', '"Alex"', 'undefined', 'ReferenceError'],
    correctIndex: 0,
    explanation: 'Class bodies are always strict; extracting the method loses the instance receiver.',
  },
  {
    code: `const parent = {
  val: 10,
  normal() { return this.val; },
  makeArrow() { return () => this.val; }
};
const child = Object.create(parent);
child.val = 30;
const normal = child.normal;
const arrow = child.makeArrow();
console.log(normal.call({ val: 80 }));
console.log(arrow.call({ val: 80 }));`,
    options: ['30 then 30', '80 then 30', '30 then 80', '80 then 80'],
    correctIndex: 1,
    explanation: '`normal` is a plain function, so `.call()` controls its `this`; `arrow` was created while `this = child`, so it keeps returning 30 regardless of `.call()`.',
  },
  {
    code: `const obj1 = {
  val: 10,
  outer() {
    const arrow = () => this.val;
    function normal() { return this.val; }
    return { arrow, normal };
  }
};
const obj2 = { val: 50 };
const result = obj1.outer.call(obj2);
console.log(result.arrow());
console.log(result.normal.call(obj1));
const boundArrow = result.arrow.bind(obj1);
console.log(boundArrow());`,
    options: ['50, 50, 50', '10, 10, 10', '50, 10, 50', '10, 50, 10'],
    correctIndex: 2,
    explanation: '`outer` ran with `this = obj2`, so `arrow` is locked to `obj2` (50) forever, even after `.bind(obj1)`. `normal` is a plain function, so `.call(obj1)` makes it return 10.',
  },
];

export const advancedQuestions = [
  {
    code: `const obj = { x: 10, show() { return this?.x; } };
console.log((obj.show)());
console.log((0, obj.show)());`,
    options: ['undefined then undefined', 'undefined then 10', '10 then undefined', '10 then 10'],
    correctIndex: 2,
    explanation: 'Parentheses keep `obj` as the receiver; the comma operator yields a bare function value, so `this` is lost.',
  },
  {
    code: `const obj = { x: 10, show() { return this?.x; } };
console.log(obj.show?.());
console.log((true ? obj.show : null)());`,
    options: ['10 then undefined', 'undefined then 10', '10 then 10', 'undefined then undefined'],
    correctIndex: 0,
    explanation: 'Optional chaining preserves the receiver; the conditional expression returns a standalone function.',
  },
  {
    code: `const obj = {
  x: 50,
  get show() { return function () { return this?.x; }; }
};
console.log(obj.show());
const fn = obj.show;
console.log(fn());`,
    options: ['50 then 50', 'undefined then 50', '50 then undefined', '10 then 10'],
    correctIndex: 2,
    explanation: '`obj.show()` calls the returned function with `this = obj`; extracting it into `fn` strips that receiver.',
  },
  {
    code: `function factory() {
  return { normal: function () { return this?.x; }, arrow: () => this.x };
}
const a = factory.call({ x: 10 });
const b = { x: 20, ...a };
console.log(b.normal());
console.log(b.arrow());`,
    options: ['10 then 20', '20 then 10', '20 then 20', '10 then 10'],
    correctIndex: 1,
    explanation: '`normal` uses `b` as its receiver; the arrow permanently kept the `this` from the `factory()` call.',
  },
  {
    code: `function show() { return this.x; }
const fn1 = show.bind({ x: 10 });
const fn2 = fn1.bind({ x: 20 });
console.log(fn1());
console.log(fn2());
console.log(fn2.call({ x: 30 }));`,
    options: ['10, 20, 30', '10, 20, 20', '20, 20, 30', '10, 10, 10'],
    correctIndex: 3,
    explanation: 'Once `this` is bound, no further `bind()` or `call()` can replace it for ordinary calls.',
  },
  {
    code: `function Person(name) { this.name = name; }
const obj = { name: "Original" };
const BoundPerson = Person.bind(obj, "Alex");
const p = new BoundPerson();
console.log(p.name);
console.log(obj.name);
console.log(p instanceof Person);`,
    options: ['"Alex", "Original", true', '"Alex", "Alex", true', '"Original", "Original", true', '"Alex", "Original", false'],
    correctIndex: 0,
    explanation: '`new` always builds a fresh instance and ignores the bound `this`; the preset argument "Alex" still applies.',
  },
  {
    prompt: 'Predict the output (run as a non-strict classic script, not a module):',
    code: `function loose() { return typeof this; }
function strict() { "use strict"; return typeof this; }
console.log(loose.call(7));
console.log(strict.call(7));`,
    options: ['"number" then "number"', '"object" then "object"', '"object" then "number"', '"number" then "object"'],
    correctIndex: 2,
    explanation: 'Non-strict functions box a primitive `this` into a wrapper object; strict functions keep it as-is.',
  },
  {
    code: `function calculate(a, b) { return this.x + a + b; }
const fn = calculate.bind({ x: 5 }, 10);
console.log(fn.call({ x: 100 }, 20));`,
    options: ['15', '35', '130', '30'],
    correctIndex: 1,
    explanation: '`bind` already fixed `this.x = 5` and `a = 10`; the later call only supplies `b = 20` (5+10+20).',
  },
  {
    code: `class User {
  constructor(x) { this.x = x; }
  arrow = () => this.x;
  normal() { return this.x; }
}
const a = new User(10), b = new User(20);
b.arrow = a.arrow;
b.normal = a.normal;
console.log(b.arrow());
console.log(b.normal());`,
    options: ['10 then 20', '20 then 10', '10 then 10', '20 then 20'],
    correctIndex: 0,
    explanation: 'The class-field arrow permanently captured instance `a`; the normal method uses whoever calls it (`b`).',
  },
  {
    code: `const parent = {
  _x: 1,
  get x() { return this._x; },
  set x(value) { this._x = value; }
};
const child = Object.create(parent);
child.x = 8;
console.log(child.x);
console.log(parent.x);
console.log(Object.hasOwn(child, "x"));
console.log(Object.hasOwn(child, "_x"));`,
    options: ['8, 1, true, true', '1, 1, false, false', '8, 1, false, true', '8, 8, true, true'],
    correctIndex: 2,
    explanation: 'The inherited setter runs with `this = child`, creating an own `child._x` (not `child.x`); `parent._x` is untouched.',
  },
  {
    code: `class Parent { show() { return this.x; } }
class Child extends Parent { show() { return super.show() * 2; } }
const child = new Child();
child.x = 10;
const fn = child.show;
console.log(child.show());
console.log(fn.call({ x: 50 }));`,
    options: ['100 then 20', '20 then 20', '10 then 50', '20 then 100'],
    correctIndex: 3,
    explanation: '`super.show()` resolves the method on `Parent.prototype` but still uses the current `this`; borrowing the method only changes `this`, not which method `super` points to.',
  },
  {
    code: `class Counter {
  #count = 10;
  getCount() { return this.#count; }
}
const counter = new Counter();
console.log(counter.getCount());
try { console.log(counter.getCount.call({})); }
catch (err) { console.log(err.name); }`,
    options: ['"TypeError" then "TypeError"', '10 then "TypeError"', '10 then 10', '10 then undefined'],
    correctIndex: 1,
    explanation: 'Private fields only exist on instances that declared them; a borrowed call on a plain `{}` throws.',
  },
  {
    code: `function create() {
  return { x: 5, arrow: () => this.x, normal() { return this.x; } };
}
const source = create.call({ x: 40 });
const target = Object.assign({}, source, { x: 90 });
console.log(target.arrow());
console.log(target.normal());`,
    options: ['40 then 90', '90 then 40', '40 then 40', '90 then 90'],
    correctIndex: 0,
    explanation: '`Object.assign` copies the function references only; the arrow keeps its original lexical `this` (40), while `normal()` uses `target` (90).',
  },
  {
    code: `function calculate() {
  const nums = [1, 2];
  const normal = nums.map(function (n) { return this.x + n; }, { x: 100 });
  const arrow = nums.map(n => this.x + n, { x: 100 });
  return [normal, arrow];
}
console.log(calculate.call({ x: 10 }));`,
    options: ['[[11,12],[11,12]]', '[[101,102],[101,102]]', '[[111,112],[11,12]]', '[[101,102],[11,12]]'],
    correctIndex: 3,
    explanation: '`map`\'s `thisArg` (`{x:100}`) applies to the normal callback; an arrow ignores `thisArg` and uses `calculate()`\'s `this` (10).',
  },
  {
    code: `const obj = { x: 10, async show() { await Promise.resolve(); return this.x; } };
const fn = obj.show;
Promise.allSettled([obj.show(), fn(), fn.call({ x: 30 })]).then(r =>
  console.log(r.map(x => x.status === "fulfilled" ? x.value : x.reason.name))
);`,
    options: ['[10, 30, "TypeError"]', '[10, "TypeError", 30]', '[10, 10, 30]', '["TypeError","TypeError",30]'],
    correctIndex: 1,
    explanation: '`await` never changes `this`; the extracted `fn()` call has no receiver and rejects, while `.call()` supplies one explicitly.',
  },
  {
    code: `function outer(a, b) {
  return { arrow: () => arguments[0], normal: function () { return arguments[0]; } };
}
const obj = outer(10, 20);
console.log(obj.arrow(99));
console.log(obj.normal(99));`,
    options: ['10 then 10', '99 then 99', '10 then 99', '99 then 10'],
    correctIndex: 2,
    explanation: 'An arrow has no `arguments` of its own and uses the enclosing function\'s; a normal function gets its own fresh `arguments`.',
  },
  {
    code: `const target = { x: 10, show() { return this.x; } };
const proxy = new Proxy(target, {
  get(obj, key, receiver) {
    if (key === "x") return 99;
    return Reflect.get(obj, key, receiver);
  }
});
console.log(target.show());
console.log(proxy.show());`,
    options: ['99 then 10', '10 then 10', '99 then 99', '10 then 99'],
    correctIndex: 3,
    explanation: '`proxy.show()` runs with `this = proxy`, so reading `this.x` goes through the proxy\'s `get` trap.',
  },
  {
    code: `let value = 10;
const obj = { get x() { return value; }, set x(v) { value = v; } };
Object.freeze(obj);
obj.x = 99;
console.log(obj.x);
console.log(Object.isFrozen(obj));`,
    options: ['99 then true', '10 then true', '99 then false', '10 then false'],
    correctIndex: 0,
    explanation: '`Object.freeze` blocks writes to data properties and descriptor changes, but an existing accessor\'s setter still runs and can mutate outside state.',
  },
];
