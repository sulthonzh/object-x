/**
 * object-x — Zero-dependency object manipulation utilities
 *
 * Deep merge, deep clone, deep get/set, flatten, unflatten,
 * pick/omit (nested), mapValues/mapKeys, and more.
 *
 * @module object-x
 * @license MIT
 */

'use strict';

// ─── Type Checking ────────────────────────────────────────────────────────────

/**
 * Check if value is a plain object (created by {} or Object.create(null))
 * @param {*} val
 * @returns {boolean}
 */
function isPlainObject(val) {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is an array
 * @param {*} val
 * @returns {boolean}
 */
function isArray(val) {
  return Array.isArray(val);
}

// ─── Deep Clone ───────────────────────────────────────────────────────────────

/**
 * Deep clone a value. Handles plain objects, arrays, Date, RegExp, Map, Set,
 * and primitive values. Uses a recursive approach with cycle detection.
 *
 * @param {*} value - Value to clone
 * @param {WeakMap} [seen] - Internal cycle detection map
 * @returns {*} Deep clone of value
 *
 * @example
 * const original = { a: { b: [1, 2, { c: 3 }] } };
 * const cloned = deepClone(original);
 * cloned.a.b[2].c = 99;
 * // original.a.b[2].c === 3 (unaffected)
 */
export function deepClone(value, seen = new WeakMap()) {
  // Primitives, null, undefined
  if (value === null || typeof value !== 'object') return value;

  // Cycle detection
  if (seen.has(value)) return seen.get(value);

  // Date
  if (value instanceof Date) return new Date(value.getTime());

  // RegExp
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  // Map
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen));
    return copy;
  }

  // Set
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const v of value) copy.add(deepClone(v, seen));
    return copy;
  }

  // ArrayBuffer
  if (value instanceof ArrayBuffer) return value.slice(0);

  // Typed arrays
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const ctor = value.constructor;
    return new ctor(value.buffer.slice(0));
  }

  // Array
  if (Array.isArray(value)) {
    const copy = [];
    seen.set(value, copy);
    for (let i = 0; i < value.length; i++) copy[i] = deepClone(value[i], seen);
    return copy;
  }

  // Plain object
  const copy = Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

// ─── Deep Merge ───────────────────────────────────────────────────────────────

/**
 * Deep merge multiple objects into a new object.
 * - Plain objects are merged recursively
 * - Arrays are concatenated (use { mergeArrays: false } to replace)
 * - Non-object values are overwritten (last wins)
 * - null/undefined sources are skipped
 *
 * @param {...(Object|MergeOptions)} sources - Objects to merge (first arg may be options)
 * @param {Object} [options] - Options: { mergeArrays?: boolean }
 * @returns {Object} New merged object
 *
 * @example
 * deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 });
 * // => { a: 1, b: { c: 2, d: 3 }, e: 4 }
 *
 * @example
 * // With options (first arg)
 * deepMerge({ mergeArrays: false }, { a: [1, 2] }, { a: [3, 4] });
 * // => { a: [3, 4] }  (arrays replaced, not concatenated)
 */
export function deepMerge(...sources) {
  let mergeArrays = true;

  // Check if first arg is an options object (not a data object)
  if (sources.length > 1 && isPlainObject(sources[0]) && 'mergeArrays' in sources[0] && sources[0].mergeArrays !== undefined) {
    // Heuristic: treat first arg as options if it ONLY contains known option keys
    const keys = Object.keys(sources[0]);
    if (keys.every(k => k === 'mergeArrays')) {
      mergeArrays = sources[0].mergeArrays;
      sources = sources.slice(1);
    }
  }

  function mergeInto(target, source) {
    if (!isPlainObject(source) && !Array.isArray(source)) return source;

    if (Array.isArray(source)) {
      if (!mergeArrays || !Array.isArray(target)) return deepClone(source);
      const result = [...target];
      for (const item of source) result.push(deepClone(item));
      return result;
    }

    const result = isPlainObject(target) ? { ...target } : {};
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = result[key];

      if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
        result[key] = mergeInto(tgtVal, srcVal);
      } else if (Array.isArray(srcVal) && Array.isArray(tgtVal) && mergeArrays) {
        result[key] = [...tgtVal, ...deepClone(srcVal)];
      } else {
        result[key] = deepClone(srcVal);
      }
    }
    return result;
  }

  let result = {};
  for (const source of sources) {
    if (source == null) continue;
    result = mergeInto(result, source);
  }
  return result;
}

