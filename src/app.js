import { drawCombo, pickReason, formatStraight } from './lucky.js';

const drawBtn = document.getElementById('draw-btn');
const comboDisplay = document.getElementById('combo-display');
const reasonDisplay = document.getElementById('reason-display');

drawBtn.addEventListener('click', () => {
    const combo = drawCombo();
    comboDisplay.textContent = formatStraight(combo);
    
    // Pick a reason for the first digit for now
    const reason = pickReason(combo[0]);
    reasonDisplay.textContent = reason;
});
