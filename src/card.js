import { t } from './i18n.js';
import { gameName } from './games.js';

// Share card (1080x1920) for "Save image". DOM-free: drawCard takes a 2D context as an argument.
const FONT = 'system-ui, sans-serif';

export function cardContent({ game, numbersText, mode, name, drawText, lang = 'taglish' }) {
  const rambolito = Boolean(game && game.rambolito) && mode === 'rambolito';
  return {
    title: 'Lotto Lucky Numbers PH',
    game: gameName(game, lang),
    forName: name ? t(lang, 'forName', { name }) : '',
    numbers: numbersText,
    modeLine: rambolito ? '(Rambolito)' : '',
    draw: drawText ? t(lang, 'cardNextDraw', { when: drawText }) : '',
    fun: t(lang, 'cardFun'),
    disclaimer: t(lang, 'cardDisclaimer'),
    url: 'lotto.xonicbox.com',
  };
}

export function cardFileName(gameId, numbersText) {
  const clean = (s) =>
    String(s).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return `lotto-lucky-numbers-${clean(gameId)}-${clean(numbersText)}.png`;
}

// Shrink rule: assume an average glyph is 0.6em wide, so text fits when size <= maxWidth / (len * 0.6).
// Result is min(base, that), floored to an integer and never below 40.
export function fitFontSize(textLength, maxWidth, base) {
  const fit = Math.floor(maxWidth / (Math.max(1, textLength) * 0.6));
  return Math.max(40, Math.min(base, fit));
}

export function drawCard(ctx, content, { width = 1080, height = 1920 } = {}) {
  const cx = width / 2;
  ctx.fillStyle = '#12061f';
  ctx.fillRect(0, 0, width, height);

  const gold = (y0, y1) => {
    const g = ctx.createLinearGradient ? ctx.createLinearGradient(0, y0, 0, y1) : null;
    if (g && g.addColorStop) {
      g.addColorStop(0, '#ffc93c');
      g.addColorStop(1, '#ff9f1c');
      return g;
    }
    return '#ffc93c';
  };

  ctx.fillStyle = gold(0, 24);
  ctx.fillRect(0, 0, width, 24);
  ctx.fillRect(0, height - 24, width, 24);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = (str, y, size, fill, weight = '600') => {
    if (!str) return;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = fill;
    ctx.fillText(str, cx, y, width - 120);
  };

  text(content.title, 260, 64, '#ffffff', '700');
  const fitText = (str, base) => fitFontSize((str || '').length, width - 120, base);
  text(content.game, 360, fitText(content.game, 52), '#ffc93c');
  text(content.forName, 440, fitText(content.forName, 44), '#ffffff', '500');

  const size = fitFontSize(content.numbers.length, width - 120, 220);
  text(content.numbers, 960, size, gold(960 - size / 2, 960 + size / 2), '800');
  text(content.modeLine, 960 + size / 2 + 60, 48, '#ffffff', '600');

  text(content.draw, 1330, 44, '#ffffff', '500');
  text(content.fun, 1570, 40, '#ffffff', '600');
  text(content.disclaimer, 1650, 32, '#ffffff', '500');
  text(content.url, 1790, 48, '#ffc93c', '700');
}
