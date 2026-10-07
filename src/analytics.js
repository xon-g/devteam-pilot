import { GAMES } from './games.js';

const MOODS = ['masaya', 'pagod', 'stressed', 'kinikilig', 'chill', 'ewan'];
const MODES = ['straight', 'rambolito'];
const VIA = ['native', 'copy', 'fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'tiktok', 'img'];

const pick = (allowed, value) => (allowed.includes(value) ? value : 'other');

export function eventPath(kind, data = {}) {
  const d = data || {};
  switch (kind) {
    case 'draw':
      return `draw/${pick(GAMES.map((g) => g.id), d.game)}/${pick(MOODS, d.mood)}/${pick(MODES, d.mode)}`;
    case 'share-tap':
      return 'share-tap';
    case 'share-done':
      return `share-done/${pick(VIA, d.via)}`;
    case 'pwa-install':
      return 'pwa-install';
    default:
      return null;
  }
}

export function track(gc, path) {
  if (!path || !gc || typeof gc.count !== 'function') return;
  try {
    gc.count({ path, title: path, event: true });
  } catch {
    // analytics must never break the app
  }
}
