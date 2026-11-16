---
title: Data Transformation with map and reduce
sidebar_position: 2
---

`map` and `reduce` are the two workhorses of data transformation: `map` reshapes each item, and `reduce` folds a whole collection down into something new — a total, a lookup table, or a grouped structure. This page works through a realistic "orders" example and a common mistake: thinking a `map` call has grouped your data when it hasn't.

## The source data

```js
const orders = [
  { orderId: 101, customer: "Neel",  items: [{ name: "Pen", qty: 2, price: 10 }, { name: "Book", qty: 1, price: 50 }] },
  { orderId: 102, customer: "Aarav", items: [{ name: "Bag", qty: 1, price: 200 }] },
  { orderId: 103, customer: "Neel",  items: [{ name: "Pen", qty: 5, price: 10 }, { name: "Eraser", qty: 3, price: 5 }] },
  { orderId: 104, customer: "Priya", items: [{ name: "Book", qty: 2, price: 50 }, { name: "Pen", qty: 1, price: 10 }] },
];
```

Each order belongs to a customer and contains a list of line items, each with a `qty` and `price`.

## `map` + inner `reduce`: one total per order

To get the total value of *each order*, `map` over the orders and, inside the callback, `reduce` over that order's `items`:

```js
const res = orders.map((order) => {
  const price = order.items.reduce((acc, item) => acc + item.price * item.qty, 0);
  return [order.customer, price];
});

console.log(res);
// [
//   [ 'Neel',  70 ],   // order 101: 2*10 + 1*50 = 70
//   [ 'Aarav', 200 ],  // order 102: 1*200 = 200
//   [ 'Neel',  65 ],   // order 103: 5*10 + 3*5 = 65
//   [ 'Priya', 110 ]   // order 104: 2*50 + 1*10 = 110
// ]
```

The inner `reduce((acc, item) => acc + item.price * item.qty, 0)` multiplies each item's `price` by its `qty` and accumulates a running total for that one order, starting from `0`.

## This is not a group-by

Look closely at the output above: `'Neel'` appears **twice** — once for order 101 (`70`) and once for order 103 (`65`). `map` always produces one output element per input element; it has no way to merge or collapse entries. If the goal was "total spent per customer," this `map` result is only a half-finished intermediate step, not the answer.

:::warning map never merges rows
A 1-to-1 `map` cannot do grouping or aggregation across elements by itself — every input element produces exactly one output element, in the same order. True grouping needs `reduce` (accumulating into a lookup object/Map) or a dedicated grouping API.
:::

### Correct approach 1: `reduce` into a lookup object

To actually sum totals *per customer*, reduce the whole `orders` array into one object, keyed by customer name:

```js
const totals = orders.reduce((acc, order) => {
  const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  acc[order.customer] = (acc[order.customer] || 0) + orderTotal;
  return acc;
}, {});

console.log(totals);
// { Neel: 135, Aarav: 200, Priya: 110 }
```

Now `Neel`'s two orders (`70 + 65`) are correctly combined into a single `135`.

### Correct approach 2: `Object.groupBy` (ES2024)

`Object.groupBy(items, callbackFn)` is a newer, purpose-built grouping API. It groups the **original items** (not a derived total) by whatever key the callback returns:

```js
const grouped = Object.groupBy(orders, (order) => order.customer);

console.log(grouped);
// [Object: null prototype] {
//   Neel:  [ { orderId: 101, customer: 'Neel',  items: [...] }, { orderId: 103, customer: 'Neel', items: [...] } ],
//   Aarav: [ { orderId: 102, customer: 'Aarav', items: [...] } ],
//   Priya: [ { orderId: 104, customer: 'Priya', items: [...] } ]
// }
```

Note two things:

1. `Object.groupBy` groups the **orders themselves** into arrays — it does not sum anything. You'd still `.reduce()` over each group if you want totals.
2. The returned object has a **`null` prototype** (`Object.getPrototypeOf(grouped) === null`), which avoids prototype-pollution surprises but also means it doesn't inherit `Object.prototype` methods like `hasOwnProperty` directly — use `Object.hasOwn(grouped, 'Neel')` instead.

Combining `Object.groupBy` with `reduce` gets you the per-customer totals *and* keeps the grouped orders available:

```js
const totalsFromGroups = Object.entries(grouped).map(([customer, customerOrders]) => {
  const total = customerOrders.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.price * item.qty, 0),
    0
  );
  return [customer, total];
});

console.log(totalsFromGroups);
// [ [ 'Neel', 135 ], [ 'Aarav', 200 ], [ 'Priya', 110 ] ]
```

:::note Map.groupBy
There is also `Map.groupBy(items, callbackFn)`, which works the same way but returns a real `Map` instead of a null-prototype object — useful when your group keys aren't strings (e.g. grouping by a `Date` or an object reference). See [Map, WeakMap and Map vs Object](./map-and-weakmap.md).
:::

:::warning Runtime support
`Object.groupBy` and `Map.groupBy` are ES2024 additions. They're available in modern evergreen browsers and Node.js 21+, but if you need to support older runtimes, use the `reduce`-into-object pattern above, which works everywhere.
:::

## Key takeaways

- `map` reshapes each element 1-to-1; it cannot merge or aggregate across elements.
- `orders.map(order => [order.customer, total])` producing repeated customer names is expected — it is **not** a group-by, just a projection.
- To actually group and sum, `reduce` into an accumulator object/Map, or use `Object.groupBy` / `Map.groupBy` to group the raw items first and reduce afterward.
- `Object.groupBy` returns a **null-prototype** object — use `Object.hasOwn()`, not `in` or `hasOwnProperty`, to check for a key safely.

## Interview questions

**Q: Given `orders.map(o => [o.customer, total])`, why do I see the same customer name twice?**
Because `map` is a 1-to-1 transformation — it never merges rows. Two orders from the same customer simply produce two separate `[customer, total]` pairs in the output array.

**Q: How do you sum a value per group without a library?**
`reduce` into an object (or `Map`) keyed by the group, adding to the existing value or initializing it with `|| 0` / `?? 0` on the first occurrence of each key.

**Q: What does `Object.groupBy` actually return?**
A plain, **null-prototype** object whose keys are whatever the callback returned and whose values are arrays of the original items that produced that key — it groups, it does not aggregate.

See also [Arrays: Creation, Mutation and Higher-Order Methods](./arrays.md) and [Iterating & JSON](../04-objects/iterating-and-json.md) for `Object.keys`/`values`/`entries`.
