#!/usr/bin/env node

/**
 * object-x CLI — Command-line interface for object manipulation
 *
 * @license MIT
 */

import { readFileSync } from 'node:fs';
import { deepClone, deepMerge, deepGet, deepSet, flatten, unflatten, pick, omit, mapValues, paths, leaves, safeStringify } from './index.js';

function readInput() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  // Try to read JSON from stdin or --input flag
  let input = null;

  const inputIdx = args.indexOf('--input');
  if (inputIdx !== -1 && args[inputIdx + 1]) {
    try {
      input = JSON.parse(readFileSync(args[inputIdx + 1], 'utf8'));
    } catch (e) {
      console.error(`Error reading input file: ${e.message}`);
      process.exit(1);
    }
  } else {
    // Try stdin
    try {
      const stdin = readFileSync(0, 'utf8').trim();
      if (stdin) input = JSON.parse(stdin);
    } catch {
      // No stdin available
    }
  }

  return { command, args: args.slice(1), input };
}

function printHelp() {
  console.log(`
object-x — Zero-dependency object manipulation utilities

Usage:
  object-x <command> [options]

Commands:
  flatten [options]     Flatten nested object to dot-separated keys
  unflatten [options]   Unflatten dot-separated keys to nested object
  merge <files...>      Deep merge multiple JSON files
  get <path>            Get nested value by dot path
  set <path> <value>    Set nested value by dot path
  pick <keys...>        Pick keys from object
  omit <keys...>        Omit keys from object
  map <expression>      Map values (e.g., "v=>v*2" or "v=>v.toUpperCase()")
  paths                 List all paths in object
  leaves                List all leaf values
  clone                 Deep clone (output JSON)
  demo                  Show demo of all features

Options:
  --input <file>        Read JSON from file
  --separator <char>    Path separator (default: '.')
  --json                Output as formatted JSON

Examples:
  echo '{"a":{"b":1}}' | object-x flatten
  echo '{"a.b":1}' | object-x unflatten
  echo '{"a":1,"b":2,"c":3}' | object-x pick a c
  echo '{"a":1,"b":2}' | object-x get a
  object-x merge file1.json file2.json
  object-x demo
`);
}

function output(obj, asJson = true) {
  if (asJson) {
    console.log(JSON.stringify(obj, null, 2));
  } else {
    console.log(String(obj));
  }
}

const { command, args, input } = readInput();
const flags = args.filter(a => a.startsWith('--'));
const positional = args.filter(a => !a.startsWith('--'));

switch (command) {
  case 'flatten': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    const sepIdx = flags.indexOf('--separator');
    const separator = sepIdx !== -1 ? flags[sepIdx + 1] : '.';
    output(flatten(input, { separator }));
    break;
  }

  case 'unflatten': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    const sepIdx = flags.indexOf('--separator');
    const separator = sepIdx !== -1 ? flags[sepIdx + 1] : '.';
    output(unflatten(input, { separator }));
    break;
  }

  case 'merge': {
    if (positional.length < 1) { console.error('Need at least one file'); process.exit(1); }
    const objs = positional.map(f => {
      try { return JSON.parse(readFileSync(f, 'utf8')); }
      catch (e) { console.error(`Error reading ${f}: ${e.message}`); process.exit(1); }
    });
    output(deepMerge(...objs));
    break;
  }

  case 'get': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    if (!positional[0]) { console.error('Need a path'); process.exit(1); }
    output(deepGet(input, positional[0]));
    break;
  }

  case 'set': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    if (!positional[0] || positional[1] === undefined) { console.error('Need path and value'); process.exit(1); }
    let value = positional[1];
    try { value = JSON.parse(positional[1]); } catch { /* keep as string */ }
    output(deepSet(input, positional[0], value));
    break;
  }

  case 'pick': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    output(pick(input, ...positional));
    break;
  }

  case 'omit': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    output(omit(input, ...positional));
    break;
  }

  case 'map': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    if (!positional[0]) { console.error('Need expression'); process.exit(1); }
    const expr = positional[0];
    // Simple arrow function parsing: v => v * 2
    const match = expr.match(/^(.+?)\s*=>\s*(.+)$/);
    if (!match) { console.error('Invalid expression. Use: key => expr'); process.exit(1); }
    const fn = new Function(match[1], `return (${match[2]})`);
    output(mapValues(input, fn));
    break;
  }

  case 'paths': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    paths(input).forEach(p => console.log(p));
    break;
  }

  case 'leaves': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    leaves(input).forEach(v => console.log(typeof v === 'object' ? JSON.stringify(v) : v));
    break;
  }

  case 'clone': {
    if (!input) { console.error('No input provided'); process.exit(1); }
    output(deepClone(input));
    break;
  }

  case 'demo': {
    runDemo();
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

function runDemo() {
  console.log('═══════════════════════════════════════════════');
  console.log('  object-x — Demo');
  console.log('═══════════════════════════════════════════════\n');

  // deepClone
  const original = { a: { b: [1, 2, { c: 3 }] }, d: new Date() };
  const cloned = deepClone(original);
  cloned.a.b[2].c = 99;
  console.log('── deepClone ──');
  console.log('original.a.b[2].c:', original.a.b[2].c, '(unchanged)');
  console.log('cloned.a.b[2].c: ', cloned.a.b[2].c);
  console.log();

  // deepMerge
  const merged = deepMerge(
    { a: 1, b: { c: 2, x: 10 }, arr: [1, 2] },
    { b: { d: 3 }, arr: [3, 4], e: 5 }
  );
  console.log('── deepMerge ──');
  console.log(JSON.stringify(merged, null, 2));
  console.log();

  // deepGet
  const obj = { user: { profile: { name: 'Sulthon', tags: ['dev', 'writer'] } } };
  console.log('── deepGet ──');
  console.log("deepGet(obj, 'user.profile.name'):", deepGet(obj, 'user.profile.name'));
  console.log("deepGet(obj, 'user.profile.tags[1]'):", deepGet(obj, 'user.profile.tags[1]'));
  console.log("deepGet(obj, 'missing.path', 'default'):", deepGet(obj, 'missing.path', 'default'));
  console.log();

  // flatten / unflatten
  console.log('── flatten / unflatten ──');
  const flat = flatten({ server: { host: '0.0.0.0', port: 3000 }, debug: true });
  console.log('flatten:', flat);
  console.log('unflatten:', unflatten(flat));
  console.log();

  // pick / omit
  console.log('── pick / omit ──');
  console.log('pick:', pick({ a: 1, b: 2, c: 3, d: 4 }, 'a', 'c'));
  console.log('omit:', omit({ a: 1, b: 2, c: 3, d: 4 }, 'b', 'd'));
  console.log();

  // mapValues
  console.log('── mapValues ──');
  const mapped = mapValues({ price: 100, tax: 20, total: 120 }, (v) => v * 2);
  console.log(mapped);
  console.log();

  // Circular reference
  console.log('── safeStringify (circular refs) ──');
  const circular = { name: 'self' };
  circular.self = circular;
  console.log(safeStringify(circular, 2));
  console.log();

  console.log('═══════════════════════════════════════════════');
  console.log('  30+ functions • zero dependencies • ES modules');
  console.log('  https://github.com/sulthonzh/object-x');
  console.log('═══════════════════════════════════════════════');
}
