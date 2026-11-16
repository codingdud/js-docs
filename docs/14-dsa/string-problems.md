---
title: String Interview Problems
sidebar_position: 1
---

# String Interview Problems

Strings are the most common input type in warm-up interview rounds. Most string problems come down to a few building blocks:

- **split / join**: turn a string into an array of characters or words (`str.split("")`, `str.split(" ")`) and back again (`arr.join("")`).
- **Frequency counting**: count characters in an object or a `Map`.
- **reduce**: walk an array of words while keeping the "best so far".
- **Regular expressions**: count matches such as vowels.
- **Sets**: remove duplicates.
- **Backtracking**: generate every arrangement.

Every example below comes from my practice files. Where a source file had a bug, the bug is explained and a corrected version is shown.

:::tip Related chapters
For the string and array APIs used here, see [Strings](../07-arrays-strings-collections/strings.md), [Arrays](../07-arrays-strings-collections/arrays.md) and [Set](../07-arrays-strings-collections/set.md).
:::

## Anagram check

Two strings are **anagrams** when they contain exactly the same characters with the same counts, in any order (`"listen"` and `"silent"`).

### The original version (buggy)

```js
function anagram(str1, str2) {
  if (str1.length !== str2.length) return false;
  return str1.split("").sort((a, b) => a - b).join("") ===
         str2.split("").sort().join("");
}
console.log(anagram("aaabb", "bbaaa")); // true  (by luck)
console.log(anagram("bbaaa", "aaabb")); // false (wrong!)
console.log(anagram("listen", "silent")); // false (wrong!)
```

:::warning The `(a, b) => a - b` comparator does not work on letters
`a - b` converts both characters to numbers. `"a" - "b"` is `NaN - NaN`, which is `NaN`. `Array.prototype.sort` treats a `NaN` result like `0` ("these are equal"). Since ES2019, `sort` is guaranteed to be stable, so the array keeps its original order. **`str1` is never actually sorted.**

The first call only returned `true` because `"aaabb"` happened to be in sorted order already. Swap the arguments and it fails.

Use a numeric comparator (`a - b`) only for numbers. For strings, use the default `sort()` (which compares UTF-16 code units) or `localeCompare`.
:::

### Fixed version: sort both strings the same way

```js
function anagram(str1, str2) {
  if (str1.length !== str2.length) return false;
  const normalize = (s) => s.split("").sort().join("");
  return normalize(str1) === normalize(str2);
}
console.log(anagram("aaabb", "bbaaa"));   // true
console.log(anagram("bbaaa", "aaabb"));   // true
console.log(anagram("listen", "silent")); // true
console.log(anagram("rat", "car"));       // false
```

This version is **O(n log n)** because of the sort.

### O(n) version: frequency counting

```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const ch of s) count[ch] = (count[ch] || 0) + 1;
  for (const ch of t) {
    if (!count[ch]) return false; // missing or already used up
    count[ch]--;
  }
  return true;
}
console.log(isAnagram("listen", "silent")); // true
console.log(isAnagram("aab", "abb"));       // false
```

:::note
For case-insensitive or space-insensitive checks (`"Dormitory"` and `"Dirty room"`), normalise first: `s.toLowerCase().replace(/\s/g, "")`.
:::

## Palindrome

A palindrome reads the same forwards and backwards.

```js
function palindrome(s) {
  return s.split("").reverse().join("") === s;
}
console.log(palindrome("helleh")); // true
console.log(palindrome("hello"));  // false
```

Strings have no `reverse` method, so the usual idiom is to split the string into an array, reverse it and join it again. That uses **O(n)** extra memory.

### Two-pointer version (O(1) extra space)

```js
function isPalindrome(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
console.log(isPalindrome("racecar")); // true
console.log(isPalindrome("abca"));    // false
```

The two-pointer approach can stop at the first mismatch, and it is the pattern interviewers expect (see [LeetCode Pattern Recognition](./leetcode-patterns.md)).

