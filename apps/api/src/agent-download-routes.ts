import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyInstance } from 'fastify';
import { AgentDownloadMetadata, AgentDownloadMetadataSchema } from '@snapprint/contracts';

export interface AgentDownloadRoutesOptions {
  installerPath?: string;
}

export const DEFAULT_AGENT_VERSION = '0.1.0';
export const DEFAULT_INSTALLER_NAME = 'SnapPrint-Print-Agent.msi' as const;

export async function agentDownloadRoutes(
  app: FastifyInstance,
  opts?: AgentDownloadRoutesOptions
): Promise<void> {
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

  const getInstallerData = (): {
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
    // Strict structural check: valid MSI must have non-trivial size and OLE CFB header
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
  app.get('/downloads/windows-agent/metadata', async (request, reply) => {
    const data = getInstallerData();
    if (!data) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'METADATA_NOT_FOUND',
        message:
          'Windows Print Agent installer metadata not available because no valid installer artifact has been compiled or published on this server.',
      });
    }

    const host = request.headers.host || 'localhost:3001';
    const proto = request.headers['x-forwarded-proto'] || 'http';
    const downloadUrl = `${proto}://${host}/downloads/windows-agent/latest.msi`;

    const metadata: AgentDownloadMetadata = AgentDownloadMetadataSchema.parse({
      version: DEFAULT_AGENT_VERSION,
      installerName: DEFAULT_INSTALLER_NAME,
      downloadUrl,
      sha256: data.sha256,
      sizeBytes: data.sizeBytes,
      releaseDate: data.releaseDate,
    });

    return reply.status(200).send(metadata);
  });

  // GET /downloads/windows-agent/latest.msi
  app.get('/downloads/windows-agent/latest.msi', async (_request, reply) => {
    const data = getInstallerData();
    if (!data) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'INSTALLER_NOT_FOUND',
        message:
          'Windows Print Agent installer artifact not found on this server. Compile or publish the release artifact before downloading.',
      });
    }

    return reply
      .header('Content-Type', 'application/x-msi')
      .header('Content-Disposition', `attachment; filename="${DEFAULT_INSTALLER_NAME}"`)
      .status(200)
      .send(data.buffer);
  });
}
