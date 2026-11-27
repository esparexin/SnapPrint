import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SnapPrint Desktop Print Agent — Windows MSI & Packaging Configuration.
 * Single source of truth for WiX v4 installer definitions and artifact metadata.
 */

export interface PackagingMetadata {
  productName: string;
  manufacturer: string;
  version: string;
  upgradeCode: string;
  componentGuid: string;
  binaryName: string;
  msiFileName: string;
  installSubdirectory: string;
  startupRegistryName: string;
  shortcutName?: string;
}

export interface WixManifestOptions {
  sourceDir?: string;
  metadata?: Partial<PackagingMetadata>;
}

export const DEFAULT_PACKAGING_METADATA: PackagingMetadata = {
  productName: 'SnapPrint Desktop Print Agent',
  manufacturer: 'SnapPrint Technologies',
  version: '0.1.4',
  upgradeCode: 'E3A7B95C-8F42-4F1A-B871-3C5E9025DF7A',
  componentGuid: 'A4D2E5C8-1B3A-4F7E-9C2D-5E8A1B3C5E7A',
  binaryName: 'snapprint-agent.exe',
  msiFileName: 'SnapPrint-Print-Agent.msi',
  installSubdirectory: 'PrintAgent',
  startupRegistryName: 'SnapPrintAgent',
  shortcutName: 'SnapPrint Desktop',
};

export function getPackageVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed.version === 'string' && parsed.version.trim()) {
        return parsed.version.trim();
      }
    }
  } catch {
    // Fallback if filesystem read is unavailable
  }
  return DEFAULT_PACKAGING_METADATA.version;
}

export function generateWixManifest(options: WixManifestOptions = {}): string {
  const dynamicVersion = options.metadata?.version || getPackageVersion();
  const meta: PackagingMetadata = {
    ...DEFAULT_PACKAGING_METADATA,
    version: dynamicVersion,
    ...(options.metadata || {}),
  };
  const sourceDir = options.sourceDir || '$(var.SourceDir)';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Package
    Name="${meta.productName}"
    Manufacturer="${meta.manufacturer}"
    Version="${meta.version}"
    UpgradeCode="${meta.upgradeCode}"
    Scope="perMachine"
    Language="1033">

    <MajorUpgrade
      Schedule="afterInstallValidate"
      AllowSameVersionUpgrades="yes"
      DowngradeErrorMessage="A newer version of ${meta.productName} is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <Property Id="MSIFASTINSTALL" Value="7" />
    <Property Id="MsiLogging" Value="voicewarmup" />
    <Property Id="ARPNOMODIFY" Value="1" />

    <CustomAction
      Id="StopRunningAgent"
      Directory="System64Folder"
      ExeCommand="taskkill.exe /F /IM ${meta.binaryName} /T"
      Execute="immediate"
      Return="ignore" />

    <InstallExecuteSequence>
      <Custom Action="StopRunningAgent" Before="InstallValidate" />
    </InstallExecuteSequence>

    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="SnapPrintVendorFolder" Name="SnapPrint">
        <Directory Id="INSTALLFOLDER" Name="${meta.installSubdirectory}" />
      </Directory>
    </StandardDirectory>

    <StandardDirectory Id="ProgramMenuFolder">
      <Directory Id="ApplicationProgramsFolder" Name="SnapPrint" />
    </StandardDirectory>

    <StandardDirectory Id="DesktopFolder" />

    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <Component Id="AgentBinaryComponent" Guid="${meta.componentGuid}">
        <File
          Id="AgentExe"
          Source="${sourceDir}\\${meta.binaryName}"
          KeyPath="yes">
          <Shortcut
            Id="ApplicationStartMenuShortcut"
            Directory="ApplicationProgramsFolder"
            Name="${meta.shortcutName || meta.productName}"
            WorkingDirectory="INSTALLFOLDER"
            Advertise="no" />
          <Shortcut
            Id="ApplicationDesktopShortcut"
            Directory="DesktopFolder"
            Name="${meta.shortcutName || meta.productName}"
            WorkingDirectory="INSTALLFOLDER"
            Advertise="no" />
        </File>
      </Component>
      <Component Id="AgentStartupRegistryComponent" Guid="C6F4A8E1-3D5B-4C9A-8E2F-7A1B3C5D7E9F" Directory="INSTALLFOLDER">
        <RegistryValue
          Root="HKLM"
          Key="Software\\Microsoft\\Windows\\CurrentVersion\\Run"
          Name="${meta.startupRegistryName}"
          Value="&quot;[INSTALLFOLDER]${meta.binaryName}&quot; start"
          Type="string"
          KeyPath="yes" />
      </Component>
      <Component Id="ApplicationShortcutsComponent" Guid="B5E3F6D9-2C4B-5E8F-0D3E-6F9B2C4D6E8B" Directory="ApplicationProgramsFolder">
        <Shortcut
          Id="UninstallProductShortcut"
          Name="Uninstall ${meta.productName}"
          Description="Uninstalls ${meta.productName}"
          Target="[System64Folder]msiexec.exe"
          Arguments="/x [ProductCode]" />
        <RemoveFolder Id="CleanUpApplicationProgramsFolder" Directory="ApplicationProgramsFolder" On="uninstall" />
        <RegistryValue
          Root="HKLM"
          Key="Software\\SnapPrint\\${meta.startupRegistryName}"
          Name="installed"
          Type="integer"
          Value="1"
          KeyPath="yes" />
      </Component>
    </ComponentGroup>

    <Feature Id="MainFeature" Title="${meta.productName}" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>
  </Package>
</Wix>
`.trim();
}
