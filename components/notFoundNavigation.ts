/** Only go back when the browser exposes a distinct page on this origin. */
export function safeNotFoundHistoryTarget(currentHref: string, previousHref?: string): string | null {
  if (!previousHref) return null;
  try {
    const current = new URL(currentHref);
    const previous = new URL(previousHref);
    if (!/^https?:$/.test(previous.protocol) || previous.origin !== current.origin
      || previous.pathname === current.pathname || /^\/api(?:\/|$)/.test(previous.pathname)) return null;
    return previous.pathname + previous.search + previous.hash;
  } catch {
    return null;
  }
}
