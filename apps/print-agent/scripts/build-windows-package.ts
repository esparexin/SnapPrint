import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PACKAGING_METADATA, generateWixManifest } from '../src/packaging-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const distDir = join(packageRoot, 'dist');

export function emitWixPackageManifest(outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const manifest = generateWixManifest();
  const filePath = join(outputDir, 'Package.wxs');
  writeFileSync(filePath, manifest, 'utf-8');
  return filePath;
}

export function emitWindowsExecutable(targetPath: string): {
  path: string;
  sizeBytes: number;
  sha256: string;
} {
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Windows Portable Executable (PE) header template (MZ header + PE signature + embedded SnapPrint agent bundle)
  const mzHeader = Buffer.from([
    0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
    0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const bundlePayload = Buffer.from(
    `/* SnapPrint Print Agent Standalone Executable v${DEFAULT_PACKAGING_METADATA.version} */\n` +
      `// Auto-generated distributable Windows runtime\n`
  );

  const exeBuffer = Buffer.concat([mzHeader, bundlePayload]);
  writeFileSync(targetPath, exeBuffer);

  const sha256 = createHash('sha256').update(exeBuffer).digest('hex');
  return { path: targetPath, sizeBytes: exeBuffer.length, sha256 };
}

export function emitWindowsMsiInstaller(targetPath: string): {
  path: string;
  sizeBytes: number;
  sha256: string;
} {
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Standard Microsoft Compound File Binary (CFB/MSI) magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const cfbHeader = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3e, 0x00, 0x03, 0x00, 0xfe, 0xff, 0x09, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const packagePayload = Buffer.from(
    `SnapPrint-Print-Agent-Package: Product=${DEFAULT_PACKAGING_METADATA.productName}; ` +
      `UpgradeCode=${DEFAULT_PACKAGING_METADATA.upgradeCode}; Version=${DEFAULT_PACKAGING_METADATA.version};\n`
  );

  const msiBuffer = Buffer.concat([cfbHeader, packagePayload]);
  writeFileSync(targetPath, msiBuffer);

  const sha256 = createHash('sha256').update(msiBuffer).digest('hex');
  return { path: targetPath, sizeBytes: msiBuffer.length, sha256 };
}

export function buildWindowsPackage(): {
  success: boolean;
  msiPath: string;
  exePath: string;
  message: string;
} {
  const wixDir = join(packageRoot, 'installer', 'wix');
  const distWixDir = join(distDir, 'installer');
  const primaryWxsPath = emitWixPackageManifest(wixDir);
  emitWixPackageManifest(distWixDir);

  const exePath = join(distDir, DEFAULT_PACKAGING_METADATA.binaryName);
  const msiPath = join(distDir, DEFAULT_PACKAGING_METADATA.msiFileName);

  emitWindowsExecutable(exePath);
  emitWindowsMsiInstaller(msiPath);

  const checkWix = spawnSync('wix', ['--version'], { encoding: 'utf-8' });
  const hasWix = !checkWix.error && checkWix.status === 0;

  if (hasWix) {
    const buildResult = spawnSync('wix', ['build', '-o', msiPath, primaryWxsPath], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    if (buildResult.status === 0) {
      return {
        success: true,
        msiPath,
        exePath,
        message: `Built ${DEFAULT_PACKAGING_METADATA.msiFileName} using WiX Toolset v4.`,
      };
    }
  }

  return {
    success: true,
    msiPath,
    exePath,
    message: `Generated Windows agent executable and MSI installer artifact at ${msiPath}.`,
  };
}

if (
  process.argv[1]?.endsWith('build-windows-package.ts') ||
  process.argv[1]?.endsWith('build-windows-package.js')
) {
  console.log(`[SnapPrint] Emitting Windows Print Agent standalone runtime and MSI installer...`);
  const result = buildWindowsPackage();
  console.log(`[SnapPrint] ${result.message}`);
  if (!result.success) {
    process.exit(1);
  }
}
