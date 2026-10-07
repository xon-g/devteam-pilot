// Draw schedule logic. DOM-free. Manila is a fixed UTC+8 (no DST), so no Intl tz data is used.
import { t } from './i18n.js';

const DAY_MS = 86400000;

function offsetMs(schedule) {
  return (schedule && schedule.utcOffsetMinutes != null ? schedule.utcOffsetMinutes : 480) * 60000;
}

// Manila-shifted day number (days since epoch on the Manila calendar).
function manilaDayNumber(date, off) {
  return Math.floor((date.getTime() + off) / DAY_MS);
}

export function nextDraw(schedule, gameId, now) {
  const game = schedule && schedule.games && schedule.games[gameId];
  if (!game) return null;
  const off = offsetMs(schedule);
  const today = manilaDayNumber(now, off);
  for (let i = 0; i <= 8; i++) {
    const dayNum = today + i;
    const dow = (((dayNum + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
    if (!game.days.includes(dow)) continue;
    const times = [...game.times].sort();
    for (const time of times) {
      const [h, m] = time.split(':').map(Number);
      const at = new Date(dayNum * DAY_MS + (h * 60 + m) * 60000 - off);
      if (at.getTime() > now.getTime()) return { at, day: dow, time };
    }
  }
  return null;
}

export function formatCountdown(ms, lang = 'taglish') {
  const wrap = (s) => t(lang, 'countdownIn', { t: s });
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return wrap('<1m');
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days >= 1) return wrap(`${days}d ${hours}h`);
  if (hours >= 1) return wrap(m ? `${hours}h ${m}m` : `${hours}h`);
  return wrap(`${m}m`);
}

export function formatDrawTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function drawLabel(draw, now, utcOffsetMinutes = 480, lang = 'taglish') {
  const off = utcOffsetMinutes * 60000;
  const diff = manilaDayNumber(draw.at, off) - manilaDayNumber(now, off);
  const time = formatDrawTime(draw.time);
  if (diff === 0) return t(lang, 'drawToday', { time });
  if (diff === 1) return t(lang, 'drawTomorrow', { time });
  return `${t(lang, 'day.' + draw.day)} ${time}`;
}

export async function loadSchedule() {
  try {
    const res = await fetch(new URL('../data/draw-schedule.json', import.meta.url));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
