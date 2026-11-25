import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleAgentRuntime } from '../src/agent-bundler.js';
import { DEFAULT_PACKAGING_METADATA, generateWixManifest } from '../src/packaging-config.js';
import { validateMsiHeader, validatePeHeader } from '../src/packaging-validator.js';

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

export async function buildWindowsPackage(options?: { allowSkipOnNonWindows?: boolean }): Promise<{
  success: boolean;
  msiPath: string;
  exePath: string;
  bundlePath: string;
  sha256?: string;
  message: string;
}> {
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // 1. Ensure runtime bundle exists
  const bundlePath = join(distDir, 'snapprint-agent.bundle.cjs');
  if (!existsSync(bundlePath)) {
    await bundleAgentRuntime();
  }

  const exePath = join(distDir, DEFAULT_PACKAGING_METADATA.binaryName);
  const msiPath = join(distDir, DEFAULT_PACKAGING_METADATA.msiFileName);

  // 2. WiX toolchain verification
  const checkWix = spawnSync('wix', ['--version'], { encoding: 'utf-8' });
  const hasWix = !checkWix.error && checkWix.status === 0;

  if (!hasWix) {
    if (options?.allowSkipOnNonWindows && process.platform !== 'win32') {
      return {
        success: false,
        msiPath,
        exePath,
        bundlePath,
        message: 'WiX toolchain not available on non-Windows environment; packaging skipped.',
      };
    }
    throw new Error(
      `WiX Toolset v4 is not installed. To compile the Windows MSI package, install WiX v4 ` +
        `('dotnet tool install --global wix') on a Windows build runner.`
    );
  }

  // 3. Emit WiX manifest
  const wixDir = join(packageRoot, 'installer', 'wix');
  const primaryWxsPath = emitWixPackageManifest(wixDir);

  // 4. Standalone Windows Executable preparation
  if (process.platform === 'win32') {
    if (!existsSync(exePath)) {
      const seaConfigPath = join(packageRoot, 'sea-config.json');
      const seaBlobPath = join(distDir, 'sea-prep.blob');

      // 4a. Generate SEA preparation blob from runtime bundle
      let seaResult = spawnSync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
        cwd: packageRoot,
        encoding: 'utf-8',
      });
      if (seaResult.status !== 0) {
        seaResult = spawnSync(process.execPath, ['--build-sea', seaConfigPath], {
          cwd: packageRoot,
          encoding: 'utf-8',
        });
      }
      if (seaResult.status !== 0 || !existsSync(seaBlobPath)) {
        throw new Error(
          `Failed to generate SEA preparation blob: ${seaResult.stderr || seaResult.stdout || 'unknown error'}`
        );
      }

      // 4b. Copy host node binary
      copyFileSync(process.execPath, exePath);

      // 4c. Remove default binary signature if signtool is present
      spawnSync('signtool', ['remove', '/s', exePath]);

      // 4d. Inject SEA preparation blob into executable via postject
      const postject = spawnSync(
        'npx',
        [
          'postject',
          exePath,
          'NODE_SEA_BLOB',
          seaBlobPath,
          '--sentinel-fuse',
          'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
        ],
        { encoding: 'utf-8', shell: true }
      );
      if (postject.status !== 0) {
        throw new Error(
          `postject failed to inject SEA blob into executable: ${postject.stderr || postject.stdout}`
        );
      }
    }
  }

  if (!existsSync(exePath)) {
    throw new Error(
      `Standalone executable ${exePath} is missing. A genuine Windows executable must be compiled before running WiX.`
    );
  }

  const exeBuffer = readFileSync(exePath);
  if (!validatePeHeader(exeBuffer) || exeBuffer.length < 10000) {
    throw new Error(
      `Generated executable at ${exePath} failed PE structural validation (invalid PE header or size).`
    );
  }

  // 5. Compile MSI with WiX v4
  const buildResult = spawnSync(
    'wix',
    ['build', '-d', `SourceDir=${distDir}`, '-o', msiPath, primaryWxsPath],
    {
      encoding: 'utf-8',
      stdio: 'inherit',
    }
  );

  if (buildResult.status !== 0) {
    throw new Error(`wix build failed with exit code ${buildResult.status}.`);
  }

  if (!existsSync(msiPath)) {
    throw new Error(`wix build completed but ${msiPath} was not found on disk.`);
  }

  const msiBuffer = readFileSync(msiPath);
  if (!validateMsiHeader(msiBuffer) || msiBuffer.length < 50000) {
    throw new Error(
      `Generated MSI at ${msiPath} failed validation (corrupt OLE CFB header or size < 50KB).`
    );
  }

  const sha256 = createHash('sha256').update(msiBuffer).digest('hex');
  const stats = statSync(msiPath);

  return {
    success: true,
    msiPath,
    exePath,
    bundlePath,
    sha256,
    message: `Successfully compiled genuine MSI installer (${stats.size} bytes, SHA-256: ${sha256}).`,
  };
}

if (
  process.argv[1]?.endsWith('build-windows-package.ts') ||
  process.argv[1]?.endsWith('build-windows-package.js')
) {
  buildWindowsPackage()
    .then((result) => {
      console.log(`[SnapPrint] ${result.message}`);
      if (!result.success) process.exit(1);
    })
    .catch((err) => {
      console.error(
        `[SnapPrint Packaging Error] ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    });
}
