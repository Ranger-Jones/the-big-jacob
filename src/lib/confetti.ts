'use client';

const COLORS = ['#f4b73a', '#c8323c', '#fbf0d9', '#8b4fc7', '#3a6fd8'];

const reduced = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Gold rain for a crown, a burst for a revolution, a long shower for the overall winner. */
export async function fireConfetti(kind: 'crown' | 'revolution' | 'win') {
  if (reduced()) return;
  const confetti = (await import('canvas-confetti')).default;
  if (kind === 'crown') {
    confetti({ particleCount: 70, spread: 80, startVelocity: 35, origin: { y: 0.35 }, colors: ['#f4b73a', '#ffe08a', '#b07a12'], scalar: 1.1 });
    return;
  }
  if (kind === 'revolution') {
    confetti({ particleCount: 110, angle: 60, spread: 75, origin: { x: 0, y: 0.7 }, colors: ['#c8323c', '#1b0e2e', '#f4b73a'] });
    confetti({ particleCount: 110, angle: 120, spread: 75, origin: { x: 1, y: 0.7 }, colors: ['#c8323c', '#1b0e2e', '#f4b73a'] });
    return;
  }
  const end = Date.now() + 2800;
  (function frame() {
    confetti({ particleCount: 6, startVelocity: 25, spread: 360, ticks: 130, origin: { x: Math.random(), y: -0.05 }, colors: COLORS, gravity: 0.8 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
