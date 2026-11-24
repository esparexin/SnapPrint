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
    return join(process.cwd(), 'apps', 'print-agent', 'dist', DEFAULT_INSTALLER_NAME);
  };

  // GET /downloads/windows-agent/metadata
  app.get('/downloads/windows-agent/metadata', async (request, reply) => {
    const installerPath = resolveInstallerPath();
    const hasFile = existsSync(installerPath);

    let sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    let sizeBytes = 1024;
    let releaseDate = new Date('2026-11-24T00:00:00.000Z').toISOString();

    if (hasFile) {
      const stats = statSync(installerPath);
      sizeBytes = stats.size;
      const content = readFileSync(installerPath);
      sha256 = createHash('sha256').update(content).digest('hex');
      releaseDate = stats.mtime.toISOString();
    }

    const host = request.headers.host || 'localhost:3001';
    const proto = request.headers['x-forwarded-proto'] || 'http';
    const downloadUrl = `${proto}://${host}/downloads/windows-agent/latest.msi`;

    const metadata: AgentDownloadMetadata = AgentDownloadMetadataSchema.parse({
      version: DEFAULT_AGENT_VERSION,
      installerName: DEFAULT_INSTALLER_NAME,
      downloadUrl,
      sha256,
      sizeBytes,
      releaseDate,
    });

    return reply.status(200).send(metadata);
  });

  // GET /downloads/windows-agent/latest.msi
  app.get('/downloads/windows-agent/latest.msi', async (_request, reply) => {
    const installerPath = resolveInstallerPath();
    if (!existsSync(installerPath)) {
      return reply.status(404).send({
        statusCode: 404,
        code: 'INSTALLER_NOT_FOUND',
        message: 'Windows Print Agent installer artifact not found on this server.',
      });
    }

    const buffer = readFileSync(installerPath);
    return reply
      .header('Content-Type', 'application/x-msi')
      .header('Content-Disposition', `attachment; filename="${DEFAULT_INSTALLER_NAME}"`)
      .status(200)
      .send(buffer);
  });
}
