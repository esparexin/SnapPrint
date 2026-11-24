import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './cli.js';

describe('CLI Commands', () => {
  beforeEach(() => {
    process.env.SNAPPRINT_CONFIG_DIR = tmpdir();
  });
  it('displays status without failing', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['status']);
    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SnapPrint Desktop Print Agent Status')
    );
    consoleLogSpy.mockRestore();
  });

  it('prints usage and returns 1 for invalid command', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitCode = await runCli(['invalid_cmd']);
    expect(exitCode).toBe(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: snapprint-agent'));
    consoleLogSpy.mockRestore();
  });

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
});
