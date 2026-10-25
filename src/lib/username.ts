export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/** Username from a URL segment – null for broken encoding or an invalid name. */
export function parseUsernameParam(raw: string): string | null {
  let name: string;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return USERNAME_RE.test(name) ? name : null;
}
