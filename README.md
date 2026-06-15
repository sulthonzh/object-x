# object-x

Zero-dependency object manipulation utilities for JavaScript/TypeScript.

Deep merge, deep clone, deep get/set, flatten, unflatten, pick/omit (nested), mapValues/mapKeys, and more — all in one tiny package with **zero dependencies**.

## Why?

Every project ends up with object manipulation helpers scattered around. `deepMerge`, `clone`, `flatten` — you know the ones. Instead of copy-pasting or pulling in lodash, grab one package that does it all cleanly.

## Install

```bash
npm install object-x
```

## Quick Start

```js
import { deepMerge, deepGet, flatten } from 'object-x';

// Deep merge configs
const config = deepMerge(
  { server: { host: '0.0.0.0', port: 3000 } },
  { server: { port: 8080, ssl: true } }
);
// => { server: { host: '0.0.0.0', port: 8080, ssl: true } }

// Get nested values safely
const port = deepGet(config, 'server.port', 3000);

// Flatten for env vars or form data
const flat = flatten({ db: { host: 'localhost', port: 5432 } });
// => { 'db.host': 'localhost', 'db.port': 5432 }
```

## API

### Deep Operations

#### `deepClone(value)`
Deep clone with cycle detection. Handles objects, arrays, Date, RegExp, Map, Set, ArrayBuffer, typed arrays.

```js
const original = { date: new Date(), nested: { items: [1, 2, 3] } };
const copy = deepClone(original); // fully independent
```

#### `deepMerge(...sources)`
Deep merge multiple objects. Arrays concatenate by default (use `{ mergeArrays: false }` to replace).

```js
deepMerge({ a: { b: 1 } }, { a: { c: 2 } });
// => { a: { b: 1, c: 2 } }

deepMerge({ mergeArrays: false }, { tags: ['a'] }, { tags: ['b'] });
// => { tags: ['b'] }  (replaced, not concatenated)
```

#### `deepGet(obj, path, defaultValue?)`
Get nested value by dot/bracket path. Returns `defaultValue` if path doesn't exist.

```js
deepGet({ user: { name: 'Sulthon' } }, 'user.name');           // => 'Sulthon'
deepGet({ list: [{ id: 1 }] }, 'list[0].id');                  // => 1
deepGet({}, 'missing.path', 'fallback');                        // => 'fallback'
```

#### `deepSet(obj, path, value)`
Set nested value by path. Creates intermediate objects/arrays automatically.

```js
const obj = {};
deepSet(obj, 'config.server.port', 3000);
// => { config: { server: { port: 3000 } } }
```

#### `deepHas(obj, path)` → `boolean`
Check if a nested path exists.

#### `deepUnset(obj, path)` → `boolean`
Delete a nested value by path.

### Flatten / Unflatten

#### `flatten(obj, options?)` → `Object`
Flatten nested object to dot-separated keys.

```js
flatten({ a: { b: { c: 1 } } }, { separator: '.' });
// => { 'a.b.c': 1 }

flatten({ a: { b: { c: 1 } } }, { maxDepth: 1 });
// => { a: { b: { c: 1 } } }  (only top-level keys)
```

#### `unflatten(obj, options?)` → `Object`
Reverse of `flatten`.

### Pick / Omit

#### `pick(obj, ...keys)` → `Object`
Shallow pick of keys.

#### `omit(obj, ...keys)` → `Object`
Shallow omit of keys.

#### `deepPick(obj, ...paths)` → `Object`
Pick nested paths.

```js
deepPick({ user: { name: 'Sulthon', email: 'a@b.com' }, token: '123' }, 'user.name');
// => { user: { name: 'Sulthon' } }
```

#### `deepOmit(obj, ...paths)` → `Object`
Omit nested paths (returns new object, original untouched).

### Transform

#### `mapValues(obj, fn)` → `Object`
Transform values, keep keys.

```js
mapValues({ price: 100, tax: 20 }, (v) => v * 1.1);
```

#### `mapKeys(obj, fn)` → `Object`
Transform keys, keep values.

#### `filterValues(obj, fn)` → `Object`
Keep only entries where predicate returns true.

### Query

#### `paths(obj)` → `string[]`
List all paths (dot-separated) to leaf values.

#### `leaves(obj)` → `Array`
Get all leaf values.

#### `size(obj)` → `number`
Count all keys recursively.

### Utilities

| Function | Description |
|----------|-------------|
| `invert(obj, opts?)` | Swap keys and values (`{ multi: true }` for arrays) |
| `groupBy(arr, fn)` | Group array items by key |
| `countBy(arr, fn)` | Count items by key |
| `deepFreeze(obj)` | Deep freeze (immutable) |
| `isDeepFrozen(obj)` | Check deep frozen status |
| `fromPairs(pairs)` | `[['a',1],['b',2]]` → `{a:1,b:2}` |
| `toPairs(obj)` | Reverse of `fromPairs` |
| `zip(...arrays)` | Zip arrays into tuples |
| `zipObject(keys, vals)` | Create object from keys + values arrays |
| `merge(...sources)` | Shallow merge (new object) |
| `defaults(obj, ...defaults)` | Fill undefined keys |
| `isEmpty(obj)` | Check if object/array is empty |
| `safeStringify(obj, space?)` | JSON.stringify that handles circular refs |

## CLI

```bash
# Flatten JSON
echo '{"a":{"b":1}}' | object-x flatten

# Get nested value
echo '{"user":{"name":"Sulthon"}}' | object-x get user.name

# Merge JSON files
object-x merge config.json overrides.json

# Pick keys
echo '{"a":1,"b":2,"c":3}' | object-x pick a c

# See all features
object-x demo
```

## Design Principles

- **Zero dependencies** — nothing to audit, nothing to break
- **No mutation** — every function returns a new value (except `deepSet`, `deepUnset`, `deepFreeze` which are explicit mutations)
- **ES modules** — modern import/export syntax
- **Practical** — functions you actually need, not 500 variations of `_.get`

## License

MIT
