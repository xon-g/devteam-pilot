import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const PAGES = ['about', 'contact', 'how-to-play', 'lucky-numbers', 'privacy', 'responsible-gaming'];

function block(html, name) {
  const open = html.indexOf(`<div data-lang-block="${name}"`);
  assert.ok(open >= 0, `block ${name}`);
  const tag = html.slice(open, html.indexOf('>', open) + 1);
  // blocks never nest <div> other than .table-wrap; find the matching close by depth.
  let depth = 0;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = open;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return { tag, body: html.slice(open + tag.length, m.index) };
  }
  throw new Error(`unclosed block ${name}`);
}

const stripSummary = (s) => s.replace(/<section lang="en">[\s\S]*?<\/section>/, '');
const count = (s, re) => (s.match(re) || []).length;
const hrefs = (s) => [...new Set([...s.matchAll(/href="([^"]*)"/g)].map((m) => m[1]))].sort();

for (const page of PAGES) {
  const html = read(`${page}/index.html`);

  test(`${page}: picker, script and three blocks`, () => {
    assert.strictEqual(count(html, /id="lang-picker"/g), 1);
    const radios = [...html.matchAll(/<input type="radio" name="lang" value="([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(radios, ['taglish', 'en', 'tl']);
    assert.ok(html.includes('<script type="module" src="../src/page-lang.js"></script>'));
    for (const name of ['taglish', 'en', 'tl']) assert.strictEqual(count(html, new RegExp(`data-lang-block="${name}"`, 'g')), 1, name);
    assert.ok(/data-lang-block="en" lang="en" hidden/.test(html));
    assert.ok(/data-lang-block="tl" lang="fil" hidden/.test(html));
    assert.ok(!/data-lang-block="taglish"[^>]*hidden/.test(html));
  });

  test(`${page}: blocks have matching structure`, () => {
    const tg = block(html, 'taglish').body;
    const base = stripSummary(tg);
    assert.ok(base.length < tg.length, 'taglish has an English summary');
    for (const name of ['en', 'tl']) {
      const b = block(html, name).body;
      assert.ok(!b.includes('English summary'), `${name} has no summary`);
      assert.strictEqual(count(b, /<h2\b/g), count(base, /<h2\b/g), `${name} h2`);
      assert.strictEqual(count(b, /<li\b/g), count(base, /<li\b/g), `${name} li`);
      assert.strictEqual(count(b, /\[CHECK/g), count(tg, /\[CHECK/g), `${name} CHECK`);
      assert.deepStrictEqual(hrefs(b), hrefs(base), `${name} hrefs`);
    }
  });

  test(`${page}: no duplicate ids`, () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  });
}

test('sw.js precaches page-lang.js under swertres-v34', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes('"src/page-lang.js"'));
  assert.ok(sw.includes('swertres-v34'));
});
