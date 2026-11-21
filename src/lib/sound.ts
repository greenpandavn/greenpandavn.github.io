let ctx: AudioContext | null = null;
let enabled = true;
export const setSfxEnabled = (v: boolean) => (enabled = v);

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

function ensure() {
  if (!enabled) return false;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

export const sfx = {
  correct() {
    if (!ensure()) return;
    tone(660, 0, 0.12, 'triangle');
    tone(990, 0.1, 0.2, 'triangle');
  },
  wrong() {
    if (!ensure()) return;
    tone(220, 0, 0.18, 'square', 0.06);
    tone(180, 0.15, 0.25, 'square', 0.06);
  },
  complete() {
    if (!ensure()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'));
  },
  tap() {
    if (!ensure()) return;
    tone(500, 0, 0.05, 'sine', 0.05);
  },
};
