// Question data for the interactive Types & Type Coercion (YDKJS) quizzes
// (docs/02-types-and-coercion/mcq-coercion-fundamentals.md and mcq-coercion-advanced.md).

export const coercionFundamentalsQuestions = [
  {
    code: `console.log(String(null));`,
    options: ['"undefined"', 'TypeError (throws)', 'null', '"null"'],
    correctIndex: 3,
    explanation: '`String(x)` always returns a string — `null` becomes the literal string `"null"`.',
  },
  {
    code: `console.log(Number(null), Number(undefined));`,
    options: ['NaN then NaN', '0 then NaN', 'NaN then 0', '0 then 0'],
    correctIndex: 1,
    explanation: '`ToNumber(null)` is `0`; `ToNumber(undefined)` is `NaN` — opposite directions, both hardcoded in the spec.',
  },
  {
    code: `console.log(String(-0));`,
    options: ['"0"', '"-0"', '"NaN"', 'TypeError (throws)'],
    correctIndex: 0,
    explanation: '`String(-0)` is `"0"` — the negative sign is lost. Use `Object.is(x, -0)` to detect `-0` specifically.',
  },
  {
    code: `console.log(String([1, 2, 3]));`,
    options: ['"[object Array]"', 'TypeError (throws)', '"1,2,3"', '"[1,2,3]"'],
    correctIndex: 2,
    explanation: 'Arrays run through `ToPrimitive(hint: \'string\')`, which calls `toString()` — elements get joined with commas, no brackets.',
  },
  {
    code: `console.log(String({}));`,
    options: ['undefined', '"[object Object]"', '"{}"', 'TypeError (throws)'],
    correctIndex: 1,
    explanation: 'With no custom `toString()`, `Object.prototype.toString()` always returns `"[object Object]"`.',
  },
  {
    code: `console.log(JSON.stringify({ a: undefined, b: () => {}, c: Symbol("x"), d: 1 }));`,
    options: ['\'{"a":null,"d":1}\'', '\'{"d":1,"b":null}\'', 'TypeError (throws)', '\'{"d":1}\''],
    correctIndex: 3,
    explanation: '`JSON.stringify` on an object silently *omits* properties whose value is `undefined`, a function, or a symbol.',
  },
  {
    code: `console.log(JSON.stringify([undefined, () => {}, Symbol("x"), 1]));`,
    options: ['\'[undefined,undefined,undefined,1]\'', 'TypeError (throws)', '\'[null,null,null,1]\'', '\'[1]\''],
    correctIndex: 2,
    explanation: 'Inside an **array**, the same unstringifiable values become `null` placeholders instead of being dropped — this preserves the array\'s length.',
  },
  {
    code: `console.log(Number("0x10"));`,
    options: ['16', '10', 'NaN', '0'],
    correctIndex: 0,
    explanation: 'Hex-prefixed numeric strings are parsed as hex by `ToNumber` — `"0x10"` is 16, not 10.',
  },
  {
    code: `console.log(Number("42abc"));`,
    options: ['42', '0', 'TypeError (throws)', 'NaN'],
    correctIndex: 3,
    explanation: '`ToNumber` needs the **entire** string to be numeric — any trailing non-numeric characters make the whole result `NaN`.',
  },
  {
    code: `console.log(parseInt("42px", 10));
console.log(Number("42px"));`,
    options: ['NaN then NaN', '42 then NaN', 'NaN then 42', '42 then 42'],
    correctIndex: 1,
    explanation: '`parseInt` stops at the first invalid character (`"p"`), returning `42`; `Number`/`ToNumber` requires the whole string to be numeric, so it\'s `NaN`.',
  },
  {
    code: `console.log(Boolean("0"));`,
    options: ['true', 'false', 'TypeError (throws)', 'undefined'],
    correctIndex: 0,
    explanation: '`"0"` is a non-empty string — it looks falsy but every non-empty string is truthy.',
  },
  {
    code: `console.log(Boolean(new Boolean(false)));`,
    options: ['undefined', 'TypeError (throws)', 'true', 'false'],
    correctIndex: 2,
    explanation: '`new Boolean(false)` is a **wrapper object**, and every object is truthy — only `.valueOf()` on it would give the falsy primitive.',
  },
  {
    code: `console.log(Boolean([]));`,
    options: ['false', 'TypeError (throws)', 'undefined', 'true'],
    correctIndex: 3,
    explanation: 'An empty array is still an object — `ToBoolean` never runs `ToPrimitive`, and objects are never on the falsy list.',
  },
  {
    code: `console.log(String(null));
console.log(null.toString());`,
    options: ['TypeError then TypeError', '"null" then TypeError', 'TypeError then "null"', '"null" then "null"'],
    correctIndex: 1,
    explanation: '`String(x)` never calls a method on `null`, so it\'s safe; `.toString()` tries to call a method ON `null`, which has none, so it throws.',
  },
  {
    code: `console.log(0 | 3.9);`,
    options: ['3.9', '0', '3', '4'],
    correctIndex: 2,
    explanation: '`0 | x` coerces via `ToInt32`, truncating toward zero like `Math.trunc` — `3.9` becomes `3`.',
  },
  {
    code: `console.log(!!0);`,
    options: ['false', 'true', '0', 'NaN'],
    correctIndex: 0,
    explanation: '`!!x` is double negation, identical to `Boolean(x)` — `0` is falsy, so the result is `false`.',
  },
  {
    code: `console.log("3" - 2);`,
    options: ['"1"', 'NaN', '"32"', '1'],
    correctIndex: 3,
    explanation: 'Unlike `+`, the `-` operator always calls `ToNumber` on both operands regardless of type — `"3"` becomes `3`, then `3 - 2`.',
  },
  {
    code: `console.log(true + false);`,
    options: ['"truefalse"', '1', '0', '2'],
    correctIndex: 1,
    explanation: 'Neither operand is a string, so `+` numifies both: `true→1`, `false→0`, giving `1 + 0`.',
  },
  {
    code: `console.log(null + 1);
console.log(undefined + 1);`,
    options: ['1 then NaN', 'NaN then 1', '0 then 1', 'NaN then NaN'],
    correctIndex: 0,
    explanation: '`ToNumber(null)` is `0`, so `0 + 1` is `1`; `ToNumber(undefined)` is `NaN`, and anything plus `NaN` is `NaN`.',
  },
  {
    code: `console.log([] + []);
console.log([] + {});`,
    options: ['0 then "[object Object]"', 'TypeError then TypeError', '"" then "[object Object]"', '"[object Object]" then ""'],
    correctIndex: 2,
    explanation: 'Both sides of `+` run `ToPrimitive`: `[]` becomes `""` either way; `{}` becomes `"[object Object]"` — then they concatenate since a string is present.',
  },
];

