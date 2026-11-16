---
title: Searching, Math and Recursion
sidebar_position: 2
---

# Searching, Math and Recursion

This page collects the small, classic algorithms that show up in warm-up interview questions: searching an array, basic number theory (primes, powers of two), and recursion with and without memoization. Each example is based on a practice file, with the bug (if any) called out and fixed.

:::tip Related chapters
For `Array` methods used alongside these algorithms, see [Arrays](../07-arrays-strings-collections/arrays.md). For how recursive calls and closures capture variables, see [Closures](../03-functions-and-scope/closures.md).
:::

## Linear search

```js
function search(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
console.log(search([1, 2, 3, 4, 6, 5], 6)); // 4
```

Linear search checks every element in order. It works on **any** array, sorted or not, and is **O(n)** in the worst case. It is the baseline every faster algorithm is compared against.

## Binary search

Binary search only works on a **sorted** array. It repeatedly halves the search range.

```js
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor(left + (right - left) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
console.log(binarySearch([1, 2, 3, 4, 5, 6, 7, 8, 9], 5)); // 4
console.log(binarySearch([1, 2, 3, 4, 5, 6, 7, 8, 9], 10)); // -1
```

| | Linear search | Binary search |
| --- | --- | --- |
| Requires sorted input | No | Yes |
| Time complexity | O(n) | O(log n) |
| Typical use | Unsorted data, small n | Large sorted arrays, "search in sorted" keyword |

:::warning Why `left + (right - left) / 2`, and not `(left + right) / 2`
Both formulas give the same mathematical result, but `(left + right) / 2` is **not overflow-safe** in languages with fixed-size integers (Java, C++): when `left` and `right` are both close to the maximum `int` value, `left + right` can overflow before the division happens. `left + (right - left) / 2` never adds two large numbers together, so it stays safe.

JavaScript numbers are IEEE-754 doubles, so this specific overflow does not happen until values exceed `Number.MAX_SAFE_INTEGER` (2^53 - 1) — far larger than any array index. The pattern is still worth using, both because it is what interviewers expect and because it transfers directly to typed languages.
:::

## Factorial

```js
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let ans = 1;
  for (let i = n; i >= 1; i--) ans *= i;
  return ans;
}
console.log(factorial(5)); // 120
```

:::note Fixing a stray semicolon
The source wrote `for (let i = n; i >= 1; i--) ans *= i;;` — two semicolons in a row. The extra `;` is simply an **empty statement** and is harmless here, but it is easy to misread as a second loop body. Keep one semicolon per statement.
:::

The commented-out line in the source, `return n * factorial(n - 1)`, is the recursive version:

```js
function factorialRec(n) {
  if (n === 0 || n === 1) return 1;
  return n * factorialRec(n - 1);
}
console.log(factorialRec(5)); // 120
```

The iterative version uses O(1) extra space; the recursive version uses O(n) stack frames. Beyond `n = 170`, both versions return `Infinity` because the result exceeds `Number.MAX_VALUE` — use `BigInt` for exact large factorials.

## Fibonacci — iterative

```js
function fib(n) {
  const fibonacci = [0, 1];
  for (let i = 2; i <= n; i++) {
    fibonacci.push(fibonacci[i - 1] + fibonacci[i - 2]);
  }
  return fibonacci;
}
console.log(fib(10)); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
```

This builds the whole sequence up to index `n` in **O(n)** time and **O(n)** space. It never recomputes a value.

## Fibonacci — recursion with memoization

```js
function recFibonacci(n, memo) {
  if (n === 0 || n === 1) return n;
  if (memo.has(n)) return memo.get(n);
  const result = recFibonacci(n - 1, memo) + recFibonacci(n - 2, memo);
  memo.set(n, result);
  return result;
}
console.log(recFibonacci(30, new Map())); // 832040
```

Without memoization, naive recursive Fibonacci is **O(2^n)** because every call branches into two more calls, most of which repeat work already done. The `Map` cache turns it into **O(n)**: each value from `0` to `n` is computed exactly once.