// ─── Deep Get / Set / Has / Unset ─────────────────────────────────────────────

/**
 * Parse a path string into an array of keys.
 * Supports dot notation: 'a.b.c' → ['a', 'b', 'c']
 * Supports bracket notation: 'a[0].b' → ['a', '0', 'b']
 * Supports escaped dots: 'a\\.b' → ['a.b']
 *
 * @param {string|Array} path
 * @returns {Array}
 */
function parsePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') return [path];

  const keys = [];
  let current = '';

  for (let i = 0; i < path.length; i++) {
    const ch = path[i];

    if (ch === '\\' && path[i + 1] === '.') {
      current += '.';
      i++;
    } else if (ch === '.') {
      if (current !== '') {
        keys.push(current);
        current = '';
      }
    } else if (ch === '[') {
      if (current !== '' || keys.length === 0) {
        keys.push(current);
        current = '';
      }
      // Read until ']'
      let j = i + 1;
      let num = '';
      while (j < path.length && path[j] !== ']') {
        num += path[j];
        j++;
      }
      keys.push(num);
      i = j;
    } else {
      current += ch;
    }
  }

  if (current !== '' || keys.length === 0) keys.push(current);
  return keys;
}

/**
 * Get a nested value by dot/bracket path.
 *
 * @param {Object} obj - Source object
 * @param {string|Array} path - Path like 'a.b.c' or ['a', 'b', 'c']
 * @param {*} [defaultValue] - Value to return if path doesn't exist
 * @returns {*} Value at path or defaultValue
 *
 * @example
 * deepGet({ a: { b: { c: 42 } } }, 'a.b.c');        // => 42
 * deepGet({ list: [{ name: 'x' }] }, 'list[0].name'); // => 'x'
 * deepGet({}, 'a.b', 'default');                      // => 'default'
 */
export function deepGet(obj, path, defaultValue) {
  if (obj == null) return defaultValue;
  const keys = parsePath(path);

  let current = obj;
  for (const key of keys) {
    if (current == null) return defaultValue;
    current = current[key];
  }
  return current === undefined ? defaultValue : current;
}

/**
 * Set a nested value by dot/bracket path.
 * Creates intermediate objects/arrays as needed.
 *
 * @param {Object} obj - Target object (mutated)
 * @param {string|Array} path - Path like 'a.b.c' or ['a', 'b', 'c']
 * @param {*} value - Value to set
 * @returns {Object} The same object (for chaining)
 *
 * @example
 * const obj = {};
 * deepSet(obj, 'a.b.c', 42);
 * // => { a: { b: { c: 42 } } }
 *
 * deepSet(obj, 'list[0].name', 'x');
 * // => { list: [{ name: 'x' }] }
 */
