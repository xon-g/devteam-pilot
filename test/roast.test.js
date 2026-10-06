import { test } from 'node:test';
import assert from 'node:assert';
import {
  NAME_ROASTS, LONG_NAME_ROASTS, SHORT_NAME_ROASTS, AGE_ROASTS,
  fill, nameRoast, ageRoast, roastLines,
} from '../src/roast.js';

const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];

const POOLS = [
  ['NAME_ROASTS', NAME_ROASTS, '{name}'],
  ['LONG_NAME_ROASTS', LONG_NAME_ROASTS, '{name}'],
  ['SHORT_NAME_ROASTS', SHORT_NAME_ROASTS, '{name}'],
  ...AGE_ROASTS.map((b) => [`AGE ${b.min}-${b.max}`, b.lines, '{age}']),
];

const RUNS = 200;
const fromPool = (pool, key, value) => pool.map((t) => fill(t, key, value));

test('templates: placeholder once, trimmed, short, unique, no banned phrases', () => {
  for (const [label, pool, ph] of POOLS) {
    assert.strictEqual(new Set(pool).size, pool.length, `${label} has duplicates`);
    for (const t of pool) {
      assert.strictEqual(t.split(ph).length - 1, 1, `${label}: ${t} placeholder count`);
      assert.strictEqual(t, t.trim(), `${label}: ${t} not trimmed`);
      assert.ok(t.length <= 50, `${label}: ${t} is ${t.length} chars`);
      for (const phrase of BANNED) {
        assert.ok(!t.toLowerCase().includes(phrase), `${label}: "${t}" has banned "${phrase}"`);
      }
    }
  }
});

test('AGE_ROASTS buckets cover 18..120 without gaps or overlaps', () => {
  for (let age = 18; age <= 120; age++) {
    const hits = AGE_ROASTS.filter((b) => age >= b.min && age <= b.max);
    assert.strictEqual(hits.length, 1, `age ${age} matched ${hits.length} buckets`);
  }
});

test('nameRoast picks the right pool and keeps the name', () => {
  const cases = [
    ['Bea', SHORT_NAME_ROASTS],
    ['Bea Cruz', NAME_ROASTS],
    ['Maria Clara Santos', LONG_NAME_ROASTS],
  ];
  for (const [name, pool] of cases) {
    const allowed = fromPool(pool, 'name', name);
    for (let i = 0; i < RUNS; i++) {
      const line = nameRoast(name);
      assert.ok(allowed.includes(line), `${name}: ${line}`);
      assert.ok(line.includes(name));
    }
  }
  assert.strictEqual(nameRoast(''), null);
});

test('ageRoast lands in the right bucket', () => {
  const cases = [[18, 18], [21, 18], [22, 22], [39, 30], [40, 40], [60, 60], [120, 60]];
  for (const [age, min] of cases) {
    const bucket = AGE_ROASTS.find((b) => b.min === min);
    const allowed = fromPool(bucket.lines, 'age', age);
    for (let i = 0; i < RUNS; i++) {
      const line = ageRoast(age);
      assert.ok(allowed.includes(line), `${age}: ${line}`);
      assert.ok(line.includes(String(age)));
    }
  }
  assert.strictEqual(ageRoast(null), null);
});

test('roastLines returns 0, 1 or 2 lines, name first', () => {
  assert.deepStrictEqual(roastLines({ name: '', age: null }), []);
  assert.strictEqual(roastLines({ name: 'Jo', age: null }).length, 1);
  const both = roastLines({ name: 'Jo', age: 33 });
  assert.strictEqual(both.length, 2);
  assert.ok(both[0].includes('Jo'));
  assert.ok(both[1].includes('33'));
});

test('fill is literal, never a regex replacement', () => {
  assert.strictEqual(fill('{name}!', 'name', '$&$1'), '$&$1!');
  assert.ok(nameRoast('$&').includes('$&'));
});
