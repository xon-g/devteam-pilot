import { rambolitoCombos, randomInt, shareText } from './lucky.js';
import { DEFAULT_GAME, drawNumbers, formatNumbers, gameName, getGame } from './games.js';
import { HTML_LANG, normalizeLang, t } from './i18n.js';
import { createSound } from './sound.js';
import { renderRoast, roastPicks } from './roast.js';
import { eventPath, track } from './analytics.js';
import { PCSO_RESULTS_URL, PCSO_FACEBOOK_URL, SITE_URL } from './config.js';
import { shareLinks, isMobileUA, copyText, shareUrl } from './share.js';
import { nextDraw, formatCountdown, drawLabel, loadSchedule } from './schedule.js';
import { cardContent, cardFileName, drawCard } from './card.js';
import { validateProfile, pickMoodReasonIndices, moodReasonLines } from './profile.js';

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
  document.getElementById('next-draw-game').textContent = gameName(currentGame, lang);
  document.getElementById('next-draw-when').textContent = drawLabel(draw, now, schedule.utcOffsetMinutes, lang);
  document.getElementById('next-draw-in').textContent = formatCountdown(draw.at.getTime() - now.getTime(), lang);
}

const sound = createSound(() => {
  const C = window.AudioContext || window.webkitAudioContext;
  return C ? new C() : null;
});
const soundButton = document.getElementById('sound');

let lang = 'taglish';
try { lang = normalizeLang(localStorage.getItem('lang')); } catch { /* blocked storage: stay Taglish */ }
let currentReasonIdx = [];
let currentRoastPicks = [];
let currentProfile = null;
let statusKey = '';
let statusVars = {};
const tr = (key, vars) => t(lang, key, vars);

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
  comboOutput.textContent = tr('prompt');
  comboOutput.classList.add('prompt');
  shareButton.disabled = true;
  shareRow.hidden = true;
  setStatus('');
  modeGroup.hidden = !game.rambolito;
  resultsGame.textContent = gameName(game, lang);
  officialResults.hidden = game.id === '1-58';
  updateNextDraw();
  eyebrow.textContent = game.id === '3d' ? 'Swertres · 3D' : gameName(game, lang);
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
    formStatus.textContent = tr('moodPick');
  } else {
    formStatus.textContent = tr('err.' + result.code);
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
  const reasonIdx = pickMoodReasonIndices(profile.mood, n);
  const moodReasons = moodReasonLines(profile.mood, reasonIdx, lang);
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
  currentReasonIdx = reasonIdx;
  currentProfile = profile;
  currentRoastPicks = roastPicks(profile);
  renderResultText();
  reasonsList.hidden = false;
  updateDisplay();
  shareButton.disabled = false;
  updateShareRow();
  track(window.goatcounter, eventPath('draw', { game: game.id, mood: profile.mood, mode: currentMode() }));
}

function renderResultText() {
  if (!currentCombo || !currentProfile) return;
  reasonElements.forEach((el, i) => {
    el.textContent = moodReasonLines(currentProfile.mood, [currentReasonIdx[i]], lang)[0];
  });
  if (currentName) {
    forName.textContent = tr('forName', { name: currentName });
    forName.hidden = false;
  } else {
    forName.hidden = true;
  }
  roastEl.textContent = '';
  for (const p of currentRoastPicks) {
    const li = document.createElement('li');
    li.textContent = renderRoast(p, currentProfile, lang);
    roastEl.appendChild(li);
  }
  roastEl.hidden = roastEl.children.length === 0;
}

function setStatus(key, vars = {}) {
  statusKey = key;
  statusVars = vars;
  shareStatus.textContent = key ? tr(key, vars) : '';
}

