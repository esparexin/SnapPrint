import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';

export const ARTIFACT_DIRS = [
  'packages/contracts/dist',
  'packages/domain/dist',
  'apps/api/dist',
  'apps/print-agent/dist',
  'apps/web/.next',
] as const;

export function cleanBuildArtifacts(rootDir: string = process.cwd()): string[] {
  const cleaned: string[] = [];

  for (const relDir of ARTIFACT_DIRS) {
    const fullPath = resolve(rootDir, relDir);
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
      cleaned.push(relDir);
    }
  }

  function removeTsBuildInfo(dir: string): void {
    if (!existsSync(dir)) return;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git') continue;
        const full = join(dir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) {
            removeTsBuildInfo(full);
          } else if (entry === 'tsconfig.tsbuildinfo') {
            rmSync(full, { force: true });
            cleaned.push(entry);
          }
        } catch {
          // Ignore individual stat errors
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  removeTsBuildInfo(rootDir);
  return cleaned;
}

if (process.argv[1] && process.argv[1].endsWith('clean.ts')) {
  const cleaned = cleanBuildArtifacts();
  if (cleaned.length > 0) {
    console.log(`[clean] Purged ${cleaned.length} build artifact targets:`);
    cleaned.forEach((p) => console.log(`  - ${p}`));
  } else {
    console.log('[clean] Build directories already clean.');
  }
}
