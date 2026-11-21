/**
 * Pure domain rules for building and validating permanent studio URLs.
 */
export function buildPermanentStudioUrl(baseUrl: string, slug: string): string {
  const cleanBase = (baseUrl || 'https://snapprint.in').trim().replace(/\/+$/, '');
  const cleanSlug = slug.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    throw new Error(`Invalid studio slug format: '${slug}'`);
  }

  return `${cleanBase}/s/${cleanSlug}`;
}

export function parseStudioSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/s\/([a-z0-9-]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
