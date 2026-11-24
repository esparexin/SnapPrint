import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { AgentDownloadMetadataSchema } from '@snapprint/contracts';
import { describe, expect, it } from 'vitest';
import { agentDownloadRoutes } from './agent-download-routes.js';
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
    expect(data.sizeBytes).toBeGreaterThan(0);
  });

  it('GET /downloads/windows-agent/latest.msi returns 200 and streams installer artifact', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/latest.msi',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/x-msi');
    expect(res.headers['content-disposition']).toContain('SnapPrint-Print-Agent.msi');
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });

  it('GET /downloads/windows-agent/latest.msi returns 404 when configured with non-existent explicit installerPath', async () => {
    const app: FastifyInstance = Fastify();
    await app.register(agentDownloadRoutes, {
      installerPath: join(tmpdir(), 'missing-installer-artifact.msi'),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/latest.msi',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('INSTALLER_NOT_FOUND');
    expect(body.message).toContain('Windows Print Agent installer artifact not found');
  });

  it('GET /downloads/windows-agent/latest.msi streams explicit installer binary when present', async () => {
    const tempMsiPath = join(tmpdir(), 'custom-snapprint-agent.msi');
    const dummyPayload = Buffer.from('FAKE-MSI-BINARY-PAYLOAD-FOR-TESTING');
    writeFileSync(tempMsiPath, dummyPayload);

    try {
      const app: FastifyInstance = Fastify();
      await app.register(agentDownloadRoutes, {
        installerPath: tempMsiPath,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/downloads/windows-agent/latest.msi',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-msi');
      expect(res.body).toBe('FAKE-MSI-BINARY-PAYLOAD-FOR-TESTING');
    } finally {
      if (existsSync(tempMsiPath)) {
        unlinkSync(tempMsiPath);
      }
    }
  });
});
