import 'server-only';
import { cookies } from 'next/headers';
import { GATE_COOKIE, verifyGateToken } from './gate';

/**
 * Server actions can be POSTed through any page, including the unlocked /zugang.
 * That is why actions check the gate themselves instead of relying on the proxy alone.
 */
export async function isGateOpen(): Promise<boolean> {
  return verifyGateToken((await cookies()).get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
}
