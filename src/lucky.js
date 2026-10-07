import { REASONS } from './reasons.js';
import { getGame, formatNumbers, shortName } from './games.js';
import { t } from './i18n.js';

export { REASONS };

export function randomInt(n) {
  const array = new Uint32Array(1);
  const max = 0xFFFFFFFF;
  const limit = max - (max % n);
  while (true) {
    globalThis.crypto.getRandomValues(array);
    const val = array[0];
    if (val < limit) {
      return val % n;
    }
  }
}

export function drawCombo() {
  return [randomInt(10), randomInt(10), randomInt(10)];
}

export function pickReason(digit) {
  const list = REASONS[digit];
  const index = randomInt(list.length);
  return list[index];
}

export function formatStraight(combo) {
  return combo.join('-');
}

export function rambolitoCombos(combo, gameId = '3d') {
  const game = getGame(gameId);
  const results = new Set();
  
  function permute(arr, m = []) {
    if (arr.length === 0) {
      results.add(formatNumbers(game, m));
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice();
        const next = curr.splice(i, 1);
        permute(curr, m.concat(next));
      }
    }
  }
  
  permute(combo);
  return Array.from(results).sort();
}

export function shareText(combo, mode, name = '', gameId = '3d', lang = 'taglish') {
  const game = getGame(gameId);
  const short = shortName(game, lang);
  const lead = name ? t(lang, 'shareLeadName', { short, name }) : t(lang, 'shareLeadSelf', { short });
  const tail = t(lang, 'shareTail');
  if (!game.rambolito) {
    return `${lead}${formatNumbers(game, combo)}${tail}`;
  }
  if (mode === 'straight') {
    return `${lead}${formatNumbers(game, combo)} (Straight)${tail}`;
  }
  return `${lead}${rambolitoCombos(combo, game.id).join(', ')} (Rambolito)${tail}`;
}
