import { REASONS } from './reasons.js';

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

export function rambolitoCombos(combo) {
  const results = new Set();
  
  function permute(arr, m = []) {
    if (arr.length === 0) {
      results.add(m.join('-'));
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

export function shareText(combo, mode) {
  const straight = formatStraight(combo);
  if (mode === 'straight') {
    return `Swertres lucky numbers ko: ${straight} (Straight) 🍀 For entertainment only. 18+.`;
  } else {
    const rambolito = rambolitoCombos(combo).join(', ');
    return `Swertres lucky numbers ko: ${rambolito} (Rambolito) 🍀 For entertainment only. 18+.`;
  }
}
