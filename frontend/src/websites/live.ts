/**
 * Live updates between the admin panel and the hosted websites. Both run on the same origin,
 * so a BroadcastChannel delivers "content changed" instantly to every open website tab and
 * to the website preview inside the page editor. Websites also refetch on focus and poll as
 * a fallback (other devices, browsers without BroadcastChannel).
 */
const CHANNEL = 'pif-cms-live';

export interface ContentChange {
  siteSlug: string;
  at: number;
}

function channel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

/** Called by the admin panel after any successful CMS mutation. */
export function announceContentChange(siteSlug: string | undefined | null): void {
  if (!siteSlug) return;
  const ch = channel();
  if (!ch) return;
  ch.postMessage({ siteSlug, at: Date.now() } satisfies ContentChange);
  ch.close();
}

/** Subscribes a website to changes of its own tenant. Returns the unsubscribe function. */
export function onContentChange(siteSlug: string, fn: (c: ContentChange) => void): () => void {
  const ch = channel();
  if (!ch) return () => {};
  ch.onmessage = (e: MessageEvent<ContentChange>) => {
    if (e.data?.siteSlug === siteSlug) fn(e.data);
  };
  return () => ch.close();
}
