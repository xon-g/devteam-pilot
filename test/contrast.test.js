import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const v = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// blend white at alpha over a base (the --card surface)
const over = (base, alpha) => {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(base.slice(i, i + 2), 16) * (1 - alpha) + 255 * alpha));
  return `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

test('small muted / accent text passes 4.5:1 on every surface it sits on', () => {
  const surfaces = { bg: v('bg'), 'bg-2': v('bg-2'), card: over(v('bg-2'), 0.06) };
  for (const fg of ['muted', 'gold', 'pink', 'text']) {
    for (const [name, bg] of Object.entries(surfaces)) {
      const r = ratio(v(fg), bg);
      assert.ok(r >= 4.5, `--${fg} on ${name}: ${r.toFixed(2)}:1`);
    }
  }
});