:::warning `recFibonacci(1000, new Map())` is not precise
JavaScript's `Number` type is a 64-bit float and can only represent integers exactly up to `Number.MAX_SAFE_INTEGER` (`2^53 - 1 ≈ 9.007 × 10^15`). `fib(1000)` is a 209-digit number, enormously larger than that. The additions still "work" and return *a* number, but it is no longer the exact Fibonacci value — it has silently lost precision, and `Number.isSafeInteger` on it returns `false`.

To get an exact result for large `n`, use `BigInt`:

```js
function recFibonacciBig(n, memo) {
  if (n === 0n || n === 1n) return n;
  if (memo.has(n)) return memo.get(n);
  const result = recFibonacciBig(n - 1n, memo) + recFibonacciBig(n - 2n, memo);
  memo.set(n, result);
  return result;
}
console.log(recFibonacciBig(80n, new Map())); // 23416728348467685n
```

`BigInt` arithmetic cannot be mixed with regular numbers (`1n + 1` throws `TypeError`), and `BigInt` has no decimal point, so it is only appropriate for whole-number math — but it has no upper bound on magnitude.
:::

The source also compared with `n == 0 || n == 1` (loose equality). For a parameter that is always a `Number`, `==` and `===` behave the same here, but `===` is the safer default — see [Loose Equality](../02-types-and-coercion/loose-equality.md).

## Prime check

```js
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}
console.log(isPrime(22)); // false (22 = 2 × 11)
console.log(isPrime(23)); // true
```

Checking divisors only up to `Math.sqrt(n)` is enough: if `n` has a factor larger than its square root, it must also have a matching factor smaller than the square root, which would already have been found. This brings the check down from **O(n)** to **O(√n)**.

## Power of two

```js
function isPowerOfTwo(n) {
  if (n < 1) return false;
  while (n > 1) {
    if (n % 2 !== 0) return false;
    n = n / 2;
  }
  return true;
}
console.log(isPowerOfTwo(17)); // false
console.log(isPowerOfTwo(16)); // true
```

This repeatedly divides by 2, which is **O(log n)**.

### Bit trick: `n & (n - 1)`

A power of two in binary has exactly one `1` bit (`8 = 1000`). Subtracting 1 flips every bit after — and including — the lowest set bit (`7 = 0111`). `AND`-ing the two clears that bit, so the result is `0` **only** for powers of two.

```js
function isPowerOfTwoFast(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
console.log(isPowerOfTwoFast(16)); // true
console.log(isPowerOfTwoFast(17)); // false
```

This is **O(1)** — no loop at all. It is the kind of trick the "Bit Manipulation" keyword group in [LeetCode Pattern Recognition](./leetcode-patterns.md) points to.

## Digit-frequency parity: `pairExist`

```js
function pairExist(num) {
  const str = num.toString();
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) || 0) + 1);
  for (const count of freq.values()) {
    if (count % 2 !== 0) return false;
  }
  return true;
}
console.log(pairExist(12233)); // false
console.log(pairExist(1212));  // true
```

:::note Walking through the examples
`12233` has digits `1, 2, 2, 3, 3`. The frequency map is `{1: 1, 2: 2, 3: 2}`. The digit `1` appears an **odd** number of times (once), so `pairExist` returns `false` — every digit must appear an even number of times for it to return `true`. `1212` has digits `1, 2, 1, 2`, giving `{1: 2, 2: 2}`, so it returns `true`.
:::

This is the same **frequency map** pattern used for anagrams in [String Interview Problems](./string-problems.md) — count with a `Map`, then check a property of the counts.

## Recursive sum: `add(n)`

A minimal example of recursion with a **base case** and a **recursive case**, summing `1` to `n`:

```js
function add(n) {
  if (n === 0) return 0;
  return n + add(n - 1);
}
console.log(add(8)); // 36  (8+7+6+5+4+3+2+1)
```

Each call waits for `add(n - 1)` to return before it can add `n`, so this uses **O(n)** stack frames. The iterative equivalent, `for (let i = 1; i <= n; i++) sum += i;`, uses O(1) space and is preferred for large `n` to avoid a stack overflow (`RangeError: Maximum call stack size exceeded`).

