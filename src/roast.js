import { randomInt } from './lucky.js';

const LANG_KEYS = ['taglish', 'en', 'tl', 'ceb'];

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

const NAME_ROASTS_EN = [
  "{name}? Main character name already",
  "Hey {name}, legend! What an awesome name",
  "{name}? Must be nice having a name like that",
  "Hello {name}! Dream big, just saying",
  "{name}... sounds like my old crush's name, ouch",
  "{name} again? Fine, you win",
  "{name}, nailed it! That name is slaying",
  "We know you, {name}. Always running late, kidding",
  "{name}? It's giving soap-opera lead",
  "{name}, have you eaten yet? Kidding, draw first"
];
const LONG_NAME_ROASTS_EN = [
  "{name}? So long, like a graduation roll call",
  "We're out of breath at your name, {name}. Kidding",
  "{name}: the full name, really? So formal"
];
const SHORT_NAME_ROASTS_EN = [
  "{name}? Short on letters, big on vibes",
  "Just {name}? Short but solid",
  "{name}! One breath and done. Lucky you"
];
const AGE_ROASTS_EN = [
  { min: 18, max: 21, lines: [
    "{age}? Still a youngster! Got an allowance from Mom?",
    "Only {age}? A true TikTok kid",
    "Fresh as can be at {age}, lucky you",
    "{age}? Just turned legal, take it easy" ] },
  { min: 22, max: 29, lines: [
    "{age}? Quarter-life crisis era, hang in there",
    "{age}? Adulting is real, ouch",
    "At {age}, you're allowed to dream",
    "{age}? This is your prime. Slay!" ] },
  { min: 30, max: 39, lines: [
    "{age}? Welcome to the auntie/uncle era",
    "{age} with a 20s aura, kidding",
    "At {age}, no more all-nighters",
    "{age}? Sore back but still going" ] },
  { min: 40, max: 49, lines: [
    "{age}? Fine wine, you only get better",
    "{age} and still turning heads",
    "At {age}, life has some good stuff after all",
    "{age}? Legend of the whole neighborhood" ] },
  { min: 50, max: 59, lines: [
    "{age}? Still a 90s kid at heart",
    "{age} already? Amazing, never fades",
    "At {age}, you're the boss",
    "{age}? Senior discount soon, kidding" ] },
  { min: 60, max: 120, lines: [
    "{age}? Senior discount unlocked!",
    "{age} and still blooming, lucky you",
    "At {age}, you're the OG legend",
    "{age}? You've been through so much, respect!" ] }
];

const NAME_ROASTS_TL = [
  "{name}? Pangalan pa lang, bida na",
  "Uy {name}, idol! Ang galing ng pangalan mo",
  "{name}? Ang swerte ng may ganyang pangalan",
  "Kumusta {name}! Puwede nang mangarap, biro lang",
  "{name}... parang pangalan ng dati kong crush, aray",
  "Si {name} na naman? Sige na, ikaw na",
  "{name}, ang galing! Angat ang pangalan mo",
  "Kilala ka namin, {name}. Laging huli, biro lang",
  "{name}? Parang bida sa teleserye",
  "{name}, kumain ka na ba? Biro lang, bunot muna"
];
const LONG_NAME_ROASTS_TL = [
  "{name}? Ang haba, pang-roll call sa pagtatapos",
  "Hingal kami sa pangalan mo, {name}. Biro lang",
  "{name}: buong pangalan talaga? Pormal naman"
];
const SHORT_NAME_ROASTS_TL = [
  "{name}? Tipid sa letra, bukas-palad sa saya",
  "{name} lang? Maikli pero matibay",
  "{name}! Isang hinga lang, tapos na. Ang swerte"
];
const AGE_ROASTS_TL = [
  { min: 18, max: 21, lines: [
    "{age}? Bata pa! May baon pa ba kay Mama?",
    "{age} ka pa lang? Batang TikTok",
    "Sariwang-sariwa sa {age}, ang swerte",
    "{age}? Kalalegal lang, dahan-dahan muna bes" ] },
  { min: 22, max: 29, lines: [
    "{age}? Panahon ng quarter-life crisis, kapit lang",
    "{age} ka? Totoo ang pagiging adult, aray",
    "Sa {age}, puwede nang mangarap",
    "{age}? Ito ang kasikatan mo, bes. Ang galing!" ] },
  { min: 30, max: 39, lines: [
    "{age}? Maligayang pagdating sa panahon ng tita/tito",
    "{age} na pero pang-20s ang aura, biro lang",
    "Sa {age}, bawal na ang puyat, bes",
    "{age}? Masakit na ang likod pero tuloy pa rin" ] },
  { min: 40, max: 49, lines: [
    "{age}? Parang alak na tumatanda, bes. Lalong gumaganda",
    "{age} pero malakas pa rin ang dating",
    "Sa {age}, may ganda rin pala ang buhay",
    "{age}? Idolo ng buong barangay" ] },
  { min: 50, max: 59, lines: [
    "{age}? Batang 90s ka pa rin sa puso",
    "{age} na? Ang galing, hindi kumukupas",
    "Sa {age}, ikaw na ang boss, bes",
    "{age}? Malapit na ang diskwento ng senior, biro lang" ] },
  { min: 60, max: 120, lines: [
    "{age}? Diskwento ng senior, bukas na!",
    "{age} at namumukadkad pa rin, ang swerte",
    "Sa {age}, ikaw ang pinakaidolo",
    "{age}? Ang dami nang napagdaanan, saludo!" ] }
];

