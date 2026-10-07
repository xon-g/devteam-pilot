import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { MOODS, validateProfile, pickMoodReasons, cleanName } from '../src/profile.js';
import { MOOD_REASONS } from '../src/reasons.js';
import { shareText } from '../src/lucky.js';

const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];

test('MOOD_REASONS keys equal MOODS', () => {
  assert.deepStrictEqual(Object.keys(MOOD_REASONS).sort(), [...MOODS].sort());
});

test('MOOD_REASONS lists are well formed and free of banned phrases', () => {
  for (const [mood, list] of Object.entries(MOOD_REASONS)) {
    assert.ok(list.length >= 6, `${mood}: fewer than 6`);
    assert.strictEqual(new Set(list).size, list.length, `${mood}: duplicates`);
    for (const line of list) {
      assert.strictEqual(typeof line, 'string');
      assert.ok(line.trim() === line && line.length > 0, `${mood}: bad trim "${line}"`);
      assert.ok(line.length <= 48, `${mood}: too long "${line}"`);
      for (const phrase of BANNED) {
        assert.ok(!line.toLowerCase().includes(phrase), `${mood}: banned "${phrase}"`);
      }
    }
  }
});

test('cleanName trims and collapses whitespace', () => {
  assert.strictEqual(cleanName('  Bea   Cruz '), 'Bea Cruz');
});

test('validateProfile table', () => {
  assert.deepStrictEqual(validateProfile({ name: '', age: '', mood: 'chill' }), { ok: true, name: '', age: null, mood: 'chill' });
  assert.strictEqual(validateProfile({ name: '  Bea   Cruz ', age: '', mood: 'chill' }).name, 'Bea Cruz');
  const longName = validateProfile({ name: 'a'.repeat(31), age: '', mood: 'chill' });
  assert.deepStrictEqual([longName.ok, longName.field], [false, 'name']);
  assert.strictEqual(longName.message, 'Hanggang 30 letters lang ang pangalan, bes.');
  assert.strictEqual(validateProfile({ name: 'a'.repeat(30), age: '', mood: 'chill' }).ok, true);

  const minor = validateProfile({ name: '', age: '17', mood: 'chill' });
  assert.deepStrictEqual([minor.ok, minor.field, minor.message], [false, 'age', "18+ lang 'to, bes. Balik ka pag 18 ka na!"]);
  const adult = validateProfile({ name: '', age: '18', mood: 'chill' });
  assert.strictEqual(adult.ok, true);
  assert.strictEqual(adult.age, 18);

  for (const bad of ['0', '121', 'abc', '1e2', '-5', '25.5']) {
    const r = validateProfile({ name: '', age: bad, mood: 'chill' });
    assert.deepStrictEqual([r.ok, r.field, r.message], [false, 'age', 'Pakilagay ang tamang edad.'], `age ${bad}`);
  }
  for (const mood of ['', 'happy']) {
    const r = validateProfile({ name: '', age: '', mood });
    assert.deepStrictEqual([r.ok, r.field], [false, 'mood']);
    assert.strictEqual(r.message, 'Kumusta ka? Pumili ka muna, bes.');
  }
});

test('pickMoodReasons returns 3 distinct items from the mood list', () => {
  for (let i = 0; i < 200; i++) {
    const picks = pickMoodReasons('pagod');
    assert.strictEqual(picks.length, 3);
    assert.strictEqual(new Set(picks).size, 3);
    for (const p of picks) assert.ok(MOOD_REASONS.pagod.includes(p));
  }
});

test('shareText with and without a name', () => {
  assert.ok(shareText([1, 2, 3], 'straight', 'Bea').startsWith('Swertres lucky numbers ni Bea: 1-2-3'));
  assert.ok(shareText([1, 2, 3], 'straight').startsWith('Swertres lucky numbers ko: 1-2-3'));
});

test('privacy: no storage, network or innerHTML in src/', () => {
  const forbidden = ['localStorage', 'sessionStorage', 'document.cookie', 'XMLHttpRequest', 'innerHTML'];
  for (const f of fs.readdirSync(new URL('../src', import.meta.url)).filter((x) => x.endsWith('.js'))) {
    const text = fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    // Task 39: app.js alone may use localStorage, for the language choice (disclosed on the privacy page).
    for (const word of forbidden) {
      if (word === 'localStorage' && f === 'app.js') continue;
      assert.ok(!text.includes(word), `${word} in src/${f}`);
    }
    // The schedule loader is the one same-origin fetch (see results-links.test.js).
    if (f !== 'schedule.js') assert.ok(!text.includes('fetch('), `fetch( in src/${f}`);
  }
});
