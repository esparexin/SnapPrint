import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ARTIFACT_DIRS, cleanBuildArtifacts } from './clean';

describe('Build Hygiene & Stale Artifact Purge (PR-3)', () => {
  it('defines artifact targets for all compiled workspaces and frontend builds', () => {
    expect(ARTIFACT_DIRS).toContain('packages/contracts/dist');
    expect(ARTIFACT_DIRS).toContain('packages/domain/dist');
    expect(ARTIFACT_DIRS).toContain('apps/api/dist');
    expect(ARTIFACT_DIRS).toContain('apps/print-agent/dist');
    expect(ARTIFACT_DIRS).toContain('apps/web/.next');
  });

  it('purges mock dist directories and tsbuildinfo files cleanly and idempotently', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'snapprint-clean-test-'));

    try {
      const mockContractsDist = join(tempDir, 'packages/contracts/dist');
      const mockApiDist = join(tempDir, 'apps/api/dist');
      const mockWebNext = join(tempDir, 'apps/web/.next');
      const mockTsBuildInfo = join(tempDir, 'tsconfig.tsbuildinfo');

      mkdirSync(mockContractsDist, { recursive: true });
      mkdirSync(mockApiDist, { recursive: true });
      mkdirSync(mockWebNext, { recursive: true });

      writeFileSync(join(mockContractsDist, 'stale.d.ts'), '// stale type');
      writeFileSync(join(mockApiDist, 'deleted-route.js'), '// deleted route');
      writeFileSync(join(mockWebNext, 'BUILD_ID'), '12345');
      writeFileSync(mockTsBuildInfo, '{}');

      expect(existsSync(mockContractsDist)).toBe(true);
      expect(existsSync(mockApiDist)).toBe(true);
      expect(existsSync(mockWebNext)).toBe(true);
      expect(existsSync(mockTsBuildInfo)).toBe(true);

      const cleaned = cleanBuildArtifacts(tempDir);

      expect(cleaned.length).toBeGreaterThanOrEqual(4);
      expect(existsSync(mockContractsDist)).toBe(false);
      expect(existsSync(mockApiDist)).toBe(false);
      expect(existsSync(mockWebNext)).toBe(false);
      expect(existsSync(mockTsBuildInfo)).toBe(false);

      const secondRun = cleanBuildArtifacts(tempDir);
      expect(secondRun).toHaveLength(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