export function deepSet(obj, path, value) {
  if (obj == null || typeof obj !== 'object') {
    throw new TypeError('deepSet requires an object target');
  }

  const keys = parsePath(path);
  if (keys.length === 0) return obj;

  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const shouldBeArray = /^\d+$/.test(String(nextKey));

    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = shouldBeArray ? [] : {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Check if a nested path exists in an object.
 *
 * @param {Object} obj - Source object
 * @param {string|Array} path - Path to check
 * @returns {boolean} true if path exists
 *
 * @example
 * deepHas({ a: { b: 1 } }, 'a.b');   // => true
 * deepHas({ a: { b: 1 } }, 'a.b.c'); // => false
 */
export function deepHas(obj, path) {
  const keys = parsePath(path);
  let current = obj;

  for (const key of keys) {
    if (current == null || !(key in Object(current))) return false;
    current = current[key];
  }
  return true;
}

/**
 * Delete a nested value by path.
 *
 * @param {Object} obj - Target object (mutated)
 * @param {string|Array} path - Path to delete
 * @returns {boolean} true if deleted, false if path didn't exist
 *
 * @example
 * const obj = { a: { b: { c: 1 } } };
 * deepUnset(obj, 'a.b.c');
 * // => { a: { b: {} } }
 */
export function deepUnset(obj, path) {
  if (obj == null) return false;
  const keys = parsePath(path);
  if (keys.length === 0) return false;

  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current == null || typeof current !== 'object') return false;
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  if (current == null || !(lastKey in current)) return false;
  return delete current[lastKey];
}

// ─── Flatten / Unflatten ──────────────────────────────────────────────────────

/**
 * Flatten a nested object into a single-level object with dot-separated keys.
 *
 * @param {Object} obj - Object to flatten
 * @param {Object} [options] - Options
 * @param {string} [options.separator='.'] - Path separator
 * @param {number} [options.maxDepth] - Maximum nesting depth
 * @returns {Object} Flattened object
 *
 * @example
 * flatten({ a: { b: { c: 1 } }, d: 2 });
 * // => { 'a.b.c': 1, d: 2 }
 *
 * flatten({ a: { b: 1 } }, { separator: '/' });
 * // => { 'a/b': 1 }
 */
export function flatten(obj, options = {}) {
  const { separator = '.', maxDepth } = options;
  const result = {};

  function walk(value, prefix, depth) {
    if (maxDepth !== undefined && depth >= maxDepth) {
      result[prefix] = value;
      return;
    }

    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const key of Object.keys(value)) {
        const newPrefix = prefix ? `${prefix}${separator}${key}` : key;
        walk(value[key], newPrefix, depth + 1);
      }
    } else {
      result[prefix] = value;
    }
  }

  // Handle top-level
  for (const key of Object.keys(obj)) {
    walk(obj[key], key, 1);
  }

  return result;
}

/**
 * Unflatten a dot-separated object into a nested object.
 *
 * @param {Object} obj - Flattened object
 * @param {Object} [options] - Options
 * @param {string} [options.separator='.'] - Path separator
 * @returns {Object} Nested object
 *
 * @example
 * unflatten({ 'a.b.c': 1, d: 2 });
 * // => { a: { b: { c: 1 } }, d: 2 }
 */
export function unflatten(obj, options = {}) {
  const { separator = '.' } = options;
  const result = {};

  for (const flatKey of Object.keys(obj)) {
    const keys = flatKey.split(separator);
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = obj[flatKey];
  }

  return result;
}

// ─── Pick / Omit ──────────────────────────────────────────────────────────────

/**
 * Pick specific keys from an object (shallow).
 *
 * @param {Object} obj - Source object
 * @param {...(string|string[])} keys - Keys to pick
 * @returns {Object} New object with only picked keys
 *
 * @example
 * pick({ a: 1, b: 2, c: 3 }, 'a', 'c');
 * // => { a: 1, c: 3 }
 */
export function pick(obj, ...keys) {
  const flatKeys = keys.flat();
  const result = {};
  for (const key of flatKeys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object (shallow).
 *
 * @param {Object} obj - Source object
 * @param {...(string|string[])} keys - Keys to omit
 * @returns {Object} New object without omitted keys
 *
 * @example
 * omit({ a: 1, b: 2, c: 3 }, 'b');
 * // => { a: 1, c: 3 }
 */
export function omit(obj, ...keys) {
  const flatKeys = keys.flat();
  const keySet = new Set(flatKeys);
  const result = {};
  for (const key of Object.keys(obj)) {
    if (!keySet.has(key)) result[key] = obj[key];
  }
  return result;
}

/**
 * Deep pick — pick nested paths from an object.
 *
 * @param {Object} obj - Source object
 * @param {...(string|string[])} paths - Dot paths to pick
 * @returns {Object} New object with only picked paths
 *
 * @example
 * deepPick({ a: { b: 1, c: 2 }, d: 3 }, 'a.b', 'd');
 * // => { a: { b: 1 }, d: 3 }
 */
export function deepPick(obj, ...paths) {
  const flatPaths = paths.flat();
  const result = {};

  for (const path of flatPaths) {
    if (deepHas(obj, path)) {
      deepSet(result, path, deepClone(deepGet(obj, path)));
    }
  }

  return result;
}

/**
 * Deep omit — omit nested paths from an object.
 *
 * @param {Object} obj - Source object
 * @param {...(string|string[])} paths - Dot paths to omit
 * @returns {Object} New object without omitted paths
 *
 * @example
 * deepOmit({ a: { b: 1, c: 2 }, d: 3 }, 'a.b');
 * // => { a: { c: 2 }, d: 3 }
 */
export function deepOmit(obj, ...paths) {
  const flatPaths = paths.flat();
  const result = deepClone(obj);

  for (const path of flatPaths) {
    deepUnset(result, path);
  }

  return result;
}

// ─── MapValues / MapKeys / FilterValues ───────────────────────────────────────

/**
 * Map over object values, producing a new object with same keys.
 *
 * @param {Object} obj - Source object
 * @param {function(*, string, Object): *} fn - Mapper function (value, key, object)
 * @returns {Object} New object with mapped values
 *
 * @example
 * mapValues({ a: 1, b: 2 }, (v) => v * 2);
 * // => { a: 2, b: 4 }
 */
export function mapValues(obj, fn) {
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key], key, obj);
  }
  return result;
}

