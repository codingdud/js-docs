---
title: "Testing JS Polyfills with TypeScript and Jest"
sidebar_position: 4
---

# Testing JS Polyfills with TypeScript and Jest

A common setup for a polyfill project is: write the polyfills themselves in plain JavaScript, but write the *tests* in TypeScript with Jest. That split sounds unusual — why add a compiler to test code that doesn't use it? — but it buys real type safety and editor autocompletion for the tests, while the polyfills themselves stay as close as possible to the vanilla JS they're meant to patch.

This page walks through that project's workflow, configuration files, and the gotchas that actually show up when you wire TypeScript, Jest, and global prototype patches together.

## Project layout and workflow

```text
polyfill/
├── array.js              # Array method polyfills (map, forEach, reduce, filter, fill)
├── cacheLru.js            # LRU cache with memoization
├── Throttling.js          # Throttling implementations
├── callbindapply.js       # Function.prototype polyfills (call, apply, bind)
│
├── __tests__/             # TypeScript test files
│   ├── array.test.ts
│   ├── cacheLru.test.ts
│   ├── Throttling.test.ts
│   └── callbindapply.test.ts
│
├── types/
│   ├── polyfills.d.ts      # Type declarations for the polyfills
│   └── jest.d.ts           # Explicit global typings for Jest's test functions
│
├── tsconfig.json
├── jest.config.js
├── package.json
├── setup.bat               # Windows dependency-install script
└── setup.sh                # (referenced, but see "Troubleshooting" below)
```

The intended day-to-day workflow is:

1. **Write the polyfill** in plain JavaScript (e.g. `array.js`), attaching it to the relevant built-in prototype.
2. **Add type definitions** for it in `types/polyfills.d.ts`, so the TypeScript test files know the new method exists and what it's typed as.
3. **Write the test** in TypeScript (e.g. `__tests__/array.test.ts`).
4. **Run the tests** with `npm test`.
5. **Check coverage** with `npm run test:coverage`.

## `package.json` scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose",
    "test:single": "jest --testNamePattern"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.19",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.3.3"
  }
}
```

`test:single` is meant to be followed by a pattern argument, e.g. `npm run test:single -- "mymap"`, to run only tests whose name matches.

## `jest.config.js`

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/dist/'],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  // Timeout for async tests (useful for throttling tests)
  testTimeout: 10000
};
```

The key setting is `preset: 'ts-jest'`: it tells Jest to compile each `.ts` test file with the TypeScript compiler (via `ts-jest`) before running it, using the project's own `tsconfig.json`. Without it, Jest wouldn't know what to do with `.ts` files at all. `testTimeout: 10000` matters specifically for the throttling tests — anything that waits on real or faked timers needs more than Jest's 5-second default to be safe.

