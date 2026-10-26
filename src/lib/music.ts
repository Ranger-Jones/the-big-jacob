'use client';

/**
 * A quiet, endlessly looping lute tune (D dorian, 3/4) synthesized with WebAudio – no audio files.
 * Off by default; the choice is remembered per device.
 */
const KEY = 'jakob-music';
const BPM = 96;
const BEAT = 60 / BPM;

// Each bar: bass note + chord tones (MIDI numbers), 3 beats.
const BARS: { bass: number; chord: number[]; melody: (number | null)[] }[] = [
  { bass: 50, chord: [62, 65, 69], melody: [74, null, 72, 74, 76, null] },
  { bass: 48, chord: [60, 64, 67], melody: [72, null, 71, 69, 67, null] },
  { bass: 50, chord: [62, 65, 69], melody: [69, 72, 74, null, 72, 69] },
  { bass: 45, chord: [57, 60, 64], melody: [67, null, 69, null, 64, null] },
  { bass: 46, chord: [58, 62, 65], melody: [65, 67, 69, null, 70, 69] },
  { bass: 48, chord: [60, 64, 67], melody: [67, null, 64, null, 60, null] },
  { bass: 45, chord: [57, 61, 64], melody: [64, 65, 67, null, 69, null] },
  { bass: 50, chord: [62, 65, 69], melody: [62, null, null, null, null, null] },
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
const listeners = new Set<(on: boolean) => void>();

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function pluck(time: number, midi: number, gain: number, length = 1.2) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc2.type = 'sawtooth';
  osc.frequency.value = freq(midi);
  osc2.frequency.value = freq(midi) * 1.003;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2800, time);
  filter.frequency.exponentialRampToValueAtTime(500, time + length);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, time + length);
  const mix = ctx.createGain();
  mix.gain.value = 0.25;
  osc.connect(g);
  osc2.connect(mix).connect(g);
  g.connect(filter).connect(master);
  osc.start(time);
  osc2.start(time);
  osc.stop(time + length + 0.05);
  osc2.stop(time + length + 0.05);
}

/** Schedules notes a little ahead of time so playback stays smooth. */
function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.4) {
    const bar = BARS[Math.floor(step / 6) % BARS.length];
    const eighth = step % 6;
    if (eighth === 0) pluck(nextTime, bar.bass, 0.09, 2.4);
    if (eighth === 2 || eighth === 4) pluck(nextTime, bar.chord[(eighth / 2) % 3], 0.035, 1.1);
    if (eighth === 1 || eighth === 3 || eighth === 5) pluck(nextTime, bar.chord[(eighth + 1) % 3] + 12, 0.02, 0.8);
    const note = bar.melody[eighth];
    if (note !== null) pluck(nextTime, note, 0.05, 0.9);
    nextTime += BEAT / 2;
    step += 1;
  }
}

export function isMusicOn(): boolean {
  return timer !== null;
}

export function wantsMusic(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function startMusic() {
  if (timer || typeof window === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    nextTime = ctx.currentTime + 0.1;
    step = 0;
    timer = setInterval(schedule, 100);
    localStorage.setItem(KEY, 'on');
  } catch {
    // No audio available – stay silent.
  }
  listeners.forEach((l) => l(true));
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (master && ctx) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    const old = master;
    setTimeout(() => old.disconnect(), 800);
  }
  master = null;
  try {
    localStorage.setItem(KEY, 'off');
  } catch {
    // ignore
  }
  listeners.forEach((l) => l(false));
}

export function onMusicChange(listener: (on: boolean) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
