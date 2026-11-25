import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify, { FastifyInstance } from 'fastify';
import { AgentDownloadMetadataSchema } from '@snapprint/contracts';
import { describe, expect, it } from 'vitest';
import { agentDownloadRoutes } from './agent-download-routes.js';
import { createTestApp } from './auth-test-helper.js';

function createValidDummyMsiPayload(): Buffer {
  const cfbHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const dummyMsiDatabase = Buffer.alloc(2048, 0x41);
  return Buffer.concat([cfbHeader, dummyMsiDatabase]);
}

describe('Windows Print Agent Download Routes', () => {
  it('GET /downloads/windows-agent/metadata returns 404 when installer artifact is not on disk', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/metadata',
    });

    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res.body);
    expect(data.code).toBe('METADATA_NOT_FOUND');
    expect(data.message).toContain('installer metadata not available');
  });

  it('GET /downloads/windows-agent/latest.msi returns 404 when installer artifact is not on disk', async () => {
    const { app } = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/downloads/windows-agent/latest.msi',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('INSTALLER_NOT_FOUND');
    expect(body.message).toContain('installer artifact not found');
  });

  it('GET /downloads/windows-agent/metadata returns valid metadata conforming to schema when present', async () => {
    const tempMsiPath = join(tmpdir(), 'valid-snapprint-agent.msi');
    writeFileSync(tempMsiPath, createValidDummyMsiPayload());

    try {
      const app: FastifyInstance = Fastify();
      await app.register(agentDownloadRoutes, { installerPath: tempMsiPath });

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
      expect(data.sizeBytes).toBeGreaterThanOrEqual(1024);
    } finally {
      if (existsSync(tempMsiPath)) unlinkSync(tempMsiPath);
    }
  });

  it('GET /downloads/windows-agent/latest.msi streams installer artifact when valid', async () => {
    const tempMsiPath = join(tmpdir(), 'valid-stream-agent.msi');
    const payload = createValidDummyMsiPayload();
    writeFileSync(tempMsiPath, payload);

    try {
      const app: FastifyInstance = Fastify();
      await app.register(agentDownloadRoutes, { installerPath: tempMsiPath });

      const res = await app.inject({
        method: 'GET',
        url: '/downloads/windows-agent/latest.msi',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-msi');
      expect(res.headers['content-disposition']).toContain('SnapPrint-Print-Agent.msi');
      expect(res.rawPayload.length).toBe(payload.length);
    } finally {
      if (existsSync(tempMsiPath)) unlinkSync(tempMsiPath);
    }
  });

  it('rejects corrupt placeholder files with size < 1024 or invalid CFB header', async () => {
    const tempMsiPath = join(tmpdir(), 'corrupt-agent.msi');
    writeFileSync(tempMsiPath, Buffer.from('corrupt placeholder text'));

    try {
      const app: FastifyInstance = Fastify();
      await app.register(agentDownloadRoutes, { installerPath: tempMsiPath });

      const res = await app.inject({
        method: 'GET',
        url: '/downloads/windows-agent/latest.msi',
      });

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('INSTALLER_NOT_FOUND');
    } finally {
      if (existsSync(tempMsiPath)) unlinkSync(tempMsiPath);
    }
  });
});