:::warning Unicode
`split("")` splits on UTF-16 code units, so emoji and other characters outside the Basic Multilingual Plane get broken into halves. `[...s].reverse().join("")` splits by code point and is safer.
:::

## Word with the most vowels

```js
function wordWithMostVowels(str) {
  return str
    .split(" ")
    .reduce(
      (acc, x) =>
        (acc.match(/[aeiou]/gi) || []).length <
        (x.match(/[aeiou]/gi) || []).length
          ? x
          : acc,
      ""
    );
}
console.log(wordWithMostVowels("hello world animesh kumar")); // "animesh"
```

How it works:

1. `split(" ")` gives `["hello", "world", "animesh", "kumar"]`.
2. `reduce` keeps `acc`, the word with the most vowels so far, starting with `""`.
3. `/[aeiou]/gi` matches every vowel (`g` means all matches, `i` means case-insensitive).
4. If the current word has **strictly more** vowels, it replaces `acc`. On a tie, the earlier word wins.

:::warning Why `|| []` is required
`String.prototype.match` with the `g` flag returns an **array of matches**, or **`null`** when nothing matches. It does not return an empty array. `"rhythm".match(/[aeiou]/gi)` is `null`, and `null.length` throws `TypeError: Cannot read properties of null`. The empty string `""` used as the initial `acc` has no vowels either, so without `|| []` the very first comparison would crash.

`(str.match(re) || []).length` is the standard way to count matches safely.
:::

## First non-repeating character

```js
function firstNonRepeatingChar(str) {
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  for (const ch of str) {
    if (freq[ch] === 1) return ch;
  }
  return null;
}
console.log(firstNonRepeatingChar("sgsdjjbsdgbhi")); // "h"
console.log(firstNonRepeatingChar("aabb"));          // null
```

This uses two passes, so it is **O(n)** time:

