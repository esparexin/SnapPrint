import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  applyAgentUpdate,
  applyUpdate,
  checkForUpdate,
  compareVersions,
  downloadUpdate,
  handleUpdateCommand,
} from './agent-updater.js';

describe('Agent Updater', () => {
  describe('compareVersions', () => {
    it('correctly compares semantic version numbers', () => {
      expect(compareVersions('0.2.0', '0.1.0')).toBe(1);
      expect(compareVersions('0.1.0', '0.2.0')).toBe(-1);
      expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
      expect(compareVersions('v1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
      expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    });
  });

  describe('checkForUpdate', () => {
    it('returns updateAvailable=true when server has a newer version', async () => {
      const mockMeta = {
        version: '0.2.0',
        installerName: 'SnapPrint-Print-Agent.msi',
        downloadUrl: 'https://snapprint.example.com/downloads/latest.msi',
        sha256: 'a'.repeat(64),
        sizeBytes: 1048576,
        releaseDate: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMeta,
      });

      const result = await checkForUpdate(
        'https://snapprint.example.com',
        '0.1.0',
        mockFetch as unknown as typeof fetch
      );
      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe('0.2.0');
      expect(result.metadata?.downloadUrl).toBe(mockMeta.downloadUrl);
    });

    it('returns updateAvailable=false when current version is equal or newer', async () => {
      const mockMeta = {
        version: '0.1.0',
        installerName: 'SnapPrint-Print-Agent.msi',
        downloadUrl: 'https://snapprint.example.com/downloads/latest.msi',
        sha256: 'b'.repeat(64),
        sizeBytes: 1048576,
        releaseDate: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMeta,
      });

      const result = await checkForUpdate(
        'https://snapprint.example.com',
        '0.1.0',
        mockFetch as unknown as typeof fetch
      );
      expect(result.updateAvailable).toBe(false);
      expect(result.latestVersion).toBe('0.1.0');
    });

    it('returns error when endpoint fails or returns non-200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await checkForUpdate(
        'https://snapprint.example.com',
        '0.1.0',
        mockFetch as unknown as typeof fetch
      );
      expect(result.updateAvailable).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });
  });

  describe('downloadUpdate', () => {
    it('downloads installer and validates sha256 checksum', async () => {
      const payload = Buffer.from('mock installer binary payload for unit test');
      const sha256 = createHash('sha256').update(payload).digest('hex');
      const testDir = join(tmpdir(), `test-update-${Date.now()}`);

      const mockMeta = {
        version: '0.2.0',
        installerName: 'SnapPrint-Print-Agent.msi' as const,
        downloadUrl: 'https://snapprint.example.com/download.msi',
        sha256,
        sizeBytes: payload.length,
        releaseDate: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
      });

      const filePath = await downloadUpdate(
        mockMeta,
        testDir,
        mockFetch as unknown as typeof fetch
      );
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath)).toEqual(payload);
      unlinkSync(filePath);
    });

    it('throws error when sha256 hash does not match', async () => {
      const payload = Buffer.from('corrupted payload');
      const testDir = join(tmpdir(), `test-update-corrupt-${Date.now()}`);

      const mockMeta = {
        version: '0.2.0',
        installerName: 'SnapPrint-Print-Agent.msi' as const,
        downloadUrl: 'https://snapprint.example.com/download.msi',
        sha256: '0'.repeat(64),
        sizeBytes: payload.length,
        releaseDate: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
      });

      await expect(
        downloadUpdate(mockMeta, testDir, mockFetch as unknown as typeof fetch)
      ).rejects.toThrow(/Checksum mismatch/);
    });
  });

  describe('applyUpdate', () => {
    it('spawns msiexec on win32 platform', () => {
      const mockSpawn = vi.fn().mockReturnValue({
        pid: 12345,
        unref: vi.fn(),
      });

      const res = applyUpdate(
        'C:\\temp\\installer.msi',
        'win32',
        mockSpawn as unknown as typeof spawn
      );
      expect(res.success).toBe(true);
      expect(res.pid).toBe(12345);
      expect(mockSpawn).toHaveBeenCalledWith(
        'msiexec.exe',
        ['/i', 'C:\\temp\\installer.msi', '/passive', '/norestart'],
        expect.objectContaining({ detached: true })
      );
    });
  });

  describe('applyAgentUpdate & handleUpdateCommand', () => {
    it('completes update workflow when new version is available', async () => {
      const payload = Buffer.from('installer bytes');
      const sha256 = createHash('sha256').update(payload).digest('hex');
      const testDir = join(tmpdir(), `test-apply-${Date.now()}`);

      const mockMeta = {
        version: '0.2.0',
        installerName: 'SnapPrint-Print-Agent.msi' as const,
        downloadUrl: 'https://snapprint.example.com/download.msi',
        sha256,
        sizeBytes: payload.length,
        releaseDate: new Date().toISOString(),
      };

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('metadata')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => mockMeta });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: async () =>
            payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
        });
      });

      const mockSpawn = vi.fn().mockReturnValue({ pid: 9999, unref: vi.fn() });

      const res = await applyAgentUpdate('https://snapprint.example.com', '0.1.0', {
        downloadDir: testDir,
        fetchImpl: mockFetch as unknown as typeof fetch,
        platform: 'win32',
        spawnImpl: mockSpawn as unknown as typeof spawn,
      });

      expect(res.success).toBe(true);
      expect(res.version).toBe('0.2.0');
      expect(res.installerPath).toBeDefined();

      if (res.installerPath && existsSync(res.installerPath)) {
        unlinkSync(res.installerPath);
      }
    });

    it('handleUpdateCommand returns 0 when already up to date', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          version: '0.1.0',
          installerName: 'SnapPrint-Print-Agent.msi',
          downloadUrl: 'https://snapprint.example.com/download.msi',
          sha256: 'c'.repeat(64),
          sizeBytes: 100,
          releaseDate: new Date().toISOString(),
        }),
      });

      const code = await handleUpdateCommand('https://snapprint.example.com', '0.1.0', {
        fetchImpl: mockFetch as unknown as typeof fetch,
      });
      expect(code).toBe(0);
    });
  });
});
