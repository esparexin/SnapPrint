import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const req = createRequire(import.meta.url);
const esbuild = req('esbuild') as typeof import('esbuild');
const defaultPackageRoot = join(__dirname, '..');
const defaultEntryPoint = join(defaultPackageRoot, 'src', 'cli.ts');
const defaultOutputFile = join(defaultPackageRoot, 'dist', 'snapprint-agent.bundle.cjs');

export interface BundleResult {
  success: boolean;
  outputPath: string;
  sizeBytes: number;
}

export interface BundleAgentOptions {
  entryPoint?: string;
  outputFile?: string;
}

export async function bundleAgentRuntime(options: BundleAgentOptions = {}): Promise<BundleResult> {
  const entryPoint = options.entryPoint || defaultEntryPoint;
  const outputFile = options.outputFile || defaultOutputFile;

  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: outputFile,
    sourcemap: 'inline',
    banner: {
      js: '/* SnapPrint Desktop Print Agent — Bundled Standalone Runtime */\n',
    },
  });

  if (result.errors && result.errors.length > 0) {
    throw new Error(`Bundling failed with errors: ${JSON.stringify(result.errors)}`);
  }

  if (!existsSync(outputFile)) {
    throw new Error(`Bundling did not emit expected output file: ${outputFile}`);
  }

  const stats = statSync(outputFile);
  if (stats.size < 5000) {
    throw new Error(`Bundled runtime is suspiciously small (${stats.size} bytes).`);
  }

  return { success: true, outputPath: outputFile, sizeBytes: stats.size };
}
