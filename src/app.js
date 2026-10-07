import { rambolitoCombos, randomInt, shareText } from './lucky.js';
import { DEFAULT_GAME, drawNumbers, formatNumbers, getGame } from './games.js';
import { createSound } from './sound.js';
import { roastLines } from './roast.js';
import { eventPath, track } from './analytics.js';
import { PCSO_RESULTS_URL, PCSO_FACEBOOK_URL, SITE_URL } from './config.js';
import { shareLinks, isMobileUA, copyText, shareUrl } from './share.js';
import { nextDraw, formatCountdown, drawLabel, loadSchedule } from './schedule.js';
import { validateProfile, pickMoodReasons } from './profile.js';

// Register service worker if supported
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker registered'))
    .catch(() => {}); // Silently fail - page still works
}

let digitElements = [];
let reasonElements = [];
let miniElements = [];
const reasonsList = document.querySelector('.reasons');
const ballsEl = document.querySelector('.balls');
const eyebrow = document.querySelector('.eyebrow');
const modeGroup = document.getElementById('mode-group');
const comboOutput = document.getElementById('combo-output');
const PROMPT = comboOutput.textContent;
const drawButton = document.getElementById('draw');
const shareButton = document.getElementById('share');
const shareRow = document.getElementById('share-row');
const shareStatus = document.getElementById('share-status');
const modeRadios = document.querySelectorAll('input[name="mode"]');

const form = document.getElementById('about-you');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const formStatus = document.getElementById('form-status');
const forName = document.getElementById('for-name');
const roastEl = document.getElementById('roast');
const officialResults = document.getElementById('official-results');
const resultsGame = document.getElementById('results-game');
officialResults.querySelector('[data-results="site"]').href = PCSO_RESULTS_URL;
officialResults.querySelector('[data-results="facebook"]').href = PCSO_FACEBOOK_URL;

const nextDrawEl = document.getElementById('next-draw');
let schedule = null;

function updateNextDraw() {
  const now = new Date();
  const draw = schedule ? nextDraw(schedule, currentGame.id, now) : null;
  nextDrawEl.hidden = !draw;
  if (!draw) return;
  document.getElementById('next-draw-game').textContent = currentGame.name;
  document.getElementById('next-draw-when').textContent = drawLabel(draw, now, schedule.utcOffsetMinutes);
  document.getElementById('next-draw-in').textContent = formatCountdown(draw.at.getTime() - now.getTime());
}

const sound = createSound(() => {
  const C = window.AudioContext || window.webkitAudioContext;
  return C ? new C() : null;
});
const soundButton = document.getElementById('sound');

let currentCombo = null;
let currentGame = getGame(DEFAULT_GAME);
let drawing = false;

function ballText(game, n) {
  return game.kind === 'digit' ? String(n) : String(n).padStart(2, '0');
}

function pickedGame() {
  const checked = form.querySelector('input[name="game"]:checked');
  return getGame(checked ? checked.value : DEFAULT_GAME);
}

function currentMode() {
  if (!currentGame.rambolito) return 'straight';
  return document.querySelector('input[name="mode"]:checked').value;
}

function buildSlots(game) {
  ballsEl.textContent = '';
  reasonsList.textContent = '';
  ballsEl.dataset.count = String(game.count);
  for (let i = 0; i < game.count; i++) {
    const ball = document.createElement('div');
    ball.className = 'digit';
    ball.id = `digit-${i}`;
    ballsEl.appendChild(ball);

    const li = document.createElement('li');
    const mini = document.createElement('span');
    mini.className = 'mini';
    mini.id = `mini-${i}`;
    const reason = document.createElement('span');
    reason.className = 'reason';
    reason.id = `reason-${i}`;
    li.appendChild(mini);
    li.appendChild(reason);
    reasonsList.appendChild(li);
  }
  digitElements = Array.from(ballsEl.children);
  reasonElements = Array.from(reasonsList.querySelectorAll('.reason'));
  miniElements = Array.from(reasonsList.querySelectorAll('.mini'));
}

function clearRoast() {
  roastEl.textContent = '';
  roastEl.hidden = true;
}

function applyGame(game) {
  currentGame = game;
  currentCombo = null;
  buildSlots(game);
  reasonsList.hidden = true;
  forName.hidden = true;
  clearRoast();
  comboOutput.textContent = PROMPT;
  comboOutput.classList.add('prompt');
  shareButton.disabled = true;
  shareRow.hidden = true;
  shareStatus.textContent = '';
  modeGroup.hidden = !game.rambolito;
  resultsGame.textContent = game.name;
  officialResults.hidden = game.id === '1-58';
  updateNextDraw();
  eyebrow.textContent = game.id === '3d' ? 'Swertres · 3D' : game.name;
}
let currentName = '';
let moodTouched = false;

function readProfile() {
  const checked = form.querySelector('input[name="mood"]:checked');
  return validateProfile({ name: nameInput.value, age: ageInput.value, mood: checked ? checked.value : '' });
}

function checkForm() {
  const result = readProfile();
  drawButton.disabled = drawing || !result.ok;
  if (result.ok) {
    formStatus.textContent = '';
  } else if (result.field === 'mood' && !moodTouched) {
    formStatus.textContent = 'Pumili ng mood para makabunot.';
  } else {
    formStatus.textContent = result.message;
  }
}

function updateDisplay() {
  if (!currentCombo) return;

  if (currentMode() === 'straight') {
    comboOutput.textContent = formatNumbers(currentGame, currentCombo);
  } else {
    const combos = rambolitoCombos(currentCombo, currentGame.id);
    comboOutput.textContent = combos.join(', ');
  }
}

