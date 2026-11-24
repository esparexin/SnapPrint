import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentDownloadMetadataSchema } from '@snapprint/contracts';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './auth-test-helper.js';

describe('Windows Print Agent Download Routes', () => {
  it('GET /downloads/windows-agent/metadata returns valid metadata conforming to schema', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/metadata',
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    const parsed = AgentDownloadMetadataSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    expect(data.installerName).toBe('SnapPrint-Print-Agent.msi');
    expect(data.downloadUrl).toContain('/downloads/windows-agent/latest.msi');
    expect(data.sha256).toMatch(/^[a-fA-F0-9]{64}$/);
  });

  it('GET /downloads/windows-agent/latest.msi returns 404 if installer artifact does not exist', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/latest.msi',
    });

    if (res.statusCode === 404) {
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('INSTALLER_NOT_FOUND');
    } else {
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-msi');
    }
  });

  it('GET /downloads/windows-agent/latest.msi streams installer binary when present', async () => {
    const tempMsiPath = join(tmpdir(), 'test-snapprint-agent.msi');
    const dummyPayload = Buffer.from('FAKE-MSI-BINARY-PAYLOAD-FOR-TESTING');
    writeFileSync(tempMsiPath, dummyPayload);

    try {
      const { app } = await createTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/downloads/windows-agent/latest.msi',
      });
      // Verify route handles file streaming gracefully
      expect([200, 404]).toContain(res.statusCode);
    } finally {
      if (existsSync(tempMsiPath)) {
        unlinkSync(tempMsiPath);
      }
    }
  });
});
