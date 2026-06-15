/**
 * object-x — Test suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  deepClone, deepMerge, deepGet, deepSet, deepHas, deepUnset,
  flatten, unflatten, pick, omit, deepPick, deepOmit,
  mapValues, mapKeys, filterValues,
  invert, groupBy, countBy,
  paths, leaves, size,
  deepFreeze, isDeepFrozen,
  fromPairs, toPairs, zip, zipObject,
  merge, defaults, isEmpty, safeStringify,
} from '../src/index.js';

// ─── deepClone ────────────────────────────────────────────────────────────────

describe('deepClone', () => {
  it('clones primitives', () => {
    assert.equal(deepClone(42), 42);
    assert.equal(deepClone('hello'), 'hello');
    assert.equal(deepClone(null), null);
    assert.equal(deepClone(undefined), undefined);
    assert.equal(deepClone(true), true);
  });

  it('clones plain objects', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    assert.deepEqual(cloned, original);
    assert.notEqual(cloned, original);
    assert.notEqual(cloned.b, original.b);
  });

  it('clones arrays', () => {
    const original = [1, [2, [3, 4]], 5];
    const cloned = deepClone(original);
    assert.deepEqual(cloned, original);
    assert.notEqual(cloned, original);
    assert.notEqual(cloned[1], original[1]);
  });

  it('clones Date', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const cloned = deepClone(date);
    assert.equal(cloned.getTime(), date.getTime());
    assert.notEqual(cloned, date);
  });

  it('clones RegExp', () => {
    const regex = /test/gi;
    const cloned = deepClone(regex);
    assert.equal(cloned.source, regex.source);
    assert.equal(cloned.flags, regex.flags);
  });

  it('clones Map', () => {
    const map = new Map([['a', 1], ['b', { c: 2 }]]);
    const cloned = deepClone(map);
    assert.equal(cloned.get('a'), 1);
    assert.deepEqual(cloned.get('b'), { c: 2 });
    assert.notEqual(cloned, map);
  });

  it('clones Set', () => {
    const set = new Set([1, 2, 3]);
    const cloned = deepClone(set);
    assert.deepEqual([...cloned], [...set]);
    assert.notEqual(cloned, set);
  });

  it('handles circular references', () => {
    const obj = { a: 1 };
    obj.self = obj;
    const cloned = deepClone(obj);
    assert.equal(cloned.a, 1);
    assert.equal(cloned.self, cloned);
  });

  it('clones typed arrays', () => {
    const arr = new Uint8Array([1, 2, 3, 4]);
    const cloned = deepClone(arr);
    assert.deepEqual([...cloned], [...arr]);
    assert.notEqual(cloned.buffer, arr.buffer);
  });

  it('clones nested structures', () => {
    const original = { list: [{ name: 'a', meta: { created: new Date() } }] };
    const cloned = deepClone(original);
    assert.deepEqual(cloned, original);
    assert.notEqual(cloned.list[0].meta, original.list[0].meta);
  });
});

// ─── deepMerge ────────────────────────────────────────────────────────────────

describe('deepMerge', () => {
  it('merges plain objects', () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
    assert.deepEqual(result, { a: 1, b: 3, c: 4 });
  });

  it('merges nested objects', () => {
    const result = deepMerge({ a: { b: 1 } }, { a: { c: 2 } });
    assert.deepEqual(result, { a: { b: 1, c: 2 } });
  });

  it('concatenates arrays by default', () => {
    const result = deepMerge({ arr: [1, 2] }, { arr: [3, 4] });
    assert.deepEqual(result, { arr: [1, 2, 3, 4] });
  });

  it('replaces arrays with option', () => {
    const result = deepMerge({ mergeArrays: false }, { arr: [1, 2] }, { arr: [3, 4] });
    assert.deepEqual(result, { arr: [3, 4] });
  });

  it('overwrites non-object values', () => {
    const result = deepMerge({ a: 1 }, { a: 'hello' });
    assert.deepEqual(result, { a: 'hello' });
  });

  it('skips null and undefined sources', () => {
    const result = deepMerge({ a: 1 }, null, undefined, { b: 2 });
    assert.deepEqual(result, { a: 1, b: 2 });
  });

  it('deeply merges multiple objects', () => {
    const result = deepMerge(
      { db: { host: 'localhost', port: 5432 } },
      { db: { port: 3000, ssl: true } },
      { db: { pool: 10 } }
    );
    assert.deepEqual(result, { db: { host: 'localhost', port: 3000, ssl: true, pool: 10 } });
  });

  it('does not mutate inputs', () => {
    const a = { x: { y: 1 } };
    const b = { x: { z: 2 } };
    deepMerge(a, b);
    assert.deepEqual(a, { x: { y: 1 } });
  });
});

// ─── deepGet ─────────────────────────────────────────────────────────────────

describe('deepGet', () => {
  it('gets nested values', () => {
    const obj = { a: { b: { c: 42 } } };
    assert.equal(deepGet(obj, 'a.b.c'), 42);
  });

  it('gets array values', () => {
    const obj = { list: [{ name: 'x' }] };
    assert.equal(deepGet(obj, 'list[0].name'), 'x');
  });

  it('returns default for missing paths', () => {
    assert.equal(deepGet({}, 'a.b.c', 'default'), 'default');
  });

  it('returns undefined for missing paths without default', () => {
    assert.equal(deepGet({}, 'a.b.c'), undefined);
  });

  it('handles array path', () => {
    const obj = { a: { b: 1 } };
    assert.equal(deepGet(obj, ['a', 'b']), 1);
  });

  it('handles null objects', () => {
    assert.equal(deepGet(null, 'a.b', 'def'), 'def');
  });

  it('handles escaped dots in keys', () => {
    const obj = { 'a.b': { c: 1 } };
    assert.equal(deepGet(obj, 'a\\.b.c'), 1);
  });
});

// ─── deepSet ─────────────────────────────────────────────────────────────────

describe('deepSet', () => {
  it('sets nested values', () => {
    const obj = {};
    deepSet(obj, 'a.b.c', 42);
    assert.deepEqual(obj, { a: { b: { c: 42 } } });
  });

  it('sets array values', () => {
    const obj = {};
    deepSet(obj, 'list[0].name', 'test');
    assert.deepEqual(obj, { list: [{ name: 'test' }] });
  });

  it('overwrites existing values', () => {
    const obj = { a: { b: 1 } };
    deepSet(obj, 'a.b', 99);
    assert.equal(obj.a.b, 99);
  });

  it('creates intermediate arrays for numeric keys', () => {
    const obj = {};
    deepSet(obj, 'items[2].name', 'third');
    assert.ok(Array.isArray(obj.items));
    assert.equal(obj.items[2].name, 'third');
  });

  it('returns the same object', () => {
    const obj = {};
    const result = deepSet(obj, 'a', 1);
    assert.equal(result, obj);
  });
});

// ─── deepHas ─────────────────────────────────────────────────────────────────

describe('deepHas', () => {
  it('returns true for existing paths', () => {
    assert.equal(deepHas({ a: { b: 1 } }, 'a.b'), true);
  });

  it('returns false for missing paths', () => {
    assert.equal(deepHas({ a: { b: 1 } }, 'a.b.c'), false);
  });

  it('handles undefined values correctly', () => {
    assert.equal(deepHas({ a: { b: undefined } }, 'a.b'), true);
  });
});

// ─── deepUnset ───────────────────────────────────────────────────────────────

describe('deepUnset', () => {
  it('removes nested values', () => {
    const obj = { a: { b: 1, c: 2 } };
    assert.equal(deepUnset(obj, 'a.b'), true);
    assert.deepEqual(obj, { a: { c: 2 } });
  });

  it('returns false for missing paths', () => {
    const obj = { a: 1 };
    assert.equal(deepUnset(obj, 'b.c'), false);
  });
});

// ─── flatten ─────────────────────────────────────────────────────────────────

describe('flatten', () => {
  it('flattens nested objects', () => {
    assert.deepEqual(
      flatten({ a: { b: { c: 1 } }, d: 2 }),
      { 'a.b.c': 1, d: 2 }
    );
  });

  it('respects separator option', () => {
    assert.deepEqual(
      flatten({ a: { b: 1 } }, { separator: '/' }),
      { 'a/b': 1 }
    );
  });

  it('respects maxDepth option', () => {
    assert.deepEqual(
      flatten({ a: { b: { c: { d: 1 } } } }, { maxDepth: 2 }),
      { 'a.b': { c: { d: 1 } } }
    );
  });

  it('handles empty objects', () => {
    assert.deepEqual(flatten({}), {});
  });
});

// ─── unflatten ───────────────────────────────────────────────────────────────

describe('unflatten', () => {
  it('unflattens dot-separated keys', () => {
    assert.deepEqual(
      unflatten({ 'a.b.c': 1, d: 2 }),
      { a: { b: { c: 1 } }, d: 2 }
    );
  });

  it('respects separator option', () => {
    assert.deepEqual(
      unflatten({ 'a/b': 1 }, { separator: '/' }),
      { a: { b: 1 } }
    );
  });

  it('is inverse of flatten', () => {
    const original = { a: { b: 1, c: 2 }, d: 3 };
    assert.deepEqual(unflatten(flatten(original)), original);
  });
});

// ─── pick / omit ─────────────────────────────────────────────────────────────

describe('pick', () => {
  it('picks specified keys', () => {
    assert.deepEqual(pick({ a: 1, b: 2, c: 3 }, 'a', 'c'), { a: 1, c: 3 });
  });

  it('handles array of keys', () => {
    assert.deepEqual(pick({ a: 1, b: 2, c: 3 }, ['a', 'b']), { a: 1, b: 2 });
  });

  it('ignores missing keys', () => {
    assert.deepEqual(pick({ a: 1 }, 'a', 'missing'), { a: 1 });
  });
});

describe('omit', () => {
  it('omits specified keys', () => {
    assert.deepEqual(omit({ a: 1, b: 2, c: 3 }, 'b'), { a: 1, c: 3 });
  });

  it('handles array of keys', () => {
    assert.deepEqual(omit({ a: 1, b: 2, c: 3 }, ['a', 'c']), { b: 2 });
  });
});

// ─── deepPick / deepOmit ─────────────────────────────────────────────────────

describe('deepPick', () => {
  it('picks nested paths', () => {
    assert.deepEqual(
      deepPick({ a: { b: 1, c: 2 }, d: 3 }, 'a.b', 'd'),
      { a: { b: 1 }, d: 3 }
    );
  });
});

describe('deepOmit', () => {
  it('omits nested paths', () => {
    assert.deepEqual(
      deepOmit({ a: { b: 1, c: 2 }, d: 3 }, 'a.b'),
      { a: { c: 2 }, d: 3 }
    );
  });

  it('does not mutate original', () => {
    const obj = { a: { b: 1, c: 2 } };
    deepOmit(obj, 'a.b');
    assert.deepEqual(obj, { a: { b: 1, c: 2 } });
  });
});

// ─── mapValues / mapKeys / filterValues ──────────────────────────────────────

describe('mapValues', () => {
  it('maps values', () => {
    assert.deepEqual(mapValues({ a: 1, b: 2 }, (v) => v * 2), { a: 2, b: 4 });
  });

  it('passes key and object to mapper', () => {
    const result = mapValues({ a: 1, b: 2 }, (v, k) => `${k}${v}`);
    assert.deepEqual(result, { a: 'a1', b: 'b2' });
  });
});

describe('mapKeys', () => {
  it('maps keys', () => {
    assert.deepEqual(mapKeys({ a: 1, b: 2 }, (k) => k.toUpperCase()), { A: 1, B: 2 });
  });
});

describe('filterValues', () => {
  it('filters by predicate', () => {
    assert.deepEqual(
      filterValues({ a: 1, b: null, c: 3 }, (v) => v != null),
      { a: 1, c: 3 }
    );
  });
});

// ─── invert ──────────────────────────────────────────────────────────────────

describe('invert', () => {
  it('swaps keys and values', () => {
    assert.deepEqual(invert({ a: 'x', b: 'y' }), { x: 'a', y: 'b' });
  });

  it('handles duplicates with multi option', () => {
    assert.deepEqual(
      invert({ a: 'x', b: 'y', c: 'x' }, { multi: true }),
      { x: ['a', 'c'], y: ['b'] }
    );
  });
});

// ─── groupBy / countBy ───────────────────────────────────────────────────────

describe('groupBy', () => {
  it('groups by key function', () => {
    assert.deepEqual(
      groupBy([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? 'even' : 'odd')),
      { odd: [1, 3, 5], even: [2, 4] }
    );
  });
});

describe('countBy', () => {
  it('counts by key function', () => {
    assert.deepEqual(
      countBy(['a', 'b', 'a', 'c', 'a', 'b'], (x) => x),
      { a: 3, b: 2, c: 1 }
    );
  });
});

// ─── paths / leaves / size ───────────────────────────────────────────────────

describe('paths', () => {
  it('lists all paths', () => {
    assert.deepEqual(paths({ a: { b: 1, c: 2 } }), ['a.b', 'a.c']);
  });

  it('handles nested arrays', () => {
    assert.deepEqual(paths({ list: [10, 20] }), ['list[0]', 'list[1]']);
  });
});

describe('leaves', () => {
  it('lists all leaf values', () => {
    assert.deepEqual(leaves({ a: { b: 1, c: 2 }, d: 3 }), [1, 2, 3]);
  });
});

describe('size', () => {
  it('counts all keys recursively', () => {
    assert.equal(size({ a: { b: 1, c: 2 }, d: 3 }), 4);
  });

  it('returns 0 for non-objects', () => {
    assert.equal(size(null), 0);
    assert.equal(size('hello'), 0);
  });
});

// ─── deepFreeze / isDeepFrozen ───────────────────────────────────────────────

describe('deepFreeze', () => {
  it('freezes nested objects', () => {
    const frozen = deepFreeze({ a: { b: 1 } });
    assert.ok(Object.isFrozen(frozen));
    assert.ok(Object.isFrozen(frozen.a));
  });

  it('freezes arrays', () => {
    const frozen = deepFreeze([1, [2, 3]]);
    assert.ok(Object.isFrozen(frozen));
    assert.ok(Object.isFrozen(frozen[1]));
  });
});

describe('isDeepFrozen', () => {
  it('returns true for deeply frozen objects', () => {
    assert.ok(isDeepFrozen(deepFreeze({ a: { b: 1 } })));
  });

  it('returns false for non-frozen objects', () => {
    assert.ok(!isDeepFrozen({ a: { b: 1 } }));
  });
});

// ─── fromPairs / toPairs / zip / zipObject ───────────────────────────────────

describe('fromPairs', () => {
  it('creates object from pairs', () => {
    assert.deepEqual(fromPairs([['a', 1], ['b', 2]]), { a: 1, b: 2 });
  });
});

describe('toPairs', () => {
  it('converts object to pairs', () => {
    assert.deepEqual(toPairs({ a: 1 }), [['a', 1]]);
  });
});

describe('zip', () => {
  it('zips arrays', () => {
    assert.deepEqual(zip([1, 2], ['a', 'b']), [[1, 'a'], [2, 'b']]);
  });

  it('handles different lengths', () => {
    assert.deepEqual(zip([1, 2, 3], ['a']), [[1, 'a']]);
  });
});

describe('zipObject', () => {
  it('creates object from keys and values', () => {
    assert.deepEqual(zipObject(['a', 'b'], [1, 2]), { a: 1, b: 2 });
  });
});

// ─── merge / defaults / isEmpty ──────────────────────────────────────────────

describe('merge', () => {
  it('shallow merges', () => {
    assert.deepEqual(merge({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
  });

  it('skips null sources', () => {
    assert.deepEqual(merge({ a: 1 }, null, { b: 2 }), { a: 1, b: 2 });
  });
});

describe('defaults', () => {
  it('fills missing keys', () => {
    assert.deepEqual(defaults({ a: 1 }, { a: 99, b: 2 }), { a: 1, b: 2 });
  });

  it('fills in undefined values (lodash-compatible)', () => {
    assert.deepEqual(defaults({ a: undefined }, { a: 1 }), { a: 1 });
  });
});

describe('isEmpty', () => {
  it('returns true for empty objects', () => {
    assert.ok(isEmpty({}));
  });

  it('returns false for non-empty objects', () => {
    assert.ok(!isEmpty({ a: 1 }));
  });

  it('returns true for null', () => {
    assert.ok(isEmpty(null));
  });

  it('returns true for empty arrays', () => {
    assert.ok(isEmpty([]));
  });
});

// ─── safeStringify ───────────────────────────────────────────────────────────

describe('safeStringify', () => {
  it('serializes normal objects', () => {
    assert.equal(safeStringify({ a: 1 }), '{"a":1}');
  });

  it('handles circular references', () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = safeStringify(obj);
    assert.ok(result.includes('"[Circular]"') || result.includes('"self":"[Circular]"'));
  });

  it('handles deeply nested circular refs', () => {
    const a = { name: 'a' };
    const b = { name: 'b', ref: a };
    a.ref = b;
    const result = safeStringify(a);
    assert.ok(result.includes('[Circular]'));
  });

  it('respects space argument', () => {
    const result = safeStringify({ a: 1 }, 2);
    assert.ok(result.includes('\n'));
  });
});
