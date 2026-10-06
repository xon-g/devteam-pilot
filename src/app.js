import { drawCombo, formatStraight, rambolitoCombos, pickReason, randomInt, shareText } from './lucky.js';

const digitElements = [
  document.getElementById('digit-0'),
  document.getElementById('digit-1'),
  document.getElementById('digit-2')
];
const reasonElements = [
  document.getElementById('reason-0'),
  document.getElementById('reason-1'),
  document.getElementById('reason-2')
];
const comboOutput = document.getElementById('combo-output');
const drawButton = document.getElementById('draw');
const shareButton = document.getElementById('share');
const shareStatus = document.getElementById('share-status');
const modeRadios = document.querySelectorAll('input[name="mode"]');

let currentCombo = null;

function updateDisplay() {
  if (!currentCombo) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'straight') {
    comboOutput.textContent = formatStraight(currentCombo);
  } else {
    const combos = rambolitoCombos(currentCombo);
    comboOutput.textContent = combos.join(', ');
  }
}

async function draw() {
  drawButton.disabled = true;
  
  // Clear reasons before starting
  for (let i = 0; i < 3; i++) {
    reasonElements[i].textContent = '';
  }

  try {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isReducedMotion) {
      currentCombo = drawCombo();
      for (let i = 0; i < 3; i++) {
        digitElements[i].textContent = currentCombo[i];
        reasonElements[i].textContent = pickReason(currentCombo[i]);
      }
    } else {
      // Roll animation
      for (let i = 0; i < 8; i++) {
        const tempCombo = [randomInt(10), randomInt(10), randomInt(10)];
        
        for (let j = 0; j < 3; j++) {
          digitElements[j].textContent = tempCombo[j];
          reasonElements[j].textContent = ''; // Clear during roll
        }
        
        await new Promise(r => setTimeout(r, 70));
      }

      currentCombo = drawCombo();
      
      // Settle left to right
      for (let i = 0; i < 3; i++) {
        digitElements[i].textContent = currentCombo[i];
        reasonElements[i].textContent = pickReason(currentCombo[i]);
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } finally {
    drawButton.disabled = false;
  }

  updateDisplay();
  shareButton.disabled = false;
}

async function handleShare() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const text = shareText(currentCombo, mode);

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