- **Pass 1** builds a frequency table. `(freq[ch] || 0) + 1` starts at 0 when the key does not exist yet, because `undefined || 0` is `0`.
- **Pass 2** walks the **original string** in order, so the first character with a count of 1 is returned. (Walking the object's keys instead would not be reliable for this.)

:::warning Undeclared variable in the source
The original file wrote `obj = {}` without `let` or `const`. In sloppy mode that silently creates a **global** variable. In strict mode (ES modules, classes) it throws `ReferenceError: obj is not defined`. Always declare variables.
:::

## Find the needle in a haystack

```js
function needleInHaystack(haystack, needle) {
  return haystack.indexOf(needle);
}
console.log(needleInHaystack("what is goning on", "on")); // 9
console.log(needleInHaystack("hello", "xyz"));            // -1
```

`indexOf` returns the index of the **first** occurrence, or `-1` if the substring is not found. Here the first `"on"` is inside `"goning"` at index 9, not the standalone word `"on"`.

Related methods:

| Method | Returns |
| --- | --- |
| `str.indexOf(sub)` | First index, or `-1` |
| `str.lastIndexOf(sub)` | Last index, or `-1` |
| `str.includes(sub)` | `true` / `false` |
| `str.search(regex)` | First index of a regex match, or `-1` |

:::note
In an interview you may be asked to implement this without `indexOf`. The simple solution compares the needle at every start position (O(n·m)). KMP brings it down to O(n + m).
:::

## Longest word

```js
function longestWord(str) {
  return str.split(" ").reduce((acc, x) => (acc.length < x.length ? x : acc), "");
}
console.log(longestWord("hello world!")); // "world!"
```

The structure is the same as the vowel problem: `reduce` keeps the best word so far. Because the comparison is strict, ties keep the **first** word. Punctuation counts as part of the word (`"world!"` has 6 characters), so strip it first if needed: `str.replace(/[^\w\s]/g, "")`.

## Pattern printing: `printx`

```js
function printx(n) {
  let sp = 2 * (n - 1);
  // top half: arms move inwards
  for (let i = 0; i < n; i++) {
    const row = " ".repeat(i) + "#".repeat(i + 1) + " ".repeat(sp * 2) + "#".repeat(i + 1);
    console.log(row);
    sp = sp - 2;
  }
  // bottom half: arms move outwards
  sp = 0;
  for (let i = n - 1; i >= 0; i--) {
    const row = " ".repeat(i) + "#".repeat(i + 1) + " ".repeat(sp * 2) + "#".repeat(i + 1);
    console.log(row);
    sp = sp + 2;
  }
}
printx(3);
```

Output for `printx(3)`:

```text
#        #
 ##    ##
  ######
  ######
 ##    ##
#        #
```

Each row has three parts:

| Part | Formula | Purpose |
| --- | --- | --- |
| Leading spaces | `" ".repeat(i)` | Pushes the row to the right |
| Left arm | `"#".repeat(i + 1)` | Arm gets thicker each row |
| Middle gap | `" ".repeat(sp * 2)` | Gap shrinks by 4 spaces each row |
| Right arm | `"#".repeat(i + 1)` | Mirrors the left arm |

The comment in the source file (`1-0, 2-2, 3-4, ...`) records the row-to-gap relationship worked out while solving it.

:::note
The middle row is printed twice, once at the end of the top loop and once at the start of the bottom loop. To get a single centre row, start the second loop at `i = n - 2` with `sp = 2`. The source also assigned `temp` and `result` without declaring them, which creates globals; use `const`.
:::

## Sorting students by several keys

Sort students by `grade` ascending, and by `id` ascending when grades are equal.

```js
class Student {
  constructor(name, grade, id) {
    this.name = name;
    this.grade = grade;
    this.id = id;
  }
}

const students = [
  new Student("Animesh", 10, 3),
  new Student("Ravi", 9, 2),
  new Student("Aman", 10, 1),
  new Student("Neha", 9, 5),
];
```

### Explicit version

```js
function sortStudents(list) {
  return list.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.id - b.id;
  });
}
```

### Short version with `||`

```js
students.sort((a, b) => a.grade - b.grade || a.id - b.id);
console.log(students.map((s) => s.name));
// ["Ravi", "Neha", "Aman", "Animesh"]
```

Why it works: a comparator returns a negative number, zero or a positive number. When grades are equal, `a.grade - b.grade` is `0`, which is falsy, so `||` falls through to `a.id - b.id`. Any non-zero difference is truthy and is returned as it is. You can chain more keys: `a.x - b.x || a.y - b.y || a.name.localeCompare(b.name)`.

:::warning `sort` mutates the array
`Array.prototype.sort` sorts **in place** and returns the same array. Use `[...list].sort(...)` or ES2023's `list.toSorted(...)` if the original order must be kept.
:::

## `maxnumberafterKSwaps`: replacing digits with 5

The `26122025.js` practice file (dated 26 Dec 2025) contains this function:

```js
function maxnumberafterKSwaps(num, k) {
  const arr = num.split("");
  const len = arr.length;

  // 1. From the left: change digits smaller than "5" to "5" (stop at the first digit >= "5")
  for (let i = 0; i < arr.length - 1 && k > 0 && arr[i] < "5"; i++) {
    arr[i] = "5";
    k--;
  }
  // 2. From the right: change digits that are not "5" (stop at the first "5")
  for (let i = len - 1; i >= 0 && k > 0 && arr[i] !== "5"; i--) {
    arr[i] = "5";
    k--;
  }
  if (k > 0) return "IMPOSIBLE";
  return arr.join("");
}

console.log(maxnumberafterKSwaps("254", 2));       // "555"
console.log(maxnumberafterKSwaps("16823456", 2));  // "56823455"
console.log(maxnumberafterKSwaps("678324234", 6)); // "678555555"
```

Step by step:

| Input | k | Left loop | Right loop | Result |
| --- | --- | --- | --- | --- |
| `"254"` | 2 | `2` becomes `5` (k=1), stops at `5` | `4` becomes `5` (k=0) | `"555"` |
| `"16823456"` | 2 | `1` becomes `5` (k=1), stops at `6` | last `6` becomes `5` (k=0) | `"56823455"` |
| `"678324234"` | 6 | stops immediately (`6` is not less than `5`) | `4,3,2,4,2,3` become `5` (k=0) | `"678555555"` |

Points to note:

- Digits are compared **as strings** (`arr[i] < "5"`). That works because single-digit strings compare by character code, and `"0"` to `"9"` are in numeric order.
- The checks are part of the `for` condition, so each loop **stops** at the first digit that fails the check. It does not skip that digit and continue.
- It returns `"IMPOSIBLE"` (spelled that way in the source) when replacements are left over.

:::warning The name does not match what the function does
The function does not swap digits, and it does not always make the number larger. In `"16823456"` the right-hand loop turns the last `6` into a `5`, which makes the number **smaller**. Treat it as "make exactly k digits into 5 using this left-then-right rule". If the real task is "maximise the number with at most k swaps" (LeetCode-style), the usual solution is greedy or backtracking: swap the largest digit to the right of each position into that position.
:::

## Counting unique characters with `Set`

```js
function uniqueCount(s) {
  return new Set(s).size;
}
console.log(uniqueCount("abacddc")); // 4 -> a, b, c, d
```

A string is iterable, so `new Set(s)` adds each character once. The `size` property gives the number of distinct characters. This is O(n).

To get the de-duplicated string itself, use `[...new Set(s)].join("")`, which gives `"abcd"` and keeps first-occurrence order.

:::note
The source file is called `mindublicatestr.js` ("minimum duplicate string"). What it returns is the **number of distinct characters**, which is also the length of the shortest string left after removing every duplicate.
:::

## All permutations of a string (backtracking)

```js
let res = [];

function permutations(str) {
  const visited = new Array(str.length).fill(false);
  const ans = [];
  backtrack(str, ans, visited);
}

function backtrack(str, ans, visited) {
  if (ans.length === str.length) {
    res.push(ans.join(""));
    return; // the original omitted this; see the note below
  }
  for (let i = 0; i < str.length; i++) {
    if (!visited[i]) {
      visited[i] = true;    // choose
      ans.push(str[i]);
      backtrack(str, ans, visited); // explore
      ans.pop();            // un-choose (backtrack)
      visited[i] = false;
    }
  }
}

permutations("abc");
console.log(res); // ["abc", "acb", "bac", "bca", "cab", "cba"]
```

This is the classic **choose, explore, un-choose** template:

- `visited[i]` marks characters already used in the current path.
- `ans` is the current partial permutation.
- When `ans` is full, it is joined and saved.
- After the recursive call, both changes are undone so the next branch starts clean.

Time complexity is **O(n · n!)**: there are n! permutations and each takes O(n) to build. This is only practical for small n (about 10 or less).

:::warning The global `res` gotcha
`res` lives **outside** the function, so results build up across calls:

```js
permutations("ab");
permutations("xy");
console.log(res); // ["ab", "ba", "xy", "yx"]  <- mixed results!
```

The function also returns nothing, so the caller has to know about the global. Keep the result array local and return it:

```js
function getPermutations(str) {
  const res = [];
  const used = new Array(str.length).fill(false);
  const path = [];

  (function backtrack() {
    if (path.length === str.length) {
      res.push(path.join(""));
      return;
    }
    for (let i = 0; i < str.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(str[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  })();

  return res;
}
console.log(getPermutations("abc").length); // 6
```

The inner function sees `res`, `used` and `path` through a [closure](../03-functions-and-scope/closures.md), so they no longer have to be passed as arguments.

The original also had no `return` after pushing a result. It still worked, because every `visited[i]` is `true` at that point and the loop does nothing. Returning early is clearer and skips a wasted loop.

For input with repeated characters such as `"aab"`, this produces duplicates. Wrap the result in a `Set`, or sort the characters and skip `str[i] === str[i - 1]` when `!used[i - 1]`.
:::

## lodash `_.difference` vs `_.xor`

```js
const _ = require("lodash");

const s1 = "temp";
const s2 = "tmp";
console.log(_.difference(s1.split(""), s2.split(""))); // ["e"]
```

`_.difference(a, b)` returns the elements of `a` that are **not in `b`**. It is **one-directional**:

```js
_.difference(["t", "e", "m", "p"], ["t", "m", "p"]); // ["e"]
_.difference(["t", "m", "p"], ["t", "e", "m", "p"]); // []   <- nothing from the first array is missing
```

To find elements that appear in **either** array but not both (the symmetric difference), use `_.xor`:

```js
_.xor(["a", "b", "c"], ["b", "c", "d"]); // ["a", "d"]
```

| Function | Meaning | `["a","b","c"]` vs `["b","c","d"]` |
| --- | --- | --- |
| `_.difference(a, b)` | in a, not in b | `["a"]` |
| `_.difference(b, a)` | in b, not in a | `["d"]` |
| `_.xor(a, b)` | in exactly one of them | `["a", "d"]` |
| `_.intersection(a, b)` | in both | `["b", "c"]` |

Plain JavaScript equivalents:

```js
const a = ["a", "b", "c"], b = ["b", "c", "d"];
const setB = new Set(b), setA = new Set(a);

const difference = a.filter((x) => !setB.has(x));                // ["a"]
const xor = [...a.filter((x) => !setB.has(x)),
             ...b.filter((x) => !setA.has(x))];                    // ["a", "d"]
```

:::warning Both lodash functions work on unique values
`_.difference` and `_.xor` compare by value (SameValueZero) and ignore **counts**. `_.difference(["t","t"], ["t"])` is `[]`, so they cannot tell you that `"tt"` has one more `t` than `"t"`. For count-sensitive problems such as anagrams, use a frequency map instead.
:::

## Summary table

| Problem | Technique | Time |
| --- | --- | --- |
| Anagram | sort both, or a frequency map | O(n log n) / O(n) |
| Palindrome | reverse and compare, or two pointers | O(n) |
| Most vowels | `reduce` + `match` with an empty-array fallback | O(total chars) |
| First non-repeating | frequency map + second pass | O(n) |
| Needle in haystack | `indexOf` | O(n·m) worst case |
| Longest word | `split` + `reduce` | O(n) |
| Multi-key sort | comparator chained with logical OR | O(n log n) |
| Unique count | `new Set(s).size` | O(n) |
| Permutations | backtracking | O(n · n!) |

## Interview questions

1. **Why does `["b","a"].sort((a, b) => a - b)` not sort?** Subtracting letters gives `NaN`, the comparator result is treated as `0`, and a stable sort keeps the original order. Use `sort()` or `localeCompare` for strings.
2. **What does `"xyz".match(/[aeiou]/g)` return?** `null`, not `[]`. Guard with `|| []`.
3. **How would you find the first non-repeating character in one pass?** You can't fully do it in one pass with only counts. Store counts (or the first index) in a `Map`, then scan the string or the `Map` once more. A `Map` keeps insertion order, so scanning its entries is O(distinct characters).
4. **Why is `a.grade - b.grade || a.id - b.id` a valid comparator?** A difference of `0` is falsy, so the next key decides. Any non-zero difference is returned unchanged.
5. **What is the time complexity of generating all permutations?** O(n · n!).
6. **Why is a module-level `res` array risky in recursive helpers?** Its state survives between calls. Keep accumulators local and return them.
7. **What is the difference between `_.difference` and `_.xor`?** `difference` is one-sided (only from the first array). `xor` is symmetric.
