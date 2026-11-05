// =============================================
// Site & App Configuration
// =============================================

export const SITE_URL = (
  typeof window !== 'undefined'
    ? ((import.meta as any).env?.VITE_SITE_URL || window.location.origin)
    : (typeof process !== 'undefined' && process.env?.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:3000')
).replace(/\/+$/, '');

/**
 * Returns canonical shareable event URL
 */
export function getEventShareUrl(eventId: string, refCode?: string | null): string {
  const base = `${SITE_URL}/event/${encodeURIComponent(eventId)}`;
  return refCode ? `${base}?ref=${encodeURIComponent(refCode)}` : base;
}

/**
 * Returns absolute public HTTPS URL for an event image or default fallback
 */
export function getAbsoluteImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || imageUrl.trim() === '') {
    return `${SITE_URL}/default-cover.png`;
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl.replace(/^http:\/\//i, 'https://');
  }
  const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${SITE_URL}${cleanPath}`;
}

