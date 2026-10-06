import { randomInt } from './lucky.js';

export const NAME_ROASTS = [
  "{name}? Pangalan pa lang, pang-main character na",
  "Uy {name}, lodi! Petmalu ang pangalan mo",
  "{name}? Sana all may ganyang pangalan",
  "Hello {name}! Pwede nang mangarap, charot",
  "{name}... parang pangalan ng crush ko dati, awit",
  "Si {name} na naman? Edi wow, ikaw na",
  "{name}, pak ganern! Slay ang pangalan",
  "Kilala ka namin, {name}. Laging late, char",
  "{name}? It's giving teleserye bida",
  "{name}, kumain ka na ba? Charot, bunot muna"
];
export const LONG_NAME_ROASTS = [   // name longer than 14 characters
  "{name}? Ang haba, pang-roll call sa graduation",
  "Hingal kami sa pangalan mo, {name}. Charot",
  "{name}: buong pangalan talaga? Ganern, formal"
];
export const SHORT_NAME_ROASTS = [  // name of 1-3 characters
  "{name}? Tipid sa letters, galante sa vibes",
  "{name} lang? Short pero solid, ganern",
  "{name}! Isang hinga lang, tapos na. Sana all"
];
export const AGE_ROASTS = [
  { min: 18, max: 21, lines: [
    "{age}? Bagets pa! May baon pa ba kay Mama?",
    "{age} ka pa lang? Batang TikTok, ganern",
    "Fresh na fresh sa {age}, sana all",
    "{age}? Kakalegal lang, chill lang muna bes" ] },
  { min: 22, max: 29, lines: [
    "{age}? Quarter-life crisis era, kapit lang",
    "{age} ka? Adulting is real, awit",
    "Sa {age}, pwede nang mangarap",
    "{age}? Prime mo 'to, bes. Slay!" ] },
  { min: 30, max: 39, lines: [
    "{age}? Welcome sa tita/tito era",
    "{age} na pero pang-20s ang aura, charot",
    "Sa {age}, bawal na mapuyat, bes",
    "{age}? Masakit na likod pero go pa rin" ] },
  { min: 40, max: 49, lines: [
    "{age}? Fine wine ka, bes. Lalong gumaganda",
    "{age} pero ang lakas pa rin ng dating",
    "Sa {age}, meron din naman palang ganda ang buhay",
    "{age}? Lodi ng buong barangay" ] },
  { min: 50, max: 59, lines: [
    "{age}? Batang 90s ka pa rin sa puso",
    "{age} na? Petmalu, walang kupas",
    "Sa {age}, ikaw na ang boss, bes",
    "{age}? Senior discount soon, charot" ] },
  { min: 60, max: 120, lines: [
    "{age}? Senior discount unlocked!",
    "{age} at blooming pa rin, sana all",
    "Sa {age}, ikaw ang OG lodi",
    "{age}? Ang dami nang napagdaanan, werpa!" ] }
];
export function fill(template, key, value) {
  return template.split(`{${key}}`).join(String(value));
}

function pick(list) {
  return list[randomInt(list.length)];
}

export function nameRoast(name) {
  if (!name) return null;
  const len = Array.from(name).length;
  const pool = len > 14 ? LONG_NAME_ROASTS : len <= 3 ? SHORT_NAME_ROASTS : NAME_ROASTS;
  return fill(pick(pool), 'name', name);
}

export function ageRoast(age) {
  if (age === null || age === undefined) return null;
  const bucket = AGE_ROASTS.find((b) => age >= b.min && age <= b.max);
  if (!bucket) return null;
  return fill(pick(bucket.lines), 'age', age);
}

export function roastLines({ name, age }) {
  return [nameRoast(name), ageRoast(age)].filter((line) => line !== null);
}