export const coercionAdvancedQuestions = [
  {
    prompt: 'What value does this evaluate to, typed as a standalone statement (e.g. at the REPL)?',
    code: `{} + [];`,
    options: ['NaN', 'TypeError (throws)', '0', '"[object Object]"'],
    correctIndex: 2,
    explanation: 'At statement start, `{` can\'t begin an object literal, so it\'s parsed as an empty block — leaving just `+[]`, which is `0`. Grammar, not coercion.',
  },
  {
    code: `console.log(({}) + []);`,
    options: ['"[object Object]"', '0', 'NaN', 'TypeError (throws)'],
    correctIndex: 0,
    explanation: 'Parentheses force `{}` into expression position (an object literal), so this is ordinary `+` concatenation: `"[object Object]" + ""`.',
  },
  {
    code: `console.log({}+[]+{}+[1]);`,
    options: ['"0[object Object]1"', '"[object Object]1"', 'TypeError (throws)', '"[object Object][object Object]1"'],
    correctIndex: 3,
    explanation: 'Inside a function call, every `{}` is unambiguously an object literal (there\'s no statement-start ambiguity) — so all two `{}` tokens stringify, giving `"[object Object][object Object]1"`.',
  },
  {
    code: `console.log([] == false);`,
    options: ['NaN', 'true', 'false', 'TypeError (throws)'],
    correctIndex: 1,
    explanation: '`[]` → `""` (ToPrimitive) → `0` (ToNumber, via R4 then R2); `false` → `0` (R1); `0 == 0` is `true`.',
  },
  {
    code: `console.log([] == ![]);`,
    options: ['false', 'TypeError (throws)', 'undefined', 'true'],
    correctIndex: 3,
    explanation: '`![]` is `false` (arrays are truthy, then negated); this reduces to `[] == false`, which resolves to `0 == 0`.',
  },
  {
    code: `console.log(null == undefined);
console.log(null == 0);`,
    options: ['true then false', 'false then true', 'true then true', 'false then false'],
    correctIndex: 0,
    explanation: '`null`/`undefined` form their own bubble, loosely equal only to each other — that bubble never extends to `0`.',
  },
  {
    code: `console.log(null == 0);
console.log(null >= 0);`,
    options: ['false then false', 'true then true', 'false then true', 'true then false'],
    correctIndex: 2,
    explanation: 'Two different algorithms: `==`\'s null/undefined bubble never coerces to `0`; relational comparison has no such bubble and numifies `null` directly to `0`.',
  },
  {
    code: `console.log("10" < "9");`,
    options: ['NaN', 'true', 'false', 'TypeError (throws)'],
    correctIndex: 1,
    explanation: 'Both operands are already strings, so relational comparison compares **lexicographically**: `"1"` sorts before `"9"` character-by-character.',
  },
  {
    code: `console.log(0 == "");
console.log(0 == "0");
console.log("" == "0");`,
    options: ['true, true, false', 'true, true, true', 'false, false, false', 'true, false, true'],
    correctIndex: 0,
    explanation: '`==` is not transitive: `""`→`0` and `"0"`→`0` individually, but comparing `""` to `"0"` directly (same type, no coercion) they\'re just different strings.',
  },
  {
    code: `console.log("2" == true);`,
    options: ['true', 'TypeError (throws)', 'NaN', 'false'],
    correctIndex: 3,
    explanation: '`true`→`1` first (R1); then `"2"`→`2` (R2); `2 == 1` is `false`. `==` never checks "truthiness" — it only converts toward number/string.',
  },
  {
    code: `console.log(false == "0");`,
    options: ['TypeError (throws)', 'NaN', 'true', 'false'],
    correctIndex: 2,
    explanation: '`false`→`0` (R1), then `"0"`→`0` (R2); `0 == 0` is `true` — a classic `== false` trap.',
  },
  {
    code: `const sym = Symbol("id");
console.log(sym + "");`,
    options: ['NaN', 'TypeError (throws)', '"Symbol(id)"', 'undefined'],
    correctIndex: 1,
    explanation: 'Implicit coercion of a symbol always throws by design (`String(sym)` would work explicitly) — accidental stringify/numify of a unique identifier is usually a bug.',
  },
  {
    code: `const o = { toString() { return "X"; }, valueOf() { return 42; } };
console.log(o + "");
console.log(String(o));`,
    options: ['"42" then "X"', '"X" then "42"', '"42" then "42"', '"X" then "X"'],
    correctIndex: 0,
    explanation: '`o + ""` uses the `\'default\'` hint → `valueOf()` wins (`42`, then stringified). `String(o)` uses the `\'string\'` hint → `toString()` wins (`"X"`).',
  },
  {
    code: `const d = new Date(2026, 0, 1);
console.log(typeof (d + 1));
console.log(typeof (+d));`,
    options: ['"number" then "string"', '"string" then "string"', '"number" then "number"', '"string" then "number"'],
    correctIndex: 3,
    explanation: '`Date` is the one exception where the `\'default\'` hint behaves like `\'string\'` (so `d + 1` stringifies); unary `+` explicitly forces the `\'number\'` hint (the timestamp).',
  },
  {
    code: `const money = {
  amount: 42,
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.amount;
    if (hint === "string") return \`$\${this.amount}\`;
    return \`\${this.amount} dollars\`;
  },
};
console.log(+money);
console.log(\`\${money}\`);
console.log(money + "");`,
    options: ['"42 dollars", "$42", 42', '42, "$42", "42 dollars"', '"$42", 42, "42 dollars"', '42, 42, 42'],
    correctIndex: 1,
    explanation: '`Symbol.toPrimitive`, when defined, wins over `valueOf`/`toString` entirely, and receives the hint directly: `\'number\'` for `+money`, `\'string\'` for the template literal, `\'default\'` for `+ ""`.',
  },
  {
    code: `console.log([1, 2, 3]);
console.log(String([1, 2, 3]));`,
    options: ['[ 1, 2, 3 ] then [ 1, 2, 3 ]', '"1,2,3" then "1,2,3"', '[ 1, 2, 3 ] then "1,2,3"', '"1,2,3" then [ 1, 2, 3 ]'],
    correctIndex: 2,
    explanation: '`console.log` uses the console\'s own *inspection* format for objects/arrays — not `toString()`. Only `String(x)` gives the real `ToString` result (`"1,2,3"`).',
  },
  {
    code: `console.log("abc" == new String("abc"));`,
    options: ['true', 'false', 'TypeError (throws)', 'NaN'],
    correctIndex: 0,
    explanation: '`new String("abc")` is an object; R4 runs `ToPrimitive` on it, unwrapping to `"abc"` — then it\'s a plain string-to-string compare, which is `true`.',
  },
  {
    code: `console.log(null == Object(null));`,
    options: ['true', 'TypeError (throws)', 'NaN', 'false'],
    correctIndex: 3,
    explanation: 'The `null`/`undefined` bubble only matches the literal values `null` and `undefined` — `Object(null)` is a real (empty) object, not in that bubble.',
  },
];
