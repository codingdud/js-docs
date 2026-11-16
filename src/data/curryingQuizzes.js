// Question data for the interactive Currying (hard questions + real implementations) quiz.
// (docs/03-functions-and-scope/mcq-currying-hard.md).
// Every code snippet was executed in Node to verify its claimed output before publishing.

export const curryingHardQuestions = [
  {
    code: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
function sumAll(...nums) { return nums.reduce((a, b) => a + b, 0); }
const curriedSum = curry(sumAll);
console.log(curriedSum());
console.log(curriedSum(1, 2, 3));`,
    options: [
      '0 then 6',
      'function then function',
      'TypeError then TypeError',
      'undefined then 6',
    ],
    correctIndex: 0,
    explanation:
      '`fn.length` ignores rest parameters entirely, so `sumAll.length` is `0`. That means `args.length >= fn.length` is true on the *very first* call, no matter how many (or how few) arguments you pass — `curry` never collects anything here, it just invokes `sumAll` immediately every time. This is why a generic `curry(fn)` based on `fn.length` cannot curry variadic functions.',
  },
  {
    code: `function curryN(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
function sumAll(...nums) { return nums.reduce((a, b) => a + b, 0); }
const curriedSum3 = curryN(sumAll, 3);
console.log(curriedSum3(1)(2)(3));
console.log(curriedSum3(1, 2)(3));`,
    options: [
      '6 then NaN',
      '6 then 6',
      'NaN then NaN',
      'TypeError (throws) then TypeError (throws)',
    ],
    correctIndex: 1,
    explanation:
      'Passing an explicit `arity` (instead of trusting `fn.length`) is the standard fix for currying variadic/rest-param functions — it tells `curry` exactly how many arguments to wait for before calling `fn`, regardless of how `fn` declares its parameters.',
  },
  {
    code: `function add(a) {
  function curried(b) {
    return add(a + b);
  }
  curried.valueOf = () => a;
  return curried;
}
console.log(add(1)(2)(3) + 0);
console.log(\`\${add(1)(2)(3)}\`);`,
    options: [
      'TypeError then TypeError',
      '"[object Function]" then 6',
      '6 then the function\'s own source code (as a string)',
      '6 then "6"',
    ],
    correctIndex: 2,
    explanation:
      'This is the classic "curry chain that also works as a number" trick: overriding `valueOf` fixes the **number** hint, so `+ 0` resolves via `ToPrimitive` to `6`. But a template literal uses the **string** hint, which tries `toString()` *before* `valueOf()` — and since no `toString` was defined, it falls back to `Function.prototype.toString()`, printing the curried function\'s own source code instead of `"6"`.',
  },
  {
    code: `function add(a) {
  function curried(b) {
    return add(a + b);
  }
  curried.valueOf = () => a;
  curried.toString = () => String(a);
  return curried;
}
console.log(add(1)(2)(3) + 0);
console.log(\`\${add(1)(2)(3)}\`);
console.log(add(1)(2)(3) == 6);`,
    options: [
      '6, "6", false',
      '6, the function\'s source code, true',
      'TypeError (throws)',
      '6, "6", true',
    ],
    correctIndex: 3,
    explanation:
      'Defining both `valueOf` and `toString` fixes both hints: `+ 0` uses the number hint (`valueOf` → `6`), the template literal uses the string hint (`toString` → `"6"`), and `==` uses the "default" hint, which tries `valueOf` first for ordinary objects — so `6 == 6` is `true`. This lets `add(1)(2)(3)` behave like both a callable curry chain *and* a plain number.',
  },
  {
    code: `const _ = Symbol('placeholder');
function curry(fn) {
  return function curried(...args) {
    const hasPlaceholder = args.includes(_);
    if (args.length >= fn.length && !hasPlaceholder) return fn(...args);
    return (...more) => {
      const merged = [];
      let mi = 0;
      for (const a of args) merged.push(a === _ ? more[mi++] : a);
      merged.push(...more.slice(mi));
      return curried(...merged);
    };
  };
}
function volume(l, w, h) { return l * w * h; }
const curried = curry(volume);
console.log(curried(_, 2, 3)(5));`,
    options: [
      'NaN',
      '30',
      '10',
      'TypeError (throws)',
    ],
    correctIndex: 1,
    explanation:
      'A placeholder symbol (`_`, the way Ramda\'s `R.__` works) marks "fill this slot later." `curried(_, 2, 3)(5)` slots the `5` into the placeholder\'s position, giving `volume(5, 2, 3)` — `5 * 2 * 3 = 30`. This lets you fix the *later* arguments while leaving an earlier one open, which plain left-to-right currying can\'t do.',
  },
  {
    code: `const _ = Symbol('placeholder');
function curry(fn) {
  return function curried(...args) {
    const hasPlaceholder = args.includes(_);
    if (args.length >= fn.length && !hasPlaceholder) return fn(...args);
    return (...more) => {
      const merged = [];
      let mi = 0;
      for (const a of args) merged.push(a === _ ? more[mi++] : a);
      merged.push(...more.slice(mi));
      return curried(...merged);
    };
  };
}
function volume(l, w, h) { return l * w * h; }
const curried = curry(volume);
console.log(curried(_, 10, _)(2, 4));`,
    options: [
      '20',
      '40',
      '80',
      'TypeError (throws)',
    ],
    correctIndex: 2,
    explanation:
      'Two placeholders get filled left-to-right by the next call\'s arguments: `_` → `2`, `10` stays fixed, `_` → `4`, giving `volume(2, 10, 4) = 80`. Multiple placeholders in one partial call are filled in the order they appear, not the order the fixed arguments appear.',
  },
  {
    code: `function deepCurry(fn) {
  return function curried(...args) {
    const result = fn(...args);
    return typeof result === 'function' ? deepCurry(result) : result;
  };
}
const configure = (env) => (region) => (timeout) => \`\${env}-\${region}-\${timeout}\`;
const dc = deepCurry(configure);
console.log(dc('prod')('us-east')(30));
console.log(dc('prod', 'us-east', 30));`,
    options: [
      '"prod-us-east-30" then "prod-us-east-30"',
      'TypeError then TypeError',
      '"prod-us-east-30" then undefined',
      '"prod-us-east-30" then a function (not fully resolved)',
    ],
    correctIndex: 3,
    explanation:
      '`deepCurry` re-wraps whatever `fn(...args)` returns if *that* is itself a function — useful for auto-currying a hand-written chain like `configure`. But it always forwards every argument from one call straight into a single `fn(...args)` invocation; it never splits multiple arguments across the chain\'s separate unary steps. Since `configure` only consumes its first parameter per step, `dc(\'prod\', \'us-east\', 30)` calls `configure(\'prod\', \'us-east\', 30)` — the extra arguments are silently ignored — and returns the still-waiting `region` function, not the final string.',
  },
  {
    code: `function memoizeCurry(fn) {
  const cache = new Map();
  return function curried(...args) {
    if (args.length >= fn.length) {
      const key = args.join(',');
      if (!cache.has(key)) {
        console.log('computing', key);
        cache.set(key, fn(...args));
      }
      return cache.get(key);
    }
    return (...more) => curried(...args, ...more);
  };
}
function add(a, b) { return a + b; }
const madd = memoizeCurry(add);
console.log(madd(1)(2));
console.log(madd(1)(2));
console.log(madd(1, 2));`,
    options: [
      'Once; 3, 3, 3',
      'Three times; 3, 3, 3',
      'Once; 3, 3, NaN',
      'Zero times; 3, 3, 3',
    ],
    correctIndex: 0,
    explanation:
      'The cache lives in the closure around `fn`, not inside any single curried-call chain — so it\'s shared across every differently-shaped call. `"computing 1,2"` logs only on the very first completed call; the second `madd(1)(2)` and the third `madd(1, 2)` both hit the same `"1,2"` cache key (built from the final argument list, not the call shape) and skip straight to the cached `3`.',
  },
  {
    code: `function curryRight(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...more, ...args);
  };
}
function subtract(a, b, c) { return a - b - c; }
const cr = curryRight(subtract);
console.log(cr(1)(2)(3));`,
    options: [
      '-4',
      'TypeError (throws)',
      '0',
      '2',
    ],
    correctIndex: 2,
    explanation:
      '`curryRight` prepends each newly-supplied argument *before* the ones already collected, so arguments end up filled right-to-left: the `1` supplied first ends up as the **last** parameter (`c`), and the `3` supplied last ends up as the **first** (`a`). The final call is `subtract(3, 2, 1) = 3 - 2 - 1 = 0`.',
  },
  {
    code: `const curry = (fn) => (...args) =>
  args.length >= fn.length ? fn(...args) : (...more) => curry(fn)(...args, ...more);
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x);

const add = curry((a, b) => a + b);
const multiply = curry((a, b) => a * b);
const pipeline = compose(add(1), multiply(2));
console.log(pipeline(3));`,
    options: [
      '6',
      '8',
      'TypeError (throws)',
      '7',
    ],
    correctIndex: 3,
    explanation:
      '`add(1)` and `multiply(2)` are each partially-applied curried functions, still waiting for one more argument. `compose` runs right-to-left: `multiply(2)(3)` first (`= 6`), then feeds that into `add(1)` (`= 7`). Currying is what makes `add(1)` and `multiply(2)` valid single-argument functions that `compose` can chain.',
  },
  {
    code: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
function greet(greeting, name = "World") { return \`\${greeting}, \${name}!\`; }
const curriedGreet = curry(greet);
console.log(curriedGreet("Hello"));`,
    options: [
      '"Hello, World!" — immediately, without waiting for a second call',
      'A function still waiting for the `name` argument',
      'TypeError (throws)',
      '"Hello, undefined!"',
    ],
    correctIndex: 0,
    explanation:
      '`fn.length` stops counting at the first parameter with a default value, so `greet.length` is `1`, not `2`. `curriedGreet("Hello")` already satisfies `args.length >= fn.length`, so it calls `greet("Hello")` right away — `name` falls back to its default `"World"` instead of ever getting its own curried step.',
  },
  {
    prompt: 'Predict the output (run as a non-strict classic script, not a module):',
    code: `const obj = {
  factor: 10,
  multiply: function (a, b) { return a * b * this.factor; },
};
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...more) => curried.apply(this, [...args, ...more]);
  };
}
obj.curriedMultiply = curry(obj.multiply);
console.log(obj.curriedMultiply(2)(3));

const cm = obj.curriedMultiply;
console.log(cm(2)(3));`,
    options: [
      'TypeError then TypeError',
      '60 then NaN',
      '60 then 60',
      'NaN then NaN',
    ],
    correctIndex: 1,
    explanation:
      '`curried` is a regular function, so `this` comes from the call-site. Calling `obj.curriedMultiply(2)` sets `this = obj` for that whole chain (the arrow-function continuation closes over it), giving `2 * 3 * 10 = 60`. But `cm` is the *same function* called standalone — `this` falls back to the global object in non-strict mode, `this.factor` is `undefined`, and `undefined` poisons the arithmetic to `NaN`. This is `this`-loss-on-extraction, not anything specific to currying.',
  },
  {
    code: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
function sum4(a, b, c, d) { return a + b + c + d; }
const c4 = curry(sum4);
console.log(c4(1, 2, 3, 4, 5));`,
    options: [
      '15',
      'TypeError (throws)',
      '"12345" (string concatenation)',
      '10',
    ],
    correctIndex: 3,
    explanation:
      '`args.length` (5) only needs to be `>= fn.length` (4) to trigger the call — it doesn\'t need to *equal* it. `curry` happily forwards all 5 arguments into `sum4(...args)`, but `sum4` only declares (and uses) `a, b, c, d`; the 5th argument is silently dropped, just like calling any plain function with too many arguments. `1 + 2 + 3 + 4 = 10`.',
  },
  {
    code: `function sum(a) {
  return function (b) {
    if (b === undefined) return a;
    return sum(a + b);
  };
}
const step = sum(1)(2);
console.log(typeof step);
console.log(step(3)());
console.log(step());`,
    options: [
      '"function", 6, 3',
      '"number", 6, 3',
      '"function", 6, 6',
      'TypeError on the second `step()` (already "used up")',
    ],
    correctIndex: 0,
    explanation:
      '`step` is just a closure over `a = 3` — calling it doesn\'t mutate or consume anything. `typeof step` is `"function"`. `step(3)()` branches off into its own new closure (`sum(3 + 3)` then finalized) and returns `6`, completely independent of what happens to `step` afterward. `step()` (called with no argument) still returns its own `a`, which is `3` — the same `step` can be called as many times, and in as many different ways, as you like.',
  },
  {
    code: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
async function fetchResource(id, token) { return \`\${id}:\${token}\`; }
const curriedFetch = curry(fetchResource);
console.log(curriedFetch(1)(2) instanceof Promise);`,
    options: [
      '"1:2" (resolved synchronously, since both args were supplied)',
      'true',
      'false',
      'TypeError (throws)',
    ],
    correctIndex: 1,
    explanation:
      'The `async` keyword doesn\'t change `fn.length` — it\'s still counted as `2` declared parameters. Once `curry` has collected enough arguments, it calls `fetchResource(1, 2)` exactly like any other function; `curry` itself never `await`s the result. An `async` function *always* returns a `Promise` synchronously (it\'s the resolved value `"1:2"` that only arrives later) — so the curried call hands back a `Promise`, not the string.',
  },
  {
    code: `function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}
function log(tag) { console.log('eval', tag); return tag; }
function add3(a, b, c) { return a + b + c; }
const curriedAdd3 = curry(add3);

const step1 = curriedAdd3(log('a'));
console.log('--- step1 done ---');
const step2 = step1(log('b'));
console.log('--- step2 done ---');
const result = step2(log('c'));
console.log(result);`,
    options: [
      'eval a → --- step1 done --- → eval b → --- step2 done --- → eval c → aNaNc',
      'TypeError (throws)',
      'eval a → --- step1 done --- → eval b → --- step2 done --- → eval c → abc',
      'eval a → eval b → eval c → --- step1 done --- → --- step2 done --- → abc',
    ],
    correctIndex: 2,
    explanation:
      'Currying only defers *calling* `add3` — it does **not** defer evaluating each argument expression you pass in along the way. `log(\'a\')` runs the instant that line executes (ordinary eager JS argument evaluation), long before `add3` itself is ever called with all three pieces. The three `log(...)` calls interleave with the `--- step done ---` lines in the exact order the code runs; only the very last step actually invokes `add3(\'a\', \'b\', \'c\')`, which concatenates as strings (`"abc"`) since none of the pieces were coerced to numbers.',
  },
];
