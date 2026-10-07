import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HEAD_PAGES = ['index.html', 'how-to-play/index.html', 'lucky-numbers/index.html', 'about/index.html', 'contact/index.html'];
export const SLOT_PAGE = 'index.html';
const HEAD_START = '<!-- adsense:start -->';
const HEAD_END = '<!-- adsense:end -->';
const SLOT_START = '<!-- adslot:start -->';
const SLOT_END = '<!-- adslot:end -->';

export function validateConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') throw new Error('ads.config.json: config must be an object');
  const { adsensePublisherId: id, adsEnabled, adSlotId: slot } = cfg;
  if (typeof id !== 'string' || (id !== '' && !/^pub-\d{16}$/.test(id))) {
    throw new Error('ads.config.json: adsensePublisherId must be "" or pub- followed by 16 digits');
  }
  if (typeof slot !== 'string' || (slot !== '' && !/^\d{10}$/.test(slot))) {
    throw new Error('ads.config.json: adSlotId must be "" or 10 digits');
  }
  if (typeof adsEnabled !== 'boolean') throw new Error('ads.config.json: adsEnabled must be a boolean');
  if (adsEnabled && !id) throw new Error('ads.config.json: adsEnabled needs adsensePublisherId');
  if (adsEnabled && !slot) throw new Error('ads.config.json: adsEnabled needs adSlotId');
  return cfg;
}

export function adsTxt(id) {
  return id ? `google.com, ${id}, DIRECT, f08c47fec0942fa0\n` : '';
}

export function headSnippet(id) {
  return id
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${id}" crossorigin="anonymous"></script>`
    : '';
}

export function slotSnippet(cfg) {
  const { adsensePublisherId: id, adsEnabled, adSlotId: slotId } = cfg;
  if (!(adsEnabled && id && slotId)) return '';
  return `<ins class="adsbygoogle" style="display:block" data-ad-client="ca-${id}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
}

function replaceBetween(html, start, end, content, label) {
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1 || b < a) throw new Error(`${label}: missing ${start} / ${end} markers`);
  return html.slice(0, a + start.length) + content + html.slice(b);
}

export function applyHead(html, id, label = 'page') {
  return replaceBetween(html, HEAD_START, HEAD_END, headSnippet(id), label);
}

export function applySlot(html, cfg, label = 'page') {
  return replaceBetween(html, SLOT_START, SLOT_END, slotSnippet(cfg), label);
}

export function apply(rootDir) {
  const cfg = validateConfig(JSON.parse(fs.readFileSync(path.join(rootDir, 'ads.config.json'), 'utf8')));
  const written = [];
  const write = (rel, content) => {
    fs.writeFileSync(path.join(rootDir, rel), content);
    written.push(rel);
  };
  const edits = new Map();
  for (const rel of HEAD_PAGES) {
    const html = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    edits.set(rel, applyHead(html, cfg.adsensePublisherId, rel));
  }
  edits.set(SLOT_PAGE, applySlot(edits.get(SLOT_PAGE), cfg, SLOT_PAGE));
  write('ads.txt', adsTxt(cfg.adsensePublisherId));
  for (const [rel, html] of edits) write(rel, html);
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  for (const f of apply(root)) console.log(f);
}
