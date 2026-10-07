import { test } from 'node:test';
import assert from 'node:assert';
import { getGame, drawNumbers, formatNumbers } from '../src/games.js';

test('1-58 game: one number in 1..58', () => {
  const g = getGame('1-58');
  assert.strictEqual(g.id, '1-58');
  assert.strictEqual(g.count, 1);
  assert.strictEqual(g.min, 1);
  assert.strictEqual(g.max, 58);
  assert.strictEqual(g.rambolito, false);
  for (let i = 0; i < 2000; i++) {
    const n = drawNumbers(g);
    assert.strictEqual(n.length, 1);
    assert.ok(Number.isInteger(n[0]) && n[0] >= 1 && n[0] <= 58);
  }
  const seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(drawNumbers(g)[0]);
  assert.ok(seen.has(1) && seen.has(58));
  assert.strictEqual(formatNumbers(g, [7]), '07');
});