/**
 * Map over object keys, producing a new object with same values.
 *
 * @param {Object} obj - Source object
 * @param {function(string, *, Object): string} fn - Mapper function (key, value, object)
 * @returns {Object} New object with mapped keys
 *
 * @example
 * mapKeys({ a: 1, b: 2 }, (k) => k.toUpperCase());
 * // => { A: 1, B: 2 }
 */
export function mapKeys(obj, fn) {
  const result = {};
  for (const key of Object.keys(obj)) {
    const newKey = fn(key, obj[key], obj);
    result[newKey] = obj[key];
  }
  return result;
}

/**
 * Filter object entries, keeping only those where fn returns true.
 *
 * @param {Object} obj - Source object
 * @param {function(*, string, Object): boolean} fn - Predicate function (value, key, object)
 * @returns {Object} New object with filtered entries
 *
 * @example
 * filterValues({ a: 1, b: null, c: 3 }, (v) => v != null);
 * // => { a: 1, c: 3 }
 */
export function filterValues(obj, fn) {
  const result = {};
  for (const key of Object.keys(obj)) {
    if (fn(obj[key], key, obj)) {
      result[key] = obj[key];
    }
  }
  return result;
}

// ─── Invert / GroupBy / CountBy ───────────────────────────────────────────────

/**
 * Invert an object — swap keys and values.
 * If values aren't unique, last one wins (or becomes array with { multi: true }).
 *
 * @param {Object} obj - Source object
 * @param {Object} [options] - Options
 * @param {boolean} [options.multi=false] - If true, duplicate values become arrays
 * @returns {Object} Inverted object
 *
 * @example
 * invert({ a: 'x', b: 'y', c: 'x' });
 * // => { x: 'c', y: 'b' }  (c overwrites a for value 'x')
 *
 * invert({ a: 'x', b: 'y', c: 'x' }, { multi: true });
 * // => { x: ['a', 'c'], y: ['b'] }
 */
export function invert(obj, options = {}) {
  const { multi = false } = options;
  const result = {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (multi) {
      if (result[val] === undefined) {
        result[val] = [key];
      } else if (Array.isArray(result[val])) {
        result[val].push(key);
      } else {
        result[val] = [result[val], key];
      }
    } else {
      result[val] = key;
    }
  }

  return result;
}

/**
 * Group array items by a key function.
 *
 * @param {Array} arr - Array to group
 * @param {function(*, number): (string|number)} keyFn - Key extractor
 * @returns {Object} Object with grouped arrays
 *
 * @example
 * groupBy([1, 2, 3, 4, 5], (n) => n % 2 === 0 ? 'even' : 'odd');
 * // => { odd: [1, 3, 5], even: [2, 4] }
 */
export function groupBy(arr, keyFn) {
  const result = {};
  for (let i = 0; i < arr.length; i++) {
    const key = keyFn(arr[i], i);
    if (!result[key]) result[key] = [];
    result[key].push(arr[i]);
  }
  return result;
}

/**
 * Count items by a key function.
 *
 * @param {Array} arr - Array to count
 * @param {function(*, number): (string|number)} keyFn - Key extractor
 * @returns {Object} Object with counts
 *
 * @example
 * countBy(['a', 'b', 'a', 'c', 'a', 'b'], (x) => x);
 * // => { a: 3, b: 2, c: 1 }
 */
