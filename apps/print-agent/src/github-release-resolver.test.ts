import { describe, expect, it, vi } from 'vitest';
import { fetchLatestReleaseFromGitHub, resolveGitHubFallback } from './github-release-resolver.js';

describe('GitHub Release Resolver', () => {
  const mockReleasePayload = {
    tag_name: 'v0.1.5',
    published_at: '2026-11-28T09:11:42Z',
    assets: [
      {
        name: 'SnapPrint-Print-Agent-v0.1.5.msi',
        size: 29208576,
        browser_download_url:
          'https://github.com/esparexin/SnapPrint/releases/download/v0.1.5/SnapPrint-Print-Agent-v0.1.5.msi',
        digest: 'sha256:2082a7b4c164b8860207e31994908c81193cdb2d48c56efa9064d5c5d8b403d4',
      },
    ],
  };

  it('parses GitHub release metadata successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReleasePayload,
    });

    const meta = await fetchLatestReleaseFromGitHub(mockFetch as unknown as typeof fetch);
    expect(meta).not.toBeNull();
    expect(meta?.version).toBe('0.1.5');
    expect(meta?.sizeBytes).toBe(29208576);
    expect(meta?.sha256).toBe('2082a7b4c164b8860207e31994908c81193cdb2d48c56efa9064d5c5d8b403d4');
  });

  it('returns null when GitHub fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const meta = await fetchLatestReleaseFromGitHub(mockFetch as unknown as typeof fetch);
    expect(meta).toBeNull();
  });

  it('resolves updateAvailable=true in fallback when GitHub has newer version', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReleasePayload,
    });

    const comparator = (v1: string, v2: string) => (v1 > v2 ? 1 : v1 < v2 ? -1 : 0);
    const result = await resolveGitHubFallback(
      '0.1.4',
      mockFetch as unknown as typeof fetch,
      comparator
    );

    expect(result.updateAvailable).toBe(true);
    expect(result.latestVersion).toBe('0.1.5');
    expect(result.metadata?.version).toBe('0.1.5');
  });

  it('resolves updateAvailable=false in fallback when current is already up to date', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReleasePayload,
    });

    const comparator = (v1: string, v2: string) => (v1 > v2 ? 1 : v1 < v2 ? -1 : 0);
    const result = await resolveGitHubFallback(
      '0.1.5',
      mockFetch as unknown as typeof fetch,
      comparator
    );

    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBe('0.1.5');
  });
});
