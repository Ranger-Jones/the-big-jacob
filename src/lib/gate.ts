/** Access question in front of the whole site – a bouncer against strangers, not real security. */
export const GATE_QUESTION = 'Wer ist mein Lieblings Rettungsdienstmitarbeiter?';
export const GATE_COOKIE = 'jakob_zugang';
export const GATE_PATH = '/zugang';
export const GATE_MAX_AGE = 60 * 60 * 24 * 365;
const ANSWER = 'peschel';
const PAYLOAD = 'jakob-zugang-v1';

export function isCorrectGateAnswer(input: unknown): boolean {
  return typeof input === 'string' && input.trim().toLowerCase() === ANSWER;
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Signed unlock token (key: SUPABASE_SECRET_KEY). */
export async function createGateToken(secret: string): Promise<string> {
  return `v1.${await hmac(secret, PAYLOAD)}`;
}

export async function verifyGateToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await createGateToken(secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
