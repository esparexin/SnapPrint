import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { getDefaultConfigPath } from './config.js';
import { DEFAULT_PACKAGING_METADATA, generateWixManifest } from './packaging-config.js';

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

  it('generates valid WiX v4 manifest containing essential install directives', () => {
    const xml = generateWixManifest();
    expect(xml).toContain('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">');
    expect(xml).toContain('Name="SnapPrint Desktop Print Agent"');
    expect(xml).toContain('Manufacturer="SnapPrint Technologies"');
    expect(xml).toContain('Version="0.1.0"');
    expect(xml).toContain('Scope="perMachine"');

    // Program Files target
    expect(xml).toContain('Directory Id="SnapPrintVendorFolder" Name="SnapPrint"');
    expect(xml).toContain('Directory Id="INSTALLFOLDER" Name="PrintAgent"');

    // Shortcuts
    expect(xml).toContain('Id="ApplicationStartMenuShortcut"');
    expect(xml).toContain('Id="ApplicationDesktopShortcut"');

    // Auto-run registry key on user boot
    expect(xml).toContain('Key="Software\\Microsoft\\Windows\\CurrentVersion\\Run"');
    expect(xml).toContain('Name="SnapPrintAgent"');
    expect(xml).toContain('Value="&quot;[INSTALLFOLDER]snapprint-agent.exe&quot; start"');
  });

  it('supports custom source directories and override metadata', () => {
    const xml = generateWixManifest({
      sourceDir: 'C:\\build\\artifacts',
      metadata: {
        version: '1.2.0',
        productName: 'Custom Print Agent',
      },
    });

    expect(xml).toContain('Version="1.2.0"');
    expect(xml).toContain('Name="Custom Print Agent"');
    expect(xml).toContain('Source="C:\\build\\artifacts\\snapprint-agent.exe"');
  });

  it('isolates mutable agent credentials outside the Program Files installation directory', () => {
    const configPath = getDefaultConfigPath();
    expect(configPath.startsWith(homedir())).toBe(true);
    expect(configPath).toContain('.snapprint');
    expect(configPath).not.toContain('ProgramFiles');
  });
});