const NAME_ROASTS_CEB = [
  "{name}? Pangalan pa lang, pang-main character na",
  "Uy {name}, idol! Nindot kaayo sa imong ngalan",
  "{name}? Sana all naay ingon ana nga ngalan",
  "Hello {name}! Puwede na mangandoy, joke lang",
  "{name}... murag ngalan sa akong crush kaniadto, aray",
  "Si {name} na usab? Sige na, ikaw na",
  "{name}, pak ing-ana! Slay ang ngalan",
  "Kilala ka namo, {name}. Kanunay ulahi, joke lang",
  "{name}? Murag bida sa teleserye",
  "{name}, nikaon na ka? Joke lang, bunot una"
];
const LONG_NAME_ROASTS_CEB = [
  "{name}? Taas kaayo, pang-roll call sa graduation",
  "Hingal mi sa imong ngalan, {name}. Joke lang",
  "{name}: tibuok ngalan gyud? Pormal kaayo"
];
const SHORT_NAME_ROASTS_CEB = [
  "{name}? Tipid sa letra, dagaya sa vibes",
  "{name} ra? Mubo pero lig-on",
  "{name}! Usa ka ginhawa ra, human na. Sana all"
];
const AGE_ROASTS_CEB = [
  { min: 18, max: 21, lines: [
    "{age}? Bata pa! Naa pay baon gikan ni Mama?",
    "{age} pa lang? TikTok kid gyud",
    "Presko kaayo sa {age}, sana all",
    "{age}? Bag-o lang legal, hinay-hinay una bes" ] },
  { min: 22, max: 29, lines: [
    "{age}? Panahon sa quarter-life crisis, kapit lang",
    "{age} ka? Tinuod ang adulting, aray",
    "Sa {age}, puwede na mangandoy",
    "{age}? Prime nimo ni, bes. Slay!" ] },
  { min: 30, max: 39, lines: [
    "{age}? Welcome sa panahon sa tita/tito",
    "{age} na pero 20s ang aura, joke lang",
    "Sa {age}, dili na puwede puyat, bes",
    "{age}? Sakit na ang likod pero go gihapon" ] },
  { min: 40, max: 49, lines: [
    "{age}? Fine wine ka, bes. Mas nindot pa",
    "{age} pero kusog gihapon ang dating",
    "Sa {age}, naa pa diay katahom ang kinabuhi",
    "{age}? Idol sa tibuok barangay" ] },
  { min: 50, max: 59, lines: [
    "{age}? 90s kid ka gihapon sa kasingkasing",
    "{age} na? Lahi gyud, walay kupas",
    "Sa {age}, ikaw na ang boss, bes",
    "{age}? Duol na ang senior discount, joke lang" ] },
  { min: 60, max: 120, lines: [
    "{age}? Senior discount, abli na!",
    "{age} ug blooming gihapon, sana all",
    "Sa {age}, ikaw ang OG idol",
    "{age}? Daghan na kaayo kag naagian, saludo!" ] }
];

export const NAME_ROASTS_I18N = { taglish: NAME_ROASTS, en: NAME_ROASTS_EN, tl: NAME_ROASTS_TL, ceb: NAME_ROASTS_CEB };
export const LONG_NAME_ROASTS_I18N = { taglish: LONG_NAME_ROASTS, en: LONG_NAME_ROASTS_EN, tl: LONG_NAME_ROASTS_TL, ceb: LONG_NAME_ROASTS_CEB };
export const SHORT_NAME_ROASTS_I18N = { taglish: SHORT_NAME_ROASTS, en: SHORT_NAME_ROASTS_EN, tl: SHORT_NAME_ROASTS_TL, ceb: SHORT_NAME_ROASTS_CEB };
export const AGE_ROASTS_I18N = { taglish: AGE_ROASTS, en: AGE_ROASTS_EN, tl: AGE_ROASTS_TL, ceb: AGE_ROASTS_CEB };

export function fill(template, key, value) {
  return template.split(`{${key}}`).join(String(value));
}

function pick(list) {
  return list[randomInt(list.length)];
}

// A pick is {kind, bucket, index}: language-independent, so a result can be re-rendered in another language.
export function nameRoastPick(name) {
  if (!name) return null;
  const len = Array.from(name).length;
  const kind = len > 14 ? 'long' : len <= 3 ? 'short' : 'name';
  const pool = kind === 'long' ? LONG_NAME_ROASTS : kind === 'short' ? SHORT_NAME_ROASTS : NAME_ROASTS;
  return { kind, bucket: 0, index: randomInt(pool.length) };
}

export function ageRoastPick(age) {
  if (age === null || age === undefined) return null;
  const bucket = AGE_ROASTS.findIndex((b) => age >= b.min && age <= b.max);
  if (bucket < 0) return null;
  return { kind: 'age', bucket, index: randomInt(AGE_ROASTS[bucket].lines.length) };
}

export function roastPicks({ name, age }) {
  return [nameRoastPick(name), ageRoastPick(age)].filter((p) => p !== null);
}

export function renderRoast(p, { name, age }, lang = 'taglish') {
  const l = LANG_KEYS.includes(lang) ? lang : 'taglish';
  if (p.kind === 'age') return fill(AGE_ROASTS_I18N[l][p.bucket].lines[p.index], 'age', age);
  const table = p.kind === 'long' ? LONG_NAME_ROASTS_I18N : p.kind === 'short' ? SHORT_NAME_ROASTS_I18N : NAME_ROASTS_I18N;
  return fill(table[l][p.index], 'name', name);
}

export function nameRoast(name, lang = 'taglish') {
  const p = nameRoastPick(name);
  return p ? renderRoast(p, { name }, lang) : null;
}

export function ageRoast(age, lang = 'taglish') {
  const p = ageRoastPick(age);
  return p ? renderRoast(p, { age }, lang) : null;
}

export function roastLines({ name, age }, lang = 'taglish') {
  return roastPicks({ name, age }).map((p) => renderRoast(p, { name, age }, lang));
}
