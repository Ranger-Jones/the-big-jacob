'use client';

/** Tiny synthesized sound effects (no audio files). Muted state is a per-device preference. */
export type SoundName = 'card' | 'pass' | 'turn' | 'clear' | 'revolution' | 'crown' | 'chat' | 'deal';

const KEY = 'jakob-sound';
let ctx: AudioContext | null = null;
let muted: boolean | null = null;
const listeners = new Set<(muted: boolean) => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(KEY) === 'off';
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? 'off' : 'on');
  } catch {
    // Private mode: the preference just isn't remembered.
  }
  listeners.forEach((l) => l(value));
}

export function onMutedChange(listener: (muted: boolean) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'triangle', gain = 0.08) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function swish(ac: AudioContext, start: number, dur = 0.12, gain = 0.12) {
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(start);
}

export function playSound(name: SoundName) {
  if (isMuted()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  switch (name) {
    case 'card': swish(ac, t); tone(ac, 520, t + 0.02, 0.08, 'sine', 0.03); break;
    case 'deal': for (let i = 0; i < 5; i++) swish(ac, t + i * 0.06, 0.07, 0.07); break;
    case 'pass': tone(ac, 330, t, 0.12, 'sine', 0.05); tone(ac, 262, t + 0.08, 0.14, 'sine', 0.04); break;
    case 'turn': tone(ac, 660, t, 0.1, 'triangle', 0.06); tone(ac, 880, t + 0.09, 0.16, 'triangle', 0.06); break;
    case 'clear': swish(ac, t, 0.25, 0.06); break;
    case 'chat': tone(ac, 990, t, 0.07, 'sine', 0.04); break;
    case 'crown': [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.09, 0.3, 'triangle', 0.07)); break;
    case 'revolution':
      [392, 392, 392, 523].forEach((f, i) => tone(ac, f, t + i * 0.13, i === 3 ? 0.5 : 0.11, 'sawtooth', 0.05));
      break;
  }
}