## Bubble sort, and a broken "read array" script

The practice file `bubbolesort.js` was meant to read numbers from the console and sort them, but as written it has two problems:

```js
var readline = required('readline-sync'); // typo: should be require(...)

var n = readline.question("Enter number of elements:");
var arr = [];
for (let i = 0; i < n; i++) {
  let ele = readline.question("Enter element " + (i + 1) + ":");
  arr.push(Number(ele));
}
// the array is built here, but nothing ever sorts it
```

:::warning Two bugs in the source
1. **`required(...)` is not a function.** The correct call is `require('readline-sync')` (no `d`). As written this throws `ReferenceError: required is not defined` before anything else runs.
2. **There is no sort.** The file reads `n` elements into `arr` and stops; "bubble sort" never happens. `n` itself is also a **string** from `readline.question`, and the `for` loop's `i < n` comparison works only because `<` coerces `n` to a number each time — see [Relational Comparison](../02-types-and-coercion/relational-comparison-and-quick-reference.md).
:::

A correct, complete version — converting the count explicitly and adding the actual sort:

```js
const readline = require("readline-sync");

const n = Number(readline.question("Enter number of elements: "));
const arr = [];
for (let i = 0; i < n; i++) {
  arr.push(Number(readline.question(`Enter element ${i + 1}: `)));
}

function bubbleSort(list) {
  const a = [...list];
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break; // already sorted — stop early
  }
  return a;
}

console.log(bubbleSort(arr));
```

Bubble sort repeatedly swaps adjacent out-of-order elements. After pass `i`, the `i` largest elements are in their final position at the end of the array, so the inner loop shrinks by one each time. It is **O(n²)** in the worst and average case, **O(n)** when the input is already sorted (thanks to the early-exit `swapped` flag), and **O(1)** extra space (ignoring the defensive copy). For real workloads, `Array.prototype.sort` (which uses an O(n log n) algorithm) is always preferred — bubble sort exists mainly to demonstrate the technique.

## Summary table

| Problem | Technique | Time |
| --- | --- | --- |
| Linear search | scan every element | O(n) |
| Binary search | halve the range each step | O(log n) |
| Factorial | loop or recursion | O(n) |
| Fibonacci (array) | build up iteratively | O(n) |
| Fibonacci (memoized) | recursion + `Map` cache | O(n) |
| Prime check | trial division up to `√n` | O(√n) |
| Power of two | repeated division, or `n & (n-1)` | O(log n) / O(1) |
| Digit-frequency parity | `Map` of counts | O(digits) |
| Bubble sort | repeated adjacent swaps | O(n²) |

## Interview questions

1. **Why is `left + (right - left) / 2` preferred over `(left + right) / 2` for the midpoint?** It avoids integer overflow in fixed-width languages; in JavaScript both are safe for realistic array sizes, but the first form is the expected idiom.
2. **What is the time complexity of naive recursive Fibonacci without memoization, and why?** O(2^n) — the call tree branches into two calls at every level, and the same sub-problems are recomputed many times.
3. **Why does `recFibonacci(1000, new Map())` give an inexact answer?** The result exceeds `Number.MAX_SAFE_INTEGER` (2^53 - 1), so it loses precision. Use `BigInt` for exact results beyond that range.
4. **Why only check divisors up to `Math.sqrt(n)` when testing primality?** Any factor pair `(a, b)` with `a * b === n` has one factor `≤ √n` and one `≥ √n`; if none exist up to `√n`, none exist at all.
5. **How does `n & (n - 1) === 0` detect a power of two?** A power of two has exactly one set bit; subtracting 1 flips all lower bits on, so `AND`-ing clears that single bit and the result is `0`.
6. **What is wrong with `required('readline-sync')`?** It calls an undefined function; the correct call is `require('readline-sync')`.
7. **Why does bubble sort's inner loop shrink by one on every pass?** Each pass bubbles the next-largest remaining element into its final position at the end of the unsorted region, so that position never needs to be revisited.
