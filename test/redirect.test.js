import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { redirectTarget } from '../src/redirect.js';

const root = new URL('../', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, root), 'utf8');
const html = read('index.html');

const CASES = [
  ['xon-g.github.io', '/devteam-pilot/', '', '', 'https://lotto.xonicbox.com/'],
  ['xon-g.github.io', '/devteam-pilot', '', '', 'https://lotto.xonicbox.com/'],
  ['xon-g.github.io', '/devteam-pilot/index.html', '?g=3d', '#x', 'https://lotto.xonicbox.com/index.html?g=3d#x'],
  ['lotto.xonicbox.com', '/', '', '', null],
  ['localhost', '/', '', '', null],
  ['abc.devteam-pilot.pages.dev', '/', '', '', null],
];

test('redirectTarget cases', () => {
  for (const [h, p, s, x, want] of CASES) assert.strictEqual(redirectTarget(h, p, s, x), want, `${h}${p}`);
});

test('inline script is first in head after charset and agrees with src/redirect.js', () => {
  const m = html.match(/<head>\s*<meta charset="UTF-8">\s*<script>([\s\S]*?)<\/script>/);
  assert.ok(m, 'inline redirect script right after <meta charset>');
  for (const [hostname, pathname, search, hash, want] of CASES) {
    let got = null;
    const location = { hostname, pathname, search, hash, replace: (u) => { got = u; } };
    vm.runInNewContext(m[1], { location });
    assert.strictEqual(got, want, `inline: ${hostname}${pathname}`);
  }
});

const PRIVACY_CASES = [
  ...CASES,
  ['xon-g.github.io', '/devteam-pilot/privacy/', '', '', 'https://lotto.xonicbox.com/privacy/'],
];
const privacyHtml = read('privacy/index.html');

test('privacy page inline script agrees with redirectTarget', () => {
  const m = privacyHtml.match(/<head>\s*<meta charset="UTF-8">\s*<script>([\s\S]*?)<\/script>/);
  assert.ok(m, 'inline redirect script right after <meta charset>');
  for (const [hostname, pathname, search, hash, want] of PRIVACY_CASES) {
    let got = null;
    const location = { hostname, pathname, search, hash, replace: (u) => { got = u; } };
    vm.runInNewContext(m[1], { location });
    assert.strictEqual(got, want, `privacy inline: ${hostname}${pathname}`);
    assert.strictEqual(redirectTarget(hostname, pathname, search, hash), want, `redirectTarget: ${hostname}${pathname}`);
  }
});

test('xon-g.github.io appears only in the redirect script/module (outside tasks, test, .review)', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n')
    .filter((f) => f && !/^(tasks|test|\.review)\//.test(f) && !/\.(png|jpg)$/.test(f));
  const hits = files.filter((f) => fs.existsSync(new URL(f, root)) && read(f).includes('xon-g.github.io'));
  assert.deepStrictEqual(hits.sort(), ['how-to-play/index.html', 'index.html', 'lucky-numbers/index.html', 'privacy/index.html', 'src/redirect.js']);
  const stripped = html.replace(/<script>[\s\S]*?<\/script>/, '');
  assert.ok(!stripped.includes('xon-g.github.io'));
  const strippedPrivacy = privacyHtml.replace(/<script>[\s\S]*?<\/script>/, '');
  assert.ok(!strippedPrivacy.includes('xon-g.github.io'));
});

for (const page of ['how-to-play', 'lucky-numbers']) {
  const pageHtml = read(`${page}/index.html`);
  const pageCases = [
    ...CASES,
    ['xon-g.github.io', `/devteam-pilot/${page}/`, '', '', `https://lotto.xonicbox.com/${page}/`],
  ];

  test(`${page} page inline script agrees with redirectTarget`, () => {
    const m = pageHtml.match(/<head>\s*<meta charset="UTF-8">\s*<script>([\s\S]*?)<\/script>/);
    assert.ok(m, 'inline redirect script right after <meta charset>');
    for (const [hostname, pathname, search, hash, want] of pageCases) {
      let got = null;
      const location = { hostname, pathname, search, hash, replace: (u) => { got = u; } };
      vm.runInNewContext(m[1], { location });
      assert.strictEqual(got, want, `${page} inline: ${hostname}${pathname}`);
      assert.strictEqual(redirectTarget(hostname, pathname, search, hash), want, `redirectTarget: ${hostname}${pathname}`);
    }
  });

  test(`${page} page has no xon-g.github.io outside the redirect script`, () => {
    const stripped = pageHtml.replace(/<script>[\s\S]*?<\/script>/, '');
    assert.ok(!stripped.includes('xon-g.github.io'));
  });
}
