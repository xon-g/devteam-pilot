import { randomInt } from './lucky.js';

export const GAMES = [
  { id: '2d',   name: 'EZ2 (2D)',          kind: 'pick',  count: 2, min: 1, max: 31, rambolito: true  },
  { id: '3d',   name: 'Swertres (3D)',     kind: 'digit', count: 3, min: 0, max: 9,  rambolito: true  },
  { id: '4d',   name: '4D Lotto',          kind: 'digit', count: 4, min: 0, max: 9,  rambolito: false },
  { id: '6d',   name: '6D Lotto',          kind: 'digit', count: 6, min: 0, max: 9,  rambolito: false },
  { id: '6-42', name: 'Lotto 6/42',        kind: 'lotto', count: 6, min: 1, max: 42, rambolito: false },
  { id: '6-45', name: 'Mega Lotto 6/45',   kind: 'lotto', count: 6, min: 1, max: 45, rambolito: false },
  { id: '6-49', name: 'Super Lotto 6/49',  kind: 'lotto', count: 6, min: 1, max: 49, rambolito: false },
  { id: '6-55', name: 'Grand Lotto 6/55',  kind: 'lotto', count: 6, min: 1, max: 55, rambolito: false },
  { id: '6-58', name: 'Ultra Lotto 6/58',  kind: 'lotto', count: 6, min: 1, max: 58, rambolito: false },
  { id: '1-58', name: 'Isang Numero (1–58)', kind: 'pick', count: 1, min: 1, max: 58, rambolito: false },
];

export const DEFAULT_GAME = '3d';

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || GAMES.find((g) => g.id === DEFAULT_GAME);
}

export function drawNumbers(game) {
  const span = game.max - game.min + 1;
  if (game.kind === 'lotto') {
    const picked = new Set();
    while (picked.size < game.count) picked.add(game.min + randomInt(span));
    return Array.from(picked).sort((a, b) => a - b);
  }
  const nums = [];
  for (let i = 0; i < game.count; i++) nums.push(game.min + randomInt(span));
  return nums;
}

export function formatNumbers(game, nums) {
  const parts = game.kind === 'digit' ? nums.map(String) : nums.map((n) => String(n).padStart(2, '0'));
  return parts.join('-');
}

export function shortName(game) {
  return game.name.replace(/\s*\(.*\)\s*$/, '');
}