## `tsconfig.json` and `allowJs`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["jest", "node"],
    "typeRoots": ["./node_modules/@types", "./types"],
    "moduleResolution": "bundler",
    "ignoreDeprecations": "6.0"
  },
  "include": ["**/*.ts", "**/*.js", "types/**/*.d.ts"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

Two settings do most of the work here:

- **`allowJs: true`** — lets TypeScript (and therefore `ts-jest`) pull plain `.js` files like `array.js` into the compilation, which is required for a test to `require('../array.js')` and have TypeScript understand the result.
- **`checkJs: false`** — explicitly turns *off* type-checking for those `.js` files. TypeScript will still parse and include them (because of `allowJs`), but it won't flag type errors inside them. This is what lets the polyfills stay plain, un-annotated JavaScript while the `.ts` test files around them are fully strict-mode checked.

`typeRoots: ["./node_modules/@types", "./types"]` is what makes the project's own hand-written `types/*.d.ts` files available globally, on equal footing with `@types/jest` and `@types/node` — without it, TypeScript would only look in `node_modules/@types` and never pick up `types/polyfills.d.ts` or `types/jest.d.ts` at all.

## `declare global` needs `export {}`

`types/polyfills.d.ts` augments the built-in `Array` and `Function` interfaces so that TypeScript knows about the custom methods the polyfills attach at runtime:

```ts
// types/polyfills.d.ts
declare global {
  interface Array<T> {
    mymap<U>(callbackfn: (value: T, index: number) => U): U[];
    myForEach(callbackfn: (value: T, index: number) => void): void;
    myReduce<U>(
      callbackfn: (accumulator: U, value: T, index: number) => U,
      initialValue: U
    ): U;
  }

  interface Function {
    mycall(context: any, ...args: any[]): any;
    myapply(context: any, args: any[]): any;
    mybind(...args: any[]): Function;
  }
}

declare function memoization<T extends (...args: any[]) => any>(
  fn: T,
  ...args: Parameters<T>
): ReturnType<T>;

export {};
```

That final `export {}` is not decorative — it's required. A `.d.ts` file with no top-level `import`/`export` is treated by TypeScript as a **global script**, and everything it declares merges straight into the global scope as ambient declarations. A `declare global { ... }` block, however, is only valid **inside a module**: its entire purpose is to reach *out* from a module's own scope and merge additions into the global scope. Without at least one `import` or `export` statement in the file, TypeScript doesn't consider it a module, and the `declare global` block itself becomes a (confusing) compiler error. Adding `export {}` — an empty export list — is the idiomatic way to mark a file as a module without actually exporting anything, which is exactly what's needed here.

## `jest.d.ts` and the `it` clash with a generator variable

```ts
// types/jest.d.ts
/// <reference types="jest" />

declare global {
  // This ensures 'it' is recognized as Jest's test function, not a generator
  const it: jest.It;
  const test: jest.It;
  const describe: jest.Describe;
  const expect: jest.Expect;
  const beforeEach: jest.Lifecycle;
  const afterEach: jest.Lifecycle;
  const beforeAll: jest.Lifecycle;
  const afterAll: jest.Lifecycle;
}

export {};
```

`@types/jest` already declares `it` as a global, so this file is mostly redundant *except* for the one comment that explains why it exists: to pin `it` down explicitly as `jest.It` wherever the ambient Jest types might otherwise be ambiguous or missing.

The scenario this guards against is a real one. It is common, when writing a manual generator-driven async runner, to name the generator's iterator `it` — short for "iterator":

```js
function* generator() {
  const countries = yield getCountries();
  const provinces = yield getProvinces(countries[0]);
  const cities = yield getCities(provinces[0].id);
  return cities;
}

let it = generator(); // <-- clashes with Jest's global `it`
function executer(arg) {
  const res = it.next(arg);
  if (res.done) {
    console.log(res);
  } else {
    Promise.resolve(res.value).then(executer);
  }
}
executer();
```

If that file is included in the same TypeScript program as the test files (which `allowJs` makes likely), `let it = generator()` tries to **redeclare** the ambient global `const it: jest.It` that Jest's types (and `jest.d.ts` here) put in scope, and TypeScript will reject it with a redeclaration error. `checkJs: false` keeps this from erupting as a compile error inside `.js` files specifically, but the same pattern written inside a `.ts` file under `__tests__/` would fail to compile.

:::warning Don't name a local variable `it` (or `test`, `describe`, `expect`...) in a project that uses Jest
These identifiers are injected as **globals** by Jest's ambient types. A local `let it = ...` or `const describe = ...` anywhere TypeScript can see both declarations will either fail to compile (in a checked file) or silently shadow Jest's real test function (in a context where it's actually called) — rename the iterator to something like `gen` or `iterator` instead.
:::

## `require` for side effects, and `module.exports` plus global augmentation

The polyfills patch built-in prototypes directly, so a test doesn't need (and can't use) a normal `import`/named-export to get access to `mymap` or `mycall` — it needs the *side effect* of the polyfill file running once, which attaches the method to `Array.prototype` or `Function.prototype` for the whole process:

```ts
// __tests__/array.test.ts
/// <reference types="jest" />
/// <reference path="../types/polyfills.d.ts" />

// Import purely for its side effect: this line mutates Array.prototype
require('../array.js');

describe('Array Polyfills', () => {
  it('should double all numbers using mymap', () => {
    const numbers: number[] = [1, 2, 3, 4];
    const result = numbers.mymap((x: number) => x * 2);
    expect(result).toEqual([2, 4, 6, 8]);
  });
});
```

Because the import's return value is never used, this is a classic **require-for-side-effects** pattern — the same shape as `import './polyfill.css'` in bundler-based code, just via CommonJS `require` instead of ESM `import`. The `/// <reference path="../types/polyfills.d.ts" />` comment is what lets TypeScript know `numbers.mymap(...)` is valid *before* `require('../array.js')` has actually run — the type declaration and the runtime patch are two separate things that happen to need to agree with each other, and nothing enforces that automatically. If `types/polyfills.d.ts` ever drifts out of sync with what `array.js` actually attaches, TypeScript will happily "type-check" calls that fail at runtime, or reject calls that would actually work.

On the implementation side, a polyfill file like `array.js` typically does two things in the same breath — it mutates a global prototype *and* optionally exposes something through `module.exports`:

```js
// array.js (shape, not full implementation)
Array.prototype.mymap = function (callbackfn) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    result.push(callbackfn(this[i], i));
  }
  return result;
};

module.exports = {}; // no named exports needed — the side effect above is the point
```

`module.exports` here can be empty (or omitted) precisely because the whole point of the file isn't to export a value — it's to run the top-level prototype assignment as a side effect of being `require`d once.

Not every polyfill in the project patches a prototype, though. `Throttling.js` exposes plain standalone functions (`Throttling1`, `ThrottlingTrailling`) instead of attaching to `Function.prototype`, and it exports them **twice**, in two different ways, at the bottom of the file:

```js
// Throttling.js (tail of the file)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Throttling1, ThrottlingTrailling };
}
if (typeof global !== 'undefined') {
  global.Throttling1 = Throttling1;
  global.ThrottlingTrailling = ThrottlingTrailling;
}
```

- The `module.exports` assignment is the normal CommonJS path, for any code that wants to `const { Throttling1 } = require('../Throttling.js')`.
- The `global.Throttling1 = ...` assignment additionally installs the function as a true **global**, exactly like Jest's own `it`/`describe` — which is what lets the test file `require('../Throttling.js')` purely for its side effect and then use `Throttling1(...)` directly, with no destructuring, the same way it uses `mymap` on an array:

```ts
// __tests__/Throttling.test.ts
require('../Throttling.js');

declare const Throttling1: <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => (...args: Parameters<T>) => void;
```

That `declare const Throttling1: ...` is a **type-only** statement — it tells TypeScript "trust me, this name exists at runtime," but it's `require('../Throttling.js')`'s global-assignment side effect that actually makes it true. (`types/polyfills.d.ts` declares the same two functions globally via `declare function Throttling1(...)`, so most test files don't even need the local `declare const` — but the pattern works either way, because both are just type-level promises layered on top of the same runtime `global.Throttling1 = ...` assignment.)

## Troubleshooting

The project's own `README.md` documents a troubleshooting section, and it's worth checking each entry against what's actually on disk, since documentation and reality can drift:

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '../array.js'` | The test's relative `require` path doesn't match where the polyfill file actually lives (or the file was moved/renamed/deleted since the test was written) | Verify the file exists at that exact relative path from the test file |
| Throttling tests time out | Real `setTimeout` delays add up across many test cases | Use `jest.useFakeTimers()` and advance time manually instead of waiting on real timers |
| Type errors only in the editor, not on the command line (or vice versa) | `types/polyfills.d.ts` isn't being picked up by the IDE's TypeScript server, or `typeRoots` isn't configured | Confirm `types/polyfills.d.ts` is covered by `typeRoots`/`include` in `tsconfig.json`, restart the TS server, and re-run `npm install` to make sure `@types/jest` is present |
| `coverage/` is empty or missing after a run | `collectCoverage` isn't actually enabled | Check `collectCoverage: true` is set in `jest.config.js` |

:::warning The README promises files that may not exist
The `README.md` for this kind of project typically links out to `setup.sh` (a Linux/Mac counterpart to `setup.bat`) and a `TYPESCRIPT_JEST_SETUP.md` setup guide. If those files aren't actually present in the repository, the documented quick-start ("`chmod +x setup.sh && ./setup.sh`", or "see `TYPESCRIPT_JEST_SETUP.md` for details") is a dead end. Treat this as a reminder to keep a project's README in sync with what it actually ships — either commit the missing files, or update the README to stop referencing them.
:::

`setup.bat` itself is a straightforward Windows convenience wrapper: it checks that `node`/`npm` are on the `PATH`, runs `npm install`, and prints the available `npm` scripts on success:

```bat
@echo off
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    exit /b 1
)
call npm install
```

## Installing npm packages (e.g. `lodash`)

Adding a real dependency to a project like this is the same regardless of whether you're consuming it from the polyfills or the tests — add it to `package.json`, then install:

```bash
npm install lodash
# for type information in the TS test files:
npm install --save-dev @types/lodash
```

That produces a `dependencies` entry like:

```json
{
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

A couple of things are worth being deliberate about here:

- `lodash` itself ships as plain JavaScript, so `allowJs`/`checkJs: false` lets TypeScript include it without trying to type-check its internals — but without `@types/lodash` (or lodash's own bundled types, where available), calls like `lodash.cloneDeep(obj)` would just be typed as `any`.
- If the goal is specifically to *exercise your own polyfill* against the real built-in or a trusted library implementation (e.g. comparing your `mymap` against `lodash.map`), keep that comparison in the test file rather than inside the polyfill itself — the polyfill's job is to patch the prototype; cross-checking it against another implementation is a testing concern.

## Key takeaways

- `allowJs` lets TypeScript include your plain-JS polyfills in the same compilation as your TS tests; `checkJs: false` keeps those JS files from being type-checked while still being included.
- `declare global { ... }` only works inside a module — a `.d.ts` file needs `export {}` (or any other `import`/`export`) to count as one.
- Jest's ambient types put `it`, `test`, `describe`, `expect`, etc. into the **global** scope — never reuse those names for your own variables (a generator iterator named `it` is a classic collision).
- `require('../file.js')` with no destructuring is a side-effect import: the point is the prototype mutation that happens as the module loads, not anything it exports.
- Keep a README's "quick start" claims honest — a missing `setup.sh` or `TYPESCRIPT_JEST_SETUP.md` is a real onboarding bug, not a cosmetic one.

See also [Array Polyfills](../12-polyfills-and-utilities/array-polyfills.md) and [`call`/`apply`/`bind` Polyfills](../12-polyfills-and-utilities/call-apply-bind-polyfills.md) for the implementations these tests exercise, and [TypeScript with Jest](../13-typescript/typescript-with-jest.md) for more on `ts-jest` configuration.

### Interview questions

1. Why would a project write polyfills in plain JavaScript but tests in TypeScript?
2. What do `allowJs` and `checkJs` each control, and why are they set differently here?
3. Why does `declare global` require the containing file to be a module, and what's the simplest way to make a `.d.ts` file one?
4. Jest's globals (`it`, `test`, `describe`, ...) live where, and what happens if your own code declares a variable with the same name?
5. What is a "require for side effects" import, and why do these polyfill tests need one instead of a normal import?
6. Why might a throttling or debouncing test time out, and how do you fix it properly instead of just raising the timeout?
7. What's the risk of a README documenting a `setup.sh` or guide file that doesn't actually exist in the repo?
