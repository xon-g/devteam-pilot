import { MOOD_REASONS } from './reasons.js';
import { randomInt } from './lucky.js';

export const MOODS = ['masaya', 'pagod', 'stressed', 'kinikilig', 'chill', 'ewan'];
export const MOOD_LABELS = { masaya: 'Masaya', pagod: 'Pagod', stressed: 'Stressed',
  kinikilig: 'Kinikilig', chill: 'Chill', ewan: 'Ewan ko' };

export function cleanName(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

export function validateProfile({ name, age, mood }) {
  const cleaned = cleanName(name);
  if (cleaned.length > 30) {
    return { ok: false, field: 'name', message: 'Hanggang 30 letters lang ang pangalan, bes.' };
  }
  const ageRaw = String(age ?? '').trim();
  let ageNum = null;
  if (ageRaw !== '') {
    if (!/^\d{1,3}$/.test(ageRaw) || Number(ageRaw) < 1 || Number(ageRaw) > 120) {
      return { ok: false, field: 'age', message: 'Pakilagay ang tamang edad.' };
    }
    ageNum = Number(ageRaw);
    if (ageNum < 18) {
      return { ok: false, field: 'age', message: "18+ lang 'to, bes. Balik ka pag 18 ka na!" };
    }
  }
  if (!MOODS.includes(mood)) {
    return { ok: false, field: 'mood', message: 'Kumusta ka? Pumili ka muna, bes.' };
  }
  return { ok: true, name: cleaned, age: ageNum, mood };
}

export function pickMoodReasons(mood, n = 3) {
  const pool = MOOD_REASONS[mood].slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(randomInt(pool.length), 1)[0]);
  }
  return out;
}
