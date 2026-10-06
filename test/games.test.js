import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES, getGame, drawNumbers, formatNumbers } from '../src/games.js';
import { shareText } from '../src/lucky.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IDS = ['2d', '3d', '4d', '6d', '6-42', '6-45', '6-49', '6-55', '6-58'];

test('GAMES list', () => {
  assert.strictEqual(GAMES.length, 9);
  assert.strictEqual(new Set(GAMES.map((g) => g.id)).size, 9);
  for (const id of IDS) assert.ok(GAMES.some((g) => g.id === id), `missing ${id}`);
  assert.strictEqual(getGame('nope').id, '3d');
  assert.strictEqual(getGame('6-58').name, 'Ultra Lotto 6/58');
});

test('drawNumbers respects count, range, distinct and order', () => {
  for (const game of GAMES) {
    for (let i = 0; i < 500; i++) {
      const nums = drawNumbers(game);
      assert.strictEqual(nums.length, game.count);
      for (const n of nums) {
        assert.ok(Number.isInteger(n) && n >= game.min && n <= game.max, `${game.id}: ${n}`);
      }
      if (game.kind === 'lotto') {
        for (let k = 1; k < nums.length; k++) assert.ok(nums[k] > nums[k - 1], `${game.id}: ${nums}`);
      }
    }
  }
});

test('drawNumbers covers the full range', () => {
  const seen = (id) => {
    const game = getGame(id);
    const s = new Set();
    for (let i = 0; i < 2000; i++) drawNumbers(game).forEach((n) => s.add(n));
    return s;
  };
  const a = seen('6-58');
  assert.ok(a.has(1) && a.has(58));
  const b = seen('2d');
  assert.ok(b.has(1) && b.has(31));
  for (const id of ['3d', '4d', '6d']) {
    const s = seen(id);
    assert.ok(s.has(0) && s.has(9), id);
  }
});

test('formatNumbers', () => {
  assert.strictEqual(formatNumbers(getGame('3d'), [1, 2, 3]), '1-2-3');
  assert.strictEqual(formatNumbers(getGame('2d'), [7, 21]), '07-21');
  assert.strictEqual(formatNumbers(getGame('6-42'), [3, 12, 25, 31, 40, 42]), '03-12-25-31-40-42');
  assert.strictEqual(formatNumbers(getGame('6d'), [0, 0, 1, 2, 3, 4]), '0-0-1-2-3-4');
});

test('shareText per game', () => {
  const tail = ' 🍀 For entertainment only. 18+.';
  assert.strictEqual(shareText([1, 2, 3], 'straight'), `Swertres lucky numbers ko: 1-2-3 (Straight)${tail}`);
  assert.strictEqual(
    shareText([1, 2, 3], 'rambolito'),
    `Swertres lucky numbers ko: 1-2-3, 1-3-2, 2-1-3, 2-3-1, 3-1-2, 3-2-1 (Rambolito)${tail}`
  );
  assert.strictEqual(
    shareText([3, 12, 25, 31, 40, 42], 'rambolito', 'Bea', '6-42'),
    'Lotto 6/42 lucky numbers ni Bea: 03-12-25-31-40-42 🍀 For entertainment only. 18+.'
  );
  assert.ok(shareText([7, 21], 'rambolito', '', '2d').includes('EZ2 lucky numbers ko: 07-21, 21-07 (Rambolito)'));
  assert.ok(shareText([7, 7], 'rambolito', '', '2d').includes('07-07 (Rambolito)'));
});

test('no Math.random in src/', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    const text = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    assert.ok(!text.includes('Math.random'), f);
  }
});
