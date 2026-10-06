import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert';

import { randomInt, drawCombo, pickReason, formatStraight, rambolitoCombos, REASONS } from '../src/lucky.js';

test('randomInt(10) distribution', () => {
  const counts = new Array(10).fill(0);
  const iterations = 20000;
  for (let i = 0; i < iterations; i++) {
    counts[randomInt(10)]++;
  }
  for (let j = 0; j < 10; j++) {
    assert.ok(counts[j] >= 1600 && counts[j] <= 2400, `Digit ${j} count ${counts[j]} out of range`);
  }
});

test('drawCombo returns 3 digits', () => {
  const combos = [];
  for (let i = 0; i < 50; i++) {
    const combo = drawCombo();
    assert.strictEqual(combo.length, 3);
    combo.forEach(d => assert.ok(d >= 0 && d <= 9));
    combos.push(combo);
  }
  const allSame = combos.every(c => JSON.stringify(c) === JSON.stringify(combos[0]));
  assert.strictEqual(allSame, false, 'drawCombo should not return identical combos every time');
});

test('lucky.js source check', () => {
  const content = fs.readFileSync(new URL('../src/lucky.js', import.meta.url), 'utf8');
  assert.ok(content.includes('getRandomValues'), 'Missing getRandomValues');
  assert.strictEqual(content.includes('Math.random'), false, 'Should not use Math.random');
});

test('rambolitoCombos permutations', () => {
  assert.deepStrictEqual(rambolitoCombos([1, 2, 3]), ["1-2-3", "1-3-2", "2-1-3", "2-3-1", "3-1-2", "3-2-1"]);
  assert.deepStrictEqual(rambolitoCombos([1, 1, 2]), ["1-1-2", "1-2-1", "2-1-1"]);
  assert.deepStrictEqual(rambolitoCombos([5, 5, 5]), ["5-5-5"]);
});

test('formatStraight', () => {
  assert.strictEqual(formatStraight([3, 8, 1]), "3-8-1");
});

test('REASONS content check', () => {
  for (let d = 0; d <= 9; d++) {
    const list = REASONS[d];
    assert.ok(Array.isArray(list) && list.length >= 3, `Digit ${d} must have >= 3 reasons`);
    list.forEach(reason => {
      assert.ok(typeof reason === 'string' && reason.length > 0, `Reason for ${d} must be a non-empty string`);
    });
  }
});

test('banned-phrase scan', () => {
  const content = fs.readFileSync(new URL('../src/reasons.js', import.meta.url), 'utf8').toLowerCase();
  const banned = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na'];
  banned.forEach(phrase => {
    assert.strictEqual(content.includes(phrase), false, `Found banned phrase: ${phrase}`);
  });
});
