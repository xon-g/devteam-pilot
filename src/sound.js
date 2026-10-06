export const SOUNDS = {
  tick: { freqs: [2400, 3200], type: 'triangle', dur: 0.04, gain: 0.06 },
  ding: { freqs: [1320], type: 'sine', dur: 0.15, gain: 0.10 },
  chaching: { freqs: [1800, 2700, 2093, 2637], type: 'triangle', dur: 0.45, gain: 0.12 }
};

function tone(ctx, type, freq, start, dur, peak) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(peak, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

export function createSound(getContext) {
  let enabled = true;
  let ctx = null;
  let failed = false;

  function context() {
    if (failed) return null;
    if (!ctx) {
      try {
        ctx = getContext();
      } catch {
        ctx = null;
      }
      if (!ctx) failed = true;
    }
    return ctx;
  }

  function play(name, index = 0) {
    try {
      if (!enabled) return;
      const def = SOUNDS[name];
      if (!def) return;
      const c = context();
      if (!c) return;
      if (c.state === 'suspended') {
        try { Promise.resolve(c.resume()).catch(() => {}); } catch { /* ignore */ }
      }
      const t = c.currentTime;
      if (name === 'tick') {
        for (const f of def.freqs) tone(c, def.type, f, t, def.dur, def.gain);
      } else if (name === 'ding') {
        tone(c, def.type, 1320 * 1.06 ** index, t, def.dur, def.gain);
      } else if (name === 'chaching') {
        const [cha, cha2, ching, ching2] = def.freqs;
        tone(c, def.type, cha, t, 0.05, def.gain);
        tone(c, def.type, cha2, t + 0.06, 0.05, def.gain);
        tone(c, def.type, ching, t + 0.12, 0.33, def.gain);
        tone(c, def.type, ching2, t + 0.12, 0.33, def.gain);
      }
    } catch {
      // sound must never break a draw
    }
  }

  return {
    play,
    setEnabled(v) { enabled = Boolean(v); },
    isEnabled() { return enabled; }
  };
}
