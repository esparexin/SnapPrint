import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { bundleAgentRuntime } from './agent-bundler.js';
import { getDefaultConfigPath } from './config.js';
import {
  DEFAULT_PACKAGING_METADATA,
  generateWixManifest,
  getPackageVersion,
} from './packaging-config.js';
import {
  validateMsiHeader,
  validateMsiIntegrity,
  validatePeHeader,
} from './packaging-validator.js';

describe('SnapPrint Print Agent Windows Packaging Config', () => {
  it('provides valid default packaging metadata aligned with contracts', () => {
    expect(DEFAULT_PACKAGING_METADATA.productName).toBe('SnapPrint Desktop Print Agent');
    expect(DEFAULT_PACKAGING_METADATA.manufacturer).toBe('SnapPrint Technologies');
    expect(DEFAULT_PACKAGING_METADATA.binaryName).toBe('snapprint-agent.exe');
    expect(DEFAULT_PACKAGING_METADATA.msiFileName).toBe('SnapPrint-Print-Agent.msi');
    expect(DEFAULT_PACKAGING_METADATA.upgradeCode).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    );
    expect(DEFAULT_PACKAGING_METADATA.componentGuid).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    );
  });

  it('resolves package version dynamically from package.json', () => {
    const version = getPackageVersion();
    expect(version).toBe('0.1.2');
  });

  it('generates valid WiX v4 manifest with upgrade scheduling and component separation', () => {
    const xml = generateWixManifest();
    expect(xml).toContain('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">');
    expect(xml).toContain('Name="SnapPrint Desktop Print Agent"');
    expect(xml).toContain('Manufacturer="SnapPrint Technologies"');
    expect(xml).toContain('Version="0.1.2"');
    expect(xml).toContain('Scope="perMachine"');
    expect(xml).toContain('Schedule="afterInstallValidate"');
    expect(xml).toContain('AllowSameVersionUpgrades="yes"');
    expect(xml).toContain('Property Id="MSIFASTINSTALL" Value="7"');
    expect(xml).toContain('Property Id="MsiLogging" Value="voicewarmup"');
    expect(xml).toContain('Id="StopRunningAgent"');
    expect(xml).toContain('Before="InstallValidate"');
    expect(xml).toContain('Root="HKLM"');
    expect(xml).toContain('Advertise="no"');
    expect(xml).toContain('Directory Id="SnapPrintVendorFolder" Name="SnapPrint"');
    expect(xml).toContain('Directory Id="INSTALLFOLDER" Name="PrintAgent"');
    expect(xml).toContain('Id="AgentStartupRegistryComponent"');
    expect(xml).toContain('Id="ApplicationStartMenuShortcut"');
    expect(xml).toContain('Id="ApplicationDesktopShortcut"');
    expect(xml).toContain('Id="UninstallProductShortcut"');
    expect(xml).toContain('Target="[System64Folder]msiexec.exe"');
    expect(xml).toContain('Arguments="/x [ProductCode]"');
    expect(xml).toContain('Key="Software\\Microsoft\\Windows\\CurrentVersion\\Run"');
  });

  it('supports custom dynamic version overrides in WiX manifest', () => {
    const xml = generateWixManifest({ metadata: { version: '0.2.5' } });
    expect(xml).toContain('Version="0.2.5"');
  });

  it('supports unified desktop shortcuts branding in WiX manifest', () => {
    const xml = generateWixManifest();
    expect(xml).toContain('Name="SnapPrint Desktop"');
  });

  it('isolates mutable agent credentials outside the Program Files installation directory', () => {
    const configPath = getDefaultConfigPath();
    expect(configPath.startsWith(homedir())).toBe(true);
    expect(configPath).toContain('.snapprint');
    expect(configPath).not.toContain('ProgramFiles');
  });

  it('validates genuine PE and MSI binary headers and rejects corrupt stubs', () => {
    // Valid minimal PE header structure (MZ + PE\0\0 at 0x3c)
    const validPe = Buffer.alloc(128, 0);
    validPe[0] = 0x4d;
    validPe[1] = 0x5a;
    validPe.writeInt32LE(0x40, 0x3c);
    validPe[0x40] = 0x50;
    validPe[0x41] = 0x45;
    expect(validatePeHeader(validPe)).toBe(true);

    // Corrupt stub
    expect(validatePeHeader(Buffer.from('corrupt placeholder text'))).toBe(false);

    // Valid MSI CFB header
    const validMsi = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(validateMsiHeader(validMsi)).toBe(true);
    expect(validateMsiHeader(Buffer.from([0x00, 0x01, 0x02]))).toBe(false);

    // Integrity check
    const integrityValid = validateMsiIntegrity(Buffer.concat([validMsi, Buffer.alloc(2048)]));
    expect(integrityValid.valid).toBe(true);

    const integrityStub = validateMsiIntegrity(Buffer.from('tiny stub'));
    expect(integrityStub.valid).toBe(false);
    expect(integrityStub.error).toContain('size must be at least 1KB');
  });

  it('bundles standalone runtime into self-contained bundle with verified size', async () => {
    const result = await bundleAgentRuntime();
    expect(result.success).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(10000);
    expect(result.outputPath).toContain('snapprint-agent.bundle.cjs');
  });

  it('validates sea-config.json and customizable WiX SourceDir', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __filename = fileURLToPath(import.meta.url);
    const seaConfigPath = join(dirname(__filename), '..', 'sea-config.json');
    const raw = readFileSync(seaConfigPath, 'utf-8');
    const seaConfig = JSON.parse(raw);
    expect(seaConfig.main).toContain('snapprint-agent.bundle.cjs');
    expect(seaConfig.output).toContain('sea-prep.blob');
    expect(seaConfig.disableExperimentalSEAWarning).toBe(true);

    const customXml = generateWixManifest({ sourceDir: 'D:\\CustomDist' });
    expect(customXml).toContain('Source="D:\\CustomDist\\snapprint-agent.exe"');
  });
});
