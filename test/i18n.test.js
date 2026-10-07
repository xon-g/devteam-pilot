import { test } from 'node:test';
import assert from 'node:assert';
import { LANGS, DEFAULT_LANG, LANG_LABELS, HTML_LANG, STRINGS, normalizeLang, t } from '../src/i18n.js';
import { REASONS_I18N, MOOD_REASONS_I18N } from '../src/reasons.js';
import {
  NAME_ROASTS_I18N, LONG_NAME_ROASTS_I18N, SHORT_NAME_ROASTS_I18N, AGE_ROASTS_I18N, roastLines,
} from '../src/roast.js';
import { shareText } from '../src/lucky.js';
import { pickMoodReasons, validateProfile } from '../src/profile.js';
import { drawLabel, formatCountdown } from '../src/schedule.js';
import { cardContent } from '../src/card.js';
import { getGame } from '../src/games.js';

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('constants and normalizeLang', () => {
  assert.deepStrictEqual(LANGS, ['taglish', 'en', 'tl']);
  assert.strictEqual(DEFAULT_LANG, 'taglish');
  assert.deepStrictEqual(LANG_LABELS, { taglish: 'Taglish', en: 'English', tl: 'Tagalog' });
  assert.deepStrictEqual(HTML_LANG, { taglish: 'fil', en: 'en', tl: 'fil' });
  assert.strictEqual(normalizeLang('en'), 'en');
  assert.strictEqual(normalizeLang('tl'), 'tl');
  for (const bad of ['EN', '', null, undefined, 'fr']) assert.strictEqual(normalizeLang(bad), 'taglish');
});

test('STRINGS: same keys, non-empty, same placeholders', () => {
  const keys = Object.keys(STRINGS.taglish).sort();
  for (const lang of ['en', 'tl']) {
    assert.deepStrictEqual(Object.keys(STRINGS[lang]).sort(), keys, lang);
    for (const k of keys) {
      const v = STRINGS[lang][k];
      assert.ok(typeof v === 'string' && v.trim().length > 0, `${lang}.${k} empty`);
      assert.strictEqual(placeholders(v), placeholders(STRINGS.taglish[k]), `${lang}.${k} placeholders`);
    }
  }
});

test('t() looks up, falls back and fills placeholders', () => {
  assert.strictEqual(t('en', 'forName', { name: 'Bea' }), 'For Bea');
  assert.strictEqual(t('tl', 'forName', { name: 'Bea' }), 'Para kay Bea');
  assert.strictEqual(t('xx', 'draw'), 'Bunot na!');
  assert.strictEqual(t('en', 'no.such.key'), 'no.such.key');
  assert.strictEqual(t('en', 'forName'), 'For {name}');
});

function checkLines(label, tables) {
  const base = tables.taglish;
  for (const lang of ['en', 'tl']) {
    assert.strictEqual(tables[lang].length, base.length, `${label} ${lang} length`);
    let same = 0;
    base.forEach((line, i) => {
      assert.strictEqual(placeholders(tables[lang][i]), placeholders(line), `${label} ${lang}[${i}] placeholders`);
      assert.ok(tables[lang][i].trim().length > 0);
      if (tables[lang][i] === line) same++;
    });
    assert.ok(same <= base.length * 0.1, `${label} ${lang}: ${same}/${base.length} untranslated`);
  }
}

test('reasons tables line up across languages', () => {
  const lists = {};
  const moodLists = {};
  for (const lang of LANGS) {
    assert.deepStrictEqual(Object.keys(REASONS_I18N[lang]), Object.keys(REASONS_I18N.taglish));
    assert.deepStrictEqual(Object.keys(MOOD_REASONS_I18N[lang]), Object.keys(MOOD_REASONS_I18N.taglish));
  }
  for (const lang of LANGS) {
    lists[lang] = Object.keys(REASONS_I18N.taglish).flatMap((d) => REASONS_I18N[lang][d]);
    moodLists[lang] = Object.keys(MOOD_REASONS_I18N.taglish).flatMap((m) => MOOD_REASONS_I18N[lang][m]);
  }
  for (const d of Object.keys(REASONS_I18N.taglish)) {
    for (const lang of LANGS) assert.strictEqual(REASONS_I18N[lang][d].length, REASONS_I18N.taglish[d].length, `digit ${d}`);
  }
  for (const m of Object.keys(MOOD_REASONS_I18N.taglish)) {
    for (const lang of LANGS) assert.strictEqual(MOOD_REASONS_I18N[lang][m].length, MOOD_REASONS_I18N.taglish[m].length, `mood ${m}`);
  }
  checkLines('REASONS', lists);
  checkLines('MOOD_REASONS', moodLists);
});

