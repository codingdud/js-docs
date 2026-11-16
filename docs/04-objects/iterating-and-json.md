---
title: Iterating Objects and JSON
sidebar_position: 3
---

# Iterating Objects and JSON

Objects are not iterable by default — there is no built-in `for...of` over `{ a: 1 }`. Instead, JavaScript gives you static methods that turn an object's properties into arrays you *can* iterate, plus `for...in`, which walks the object directly but with different rules about what it sees. This page covers both, and the `JSON` methods used to serialize objects to text and back.

## `Object.keys`, `Object.values`, `Object.entries`

All three return arrays of an object's **own enumerable string-keyed** properties, in the same insertion order.

```js
let obj = { name: "John", age: 30, city: "New York" };

console.log(Object.keys(obj));                  // ["name", "age", "city"]
console.log(Object.values(obj).toString());     // "John,30,New York"
console.log(Object.entries(obj));
// [["name", "John"], ["age", 30], ["city", "New York"]]
```

`Object.entries` pairs naturally with `for...of` and array destructuring, giving you both the key and the value on each pass:

```js
for (let [key, value] of Object.entries(obj)) {
  console.log(`${key}: ${value}`);
}
// name: John
// age: 30
// city: New York
```

| Method | Returns | Includes inherited keys? | Includes symbols? |
|---|---|---|---|
| `Object.keys(obj)` | `string[]` of keys | No | No |
| `Object.values(obj)` | `any[]` of values | No | No |
| `Object.entries(obj)` | `[key, value][]` | No | No |

## `for...in`: own **and** inherited enumerable keys

`for...in` is different from all three static methods above in one important way: it walks the **whole prototype chain**, yielding every enumerable string key it finds, own or inherited.

```js
let obj = { name: "John", age: 30, city: "New York" };
obj.country = "USA"; // adding a property afterwards works the same way

for (let key in obj) {
  console.log(`${key}: ${obj[key]}`);
}
// name: John
// age: 30
// city: New York
// country: USA
```

That looks identical to `Object.keys` here only because this `obj`'s prototype (`Object.prototype`) has no *enumerable* properties of its own — `toString`, `hasOwnProperty`, and friends are all non-enumerable by design. Give an object an enumerable property on its prototype and the difference shows up immediately:

```js
const base = { shared: "from the prototype" };
const child = Object.create(base);
child.own = "mine";

for (let key in child) console.log(key);
// own
// shared        <- inherited, but for...in still reports it

console.log(Object.keys(child)); // ["own"]  - own keys only
```

:::warning Guard inherited keys with `hasOwnProperty`
If you only want an object's own properties inside a `for...in` loop, check for it explicitly:

```js
for (let key in child) {
  if (Object.hasOwn(child, key)) {
    console.log(key); // "own"
  }
}
```

`Object.hasOwn(obj, key)` is the modern replacement for `obj.hasOwnProperty(key)` — it also works correctly on objects created with `Object.create(null)`, which have no `hasOwnProperty` method to call.
:::

## `JSON.stringify` and `JSON.parse`

`JSON.stringify` serializes a value to a JSON text string; `JSON.parse` does the reverse.

```js
let obj = { name: "John", age: 30, city: "New York" };

let text = JSON.stringify(obj);
console.log(text); // '{"name":"John","age":30,"city":"New York"}'

let parsed = JSON.parse(text);
console.log(parsed); // { name: "John", age: 30, city: "New York" }
console.log(parsed === obj); // false - a brand new object, not the same reference
```

The round trip is **not** lossless. `JSON.stringify` silently drops or transforms anything JSON cannot represent:

| Value in the original object | What `JSON.stringify` does with it |
|---|---|
| `function` | Property is dropped entirely |
| `undefined` | Property is dropped entirely |
| `symbol` (as a value or a key) | Dropped entirely |
| `NaN`, `Infinity`, `-Infinity` | Converted to `null` |
| Non-enumerable property | Dropped (same rule as `for...in` / `Object.keys`) |
| `Date` | Converted to its ISO string (`toJSON()` is called) |
| `Map`, `Set` | Serialized as `{}` — their entries are lost |
| Circular reference | Throws `TypeError: Converting circular structure to JSON` |

```js
const sample = {
  ok: 1,
  fn: () => "nope",
  missing: undefined,
  nan: NaN,
  when: new Date("2024-01-01"),
  tags: new Set(["a", "b"]),
};

console.log(JSON.stringify(sample));
// '{"ok":1,"nan":null,"when":"2024-01-01T00:00:00.000Z","tags":{}}'
// fn and missing are gone; nan became null; when became a string; tags lost its entries
```

See [Shallow vs Deep Copy](./shallow-vs-deep-copy.md) for how this same behaviour affects `JSON.parse(JSON.stringify(x))` as a cloning technique.

## Bracket notation works on any key, including special ones

Dot notation (`obj.key`) only works for identifier-like key names. Bracket notation (`obj["key"]`) accepts any string expression, including ones that look like built-in properties — such as an array's `length`.

```js
const arr = [1, 2, 3, 4, 5];
console.log(arr["length"]); // 5 - same as arr.length; "length" is just a property name
console.log(arr["0"]);      // 1 - array indices are string keys under the hood
```

`length` is a real, writable, own property of every array, so assigning through bracket notation changes the array itself, not just a reported count:

```js
const arr = [1, 2, 3, 4, 5];
arr["length"] = 3;
console.log(arr); // [1, 2, 3] - the extra elements are deleted

arr["length"] = 5;
console.log(arr); // [1, 2, 3, <2 empty items>] - grows back, but with holes, not values
```

:::tip
Bracket notation is also how you use a **variable** or a computed expression as a key: `obj[someVariable]` or `obj["prefix-" + id]`. Dot notation cannot do either.
:::

## Interview questions

**Q: What is the difference between `Object.keys`/`values`/`entries` and `for...in`?**
The static methods only ever return own enumerable string-keyed data; `for...in` walks the whole prototype chain and yields every enumerable key it finds there too, own or inherited.

**Q: Why might `JSON.parse(JSON.stringify(obj))` not round-trip perfectly?**
`JSON.stringify` drops functions, `undefined` values and symbol keys, turns `NaN`/`Infinity` into `null`, serializes `Date` as a string, and serializes `Map`/`Set` as empty objects. It also throws on circular references.

**Q: Does `arr["length"] = n` just change how `length` reports?**
No — `length` is a real, writable own property of the array. Setting it to a smaller number actually deletes the trailing elements; setting it larger adds empty slots.

## Key takeaways

- `Object.keys` / `values` / `entries` return own enumerable properties only, as arrays you can loop with `for...of`.
- `for...in` additionally reports **inherited** enumerable properties; filter with `Object.hasOwn` when you need own keys only.
- `JSON.stringify` / `JSON.parse` round-trip plain data, but silently drop functions, `undefined`, symbols, and flatten `Date`/`Map`/`Set`/`NaN`/`Infinity`.
- Bracket notation accepts any string (including computed expressions and names that collide with built-ins like `length`), while dot notation only accepts literal identifiers.
- Next: [Shallow vs Deep Copy](./shallow-vs-deep-copy.md).
