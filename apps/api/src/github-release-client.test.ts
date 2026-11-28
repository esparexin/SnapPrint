import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchLatestGitHubAgentRelease,
  resetGitHubReleaseCacheForTesting,
} from './github-release-client.js';

describe('GitHub Release Client', () => {
  beforeEach(() => {
    resetGitHubReleaseCacheForTesting();
  });

  it('fetches and parses release metadata from GitHub', async () => {
    const mockData = {
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

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const meta = await fetchLatestGitHubAgentRelease(mockFetch as unknown as typeof fetch);
    expect(meta).not.toBeNull();
    expect(meta?.version).toBe('0.1.5');
    expect(meta?.sizeBytes).toBe(29208576);
    expect(meta?.sha256).toBe('2082a7b4c164b8860207e31994908c81193cdb2d48c56efa9064d5c5d8b403d4');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify cache hit
    const cached = await fetchLatestGitHubAgentRelease(mockFetch as unknown as typeof fetch);
    expect(cached?.version).toBe('0.1.5');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns null when GitHub API fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const meta = await fetchLatestGitHubAgentRelease(mockFetch as unknown as typeof fetch);
    expect(meta).toBeNull();
  });
});
