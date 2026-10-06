export const REASONS = {
  0: ["swerte ang kulay pula", "magandang simula", "swerteng araw"],
  1: ["isang hakbang pasulong", "bagong pagkakataon", "swerte sa umaga"],
  2: ["dalawang beses na swerte", "balanse ang buhay", "swerte sa paglalakbay"],
  3: ["tatlong bituin ang gabay", "swerte sa pamilya", "masayang araw"],
  4: ["matatag na pundasyon", "swerte sa trabaho", "magandang balita"],
  5: ["gitnang swerte", "balanseng swerte", "swerte sa pagkain"],
  6: ["swerte sa pera", "magandang swerte", "masayang buhay"],
  7: ["pitong bituin", "swerte sa pag-ibig", "swerte sa suwerte"],
  8: ["walang hanggang swerte", "swerte sa negosyo", "masaganang araw"],
  9: ["pinakamataas na swerte", "swerte sa lahat", "ganap na swerte"]
};

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
  return Array.from(results);
}