test('roast tables line up across languages', () => {
  checkLines('NAME_ROASTS', NAME_ROASTS_I18N);
  checkLines('LONG_NAME_ROASTS', LONG_NAME_ROASTS_I18N);
  checkLines('SHORT_NAME_ROASTS', SHORT_NAME_ROASTS_I18N);
  const age = {};
  for (const lang of LANGS) {
    assert.strictEqual(AGE_ROASTS_I18N[lang].length, AGE_ROASTS_I18N.taglish.length);
    AGE_ROASTS_I18N[lang].forEach((b, i) => {
      const base = AGE_ROASTS_I18N.taglish[i];
      assert.deepStrictEqual([b.min, b.max, b.lines.length], [base.min, base.max, base.lines.length], `${lang} bucket ${i}`);
    });
    age[lang] = AGE_ROASTS_I18N[lang].flatMap((b) => b.lines);
  }
  checkLines('AGE_ROASTS', age);
});

test('Taglish is the default everywhere', () => {
  const combo = [1, 2, 3];
  for (const mode of ['straight', 'rambolito']) {
    assert.strictEqual(shareText(combo, mode, 'Bea', '3d'), shareText(combo, mode, 'Bea', '3d', 'taglish'));
    assert.strictEqual(shareText(combo, mode), shareText(combo, mode, '', '3d', 'taglish'));
  }
  assert.strictEqual(shareText([5], 'straight', '', '1-58'), 'Isang Numero lucky numbers ko: 05 🍀 For entertainment only. 18+.');
  assert.ok(shareText([5], 'straight', '', '1-58', 'en').startsWith('My One Number lucky numbers: 05'));
  assert.ok(shareText(combo, 'straight', 'Bea', '3d', 'en').startsWith('Swertres lucky numbers for Bea: 1-2-3'));
  assert.ok(shareText(combo, 'straight', 'Bea', '3d', 'tl').startsWith('Mga lucky number ni Bea sa Swertres: 1-2-3'));

  for (let i = 0; i < 20; i++) {
    const lines = roastLines({ name: 'Bea', age: 25 });
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('Bea') && lines[1].includes('25'));
    assert.strictEqual(pickMoodReasons('chill', 3).length, 3);
  }
  const en = roastLines({ name: 'Bea', age: 25 }, 'en');
  assert.ok(en[0].includes('Bea') && en[1].includes('25'));
  assert.ok(pickMoodReasons('chill', 3, 'en').every((l) => MOOD_REASONS_I18N.en.chill.includes(l)));

  const now = new Date('2026-10-07T00:00:00Z');
  const draw = { at: new Date('2026-10-07T06:00:00Z'), day: 3, time: '14:00' };
  assert.strictEqual(drawLabel(draw, now), drawLabel(draw, now, 480, 'taglish'));
  assert.strictEqual(drawLabel(draw, now), 'ngayong 2:00 PM');
  assert.strictEqual(drawLabel(draw, now, 480, 'en'), 'today 2:00 PM');
  assert.strictEqual(formatCountdown(125 * 60000), 'in 2h 5m');
  assert.strictEqual(formatCountdown(125 * 60000, 'tl'), 'sa loob ng 2h 5m');

  const c = { game: getGame('3d'), numbersText: '1-2-3', mode: 'straight', name: 'Bea', drawText: 'bukas 2:00 PM' };
  assert.deepStrictEqual(cardContent(c), cardContent({ ...c, lang: 'taglish' }));
  assert.strictEqual(cardContent({ ...c, lang: 'en' }).forName, 'For Bea');
});

test('validateProfile returns a code that has a message in every language', () => {
  const cases = [
    [{ name: 'a'.repeat(31), age: '', mood: 'chill' }, 'nameTooLong'],
    [{ name: '', age: 'x', mood: 'chill' }, 'ageInvalid'],
    [{ name: '', age: '17', mood: 'chill' }, 'ageUnder18'],
    [{ name: '', age: '', mood: '' }, 'moodRequired'],
  ];
  for (const [input, code] of cases) {
    const r = validateProfile(input);
    assert.strictEqual(r.code, code);
    assert.strictEqual(t('taglish', `err.${code}`), r.message);
    for (const lang of LANGS) assert.ok(STRINGS[lang][`err.${code}`]);
  }
});
