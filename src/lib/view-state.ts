// Share pages mirror the viewing state (open entry, fullscreen image) into
// query params so a copied URL reopens exactly what the sender was looking at.
// In-tab views on the home page never touch the address bar.

export function onSharePage(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/s/");
}

export function readViewParam(key: string): string | null {
  if (!onSharePage()) return null;
  return new URLSearchParams(window.location.search).get(key);
}

// Safari rate-limits replaceState (and throws when exceeded) — rapid gallery
// navigation (key-repeat) must therefore debounce and swallow failures.
let pendingPatch: Record<string, string | null> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function writeViewParams(patch: Record<string, string | null>): void {
  if (!onSharePage()) return;
  pendingPatch = { ...pendingPatch, ...patch };
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const merged = pendingPatch;
    pendingPatch = null;
    flushTimer = null;
    if (!merged) return;
    try {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(merged)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      const url = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // replaceState throttled — state lands on the next write
    }
  }, 300);
}
