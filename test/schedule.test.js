import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { GAMES } from '../src/games.js';
import { nextDraw, formatCountdown, formatDrawTime, drawLabel } from '../src/schedule.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const schedule = JSON.parse(read('data/draw-schedule.json'));
const Z = (s) => new Date(s);
const manila = (d) => {
  const s = new Date(d.getTime() + 8 * 3600000);
  return { day: s.getUTCDay(), time: `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}` };
};

test('schedule JSON covers every game except 1-58 and is well-formed', () => {
  assert.strictEqual(schedule.utcOffsetMinutes, 480);
  for (const g of GAMES) {
    if (g.id === '1-58') { assert.ok(!(g.id in schedule.games)); continue; }
    const e = schedule.games[g.id];
    assert.ok(e, g.id);
    assert.ok(e.days.length > 0 && e.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6), g.id);
    assert.ok(e.times.length > 0 && e.times.every((t) => /^\d\d:\d\d$/.test(t)), g.id);
  }
});

test('fixed instants', () => {
  let d = nextDraw(schedule, '3d', Z('2026-10-07T05:59:00Z'));
  assert.deepStrictEqual([d.day, d.time], [3, '14:00']);
  assert.strictEqual(formatCountdown(d.at - Z('2026-10-07T05:59:00Z')), 'in 1m');
  d = nextDraw(schedule, '3d', Z('2026-10-07T06:00:00Z'));
  assert.deepStrictEqual([d.day, d.time], [3, '17:00']);
  const n = Z('2026-10-07T13:00:01Z');
  d = nextDraw(schedule, '3d', n);
  assert.deepStrictEqual([d.day, d.time], [4, '14:00']);
  assert.strictEqual(drawLabel(d, n), 'bukas 2:00 PM');
  d = nextDraw(schedule, '3d', Z('2026-10-10T15:30:00Z'));
  assert.deepStrictEqual([d.day, d.time], [0, '14:00']);
  assert.strictEqual(d.at.toISOString(), '2026-10-11T06:00:00.000Z');
  const w = Z('2026-10-07T13:30:00Z');
  d = nextDraw(schedule, '4d', w);
  assert.deepStrictEqual([d.day, d.time], [5, '21:00']);
  assert.strictEqual(drawLabel(d, w), 'Biyernes 9:00 PM');
  assert.strictEqual(formatCountdown(d.at - w), 'in 1d 23h');
  assert.strictEqual(nextDraw(schedule, '6-58', Z('2026-10-09T13:00:30Z')).day, 0);
  assert.strictEqual(nextDraw(schedule, '6-49', Z('2026-10-08T14:00:00Z')).day, 0);
  assert.strictEqual(nextDraw(schedule, '6-55', Z('2026-10-10T13:01:00Z')).day, 1);
  assert.strictEqual(nextDraw(schedule, '1-58', w), null);
});

test('same-day label', () => {
  const n = Z('2026-10-07T07:48:00Z');
  assert.strictEqual(drawLabel(nextDraw(schedule, '3d', n), n), 'ngayong 5:00 PM');
});

test('every hour of a week, every game', () => {
  const start = Z('2026-10-04T00:00:00Z');
  for (const id of Object.keys(schedule.games)) {
    const e = schedule.games[id];
    for (let h = 0; h < 168; h++) {
      const now = new Date(start.getTime() + h * 3600000);
      const d = nextDraw(schedule, id, now);
      assert.ok(d.at > now && d.at - now <= 7 * 86400000, `${id} ${h}`);
      const m = manila(d.at);
      assert.ok(e.days.includes(m.day) && e.times.includes(m.time), `${id} ${h}`);
    }
  }
});

test('formatters', () => {
  assert.strictEqual(formatCountdown(30000), 'in <1m');
  assert.strictEqual(formatCountdown(59 * 60000), 'in 59m');
  assert.strictEqual(formatCountdown(72 * 60000), 'in 1h 12m');
  assert.strictEqual(formatCountdown(51 * 3600000), 'in 2d 3h');
  assert.strictEqual(formatDrawTime('14:00'), '2:00 PM');
  assert.strictEqual(formatDrawTime('21:00'), '9:00 PM');
  assert.strictEqual(formatDrawTime('12:00'), '12:00 PM');
});

test('how-to-play draw days match the JSON', () => {
  const html = read('how-to-play/index.html');
  const abbr = { Lin: 0, Lun: 1, Mar: 2, Miy: 3, Huw: 4, Biy: 5, Sab: 6 };
  const names = { '6-42': 'Lotto 6/42', '6-45': 'Mega Lotto 6/45', '6-49': 'Super Lotto 6/49', '6-55': 'Grand Lotto 6/55', '6-58': 'Ultra Lotto 6/58' };
  for (const [id, name] of Object.entries(names)) {
    const row = html.match(new RegExp(`<td>${name}</td><td>[^<]*</td><td>[^<]*</td><td>([^<]*)<`))[1];
    const days = row.split(',').map((s) => abbr[s.trim()]).sort();
    assert.deepStrictEqual(days, [...schedule.games[id].days].sort(), id);
  }
});

test('sw.js is v31 and lists the new files', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes('swertres-v44'));
  assert.ok(sw.includes('"data/draw-schedule.json"') && sw.includes('"src/schedule.js"'));
});
