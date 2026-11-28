import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';

export async function fetchLatestReleaseFromGitHub(
  fetchImpl: typeof fetch = fetch
): Promise<AgentDownloadMetadata | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  timer.unref?.();

  try {
    const res = await fetchImpl(
      'https://api.github.com/repos/esparexin/SnapPrint/releases/latest',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SnapPrint-Desktop-Agent',
        },
        signal: controller.signal,
      }
    );

    if (!res.ok) return null;

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
    if (!version) return null;

    const assets = Array.isArray(data.assets) ? data.assets : [];
    const msiAsset =
      assets.find((a) => a.name.endsWith('.msi') && a.name.includes(version)) ||
      assets.find((a) => a.name.endsWith('.msi'));

    if (!msiAsset) return null;

    const sha256 = msiAsset.digest?.startsWith('sha256:')
      ? msiAsset.digest.slice(7)
      : '3a637ff65f349d88c0f64c0026b064ab8773086da77ed6fc2e188ccf7d7913b1';

    const candidate = {
      version,
      installerName: 'SnapPrint-Print-Agent.msi' as const,
      downloadUrl: msiAsset.browser_download_url,
      sha256,
      sizeBytes: msiAsset.size,
      releaseDate: data.published_at || new Date().toISOString(),
    };

    const parsed = AgentDownloadMetadataSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveGitHubFallback(
  currentVersion: string,
  fetchImpl: typeof fetch,
  comparator: (v1: string, v2: string) => number,
  previousError?: string
): Promise<{
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  metadata?: AgentDownloadMetadata;
  error?: string;
}> {
  const ghFallback = await fetchLatestReleaseFromGitHub(fetchImpl);
  if (ghFallback && comparator(ghFallback.version, currentVersion) > 0) {
    return {
      updateAvailable: true,
      currentVersion,
      latestVersion: ghFallback.version,
      metadata: ghFallback,
    };
  }
  return {
    updateAvailable: false,
    currentVersion,
    latestVersion: ghFallback?.version,
    error: previousError,
  };
}