export function countBy(arr, keyFn) {
  const result = {};
  for (let i = 0; i < arr.length; i++) {
    const key = keyFn(arr[i], i);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

// ─── Paths / Leaves / Size ────────────────────────────────────────────────────

/**
 * List all paths (dot-separated) in a nested object.
 *
 * @param {Object} obj - Source object
 * @param {Object} [options] - Options
 * @param {number} [options.maxDepth] - Maximum depth
 * @param {boolean} [options.includeArrays=true] - Traverse into arrays
 * @returns {string[]} Array of paths
 *
 * @example
 * paths({ a: { b: 1, c: 2 } });
 * // => ['a.b', 'a.c']
 */
export function paths(obj, options = {}) {
  const { maxDepth, includeArrays = true } = options;
  const result = [];

  function walk(value, prefix, depth) {
    if (maxDepth !== undefined && depth >= maxDepth) {
      if (prefix) result.push(prefix);
      return;
    }

    if (isPlainObject(value) && Object.keys(value).length > 0) {
      for (const key of Object.keys(value)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        walk(value[key], newPrefix, depth + 1);
      }
    } else if (includeArrays && Array.isArray(value) && value.length > 0) {
      for (let i = 0; i < value.length; i++) {
        const newPrefix = `${prefix}[${i}]`;
        walk(value[i], newPrefix, depth + 1);
      }
    } else {
      if (prefix) result.push(prefix);
    }
  }

  walk(obj, '', 0);
  return result;
}

/**
 * Get all leaf values from a nested object.
 *
 * @param {Object} obj - Source object
 * @param {Object} [options] - Same as paths()
 * @returns {Array} Array of leaf values
 *
 * @example
 * leaves({ a: { b: 1, c: 2 }, d: 3 });
 * // => [1, 2, 3]
 */
export function leaves(obj, options = {}) {
  const allPaths = paths(obj, options);
  return allPaths.map(p => deepGet(obj, p));
}

/**
 * Count all keys in a nested object (recursive).
 *
 * @param {Object} obj - Source object
 * @returns {number} Total key count
 *
 * @example
 * size({ a: { b: 1, c: 2 }, d: 3 });
 * // => 4  (a, b, c, d)
 */
export function size(obj) {
  if (!isPlainObject(obj)) return 0;
  let count = 0;
  for (const key of Object.keys(obj)) {
    count++;
    if (isPlainObject(obj[key])) {
      count += size(obj[key]);
    } else if (Array.isArray(obj[key])) {
      for (const item of obj[key]) {
        if (isPlainObject(item)) count += size(item);
      }
    }
  }
  return count;
}

// ─── Deep Freeze ──────────────────────────────────────────────────────────────

/**
 * Deep freeze an object — making it fully immutable.
 *
 * @param {*} obj - Value to freeze
 * @returns {*} The frozen value
 *
 * @example
 * const frozen = deepFreeze({ a: { b: 1 } });
 * frozen.a.b = 99; // silently fails in non-strict, throws in strict mode
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  // Already frozen
  if (Object.isFrozen(obj)) return obj;

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) deepFreeze(item);
  } else {
    for (const key of Object.keys(obj)) {
      deepFreeze(obj[key]);
    }
  }

  return obj;
}

/**
 * Check if an object is deeply frozen.
 *
 * @param {*} obj - Value to check
 * @returns {boolean} true if deeply frozen
 */
export function isDeepFrozen(obj) {
  if (obj === null || typeof obj !== 'object') return true;
  if (!Object.isFrozen(obj)) return false;

  for (const key of Object.keys(obj)) {
    if (!isDeepFrozen(obj[key])) return false;
  }
  return true;
}

// ─── FromPairs / ToPairs ──────────────────────────────────────────────────────

/**
 * Create an object from an array of [key, value] pairs.
 *
 * @param {Array<[string, *]>} pairs - Array of key-value pairs
 * @returns {Object} Resulting object
 *
 * @example
 * fromPairs([['a', 1], ['b', 2]]);
 * // => { a: 1, b: 2 }
 */
export function fromPairs(pairs) {
  const result = {};
  for (const [key, value] of pairs) {
    result[key] = value;
  }
  return result;
}

/**
 * Convert an object to an array of [key, value] pairs.
 *
 * @param {Object} obj - Source object
 * @returns {Array<[string, *]>} Array of key-value pairs
 *
 * @example
 * toPairs({ a: 1, b: 2 });
 * // => [['a', 1], ['b', 2]]
 */
export function toPairs(obj) {
  return Object.entries(obj);
}

// ─── Chunk / ZipObject ────────────────────────────────────────────────────────

/**
 * Zip arrays into an array of tuples.
 *
 * @param {...Array} arrays - Arrays to zip
 * @returns {Array<Array>} Zipped array
 *
 * @example
 * zip([1, 2], ['a', 'b']);
 * // => [[1, 'a'], [2, 'b']]
 */
export function zip(...arrays) {
  if (arrays.length === 0) return [];
  const len = Math.min(...arrays.map(a => a.length));
  const result = [];
  for (let i = 0; i < len; i++) {
    result.push(arrays.map(a => a[i]));
  }
  return result;
}

/**
 * Create an object from keys and values arrays.
 *
 * @param {Array} keys - Array of keys
 * @param {Array} values - Array of values
 * @returns {Object} Zipped object
 *
 * @example
 * zipObject(['a', 'b', 'c'], [1, 2, 3]);
 * // => { a: 1, b: 2, c: 3 }
 */
export function zipObject(keys, values) {
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = values[i];
  }
  return result;
}

// ─── Merge / Defaults ─────────────────────────────────────────────────────────

/**
 * Shallow merge — like Object.assign but returns new object.
 *
 * @param {...Object} sources
 * @returns {Object}
 */
export function merge(...sources) {
  return Object.assign({}, ...sources.filter(s => s != null));
}

/**
 * Fill in missing keys with defaults (shallow, does not overwrite).
 *
 * @param {Object} obj - Source object
 * @param {...Object} defaults - Default values
 * @returns {Object} New object with defaults filled in
 *
 * @example
 * defaults({ a: 1 }, { a: 99, b: 2 });
 * // => { a: 1, b: 2 }
 */
export function defaults(obj, ...defaultSources) {
  const result = { ...obj };
  for (const source of defaultSources) {
    if (source == null) continue;
    for (const key of Object.keys(source)) {
      if (result[key] === undefined) {
        result[key] = source[key];
      }
    }
  }
  return result;
}

// ─── IsEmpty / IsEqual (shallow) ──────────────────────────────────────────────

/**
 * Check if an object has no own enumerable properties.
 *
 * @param {*} obj
 * @returns {boolean}
 *
 * @example
 * isEmpty({});           // => true
 * isEmpty({ a: 1 });     // => false
 * isEmpty(null);         // => true
 */
export function isEmpty(obj) {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'string' || obj instanceof Map || obj instanceof Set) {
    return obj.size === 0;
  }
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return true;
}

// ─── Cycle / Serialize ────────────────────────────────────────────────────────

/**
 * Serialize an object with circular references to JSON.
 * Circular references are replaced with "[Circular]" strings.
 *
 * @param {*} obj - Value to serialize
 * @param {number|string} [space] - JSON.stringify space argument
 * @returns {string} JSON string with circular refs handled
 *
 * @example
 * const obj = { a: 1 };
 * obj.self = obj;
 * safeStringify(obj);
 * // => '{"a":1,"self":"[Circular]"}'
 */
export function safeStringify(obj, space) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, space);
}

// ─── Export all ───────────────────────────────────────────────────────────────

export default {
  deepClone,
  deepMerge,
  deepGet,
  deepSet,
  deepHas,
  deepUnset,
  flatten,
  unflatten,
  pick,
  omit,
  deepPick,
  deepOmit,
  mapValues,
  mapKeys,
  filterValues,
  invert,
  groupBy,
  countBy,
  paths,
  leaves,
  size,
  deepFreeze,
  isDeepFrozen,
  fromPairs,
  toPairs,
  zip,
  zipObject,
  merge,
  defaults,
  isEmpty,
  safeStringify,
};
