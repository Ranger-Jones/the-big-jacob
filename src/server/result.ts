export type ServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
/** Error code for an outdated expectation – the client silently refetches. */
export const STALE = 'STALE';
