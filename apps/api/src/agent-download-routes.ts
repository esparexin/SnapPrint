import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';

export interface AgentDownloadRoutesOptions {
  installerPath?: string;
  allowRemoteRelease?: boolean;
}

export const DEFAULT_AGENT_VERSION = '0.1.2';
export const DEFAULT_INSTALLER_NAME = 'SnapPrint-Print-Agent.msi' as const;

export const DEFAULT_VERIFIED_RELEASE = {
  version: DEFAULT_AGENT_VERSION,
  installerName: DEFAULT_INSTALLER_NAME,
  sha256: '090032f9f495cf198715667d0704e258713b5faa81e2b9cbebbc961d92ea58dc',
  sizeBytes: 29216768,
  releaseUrl:
    'https://github.com/esparexin/SnapPrint/releases/download/v0.1.2/SnapPrint-Print-Agent.msi',
  releaseDate: '2026-11-27T06:30:00.000Z',
} as const;

export async function agentDownloadRoutes(
  app: FastifyInstance,
  opts?: AgentDownloadRoutesOptions
): Promise<void> {
  const allowRemote =
    opts?.allowRemoteRelease ??
    (process.env.ENABLE_REMOTE_AGENT_RELEASE === 'true' || process.env.NODE_ENV === 'production');

  const resolveInstallerPath = (): string => {
    if (opts?.installerPath) {
      return opts.installerPath;
    }
    if (process.env.AGENT_INSTALLER_PATH) {
      return process.env.AGENT_INSTALLER_PATH;
    }

    const candidatePaths = [
      join(process.cwd(), 'apps', 'print-agent', 'dist', DEFAULT_INSTALLER_NAME),
      join(process.cwd(), '..', 'print-agent', 'dist', DEFAULT_INSTALLER_NAME),
      join(import.meta.dirname, '..', '..', 'print-agent', 'dist', DEFAULT_INSTALLER_NAME),
      join(import.meta.dirname, '..', '..', '..', 'print-agent', 'dist', DEFAULT_INSTALLER_NAME),
    ];

    for (const candidate of candidatePaths) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return candidatePaths[0];
  };

  const getLocalInstallerData = (): {
    buffer: Buffer;
    sizeBytes: number;
    sha256: string;
    releaseDate: string;
  } | null => {
    const installerPath = resolveInstallerPath();
    if (!existsSync(installerPath)) {
      return null;
    }

    const stats = statSync(installerPath);
    if (stats.size < 1024) {
      return null;
    }

    const buffer = readFileSync(installerPath);
    if (
      buffer.length < 8 ||
      buffer[0] !== 0xd0 ||
      buffer[1] !== 0xcf ||
      buffer[2] !== 0x11 ||
      buffer[3] !== 0xe0 ||
      buffer[4] !== 0xa1 ||
      buffer[5] !== 0xb1 ||
      buffer[6] !== 0x1a ||
      buffer[7] !== 0xe1
    ) {
      return null;
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex');
    return { buffer, sizeBytes: stats.size, sha256, releaseDate: stats.mtime.toISOString() };
  };

  // GET /downloads/windows-agent/metadata
  app.get(
    '/downloads/windows-agent/metadata',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const localData = getLocalInstallerData();
      const host = request.headers.host || 'localhost:3001';
      const proto = request.headers['x-forwarded-proto'] || 'http';
      const downloadUrl = `${proto}://${host}/downloads/windows-agent/latest.msi`;

      if (localData) {
        const metadata: AgentDownloadMetadata = AgentDownloadMetadataSchema.parse({
          version: DEFAULT_AGENT_VERSION,
          installerName: DEFAULT_INSTALLER_NAME,
          downloadUrl,
          sha256: localData.sha256,
          sizeBytes: localData.sizeBytes,
          releaseDate: localData.releaseDate,
        });
        return reply.status(200).send(metadata);
      }

      if (allowRemote) {
        const metadata: AgentDownloadMetadata = AgentDownloadMetadataSchema.parse({
          version: DEFAULT_VERIFIED_RELEASE.version,
          installerName: DEFAULT_VERIFIED_RELEASE.installerName,
          downloadUrl,
          sha256: DEFAULT_VERIFIED_RELEASE.sha256,
          sizeBytes: DEFAULT_VERIFIED_RELEASE.sizeBytes,
          releaseDate: DEFAULT_VERIFIED_RELEASE.releaseDate,
        });
        return reply.status(200).send(metadata);
      }

      return reply.status(404).send({
        statusCode: 404,
        code: 'METADATA_NOT_FOUND',
        message:
          'Windows Print Agent installer metadata not available because no valid installer artifact has been compiled or published on this server.',
      });
    }
  );

  const handleDownload = async (_request: FastifyRequest, reply: FastifyReply) => {
    const localData = getLocalInstallerData();
    if (localData) {
      return reply
        .header('Content-Type', 'application/x-msi')
        .header('Content-Disposition', `attachment; filename="${DEFAULT_INSTALLER_NAME}"`)
        .header('ETag', `"${localData.sha256}"`)
        .status(200)
        .send(localData.buffer);
    }

    if (allowRemote) {
      return reply.redirect(DEFAULT_VERIFIED_RELEASE.releaseUrl, 302);
    }

    return reply.status(404).send({
      statusCode: 404,
      code: 'INSTALLER_NOT_FOUND',
      message:
        'Windows Print Agent installer artifact not found on this server. Compile or publish the release artifact before downloading.',
    });
  };

  // GET /downloads/windows-agent
  app.get('/downloads/windows-agent', handleDownload);

  // GET /downloads/windows-agent/latest.msi
  app.get('/downloads/windows-agent/latest.msi', handleDownload);
}
