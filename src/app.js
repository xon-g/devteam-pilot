import { rambolitoCombos, randomInt, shareText } from './lucky.js';
import { DEFAULT_GAME, drawNumbers, formatNumbers, getGame } from './games.js';
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
const shareStatus = document.getElementById('share-status');
const modeRadios = document.querySelectorAll('input[name="mode"]');

const form = document.getElementById('about-you');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const formStatus = document.getElementById('form-status');
const forName = document.getElementById('for-name');

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

function applyGame(game) {
  currentGame = game;
  currentCombo = null;
  buildSlots(game);
  reasonsList.hidden = true;
  forName.hidden = true;
  comboOutput.textContent = PROMPT;
  comboOutput.classList.add('prompt');
  shareButton.disabled = true;
  shareStatus.textContent = '';
  modeGroup.hidden = !game.rambolito;
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
    } else {
      // Roll animation
      for (let r = 0; r < 8; r++) {
        for (let j = 0; j < n; j++) {
          digitElements[j].textContent = ballText(game, game.min + randomInt(span));
          digitElements[j].classList.add('rolling');
        }
        await new Promise(res => setTimeout(res, 70));
      }

      currentCombo = drawNumbers(game);

      // Settle left to right
      for (let i = 0; i < n; i++) {
        digitElements[i].textContent = ballText(game, currentCombo[i]);
        digitElements[i].classList.remove('rolling');
        reasonElements[i].textContent = moodReasons[i];
        miniElements[i].textContent = ballText(game, currentCombo[i]);
        await new Promise(res => setTimeout(res, 100));
      }
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
  reasonsList.hidden = false;
  updateDisplay();
  shareButton.disabled = false;
}

async function handleShare() {
  const text = shareText(currentCombo, currentMode(), currentName, currentGame.id);

  try {
    if (navigator.share) {
      await navigator.share({
        text: text
      });
      shareStatus.textContent = 'Naibahagi na!';
    } else {
      await navigator.clipboard.writeText(text);
      shareStatus.textContent = 'Nakopya na!';
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

drawButton.addEventListener('click', draw);
shareButton.addEventListener('click', handleShare);

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
