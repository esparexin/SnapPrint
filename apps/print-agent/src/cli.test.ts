import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENT_VERSION, extractApiUrlFlag, extractUrlFlags, runCli } from './cli.js';
import { clearAgentConfig, loadAgentConfig } from './config.js';

describe('CLI Commands', () => {
  beforeEach(() => {
    process.env.SNAPPRINT_CONFIG_DIR = tmpdir();
    clearAgentConfig();
  });

  it('displays status without failing', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['status']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Desktop Print Agent Status')
    );
    consoleLogSpy.mockRestore();
  }, 10000);

  it('prints usage and returns 1 for invalid command', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['invalid_cmd']);
    expect(exitCode).toBe(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: snapprint-agent'));
    consoleLogSpy.mockRestore();
  });

  it('extractApiUrlFlag parses --api-url and --server variations', () => {
    expect(extractApiUrlFlag(['status', '--api-url=https://api.one.com'])).toEqual({
      apiUrl: 'https://api.one.com',
      filteredArgv: ['status'],
    });

    expect(
      extractApiUrlFlag(['pair', 'SNAP-1234-5678', '--api-url', 'https://api.two.com'])
    ).toEqual({
      apiUrl: 'https://api.two.com',
      filteredArgv: ['pair', 'SNAP-1234-5678'],
    });

    expect(extractApiUrlFlag(['status', '--server', 'https://api.three.com'])).toEqual({
      apiUrl: 'https://api.three.com',
      filteredArgv: ['status'],
    });

    expect(
      extractUrlFlags([
        'desktop',
        '--web-url=https://app.snapprint.in',
        '--api-url=https://api.one.com',
      ])
    ).toEqual({
      apiUrl: 'https://api.one.com',
      webUrl: 'https://app.snapprint.in',
      filteredArgv: ['desktop'],
    });

    expect(extractUrlFlags(['gui', '--app-url', 'https://custom-web.snapprint.in'])).toEqual({
      apiUrl: undefined,
      webUrl: 'https://custom-web.snapprint.in',
      filteredArgv: ['gui'],
    });
  });

  it('config command displays and updates API URL', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['config', '--api-url', 'https://custom-print.example.com']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('API URL updated to: https://custom-print.example.com')
    );

    const saved = loadAgentConfig();
    expect(saved.apiUrl).toBe('https://custom-print.example.com');
    consoleLogSpy.mockRestore();
  });

  it('config command updates and displays Desktop Web URL', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['config', '--web-url', 'https://custom-app.snapprint.in']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Web URL updated to: https://custom-app.snapprint.in')
    );

    const saved = loadAgentConfig();
    expect(saved.webUrl).toBe('https://custom-app.snapprint.in');
    consoleLogSpy.mockRestore();
  });

  it('pair command alias requires pairing code when empty', async () => {
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // When code is empty string
    const exitCode = await runCli(['pair', '   ']);
    expect(exitCode).toBe(1);
    expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringContaining('Pairing code is required'));
    consoleErrSpy.mockRestore();
  });

  it('pair command enrolls device and launches GUI session automatically', async () => {
    process.env.SNAPPRINT_TEST_MODE = '1';
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/agent/enroll')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              deviceToken: 'tok_cli_pair',
              studioId: 'std_cli',
              deviceId: 'dev_cli',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      if (url.includes('/agent/sync-printers')) {
        return Promise.resolve(
          new Response(JSON.stringify({ count: 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const exitCode = await runCli(['pair', 'SNAP-1111-2222']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Agent GUI running at: http://127.0.0.1:')
    );

    delete process.env.SNAPPRINT_TEST_MODE;
    consoleLogSpy.mockRestore();
    fetchSpy.mockRestore();
  }, 15000);

  it('fails sync when device is not enrolled', async () => {
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitCode = await runCli(['sync']);
    expect(exitCode).toBe(1);
    expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringContaining('Device not enrolled'));
    consoleErrSpy.mockRestore();
  });

  it('unpairs device and returns 0', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['unpair']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Device credentials cleared successfully')
    );
    consoleLogSpy.mockRestore();
  });

  it('prints version and returns 0 for version, --version, and -v', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    for (const flag of ['version', '--version', '-v']) {
      const exitCode = await runCli([flag]);
      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(AGENT_VERSION);
    }

    consoleLogSpy.mockRestore();
  });

  it('launches GUI server and closes cleanly in test mode', async () => {
    process.env.SNAPPRINT_TEST_MODE = '1';
    const exitCode = await runCli(['gui']);
    expect(exitCode).toBe(0);
    delete process.env.SNAPPRINT_TEST_MODE;
  });

  it('launches unified desktop session and closes cleanly in test mode', async () => {
    process.env.SNAPPRINT_TEST_MODE = '1';
    const exitCode = await runCli(['desktop']);
    expect(exitCode).toBe(0);
    delete process.env.SNAPPRINT_TEST_MODE;
  });

  it('defaults to desktop mode when no command is provided in test mode', async () => {
    process.env.SNAPPRINT_TEST_MODE = '1';
    const exitCode = await runCli([]);
    expect(exitCode).toBe(0);
    delete process.env.SNAPPRINT_TEST_MODE;
  });

  it('runs update command checking for updates', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        version: '0.1.1',
        installerName: 'SnapPrint-Print-Agent.msi',
        downloadUrl: 'https://snapprint.example.com/download.msi',
        sha256: 'a'.repeat(64),
        sizeBytes: 100,
        releaseDate: new Date().toISOString(),
      }),
    } as unknown as Response);

    const exitCode = await runCli(['update']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Checking for agent updates')
    );
    consoleLogSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
