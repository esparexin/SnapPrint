import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DEFAULT_PACKAGING_METADATA, generateWixManifest } from '../src/packaging-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

export function emitWixPackageManifest(outputDir: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const manifest = generateWixManifest();
  const filePath = join(outputDir, 'Package.wxs');
  writeFileSync(filePath, manifest, 'utf-8');
  return filePath;
}

export function buildWindowsPackage(): {
  success: boolean;
  wixManifestPath: string;
  message: string;
} {
  const wixDir = join(packageRoot, 'installer', 'wix');
  const distWixDir = join(packageRoot, 'dist', 'installer');

  const primaryPath = emitWixPackageManifest(wixDir);
  emitWixPackageManifest(distWixDir);

  const checkWix = spawnSync('wix', ['--version'], { encoding: 'utf-8' });
  const hasWix = !checkWix.error && checkWix.status === 0;

  if (hasWix) {
    const buildResult = spawnSync(
      'wix',
      [
        'build',
        '-o',
        join(packageRoot, 'dist', DEFAULT_PACKAGING_METADATA.msiFileName),
        primaryPath,
      ],
      { encoding: 'utf-8', stdio: 'inherit' }
    );
    if (buildResult.status === 0) {
      return {
        success: true,
        wixManifestPath: primaryPath,
        message: `Built ${DEFAULT_PACKAGING_METADATA.msiFileName} using WiX Toolset v4.`,
      };
    }
    return {
      success: false,
      wixManifestPath: primaryPath,
      message: 'WiX build failed.',
    };
  }

  return {
    success: true,
    wixManifestPath: primaryPath,
    message: `Generated WiX v4 manifest at ${primaryPath} (ready for Windows CI/CD or host WiX v4 compilation).`,
  };
}

if (
  process.argv[1]?.endsWith('build-windows-package.ts') ||
  process.argv[1]?.endsWith('build-windows-package.js')
) {
  console.log(`[SnapPrint] Emitting Windows MSI WiX Toolset v4 configuration...`);
  const result = buildWindowsPackage();
  console.log(`[SnapPrint] ${result.message}`);
  if (!result.success) {
    process.exit(1);
  }
}
