import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test(':root defines the type tokens', () => {
  const root = css.match(/:root\s*{([^}]*)}/)[1];
  for (const t of ['--step--2', '--step--1', '--step-0', '--step-1', '--step-2', '--step-3',
    '--lh-tight', '--lh-snug', '--lh-body', '--w-regular', '--w-medium', '--w-bold', '--w-black',
    '--track-caps']) {
    assert.ok(new RegExp(`${t}\\s*:`).test(root), `missing ${t}`);
  }
});

test('every font-weight is a var(--w-*) or inherit', () => {
  const vals = [...css.matchAll(/font-weight\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(vals.length > 0);
  for (const v of vals) assert.ok(/^var\(--w-(regular|medium|bold|black)\)$|^inherit$/.test(v), v);
  assert.ok(!/font-weight\s*:\s*(500|700)\b/.test(css));
});

test('no web fonts', () => {
  assert.ok(!/@font-face/.test(css));
  assert.ok(!/url\(/.test(css));
  assert.ok(!/fonts\.googleapis/.test(css));
});
