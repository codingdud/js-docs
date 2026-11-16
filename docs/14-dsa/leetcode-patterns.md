---
title: LeetCode Pattern Recognition
sidebar_position: 3
---

# LeetCode Pattern Recognition

Recognizing the right technique quickly is most of the battle in a timed coding interview. This page is a structured version of a four-step pattern-recognition method: read the **constraints**, then the **input format**, then the **output format**, then scan the **wording** for keywords that point straight at a known technique.

:::tip How to use this page
Work through the four steps in order for any new problem. Steps 1–3 narrow down a *family* of techniques; step 4's keyword table usually confirms the specific one. None of these are guarantees — they are strong priors that save time during the first read of a problem.
:::

## Step 1: Constraints → complexity budget

The size of the input (`n`) tells you which complexities are even allowed. Figure this out before writing any code.

| Constraint on `n` | Algorithms that are **viable** | Algorithms that are **too slow** |
| --- | --- | --- |
| Small, `n <= 20` | Brute force, backtracking, recursion; exponential time (`2^n`, `n!`) is fine | — |
| Medium, `10^3` to `10^6` | O(n), O(n log n): greedy, two pointers, heaps, dynamic programming | Brute force / exponential |
| Large, `n >= 10^7` | O(log n) or O(1): binary search, closed-form math | Any O(n) or slower full pass |

If a problem allows `n` up to `10^6` and you are reaching for a nested loop (O(n²)), that is a signal to look for a faster technique before coding.

## Step 2: Input format → technique

The shape of the input data points to a family of standard techniques.

| Input shape | Typical techniques |
| --- | --- |
| Tree / binary tree / BST | DFS (all paths, recursive exploration, pre/in/post-order); BFS (level-by-level, shortest path in an unweighted tree); think about parent-child relationships |
| Graph (nodes + edges) | BFS for shortest path; DFS for connected components; Union-Find for "connected components" / "number of groups"; topological sort for dependency ordering |
| 2D grid / matrix | DFS/BFS for "island" problems; Union-Find for connected regions; dynamic programming for path-counting problems; decide 4-directional vs 8-directional movement |
| Sorted array | Two pointers; binary search; greedy |
| String | Two pointers for palindromes; sliding window for substrings; a trie for word/prefix problems; a stack for parentheses/brackets |
| Linked list | Two pointers (fast/slow) for cycle detection and middle-finding; dummy-node techniques for edge cases at the head |

## Step 3: Output format → technique

What the function is asked to **return** is just as informative as the input.

| Output shape | Typical techniques |
| --- | --- |
| List of lists (combinations, subsets, paths) | Backtracking is almost always the answer: generate all possibilities with a choose / explore / un-choose recursion (see the permutation example in [String Interview Problems](./string-problems.md)) |
| A single number (max/min profit, cost, number of ways, jumps) | Dynamic programming for optimization; greedy for locally-optimal choices; a closed-form math approach for pure counting |
| A modified array/string (in-place) | Two pointers for in-place modification without extra memory |
| An ordered list (sorted sequence, valid task order) | Sorting with a custom comparator; topological sort for dependency ordering; a heap to maintain order incrementally |

## Step 4: Keyword → pattern table

Certain words in the problem statement are strong hints. This is the fastest step once the vocabulary is familiar.

| Keywords in the prompt | Pattern |
| --- | --- |
| "Number of ways", "maximum/minimum" + "sum/profit/cost", "can you reach", "longest/shortest subsequence", "optimal"/"best" | Dynamic programming |
| "Palindrome", "sorted array", "target sum", "remove duplicates" | Two pointers |
| "K largest"/"K smallest", "top K elements", "median", "priority" | Heap |
| "Parentheses"/"brackets", "valid expression", "nested structure", "undo operations" | Stack |
| "Next greater element", "next smaller element" | Monotonic stack |
| "Count frequency", "find duplicates", "anagram" | Hash map |
| "Word search", "word prefixes" | Trie |
| "Minimum operations" | Greedy |
| "Connected components", "number of groups" | Union-Find |
| "Kth element", "search in sorted", "minimize maximum", "first/last occurrence" | Binary search |
| "XOR" operations, "single number" problems, "power of 2" | Bit manipulation |
| "Greatest/least common denominator", "prime numbers", "angle calculations", "coordinate" | Math / geometry |
| "Optimal strategy", "win/lose scenarios", "minimax" | Game theory |
| "Substring" with conditions, "subarray" with fixed/variable size, "maximum/minimum window", "contains all" | Sliding window |

:::note Overlap is normal
Several keyword groups can match the same problem — for example, "longest substring without repeating characters" is both a **string** input (step 2) and a **sliding window** keyword (step 4). When two rows agree, that is a strong signal; when they disagree, re-read the constraints (step 1) to break the tie.
:::

## Worked walkthrough

A short example of applying all four steps to "Given a sorted array of `10^5` integers, return the indices of the two numbers that add up to a target value."

1. **Constraints**: `n = 10^5` is medium-sized → O(n) or O(n log n) only, no brute force O(n²).
2. **Input format**: a *sorted array* → two pointers or binary search.
3. **Output format**: a pair of indices, not a list of lists → not backtracking; consistent with two pointers.
4. **Keywords**: "sorted array" and "target sum" both point at **two pointers** directly.

All four steps agree: move one pointer from each end, moving the low pointer up when the sum is too small and the high pointer down when it is too large, until the sum matches — an O(n) solution.

## Interview questions

1. **A problem allows `n` up to `10^7`. What does that rule out?** Any O(n) or slower full pass; only O(log n) or O(1) approaches (binary search, closed-form math) fit the budget.
2. **The output is "all subsets of an array." What family of techniques does that point to?** Backtracking — generating a list of lists almost always means exploring choices recursively.
3. **A problem statement contains both "palindrome" and "sliding window."** Which keyword table rows apply, and why might that matter? Both "two pointers" (palindrome) and "sliding window" (substring) rows apply; this usually signals a substring-palindrome problem that needs a window that can expand/contract while checking a two-pointer symmetry condition inside it.
4. **Why check constraints (step 1) before keywords (step 4)?** Keywords suggest a *family* of techniques, but the constraints decide which complexity in that family is actually acceptable — a backtracking idea only survives step 1 if `n` is small.
5. **"Find the Kth largest element" — which two keyword rows both apply, and which is usually faster?** "K largest/K smallest" (heap, O(n log k)) and "Kth element" (binary search / quickselect-style partitioning, O(n) average). Either passes; quickselect is faster asymptotically but a heap is simpler to implement correctly under time pressure.
