import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';

interface CachedRelease {
  metadata: AgentDownloadMetadata;
  expiresAt: number;
}

let cachedRelease: CachedRelease | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function resetGitHubReleaseCacheForTesting(): void {
  cachedRelease = null;
}

export async function fetchLatestGitHubAgentRelease(
  fetchImpl: typeof fetch = fetch
): Promise<AgentDownloadMetadata | null> {
  const now = Date.now();
  if (cachedRelease && cachedRelease.expiresAt > now) {
    return cachedRelease.metadata;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  timer.unref?.();

  try {
    const res = await fetchImpl(
      'https://api.github.com/repos/esparexin/SnapPrint/releases/latest',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SnapPrint-API-AgentUpdater',
        },
        signal: controller.signal,
      }
    );

    if (!res.ok) return cachedRelease?.metadata ?? null;

    const data = (await res.json()) as {
      tag_name?: string;
      published_at?: string;
      assets?: Array<{
        name: string;
        size: number;
        browser_download_url: string;
        digest?: string;
      }>;
    };

    const tagName = data.tag_name || '';
    const version = tagName.replace(/^v/, '').trim();
    if (!version) return cachedRelease?.metadata ?? null;

    const assets = Array.isArray(data.assets) ? data.assets : [];
    const msiAsset =
      assets.find((a) => a.name.endsWith('.msi') && a.name.includes(version)) ||
      assets.find((a) => a.name.endsWith('.msi'));

    if (!msiAsset) return cachedRelease?.metadata ?? null;

    const sha256 = msiAsset.digest?.startsWith('sha256:')
      ? msiAsset.digest.slice(7)
      : '2082a7b4c164b8860207e31994908c81193cdb2d48c56efa9064d5c5d8b403d4';

    const candidate = {
      version,
      installerName: 'SnapPrint-Print-Agent.msi' as const,
      downloadUrl: msiAsset.browser_download_url,
      sha256,
      sizeBytes: msiAsset.size,
      releaseDate: data.published_at || new Date().toISOString(),
    };

    const parsed = AgentDownloadMetadataSchema.safeParse(candidate);
    if (!parsed.success) return cachedRelease?.metadata ?? null;

    cachedRelease = {
      metadata: parsed.data,
      expiresAt: now + CACHE_TTL_MS,
    };
    return parsed.data;
  } catch {
    return cachedRelease?.metadata ?? null;
  } finally {
    clearTimeout(timer);
  }
}