function currentShareText() {
  return shareText(currentCombo, currentMode(), currentName, currentGame.id, lang);
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

function cardBlob() {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const drawText = nextDrawEl.hidden
    ? ''
    : `${document.getElementById('next-draw-when').textContent}`.trim();
  const content = cardContent({
    game: currentGame,
    numbersText: formatNumbers(currentGame, currentCombo),
    mode: currentMode(),
    name: currentName,
    drawText,
    lang
  });
  drawCard(canvas.getContext('2d'), content, { width: 1080, height: 1920 });
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

function downloadBlob(blob, fileName) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function cardFile() {
  const blob = await cardBlob();
  const fileName = cardFileName(currentGame.id, formatNumbers(currentGame, currentCombo));
  return { blob, fileName, file: new File([blob], fileName, { type: 'image/png' }) };
}

const APP_NAMES = { tiktok: 'TikTok', ig: 'Instagram' };

async function shareToApp(appKey) {
  const app = APP_NAMES[appKey];
  try {
    await navigator.clipboard.writeText(copyText(currentShareText(), SITE_URL));
  } catch (err) {
    // clipboard is best-effort
  }
  try {
    const { blob, fileName, file } = await cardFile();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        setStatus('statusAppShared', { app });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, fileName);
    setStatus('statusAppSaved', { app });
  } catch (err) {
    setStatus('statusSaveFail');
    console.warn(`${app} share error:`, err);
  }
}

async function saveImage() {
  try {
    const { blob, fileName, file } = await cardFile();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: currentShareText(), url: shareUrl(SITE_URL, 'img') });
        setStatus('statusShared');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        // e.g. Safari NotAllowedError after user activation expired: fall back to download
      }
    }
    downloadBlob(blob, fileName);
    setStatus('statusSaved');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    setStatus('statusSaveFail');
    console.warn('Save image error:', err);
  }
}

async function handleRowClick(e) {
  const el = e.target.closest('[data-share]');
  if (!el) return;
  const via = el.dataset.share;
  track(window.goatcounter, eventPath('share-done', { via }));
  if (via === 'img') return saveImage();
  if (via in APP_NAMES) return shareToApp(via);
  if (via !== 'copy') return;
  try {
    await navigator.clipboard.writeText(copyText(currentShareText(), SITE_URL));
    setStatus('statusCopied');
  } catch (err) {
    setStatus('statusShareFail');
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
      setStatus('statusShared');
      track(window.goatcounter, eventPath('share-done', { via: 'native' }));
    } else {
      await navigator.clipboard.writeText(copyText(text, SITE_URL));
      setStatus('statusCopied');
      track(window.goatcounter, eventPath('share-done', { via: 'copy' }));
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled, do nothing
    } else {
      setStatus('statusShareFail');
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
  updateSoundLabel();
});

function updateSoundLabel() {
  soundButton.textContent = tr(sound.isEnabled() ? 'soundOn' : 'soundOff');
}

const NAV_KEYS = {
  'how-to-play/': 'navHow', 'lucky-numbers/': 'navLucky', 'responsible-gaming/': 'navResponsible',
  'about/': 'navAbout', 'contact/': 'navContact', 'privacy/': 'navPrivacy',
};

function applyStaticText() {
  document.documentElement.lang = HTML_LANG[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', tr(el.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-i18n-lead]').forEach((el) => { el.firstChild.textContent = `${tr(el.dataset.i18nLead)} `; });
  document.getElementById('disclaimer').textContent = tr('disclaimer');
  const siteLinks = document.querySelector('.site-links');
  siteLinks.setAttribute('aria-label', tr('siteLinks'));
  siteLinks.querySelectorAll('a').forEach((a) => {
    const key = NAV_KEYS[a.getAttribute('href')];
    if (key) a.textContent = tr(key);
  });
  document.querySelectorAll('[data-lang-block]').forEach((el) => { el.hidden = el.dataset.langBlock !== lang; });
  // The tagline keeps its <br>: first and last child are the two text nodes.
  const [line1, line2] = tr('tagline').split('\n');
  const tagline = document.querySelector('.tagline');
  tagline.firstChild.textContent = line1;
  tagline.lastChild.textContent = line2;
  updateSoundLabel();
}

function applyLang() {
  applyStaticText();
  const picked = document.querySelector(`input[name="lang"][value="${lang}"]`);
  if (picked) picked.checked = true;
  resultsGame.textContent = gameName(currentGame, lang);
  eyebrow.textContent = currentGame.id === '3d' ? 'Swertres · 3D' : gameName(currentGame, lang);
  if (!currentCombo) comboOutput.textContent = tr('prompt');
  shareStatus.textContent = statusKey ? tr(statusKey, statusVars) : '';
  renderResultText();
  if (currentCombo) updateShareRow();
  updateNextDraw();
  checkForm();
}

document.querySelectorAll('input[name="lang"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    lang = normalizeLang(radio.value);
    try { localStorage.setItem('lang', lang); } catch { /* blocked storage: keep going */ }
    applyLang();
  });
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
applyLang();
loadSchedule().then((s) => {
  schedule = s;
  updateNextDraw();
}).catch(() => {});
setInterval(updateNextDraw, 30000);