async function draw() {
  const profile = readProfile();
  if (!profile.ok) {
    checkForm();
    return;
  }
  drawButton.disabled = true;
  drawing = true;
  const game = currentGame;
  const n = game.count;
  const moodReasons = pickMoodReasons(profile.mood, n);
  currentName = profile.name;
  forName.hidden = true;
  clearRoast();
  buildSlots(game);
  reasonsList.hidden = true;

  try {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const span = game.max - game.min + 1;

    if (isReducedMotion) {
      currentCombo = drawNumbers(game);
      for (let i = 0; i < n; i++) {
        digitElements[i].textContent = ballText(game, currentCombo[i]);
        reasonElements[i].textContent = moodReasons[i];
        miniElements[i].textContent = ballText(game, currentCombo[i]);
      }
      sound.play('chaching');
    } else {
      // Roll animation: frame delays decelerate (ease-out) from 45ms to 140ms
      const frames = 10;
      for (let r = 0; r < frames; r++) {
        for (let j = 0; j < n; j++) {
          digitElements[j].textContent = ballText(game, game.min + randomInt(span));
          digitElements[j].classList.remove('landed');
          digitElements[j].classList.add('rolling');
        }
        sound.play('tick');
        const t = r / (frames - 1);
        const delay = 45 + (140 - 45) * (1 - (1 - t) * (1 - t));
        await new Promise(res => setTimeout(res, delay));
      }

      currentCombo = drawNumbers(game);

      // Settle left to right
      for (let i = 0; i < n; i++) {
        const ball = digitElements[i];
        ball.textContent = ballText(game, currentCombo[i]);
        ball.classList.remove('rolling');
        ball.classList.remove('landed');
        void ball.offsetWidth;
        ball.classList.add('landed');
        reasonElements[i].textContent = moodReasons[i];
        miniElements[i].textContent = ballText(game, currentCombo[i]);
        sound.play('ding', i);
        await new Promise(res => setTimeout(res, 120));
      }
      sound.play('chaching');
    }
  } finally {
    drawing = false;
    checkForm();
  }

  if (pickedGame().id !== game.id) {
    applyGame(pickedGame());
    return;
  }

  comboOutput.classList.remove('prompt');
  if (currentName) {
    forName.textContent = `Para kay ${currentName}`;
    forName.hidden = false;
  } else {
    forName.hidden = true;
  }
  for (const line of roastLines(profile)) {
    const li = document.createElement('li');
    li.textContent = line;
    roastEl.appendChild(li);
  }
  roastEl.hidden = roastEl.children.length === 0;
  reasonsList.hidden = false;
  updateDisplay();
  shareButton.disabled = false;
  updateShareRow();
  track(window.goatcounter, eventPath('draw', { game: game.id, mood: profile.mood, mode: currentMode() }));
}

function currentShareText() {
  return shareText(currentCombo, currentMode(), currentName, currentGame.id);
}

function updateShareRow() {
  const mobile = isMobileUA(navigator.userAgent);
  for (const link of shareLinks(currentShareText(), SITE_URL)) {
    const a = shareRow.querySelector(`a[data-share="${link.id}"]`);
    if (!a) continue;
    a.href = link.href;
    if (link.href.startsWith('https:')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.hidden = link.id === 'msgr' && !mobile;
  }
  shareRow.hidden = false;
}

async function handleRowClick(e) {
  const el = e.target.closest('[data-share]');
  if (!el) return;
  const via = el.dataset.share;
  track(window.goatcounter, eventPath('share-done', { via }));
  if (via !== 'copy') return;
  try {
    await navigator.clipboard.writeText(copyText(currentShareText(), SITE_URL));
    shareStatus.textContent = 'Nakopya na!';
  } catch (err) {
    shareStatus.textContent = 'Hindi maibahagi';
    console.error('Share error:', err);
  }
}

async function handleShare() {
  track(window.goatcounter, eventPath('share-tap'));
  const text = currentShareText();

  try {
    if (navigator.share) {
      await navigator.share({
        text: text,
        url: shareUrl(SITE_URL, 'native')
      });
      shareStatus.textContent = 'Naibahagi na!';
      track(window.goatcounter, eventPath('share-done', { via: 'native' }));
    } else {
      await navigator.clipboard.writeText(copyText(text, SITE_URL));
      shareStatus.textContent = 'Nakopya na!';
      track(window.goatcounter, eventPath('share-done', { via: 'copy' }));
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled, do nothing
    } else {
      shareStatus.textContent = 'Hindi maibahagi';
      console.error('Share error:', err);
    }
  }
}

window.addEventListener('appinstalled', () => track(window.goatcounter, eventPath('pwa-install')));
drawButton.addEventListener('click', draw);
shareButton.addEventListener('click', handleShare);
shareRow.addEventListener('click', handleRowClick);
soundButton.addEventListener('click', () => {
  const on = !sound.isEnabled();
  sound.setEnabled(on);
  soundButton.setAttribute('aria-pressed', String(on));
  soundButton.textContent = on ? '🔊 Tunog: On' : '🔇 Tunog: Off';
});

modeRadios.forEach(radio => {
  radio.addEventListener('change', updateDisplay);
});

form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', checkForm);
form.addEventListener('change', (e) => {
  if (e.target.name === 'mood') moodTouched = true;
  if (e.target.name === 'game' && !drawing) applyGame(pickedGame());
  checkForm();
});
applyGame(pickedGame());
checkForm();
loadSchedule().then((s) => {
  schedule = s;
  updateNextDraw();
}).catch(() => {});
setInterval(updateNextDraw, 30000);
