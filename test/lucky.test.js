import { randomInt, drawCombo, pickReason, formatStraight, rambolitoCombos, shareText } from '../src/lucky.js';
import { REASONS } from '../src/reasons.js';
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert';

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

test('rambolitoCombos counts', () => {
  assert.strictEqual(rambolitoCombos([7, 7, 7]).length, 1);
  assert.strictEqual(rambolitoCombos([1, 1, 2]).length, 3);
});

test('rambolitoCombos is sorted for unsorted input', () => {
  assert.deepStrictEqual(rambolitoCombos([3, 2, 1]), ["1-2-3", "1-3-2", "2-1-3", "2-3-1", "3-1-2", "3-2-1"]);
  assert.deepStrictEqual(rambolitoCombos([2, 1, 1]), ["1-1-2", "1-2-1", "2-1-1"]);
});

test('pickReason(d) returns one of REASONS[d]', () => {
  for (let d = 0; d <= 9; d++) {
    for (let i = 0; i < 20; i++) {
      assert.ok(REASONS[d].includes(pickReason(d)), `pickReason(${d}) returned an unknown reason`);
    }
  }
});

test('formatStraight', () => {
  assert.strictEqual(formatStraight([3, 8, 1]), "3-8-1");
});

test('REASONS content check', () => {
  // Verify all digits 0-9 exist as keys
  const keys = Object.keys(REASONS).sort();
  assert.deepStrictEqual(keys, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], 'REASONS keys must be digits 0-9');
  
  // Verify required phrases exist
  const allReasons = Object.values(REASONS).flat();
  assert.ok(allReasons.includes('Pwede nang mangarap'), 'Missing "Pwede nang mangarap"');
  assert.ok(allReasons.includes('Meron din naman palang ganda ang buhay'), 'Missing "Meron din naman palang ganda ang buhay"');
  
  // Validate each digit's reasons
  for (let d = 0; d <= 9; d++) {
    const list = REASONS[d];
    assert.ok(Array.isArray(list), `Digit ${d} reasons must be an array`);
    assert.ok(list.length >= 4, `Digit ${d} must have >= 4 reasons, got ${list.length}`);
    
    // Check each reason
    const seen = new Set();
    for (const reason of list) {
      assert.ok(typeof reason === 'string', `Digit ${d} reason must be a string`);
      assert.ok(reason.length > 0, `Digit ${d} reason must be non-empty`);
      assert.ok(reason.trim().length > 0, `Digit ${d} reason must not be whitespace-only`);
      assert.ok(reason.length <= 48, `Digit ${d} reason too long (${reason.length} chars): ${reason}`);
      assert.ok(!seen.has(reason), `Digit ${d} has duplicate reason: ${reason}`);
      seen.add(reason);
    }
  }
});

test('lucky.js uses the single REASONS list from reasons.js', () => {
  const content = fs.readFileSync(new URL('../src/lucky.js', import.meta.url), 'utf8');
  assert.ok(content.includes("from './reasons.js'"), 'lucky.js must import REASONS from reasons.js');
  assert.strictEqual(/export const REASONS/.test(content), false, 'lucky.js must not keep its own copy of REASONS');
});

test('banned-phrase scan', () => {
  const content = fs.readFileSync(new URL('../src/reasons.js', import.meta.url), 'utf8').toLowerCase();
  const banned = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];
  banned.forEach(phrase => {
    assert.strictEqual(content.includes(phrase), false, `Found banned phrase: ${phrase}`);
  });
});

test('shareText straight format', () => {
  assert.strictEqual(shareText([3, 8, 1], 'straight'), 'Swertres lucky numbers ko: 3-8-1 (Straight) 🍀 For entertainment only. 18+.');
});

test('shareText rambolito format', () => {
  const text = shareText([1, 2, 3], 'rambolito');
  assert.ok(text.includes('1-2-3'));
  assert.ok(text.includes('1-3-2'));
  assert.ok(text.includes('2-1-3'));
  assert.ok(text.includes('2-3-1'));
  assert.ok(text.includes('3-1-2'));
  assert.ok(text.includes('3-2-1'));
  assert.ok(text.includes('🍀 For entertainment only. 18+.'));
});

test('shareText banned-phrase scan', () => {
  const text = shareText([3, 8, 1], 'straight');
  const banned = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];
  banned.forEach(phrase => {
    assert.strictEqual(text.toLowerCase().includes(phrase), false, `Found banned phrase in shareText: ${phrase}`);
  });
});
