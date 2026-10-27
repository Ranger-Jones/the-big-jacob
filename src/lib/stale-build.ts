'use client';

/**
 * After a new deployment, pages that were already open still run the old build. Their next request
 * can ask for chunks or server actions that no longer exist – a full reload fixes that.
 */
const STALE = /Failed to find Server Action|ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch|older or newer deployment/i;
const KEY = 'jakob-stale-reload';

export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return STALE.test(message);
}

/** Reloads once; returns false if we already reloaded a moment ago (avoids reload loops). */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Without storage we still reload, but only this once per page view.
  }
  window.location.reload();
  return true;
}
