import { test } from 'node:test';
import assert from 'node:assert';
import { createSound, SOUNDS } from '../src/sound.js';

function fakeFactory() {
  const rec = { created: 0, osc: [], gains: [], resumed: 0 };
  const factory = () => {
    rec.created++;
    return {
      currentTime: 10,
      state: 'suspended',
      destination: {},
      resume() { rec.resumed++; return Promise.resolve(); },
      createOscillator() {
        const o = { type: '', freq: null, start: null, stop: null,
          frequency: { setValueAtTime(v) { o.freq = v; } },
          connect() {}, start(t) { o.start = t; }, stop(t) { o.stop = t; } };
        rec.osc.push(o);
        return o;
      },
      createGain() {
        const g = { gain: { setValueAtTime(v) { rec.gains.push(v); }, exponentialRampToValueAtTime(v) { rec.gains.push(v); } }, connect() {} };
        return g;
      }
    };
  };
  return { rec, factory };
}

test('imports in Node and exports SOUNDS', () => {
  assert.deepStrictEqual(Object.keys(SOUNDS), ['tick', 'ding', 'chaching']);
});

test('factory is not called until first play', () => {
  const { rec, factory } = fakeFactory();
  const s = createSound(factory);
  assert.strictEqual(rec.created, 0);
  s.play('tick');
  assert.strictEqual(rec.created, 1);
  s.play('tick');
  assert.strictEqual(rec.created, 1);
  assert.strictEqual(rec.resumed >= 1, true);
});

test('tick plays two oscillators', () => {
  const { rec, factory } = fakeFactory();
  createSound(factory).play('tick');
  assert.deepStrictEqual(rec.osc.map((o) => o.freq), [2400, 3200]);
  for (const o of rec.osc) assert.ok(o.stop - o.start <= 0.05);
});

test('ding pitch rises with index', () => {
  const { rec, factory } = fakeFactory();
  createSound(factory).play('ding', 2);
  assert.strictEqual(rec.osc.length, 1);
  assert.ok(Math.abs(rec.osc[0].freq - 1320 * 1.06 ** 2) < 0.01);
});

test('chaching plays four oscillators within 0.46 s; no gain above 0.2', () => {
  const { rec, factory } = fakeFactory();
  createSound(factory).play('chaching');
  assert.strictEqual(rec.osc.length, 4);
  assert.deepStrictEqual(rec.osc.map((o) => o.freq), [1800, 2700, 2093, 2637]);
  for (const o of rec.osc) assert.ok(o.stop - 10 <= 0.46);
  const all = [];
  for (const n of ['tick', 'ding', 'chaching']) {
    const r = fakeFactory();
    createSound(r.factory).play(n, 5);
    all.push(...r.rec.gains);
  }
  for (const g of [...rec.gains, ...all]) assert.ok(g <= 0.2);
});

test('null or throwing factory never throws', () => {
  for (const f of [() => null, () => { throw new Error('no audio'); }]) {
    let calls = 0;
    const s = createSound(() => { calls++; return f(); });
    assert.doesNotThrow(() => { s.play('tick'); s.play('chaching'); });
    assert.strictEqual(calls, 1);
  }
});

test('disabled and unknown names do nothing', () => {
  const { rec, factory } = fakeFactory();
  const s = createSound(factory);
  s.setEnabled(false);
  assert.strictEqual(s.isEnabled(), false);
  s.play('tick');
  assert.strictEqual(rec.osc.length, 0);
  s.setEnabled(true);
  s.play('nope');
  assert.strictEqual(rec.osc.length, 0);
  s.play('tick');
  assert.strictEqual(rec.osc.length, 2);
});
