---
title: "TypeScript + Jest Testing"
sidebar_position: 6
---

This page walks through a small but complete TypeScript project set up for testing with Jest: its folder layout, the `tsconfig`/`jest.config` wiring that makes `.ts` test files runnable, two utility modules (`ArrayHelpers`, `StringHelpers`) with their real implementations, the test suites written against them, and a handful of gotchas the project's own code and docs ran into — including one case where a test's expected value doesn't actually match what the code it's testing produces.

## Project structure and commands

```text
examples/
├── src/
│   ├── index.ts                    # Main entry point
│   └── utils/
│       ├── arrayHelpers.ts         # Array utility functions
│       └── stringHelpers.ts        # String utility functions
├── tests/
│   ├── unit/
│   │   ├── arrayHelpers.test.ts    # Array tests
│   │   └── stringHelpers.test.ts   # String tests
│   └── setup.ts                    # Global test setup
├── dist/                           # Compiled output (generated)
├── coverage/                       # Coverage reports (generated)
├── jest.config.js                  # Jest configuration
├── tsconfig.json                   # TypeScript config
├── tsconfig.test.json              # TypeScript config for tests
└── package.json                    # Project metadata
```

```bash
npm install            # TypeScript, Jest, ts-jest, @types/jest
npm test                # run the full suite once
npm run test:watch      # rerun automatically on file changes
npm run test:coverage   # run with coverage, writes coverage/index.html
npm test -- arrayHelpers.test.ts        # run one file
npm test -- --testNamePattern="map"      # run tests matching a name pattern
npm test -- --verbose                    # verbose per-test output

npm run build           # one-time TypeScript build
npm run build:watch     # rebuild on changes
npm start                # run the compiled output (node dist/index.js)
npm run dev               # run the .ts source directly via ts-node, no build step
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### `jest.config.js`, with 80% coverage thresholds

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: ["src/**/*.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

The `ts-jest` preset compiles each `.ts` test and source file on the fly before Jest runs it, so no separate build step is needed to run the suite. `coverageThreshold.global` makes `npm run test:coverage` **fail the whole run** if the aggregate branch, function, line, or statement coverage across every file matched by `collectCoverageFrom` drops below 80% — a useful guardrail, but one that means adding new, untested code can break CI even if every existing test still passes.

:::warning
The structure above lists `jest.config.js`, `tsconfig.json`, and `tsconfig.test.json` as part of the project, but none of those three files were available to inspect directly — only the `README.md`, the two `src/utils/*.ts` files, `src/index.ts`, and the `tests/*.ts` files were. If you're setting this project up from scratch, double-check those three config files actually exist and match what's shown here (especially `testMatch`/`moduleNameMapper` in `jest.config.js`) before assuming the commands above will work as described — a missing or misconfigured file is the most common reason `npm test` fails with "no tests found" or `Cannot find module`.
:::

## `ArrayHelpers`: generic reimplementations of `map`/`filter`/`reduce`

```ts
export class ArrayHelpers {
  static map<T, U>(array: T[], callback: (item: T, index: number, arr: T[]) => U): U[] {
    const result: U[] = [];
    for (let i = 0; i < array.length; i++) {
      result.push(callback(array[i], i, array));
    }
    return result;
  }

  static filter<T>(array: T[], predicate: (item: T, index: number, arr: T[]) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i], i, array)) {
        result.push(array[i]);
      }
    }
    return result;
  }

  static reduce<T, U>(
    array: T[],
    callback: (accumulator: U, current: T, index: number, arr: T[]) => U,
    initialValue: U
  ): U {
    let accumulator = initialValue;
    for (let i = 0; i < array.length; i++) {
      accumulator = callback(accumulator, array[i], i, array);
    }
    return accumulator;
  }

  static flatten<T>(array: (T | T[])[]): T[] {
    const result: T[] = [];
    for (const item of array) {
      if (Array.isArray(item)) {
        result.push(...this.flatten(item)); // recursive — handles arbitrary nesting depth
      } else {
        result.push(item);
      }
    }
    return result;
  }

  static unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  static chunk<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      throw new Error("Chunk size must be greater than 0");
    }
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
}

ArrayHelpers.map([1, 2, 3], (x) => x * 2);          // [2, 4, 6]
ArrayHelpers.map([1, 2, 3], (n) => n.toString());    // ["1", "2", "3"] — U can differ from T
ArrayHelpers.filter([1, 2, 3, 4], (x) => x % 2 === 0); // [2, 4]
ArrayHelpers.reduce([1, 2, 3], (acc, x) => acc + x, 0); // 6
ArrayHelpers.flatten([1, [2, 3], [4, [5]]]);            // [1, 2, 3, 4, 5]
ArrayHelpers.unique([1, 2, 2, 3, 3]);                   // [1, 2, 3]
ArrayHelpers.chunk([1, 2, 3, 4, 5], 2);                 // [[1, 2], [3, 4], [5]]
// ArrayHelpers.chunk([1, 2, 3], 0); // throws: Error: Chunk size must be greater than 0
```

Two generics are doing real work here: `map<T, U>` lets the output element type (`U`) differ from the input element type (`T`) — `ArrayHelpers.map(numbers, (n) => n.toString())` correctly infers `string[]` as the result, not `number[]`. `reduce<T, U>` similarly lets the accumulator type diverge entirely from the array's element type, which is how `reduce` turns `[1, 2, 3]` into a `Record<number, number>` lookup object in one of its test cases.

## `StringHelpers`: regex-based case conversions and their edge cases

```ts
export class StringHelpers {
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static toCamelCase(str: string): string {
    return str
      .toLowerCase()                                            // <- lowercases EVERYTHING first
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
  }

  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }

  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  static truncate(str: string, maxLength: number, suffix: string = "..."): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  }

  static isPalindrome(str: string): boolean {
    const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleaned === cleaned.split("").reverse().join("");
  }

  static wordCount(str: string): number {
    return str.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }

  static reverse(str: string): string {
    return str.split("").reverse().join("");
  }
}
```

```ts
StringHelpers.capitalize("hello");            // "Hello"
StringHelpers.toKebabCase("helloWorld");      // "hello-world"
StringHelpers.toSnakeCase("helloWorld");      // "hello_world"
StringHelpers.isPalindrome("A man, a plan, a canal: Panama"); // true — punctuation and case are stripped first
StringHelpers.wordCount("  hello   world  "); // 2 — leading/trailing/repeated whitespace collapses
StringHelpers.reverse("hello");               // "olleh"
```

`toKebabCase` and `toSnakeCase` both rely on the same two-step regex pattern: `([a-z])([A-Z])` finds a lowercase-then-uppercase boundary (e.g. the `oW` in `helloWorld`) and inserts a separator between the two captured groups, then a second `replace` collapses any existing whitespace/underscore/hyphen runs into that same separator, before lower-casing the whole result.

:::warning Gotcha: `toCamelCase` lower-cases its input *before* camel-casing it
`toCamelCase` calls `.toLowerCase()` on the **entire string first**, then looks for separator characters to capitalize the character right after them. If the input has no separators at all — including an input that was *already* camelCase — there's nothing left to re-capitalize, so the whole string comes out lowercase:

```ts
StringHelpers.toCamelCase("hello-world");  // "helloWorld" — the hyphen gives it something to capitalize
StringHelpers.toCamelCase("helloWorld");   // "helloworld" — already camelCase, no separator to act on,
                                            // so it stays fully lowercased
```

This is confirmed by the project's own test suite (`toCamelCase('helloWorld')` is asserted to equal `'helloworld'`, not `'helloWorld'`) — it is the actual, intended behavior of this implementation, not a bug in the tests. If you need a camelCase-preserving version, you'd need to special-case inputs that contain no separator characters at all, rather than lower-casing unconditionally.
:::

:::danger Gotcha: the README's `truncate` example comment is wrong
The project's `README.md` claims:

```ts
StringHelpers.truncate('Long text', 10);
// 'Long te...'
```

That comment does not match the actual implementation. `'Long text'` is 9 characters long, and `truncate`'s first line is `if (str.length <= maxLength) return str;` — since `9 <= 10`, the function returns the string **completely unchanged**:

```ts
StringHelpers.truncate("Long text", 10); // "Long text" — NOT "Long te...", the string is shorter than maxLength
```

The truncating branch only runs once the string is actually longer than `maxLength`, as the test suite correctly verifies: `truncate('This is a very long string', 10)` → `'This is...'` (27 characters cut down to 10).
:::

:::warning Gotcha: one of the project's own test assertions doesn't match its implementation
The custom-suffix test asserts:

```ts
const input = "This is a very long string";
const result = StringHelpers.truncate(input, 10, "---");
// test asserts: result === "This i---"
```

Tracing the real implementation: `maxLength - suffix.length` is `10 - 3 = 7`, and `input.slice(0, 7)` on `"This is a very long string"` is `"This is"` (characters `0`–`6`). So the function actually returns `"This is" + "---"` = `"This is---"` (10 characters) — **not** `"This i---"` (9 characters) as the test expects. Running this specific test against the implementation as written would fail. This is a real inconsistency in the test fixture, not a quirk of TypeScript — it's a reminder that a test file compiling cleanly under `ts-jest` says nothing about whether its expectations are actually correct; only running the suite (and reading the failure) catches this kind of mismatch.
:::

## `require.main === module`: only run the demo when executed directly

```ts
// src/index.ts
import { ArrayHelpers } from "./utils/arrayHelpers";
import { StringHelpers } from "./utils/stringHelpers";

export { ArrayHelpers, StringHelpers };

// Example usage
if (require.main === module) {
  console.log("TypeScript + Jest Example Project");

  const numbers = [1, 2, 3, 4, 5];
  const doubled = ArrayHelpers.map(numbers, (x) => x * 2);
  console.log("Doubled:", doubled); // Doubled: [2, 4, 6, 8, 10]

  const text = "hello world";
  const capitalized = StringHelpers.capitalize(text);
  console.log("Capitalized:", capitalized); // Capitalized: Hello world
}
```

In Node's CommonJS module system, `require.main` is set to the module object of whichever file was launched directly (e.g. via `node dist/index.js` or `npm start`). Comparing it to `module` (the current file's own module object) tells you whether *this specific file* was the entry point, or whether it was merely `import`ed/`require`d by something else — like a test file importing `ArrayHelpers`/`StringHelpers` from the same `index.ts`. That's exactly why the demo console logging only runs with `npm start`, never as a side effect of `import { ArrayHelpers } from "../../src/index"` inside a test.

## Jest matchers, async assertions and mocks

```ts
// Equality
expect(value).toBe(expected);      // === — reference/primitive equality
expect(value).toEqual(expected);   // deep structural equality — recurses into objects/arrays

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(number).toBeGreaterThan(3);
expect(number).toBeLessThan(5);
expect(float).toBeCloseTo(0.3);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain("substring");

// Arrays / objects
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(object).toHaveProperty("key");

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);

// Async — promises must be returned or awaited, or Jest can't see the assertion run
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Mocks
const mockFn = jest.fn();
mockFn("test");
expect(mockFn).toHaveBeenCalledWith("test");
expect(mockFn).toHaveBeenCalledTimes(1);
```

:::warning Gotcha: `toBe` vs `toEqual`
`toBe` uses `===`, so it's correct for primitives (`toBe(10)`, `toBe("hello")`) but wrong for arrays and objects — two structurally identical arrays are never `===` to each other. `toEqual` performs a deep, recursive comparison and is what the array/object assertions in this project's actual test suite use throughout (e.g. `expect(result).toEqual([2, 4, 6, 8])`), while the scalar-returning tests (`reduce`, `capitalize`, `toCamelCase`, …) use `toBe`. Reaching for `toBe` on an object or array comparison is one of the most common sources of a confusingly-passing-when-it-shouldn't (or failing-when-it-shouldn't) Jest test.
:::

## `tests/setup.ts`: global hooks and `export {}`

```ts
// Extend Jest matcher typings if you add custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      // custom matchers would be declared here
    }
  }
}

beforeAll(() => {
  console.log("Starting test suite...");
});

afterAll(() => {
  console.log("Test suite completed!");
});

beforeEach(() => {
  // reset any mocks or shared state before each test
});

afterEach(() => {
  jest.clearAllMocks(); // ensures mock call history doesn't leak between tests
});

export {};
```

`beforeAll`/`afterAll` run once for the whole file (or globally, if this file is registered as Jest's `setupFilesAfterEnv`/`globalSetup`); `beforeEach`/`afterEach` run around every individual test. `jest.clearAllMocks()` in `afterEach` resets call counts and recorded arguments on every mock, so one test's `mockFn` history can't leak into the next and produce a false `toHaveBeenCalledTimes` result.

The trailing `export {}` is not decorative: it's what turns this file into a **module** rather than a global script, from TypeScript's point of view. The file's only top-level statements are side-effecting calls (`beforeAll(...)`, etc.) with no `import`/`export` — without the empty `export {}`, TypeScript would treat `declare global { ... }` as merging into the *global* scope from a *global* script context, which behaves differently (and can conflict with other files) than merging into the global scope from within a module, which is what `declare global` is actually designed for.

## Key takeaways

- `ts-jest` compiles `.ts` test and source files on the fly, so the test command needs no separate `npm run build` step first — but `tsconfig.json`/`tsconfig.test.json`/`jest.config.js` all have to exist and agree with each other, or you get "Cannot find module" or "no tests found" instead of a clear TypeScript error.
- `coverageThreshold.global` set to 80% across branches/functions/lines/statements will fail `npm run test:coverage` outright if any metric drops below that bar — it's a hard gate, not a warning.
- Generic helper methods like `map<T, U>` and `reduce<T, U>` let the output type diverge from the input type while still being fully type-checked end to end.
- `toCamelCase` lower-cases its entire input before looking for separators to capitalize — so an already-camelCase string loses its casing, by design of that implementation, not by accident.
- Always re-derive an expected value from the actual implementation rather than trusting a comment or a test assertion at face value — this page found both a wrong README comment and a test assertion that doesn't match its own implementation for `truncate`.
- `require.main === module` distinguishes "this file was launched directly" from "this file was imported," which is how a demo's console output stays out of test runs that import the same module.
- `toBe` is reference/primitive (`===`) equality; `toEqual` is deep structural equality — use `toEqual` for arrays and objects, `toBe` for primitives.
- The empty `export {}` at the bottom of a setup file with no other imports/exports is required to make TypeScript treat the file as a module, which is what lets `declare global { ... }` augment the global scope correctly rather than merging as a global script.

## Interview questions

1. **Why does `jest.config.js` need `coverageThreshold.global` set to 80%, and what happens if coverage drops below it?** It's a hard gate on code quality — `npm run test:coverage` fails the whole run (not just a warning) if the aggregate branch, function, line, or statement coverage across every file matched by `collectCoverageFrom` falls below the configured percentage, even if every individual test still passes.
2. **What's wrong with testing `expect(arrayResult).toBe([1, 2, 3])`?** `toBe` uses `===`, and two arrays are never `===` to each other even with identical contents — this assertion would fail every time regardless of whether the array's contents are correct; `toEqual` is the correct matcher for structural/deep comparisons.
3. **Why does `StringHelpers.toCamelCase('helloWorld')` return `'helloworld'` instead of leaving it unchanged?** The implementation calls `.toLowerCase()` on the whole string before looking for non-alphanumeric separator characters to capitalize; an already-camelCase string has no such separators, so nothing gets re-capitalized and the lower-cased pass is the only thing that runs.
4. **What does `require.main === module` check, and why is it used in `src/index.ts`?** It checks whether the current file was the entry point Node was actually launched with (as opposed to a file some other module merely `require`d/`import`ed); wrapping the demo `console.log` calls in that check means importing `ArrayHelpers`/`StringHelpers` from a test file never triggers that demo output as a side effect.
5. **Why does `tests/setup.ts` end with `export {}` even though nothing else is exported?** The file has no other top-level `import`/`export`, so without `export {}` TypeScript would treat it as a global script rather than a module; `declare global { ... }` needs to be inside an actual module to augment the global scope correctly, so the empty export exists purely to make the file a module.
